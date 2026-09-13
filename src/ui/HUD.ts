/**
 * HUD — DOM overlay bindings + floating combat text.
 * Game logic never touches document directly; it goes through here.
 */
import { SKILL_DEFS, type SkillId } from '../config/SkillConfig';
import { createSkillIcon } from './SkillIcons';
import { SkillUnlockNotice } from './SkillUnlockNotice';

export type Projector = (worldX: number, worldY: number) => { sx: number; sy: number };

interface FloatItem {
  el: HTMLDivElement;
  x: number;
  y: number;
  life: number;
  ttl: number;
  rise: number;
}

interface SkillSlot {
  id: SkillId;
  root: HTMLDivElement;
  emblem: HTMLDivElement;
  learned: boolean;
  key: HTMLDivElement;
  lv: HTMLDivElement;
  overlay: HTMLDivElement;
  cooldown: HTMLDivElement;
  status: HTMLDivElement;
  detail: HTMLDivElement;
  stateBadge: HTMLDivElement;
  name: string;
  manaCost: number;
  stateLabel: string;
}

function required<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`HUD element missing: #${id}`);
  return el as T;
}

export class HUD {
  private readonly hpFill = required('hp-fill');
  private readonly hpText = required('hp-text');
  private readonly goldText = required('gold-text');
  private readonly levelText = required('level-text');
  private readonly expFill = required('exp-fill');
  private readonly expText = required('exp-text');
  private readonly banner = required('banner');
  private readonly floatLayer = required('float-layer');
  private readonly hintEl = required('hint');
  private readonly mpFill = required('mp-fill');
  private readonly mpText = required('mp-text');
  private readonly skillBar = required('skill-bar');
  private readonly skillSlots: SkillSlot[] = [];
  private readonly flashEl = required('flash');
  private readonly buffEl = required('buff-bar');
  private readonly promptEl = required('prompt');
  private readonly fadeEl = required('fade');
  private autoSkillBtn: HTMLButtonElement | null = null;
  private lastBuffText = '';
  private skillSystemUnlocked = false;
  private skillUnlockNotice: SkillUnlockNotice | null = null;

  private readonly floats: FloatItem[] = [];
  private bannerTimer = 0;

  updatePlayer(opts: {
    hp: number;
    maxHP: number;
    mp: number;
    maxMP: number;
    level: number;
    exp: number;
    expReq: number;
    gold: number;
  }): void {
    const hpFrac = opts.maxHP > 0 ? Math.max(0, opts.hp / opts.maxHP) : 0;
    this.hpFill.style.transform = `scaleX(${hpFrac})`;
    this.hpText.textContent = `${Math.ceil(opts.hp)} / ${opts.maxHP}`;

    const mpFrac = opts.maxMP > 0 ? Math.max(0, opts.mp / opts.maxMP) : 0;
    this.mpFill.style.transform = `scaleX(${mpFrac})`;
    this.mpText.textContent = `${Math.floor(opts.mp)} / ${opts.maxMP}`;

    this.levelText.textContent = String(opts.level);
    const expFrac = opts.expReq > 0 ? Math.min(1, opts.exp / opts.expReq) : 1;
    this.expFill.style.transform = `scaleX(${expFrac})`;
    this.expText.textContent = opts.expReq > 0 ? `${Math.floor(opts.exp)} / ${opts.expReq} XP` : 'MAX';

    this.goldText.textContent = String(Math.floor(opts.gold));
  }

  setHint(text: string): void {
    this.hintEl.textContent = text;
  }

