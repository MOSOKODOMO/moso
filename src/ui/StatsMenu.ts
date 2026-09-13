/**
 * StatsMenu — MMORPG-style character panel (C key / STATS button).
 * Fixed header + scrollable body; paper-doll equipment around the live hero.
 * Allocation and current status sit side by side, above derived breakdowns,
 * skills and active relics. The helmet is an armor-linked appearance preview.
 * Reads live data each refresh; Game applies mutations + world sync.
 */
import {
  FLOOR_RELICS,
  MAX_ACTIVE_RELICS,
  RARITY_COLORS,
  RARITY_LABELS,
  SLOT_LABELS,
  SLOT_ORDER,
} from '../config/ItemDefs';
import { SKILL_DEFS, SKILL_ORDER, type SkillId } from '../config/SkillConfig';
import type { EquipmentManager } from '../items/Equipment';
import { itemName, itemSlot, itemTier } from '../items/ItemInstance';
import type { FloorRelicManager } from '../relics/FloorRelics';
import type { Player } from '../player/Player';
import { makeHelmetTexture, makeRelicTexture, makeWeaponTexture } from '../rendering/SpriteFactory';
import {
  makeAccessoryIcon,
  makeArmorIcon,
  makeBootsIcon,
} from '../rendering/StageSprites';
import { BASE_ITEMS } from '../config/ItemDefs';
import type { StatId } from '../systems/SaveManager';
import { drawHeroPreview, iconURL } from './HeroPreview';
import { itemSummary, tooltipHTML } from './ItemTooltip';
import { createHudAction } from './HudActions';

export interface StatsMenuCallbacks {
  onAllocateStat: (id: StatId) => void;
  onUpgradeSkill: (id: SkillId) => void;
  onToggleRelic: (id: string) => void;
}

export interface StatsMenuGear {
  equipment: EquipmentManager;
  floorRelics: FloorRelicManager | null;
}

const STAT_ORDER: StatId[] = ['str', 'agi', 'crit', 'int'];
const STAT_NAMES: Record<StatId, string> = { str: 'STR', agi: 'AGI', crit: 'CRIT', int: 'INT' };
const STAT_DESCS: Record<StatId, string> = {
  str: '+0.6 Attack, +2 Max HP each',
  agi: '+0.12% Move, +0.08% Dodge each',
  crit: '+0.25% Crit Chance each (2.5x dmg)',
  int: '+2 Max MP, +0.5% Skill Damage each',
};

function trim(v: number): string {
  return String(Math.round(v * 10) / 10);
}

function pct(v: number): string {
  return `${trim(v * 100)}%`;
}

function escapeHTML(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export class StatsMenu {
  private readonly overlay: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly button: HTMLButtonElement;
  private selectedEquipUid: number | null = null;
  private open = false;

  constructor(
    private readonly player: Player,
    private readonly cb: StatsMenuCallbacks,
    private readonly gear: StatsMenuGear,
  ) {
    const hud = document.getElementById('hud') ?? document.body;

    this.button = createHudAction('stats', () => this.toggle());

    this.overlay = document.createElement('div');
    this.overlay.id = 'stats-overlay';
    this.overlay.classList.add('hidden', 'panel-overlay');

    const panel = document.createElement('div');
    panel.className = 'pause-panel wide char-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'character-panel-title');

    const header = document.createElement('div');
    header.className = 'character-header';
    const title = document.createElement('h2');
    title.id = 'character-panel-title';
    title.textContent = 'CHARACTER';
    header.appendChild(title);

    this.body = document.createElement('div');
    this.body.className = 'character-body';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'menu-btn character-close';
    close.dataset.hudClose = 'stats';
    close.textContent = 'Close';
    close.addEventListener('click', () => this.setOpen(false));
    header.appendChild(close);
    panel.append(header, this.body);

    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        const controls = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), summary'));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
      if (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') {
        event.stopPropagation();
      }
    });

    this.overlay.appendChild(panel);
    hud.appendChild(this.overlay);
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    this.setOpen(!this.open);
  }

  /** Called by the level-three unlock notice without changing any skill choice. */
  openLearning(): void {
    if (!this.open) this.setOpen(true);
    else this.refresh();
    const section = this.body.querySelector<HTMLElement>('#character-skill-learning');
    section?.scrollIntoView({ block: 'start', behavior: 'auto' });
    const firstAction = section?.querySelector<HTMLButtonElement>('[data-skill]:not(:disabled)');
    (firstAction ?? section)?.focus({ preventScroll: true });
  }

  setOpen(open: boolean): void {
    const wasOpen = this.open;
    this.open = open;
    this.button.setAttribute('aria-expanded', String(open));
    this.overlay.classList.toggle('hidden', !open);
    if (open) {
      this.selectedEquipUid = null;
      this.refresh();
      this.body.scrollTop = 0;
      this.overlay.querySelector<HTMLButtonElement>('[data-hud-close="stats"]')?.focus({ preventScroll: true });
    } else if (wasOpen && this.overlay.contains(document.activeElement)) {
      this.button.focus({ preventScroll: true });
    }
  }

  private gearIcon(baseId: string): string {
    const def = BASE_ITEMS[baseId];
    if (def.slot === 'weapon') return iconURL(`pw-${baseId}`, () => makeWeaponTexture(def.tier));
    if (def.slot === 'armor') return iconURL(`pa-${baseId}`, () => makeArmorIcon(def.tier));
    if (def.slot === 'boots') return iconURL(`pb-${baseId}`, () => makeBootsIcon(def.tier));
    return iconURL(`pc-${baseId}`, () => makeAccessoryIcon(def.tier));
  }

  refresh(): void {
    if (!this.open) return;
    const p = this.player;
    const eq = this.gear.equipment;
    const bd = p.lastBreakdown;
    const agg = eq.aggregates();
    const scrollTop = this.body.scrollTop;
    const expanded = Array.from(this.body.querySelectorAll<HTMLDetailsElement>('details[open]'))
      .map((detail) => detail.dataset.derived);
    const focused = document.activeElement instanceof HTMLElement && this.body.contains(document.activeElement)
      ? document.activeElement : null;
    const focusKey = focused?.dataset.stat ? `[data-stat="${focused.dataset.stat}"]`
      : focused?.dataset.skill ? `[data-skill="${focused.dataset.skill}"]`
      : focused?.dataset.equip ? `[data-equip="${focused.dataset.equip}"]`
      : focused?.dataset.relic ? `[data-relic="${focused.dataset.relic}"]` : null;
    // Reuse the HUD's display label until saved character names exist.
    const playerName = escapeHTML(document.getElementById('character-name')?.textContent?.trim() || 'Adventurer');

    let html = `<div class="character-identity"><div><strong>${playerName}</strong><span>Level ${p.level} · Swordsman</span></div>` +
      `<div class="character-points"><span>Stat points <b>${p.statPoints}</b></span><span>Skill points <b>${p.skillPoints}</b></span></div></div>`;

    // --- Existing gear slots surround the same equipped hero used in-world. ---
    html += '<section class="character-section character-equipment"><div class="character-section-heading"><h3>EQUIPMENT</h3><span>Inspect a slot for bonuses</span></div>';
    html += '<div class="character-equipment-layout"><div class="character-doll">';
    html += `<div class="character-helmet" title="Helmet appearance follows equipped armor; this is not a separate equipment slot.">` +
      `<span>Helmet</span><img src="${iconURL(`character-helmet-${p.armorTier}`, () => makeHelmetTexture(p.armorTier))}" alt="Armor-linked helmet appearance" draggable="false"><small>With armor</small></div>`;
    html += '<div class="character-hero"><canvas class="hero-canvas" width="144" height="200" aria-label="Current equipped character appearance"></canvas></div>';
    for (const slot of SLOT_ORDER) {
      const item = eq.equipped[slot];
      if (!item) {
        html += `<div class="character-slot character-slot-${slot} empty"><span>${SLOT_LABELS[slot]}</span><span class="character-slot-empty">—</span><small>Empty</small></div>`;
        continue;
      }
      const color = RARITY_COLORS[item.rarity];
      const enh = eq.enhance[slot];
      const selected = this.selectedEquipUid === item.uid ? ' sel' : '';
      const label = escapeHTML(`${SLOT_LABELS[slot]}: ${itemName(item)}, ${RARITY_LABELS[item.rarity]}, Tier ${itemTier(item)}${enh > 0 ? `, enhanced +${enh}` : ''}. ${itemSummary(item)}`);
      html += `<button type="button" class="character-slot character-slot-${slot}${selected}" data-equip="${item.uid}" ` +
        `style="--gear-color:${color}" aria-label="${label}" aria-pressed="${this.selectedEquipUid === item.uid}" aria-describedby="character-gear-detail" title="${label}">` +
        `<span>${SLOT_LABELS[slot]}</span><img src="${this.gearIcon(item.baseId)}" alt="" draggable="false">` +
        `<small>T${itemTier(item)}${enh > 0 ? ` · +${enh}` : ''}</small></button>`;
    }
    html += '</div><div class="char-detail" id="character-gear-detail" role="region" aria-label="Equipment details"></div></div>';
    html += '<p class="character-help">Helmet appearance follows armor. Change equipped items in Inventory.</p></section>';

    // --- Base stats ---
    html += '<div class="character-build"><section class="character-section character-allocation"><div class="character-section-heading"><h3>STAT ALLOCATION</h3>' +
      `<span><b>${p.statPoints}</b> available</span></div>`;
    for (const id of STAT_ORDER) {
      const alloc = p.stats[id];
      const charm = p.relicBonus[id];
      const gearPts = Math.round((agg[id] as number) * 10) / 10;
      const total = alloc + charm + gearPts;
      html +=
        `<div class="stat-row"><div class="stat-info"><div class="character-stat-total"><b>${STAT_NAMES[id]}</b><strong>${trim(total)}</strong></div>` +
        `<div class="stat-desc">${STAT_DESCS[id]}</div><div class="character-stat-source">Allocated ${alloc}${charm > 0 ? ` · Charm +${charm}` : ''}${gearPts > 0 ? ` · Gear +${trim(gearPts)}` : ''}</div></div>` +
        `<button type="button" class="stat-plus" data-stat="${id}" aria-label="Allocate one point to ${STAT_NAMES[id]}"${p.statPoints <= 0 ? ' disabled' : ''}>+</button></div>`;
    }
    html += '</section><section class="character-section character-status"><div class="character-section-heading"><h3>STATUS</h3><span>Current character</span></div>';
    const resource = (label: string, current: number, max: number, kind: string): string =>
      `<div class="character-resource"><div><span>${label}</span><b>${Math.ceil(current)} / ${trim(max)}</b></div>` +
      `<div class="character-resource-track ${kind}"><span style="width:${Math.max(0, Math.min(100, current / Math.max(1, max) * 100))}%"></span></div></div>`;
    html += resource('Health', p.hp, p.maxHP, 'health') + resource('Mana', p.mp, p.maxMP, 'mana');
    html += `<dl class="character-status-values"><div><dt>Attack</dt><dd>${trim(bd.attack.final)}</dd></div>` +
      `<div><dt>Defense</dt><dd>${trim(bd.defense.final)}</dd></div><div><dt>Crit chance</dt><dd>${pct(bd.critChance.final)}</dd></div>` +
      `<div><dt>Dodge</dt><dd>${pct(bd.dodge.final)}</dd></div></dl>`;
    html += '<p class="character-help">Totals include allocated points, equipped gear and active relics. Expand a derived stat below for its breakdown.</p></section></div>';

    // --- Derived stats with breakdowns ---
    html += '<section class="character-section"><div class="character-section-heading"><h3>DERIVED STATS</h3><span>Expand to inspect sources</span></div><div class="character-derived-grid">';
    const row = (label: string, value: string, detail: string): string =>
      `<details class="derived" data-derived="${label}"${expanded.includes(label) ? ' open' : ''}><summary><span>${label}</span><b>${value}</b></summary><div class="breakdown">${detail}</div></details>`;
    html += row('Attack', trim(bd.attack.final),
      `Base ${trim(bd.attack.base)} • STR +${trim(bd.attack.str)} • Equip +${trim(bd.attack.equip)} • Relics +${trim(bd.attack.relic)} • Buffs ×${trim(bd.attack.buffMult)} = <b>${trim(bd.attack.final)}</b>`);
    html += row('Defense', trim(bd.defense.final),
      `Base ${trim(bd.defense.base)} • Equip +${trim(bd.defense.equip)} • Relics +${trim(bd.defense.relic)} • Buffs ×${trim(bd.defense.buffMult)} = <b>${trim(bd.defense.final)}</b>`);
    html += row('Max HP', trim(bd.maxHP.final),
      `Base ${trim(bd.maxHP.base)} • STR +${trim(bd.maxHP.str)} • Equip +${trim(bd.maxHP.equip)} = <b>${trim(bd.maxHP.final)}</b>`);
    html += row('Max MP', trim(bd.maxMP.final),
      `Base ${trim(bd.maxMP.base)} • INT +${trim(bd.maxMP.str)} • Equip +${trim(bd.maxMP.equip)} = <b>${trim(bd.maxMP.final)}</b>`);
    html += row('Crit Chance', pct(bd.critChance.final),
      `Base ${pct(bd.critChance.base)} • CRIT +${pct(bd.critChance.crit)} • Equip +${pct(bd.critChance.equip)} • Relics +${pct(bd.critChance.relic)} = <b>${pct(bd.critChance.final)}</b> (2.5x dmg)`);
    html += row('Dodge', pct(bd.dodge.final),
      `AGI +${pct(bd.dodge.agi)} • Equip +${pct(bd.dodge.equip)} = <b>${pct(bd.dodge.final)}</b>`);
    html += row('Move Speed', `+${pct(bd.moveSpeed.final)}`,
      `AGI +${pct(bd.moveSpeed.agi)} • Equip +${pct(bd.moveSpeed.equip)} • Berserk +${pct(bd.moveSpeed.berserk)}`);
    html += row('Skill Damage', `+${pct(bd.skillDamage.final)}`,
      `INT +${pct(bd.skillDamage.int)} • Equip +${pct(bd.skillDamage.equip)} • Relics +${pct(bd.skillDamage.relic)} • Berserk +${pct(bd.skillDamage.berserk)}`);
    html += '</div></section>';

    // --- Skills ---
    const learnedCount = SKILL_ORDER.filter((id) => p.skillLevels[id] > 0).length;
    const mastered = SKILL_ORDER.every((id) => p.skillLevels[id] >= SKILL_DEFS[id].maxLevel);
    const learningNote = !p.skillSystemUnlocked
      ? 'Skill learning opens at level 3. For now, practice your normal attack in the safe first ruins.'
      : mastered ? 'All three skills have reached their maximum rank.'
      : learnedCount === 0 ? 'Choose any skill as your first. Learning rank 1 costs one point and fills only that skill’s hotbar slot.'
      : 'Learn another skill or strengthen one you know. Each rank costs one point. Skills keep their fixed hotbar slots.';
    html += `<section class="character-section skill-learning-section" id="character-skill-learning" tabindex="-1"><div class="character-section-heading"><h3>SKILL LEARNING</h3>` +
      `<span>${p.skillSystemUnlocked ? `<b>${p.skillPoints}</b> points available` : 'Unlocks at level 3'}</span></div>` +
      `<p class="skill-learning-intro">${learningNote}</p><div class="character-skills skill-learning-grid">`;
    for (const id of SKILL_ORDER) {
      const def = SKILL_DEFS[id];
      const lv = p.skillLevels[id];
      const maxed = lv >= def.maxLevel;
      const nextRank = Math.min(def.maxLevel, Math.max(1, lv + 1));
      const action = !p.skillSystemUnlocked ? 'Level 3 required' : maxed ? 'Maximum rank' : lv === 0 ? 'Learn · 1 point' : 'Upgrade · 1 point';
      const tags: Record<SkillId, string> = { power: 'Mobility · Close range', bolt: 'Area damage · Sword magic', heal: 'Self buff · Battle stance' };
      html += `<article class="skill-learning-card${lv > 0 ? ' learned' : ''}"><div class="skill-learning-card-heading"><b>${def.name}</b>` +
        `<span>${lv > 0 ? `Rank ${lv}/${def.maxLevel}` : 'Not learned'}</span></div>` +
        `<div class="skill-learning-role">${tags[id]}</div><div class="stat-desc">${def.describe(Math.max(1, lv))}</div>` +
        `<div class="skill-learning-cost">${def.manaCost} MP · ${def.cooldown}s cooldown · Slot ${SKILL_ORDER.indexOf(id) + 1}</div>` +
        `${lv > 0 && !maxed ? `<div class="skill-next-rank">Next rank: ${def.describe(nextRank)}</div>` : ''}` +
        `<button type="button" class="menu-btn skill-learn-action" data-skill="${id}" aria-label="${lv === 0 ? 'Learn' : 'Upgrade'} ${def.name}${maxed ? ', maximum rank' : ` to rank ${nextRank}, costs one point`}"` +
        `${!p.skillSystemUnlocked || p.skillPoints <= 0 || maxed ? ' disabled' : ''}>${action}</button></article>`;
    }
    html += '</div><p class="character-help">Earn one skill point at level 3 and each later level until all 15 skill ranks are covered.</p></section>';

    // --- Active relics ---
    const relics = this.gear.floorRelics;
    const activeCount = relics?.active.filter(Boolean).length ?? 0;
    html += `<section class="character-section"><div class="character-section-heading"><h3>RELICS</h3><span>${activeCount} / ${MAX_ACTIVE_RELICS} active</span></div>`;
    if (!relics || relics.owned.length === 0) {
      html += '<div class="pause-note">No relics yet — the Forgotten Ruins hide a Lucky Slime Core…</div>';
    } else {
      html += '<div class="relic-grid">';
      for (const id of relics.owned) {
        const def = FLOOR_RELICS[id];
        if (!def) continue;
        const active = relics.isActive(id);
        html +=
          `<button type="button" class="relic-slot owned${active ? ' active' : ''}" style="--relic-color:${def.color};" ` +
          `data-relic="${id}" aria-pressed="${active}" title="${escapeHTML(`${def.name}: ${def.description} (${active ? 'unequip' : 'equip'})`)}">` +
          `<img class="relic-icon" src="${iconURL(`relic-${id}`, () => makeRelicTexture(def.color))}" alt="" draggable="false">` +
          `<span>${def.name}</span><small>${active ? 'Active' : 'Equip'}</small></button>`;
      }
      for (let i = activeCount; i < MAX_ACTIVE_RELICS; i += 1) {
        html += '<div class="relic-slot character-empty-relic">Open active slot</div>';
      }
      html += '</div>';
    }
    html += '</section>';

    this.body.innerHTML = html;

    // Live hero preview (same textures as the world sprite).
    const canvas = this.body.querySelector<HTMLCanvasElement>('.hero-canvas');
    if (canvas) drawHeroPreview(canvas, p.weaponTier, p.armorTier, eq.enhance.weapon, eq.enhance.armor,
      eq.equipped.boots ? itemTier(eq.equipped.boots) : 0);

    // Selected equipment tooltip.
    this.showEquipmentDetail(this.selectedEquipUid);

    this.body.querySelectorAll<HTMLButtonElement>('[data-stat]').forEach((b) => {
      b.addEventListener('click', () => {
        this.cb.onAllocateStat(b.dataset.stat as StatId);
        this.refresh();
      });
    });
    this.body.querySelectorAll<HTMLButtonElement>('[data-skill]').forEach((b) => {
      b.addEventListener('click', () => {
        this.cb.onUpgradeSkill(b.dataset.skill as SkillId);
        this.refresh();
      });
    });
    this.body.querySelectorAll<HTMLButtonElement>('[data-equip]').forEach((el) => {
      el.addEventListener('mouseenter', () => this.showEquipmentDetail(Number(el.dataset.equip)));
      el.addEventListener('focus', () => this.showEquipmentDetail(Number(el.dataset.equip)));
      el.addEventListener('mouseleave', () => {
        const focusedEquip = this.body.querySelector<HTMLButtonElement>('[data-equip]:focus');
        this.showEquipmentDetail(focusedEquip ? Number(focusedEquip.dataset.equip) : this.selectedEquipUid);
      });
      el.addEventListener('blur', () => this.showEquipmentDetail(this.selectedEquipUid));
      el.addEventListener('click', () => {
        const uid = Number(el.dataset.equip);
        this.selectedEquipUid = this.selectedEquipUid === uid ? null : uid;
        this.refresh();
      });
    });
    this.body.querySelectorAll<HTMLButtonElement>('[data-relic]').forEach((el) => {
      el.addEventListener('click', () => {
        this.cb.onToggleRelic(el.dataset.relic ?? '');
        this.refresh();
      });
    });
    if (focusKey) this.body.querySelector<HTMLElement>(focusKey)?.focus({ preventScroll: true });
    this.body.scrollTop = scrollTop;
  }

  private showEquipmentDetail(uid: number | null): void {
    const detail = this.body.querySelector<HTMLDivElement>('.char-detail');
    if (!detail) return;
    const item = uid === null ? null : this.findEquipped(uid);
    detail.innerHTML = item
      ? `<div class="character-inspect-label">${this.selectedEquipUid === uid ? 'Selected equipment' : 'Equipment details'}</div><div class="tt-card">${tooltipHTML(item, null, this.gear.equipment.enhance[itemSlot(item)])}</div>`
      : '<div class="character-inspect-empty"><span class="character-inspect-symbol" aria-hidden="true">◇</span><b>Your equipment</b><p>Hover or focus a slot to see its name, rarity and bonuses.</p><p>Click a slot to keep its details open.</p></div>';
  }

  private findEquipped(uid: number) {
    for (const slot of SLOT_ORDER) {
      const item = this.gear.equipment.equipped[slot];
      if (item && item.uid === uid) return item;
    }
    return null;
  }
}