  /** Build the 3 skill slots once (labels refreshed via setSkillKeys). */
  initSkillBar(slots: Array<{ id: SkillId; name: string; key: string; manaCost: number }>): void {
    this.skillBar.replaceChildren();
    this.skillSlots.length = 0;
    for (const slot of slots) {
      const root = document.createElement('div');
      root.className = 'skill-slot unlearned locked';
      root.dataset.skill = slot.id;
      root.tabIndex = 0;
      root.setAttribute('role', 'group');
      root.setAttribute('aria-describedby', `skill-${slot.id}-tooltip`);
      const key = document.createElement('div');
      key.className = 'skill-key';
      key.textContent = this.compactKey(slot.key);
      const lv = document.createElement('div');
      lv.className = 'skill-lv';
      lv.textContent = 'Not learned';
      const name = document.createElement('div');
      name.className = 'skill-name';
      name.textContent = slot.name;
      const overlay = document.createElement('div');
      overlay.className = 'cd-overlay';
      const emblem = document.createElement('div');
      emblem.className = 'skill-emblem';
      const cooldown = document.createElement('div');
      cooldown.className = 'skill-cooldown';
      const status = document.createElement('div');
      status.className = 'skill-status';
      status.textContent = 'Skill learning unlocks at level 3';
      const detail = document.createElement('div');
      detail.className = 'skill-detail';
      detail.textContent = SKILL_DEFS[slot.id].describe(1);
      const stateBadge = document.createElement('div');
      stateBadge.className = 'skill-state-badge';
      stateBadge.setAttribute('aria-hidden', 'true');
      const tooltip = document.createElement('div');
      tooltip.id = `skill-${slot.id}-tooltip`;
      tooltip.className = 'skill-tooltip';
      tooltip.setAttribute('role', 'tooltip');
      tooltip.append(name, lv, detail, status);
      // No skill artwork is created before the player learns its first rank.
      emblem.append(overlay, cooldown);
      root.append(emblem, key, stateBadge, tooltip);
      const skillSlot: SkillSlot = {
        id: slot.id, root, emblem, learned: false, key, lv, overlay, cooldown, status, detail, stateBadge,
        name: slot.name, manaCost: slot.manaCost, stateLabel: 'Skill learning unlocks at level 3',
      };
      this.labelSkill(skillSlot);
      this.skillBar.appendChild(root);
      this.skillSlots.push(skillSlot);
    }
  }

  setSkillKeys(keys: string[]): void {
    keys.forEach((k, i) => {
      const slot = this.skillSlots[i];
      if (slot) {
        slot.key.textContent = this.compactKey(k);
        this.labelSkill(slot);
      }
    });
  }

  updateSkillBar(
    states: Array<{ level: number; maxLevel: number; cdLeft: number; cdTotal: number; affordable: boolean }>,
    unlocked = this.skillSystemUnlocked,
  ): void {
    this.skillSystemUnlocked = unlocked;
    states.forEach((s, i) => {
      const slot = this.skillSlots[i];
      if (!slot) return;
      const learned = s.level > 0;
      if (slot.learned !== learned) {
        slot.learned = learned;
        slot.emblem.querySelector('.skill-art')?.remove();
        if (learned) slot.emblem.prepend(createSkillIcon(slot.id));
      }
      const level = learned ? `Lv ${s.level}` : 'Not learned';
      if (slot.lv.textContent !== level) slot.lv.textContent = level;
      const detail = SKILL_DEFS[slot.id].describe(Math.max(1, s.level));
      if (slot.detail.textContent !== detail) slot.detail.textContent = detail;
      const frac = s.cdTotal > 0 ? Math.max(0, Math.min(1, s.cdLeft / s.cdTotal)) : 0;
      slot.overlay.style.height = `${learned ? frac * 100 : 0}%`;
      const coolingDown = learned && s.cdLeft > 0;
      const locked = !learned;
      const seconds = s.cdLeft >= 1 ? String(Math.ceil(s.cdLeft)) : Math.max(0.1, s.cdLeft).toFixed(1);
      const countdown = coolingDown && !locked ? `${seconds}s` : '';
      if (slot.cooldown.textContent !== countdown) slot.cooldown.textContent = countdown;
      const status = locked
        ? unlocked ? 'Not learned · Open Stats to choose a skill' : 'Skill learning unlocks at level 3'
        : !s.affordable ? `${slot.manaCost} MP · LOW MANA` : `${slot.manaCost} MP · ${coolingDown ? 'WAIT' : 'READY'}`;
      if (slot.status.textContent !== status) slot.status.textContent = status;
      slot.root.classList.toggle('on-cooldown', coolingDown);
      slot.root.classList.toggle('no-mana', learned && !s.affordable);
      slot.root.classList.toggle('locked', locked);
      slot.root.classList.toggle('unlearned', locked);
      const badge = learned && !s.affordable ? 'MP!' : '';
      if (slot.stateBadge.textContent !== badge) slot.stateBadge.textContent = badge;
      slot.stateLabel = [
        locked ? status : coolingDown ? `${seconds} seconds cooldown` : s.affordable ? 'Ready' : '',
        !locked && !s.affordable ? 'Not enough mana' : '',
      ].filter(Boolean).join('. ');
      this.labelSkill(slot);
    });
  }

  private labelSkill(slot: SkillSlot): void {
    const label = slot.learned
      ? `${slot.name} (${slot.key.textContent}), ${slot.lv.textContent}. ${slot.manaCost} MP. ${slot.stateLabel}.`
      : `Empty skill slot: ${slot.name} (${slot.key.textContent}). ${slot.stateLabel}.`;
    if (slot.root.getAttribute('aria-label') !== label) {
      slot.root.setAttribute('aria-label', label);
    }
  }

  /** Root calls this once on the saved locked → unlocked transition. */
  showSkillUnlock(onOpenLearning: () => void): void {
    this.skillSystemUnlocked = true;
    this.skillUnlockNotice ??= new SkillUnlockNotice();
    this.skillUnlockNotice.show(onOpenLearning);
  }

  private compactKey(key: string): string {
    return ({ Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']' } as Record<string, string>)[key] ?? key;
  }

  /** Fullscreen impact flash (CSS-faded, no game-loop coupling). */
  flashScreen(color = '255,255,255', strength = 0.45): void {
    const el = this.flashEl;
    el.style.transition = 'none';
    el.style.background = `rgba(${color},${strength})`;
    el.style.opacity = '1';
    void el.offsetWidth;
    el.style.transition = 'opacity 0.45s ease-out';
    el.style.opacity = '0';
  }

  /** Toggle button under the skill bar for auto-skill assist. */
  initAutoSkillButton(onToggle: () => void): void {
    const hud = document.getElementById('hud');
    if (!hud || this.autoSkillBtn) return;
    this.autoSkillBtn = document.createElement('button');
    this.autoSkillBtn.id = 'auto-skill-btn';
    this.autoSkillBtn.type = 'button';
    this.autoSkillBtn.title = 'Automatically cast ready skills at nearby enemies';
    this.autoSkillBtn.addEventListener('keydown', (event) => {
      if (event.code === 'Space' || event.code === 'Enter') event.stopPropagation();
    });
    this.autoSkillBtn.addEventListener('click', onToggle);
    hud.appendChild(this.autoSkillBtn);
  }

  setAutoSkill(on: boolean): void {
    if (!this.autoSkillBtn) return;
    this.autoSkillBtn.textContent = `AUTO-SKILL: ${on ? 'ON' : 'OFF'}`;
    this.autoSkillBtn.setAttribute('aria-pressed', String(on));
    this.autoSkillBtn.classList.toggle('on', on);
  }

  /** Buff countdown badge (e.g. BERSERK). Cached to avoid DOM churn. */
  showBuff(text: string): void {
    if (this.lastBuffText !== text) {
      this.lastBuffText = text;
      this.buffEl.textContent = text;
    }
    this.buffEl.classList.remove('hidden');
  }

  hideBuff(): void {
    if (this.lastBuffText !== '') {
      this.lastBuffText = '';
      this.buffEl.classList.add('hidden');
    }
  }

  /** Context prompt above the skill bar ("Press E — Talk to Mira"). */
  showPrompt(text: string): void {
    if (this.promptEl.textContent !== text) this.promptEl.textContent = text;
    this.promptEl.classList.remove('hidden');
  }

  hidePrompt(): void {
    this.promptEl.classList.add('hidden');
  }

  /** Fade out, run the swap, fade back in (map transitions). */
  fadeThrough(swap: () => void, ms = 280): void {
    const el = this.fadeEl;
    el.style.transition = `opacity ${ms}ms ease`;
    el.style.opacity = '1';
    window.setTimeout(() => {
      swap();
      el.style.opacity = '0';
    }, ms + 30);
  }

  showBanner(text: string): void {
    window.clearTimeout(this.bannerTimer);
    this.banner.textContent = text;
    this.banner.classList.remove('hidden');
    // Restart the CSS pop animation.
    this.banner.style.animation = 'none';
    void this.banner.offsetWidth;
    this.banner.style.animation = '';
    this.bannerTimer = window.setTimeout(() => this.banner.classList.add('hidden'), 1650);
  }

  spawnFloatingText(worldX: number, worldY: number, text: string, cssClass: string): void {
    const el = document.createElement('div');
    el.className = `float-text ${cssClass}`;
    el.textContent = text;
    this.floatLayer.appendChild(el);
    this.floats.push({ el, x: worldX, y: worldY, life: 0, ttl: cssClass === 'crit' ? 1.1 : 0.85, rise: 1.3 });
  }

  /** Move floating texts with the world; fade them out at end of life. */
  updateFx(dt: number, project: Projector): void {
    for (let i = this.floats.length - 1; i >= 0; i -= 1) {
      const item = this.floats[i];
      item.life += dt;
      if (item.life >= item.ttl) {
        item.el.remove();
        this.floats.splice(i, 1);
        continue;
      }
      const pos = project(item.x, item.y + item.rise * item.life);
      item.el.style.left = `${pos.sx}px`;
      item.el.style.top = `${pos.sy}px`;
      const fadeStart = item.ttl * 0.55;
      item.el.style.opacity = item.life > fadeStart ? String(1 - (item.life - fadeStart) / (item.ttl - fadeStart)) : '1';
    }
  }
}
