/** Eight-floor gate selection backed by deterministic campaign unlocks. */
import { Campaign, FLOOR_STORIES, floorRewardId } from '../campaign/Campaign';

export interface GateMenuCallbacks {
  onEnter: (floor: number) => void;
  onLeave: () => void;
  getCampaign?: () => Campaign;
  getCurrentFloor?: () => number;
}
export class GateMenu {
  private readonly overlay: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly close: HTMLButtonElement;
  private readonly fallbackCampaign = new Campaign();
  private open = false;
  private mode: 'enter' | 'leave' = 'enter';
  private currentFloor = 1;
  private returnFocus: HTMLElement | null = null;

  constructor(private readonly cb: GateMenuCallbacks) {
    const hud = document.getElementById('hud') ?? document.body;
    this.overlay = document.createElement('div');
    this.overlay.id = 'gate-overlay';
    this.overlay.classList.add('hidden', 'panel-overlay');
    const panel = document.createElement('div');
    panel.className = 'campaign-panel gate-campaign-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'gate-title');
    const header = document.createElement('div');
    header.className = 'campaign-dialog-header';
    const title = document.createElement('h2');
    title.id = 'gate-title';
    title.textContent = 'DUNGEON GATE';
    this.close = document.createElement('button');
    this.close.type = 'button';
    this.close.className = 'menu-btn small';
    this.close.textContent = 'Close';
    this.close.addEventListener('click', () => this.setOpen(false));
    header.append(title, this.close);
    this.body = document.createElement('div');
    this.body.className = 'campaign-dialog-content';
    panel.append(header, this.body);
    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); this.setOpen(false);
      } else if (event.key === 'Tab') {
        const controls = Array.from(panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      } else if (event.code === 'Space' || event.code === 'Enter') event.stopPropagation();
    });
    this.overlay.appendChild(panel);
    hud.appendChild(this.overlay);
  }

  isOpen(): boolean { return this.open; }
  setOpen(open: boolean): void {
    if (open && !this.open) this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.open = open;
    this.overlay.classList.toggle('hidden', !open);
    if (open) {
      this.refresh();
      (this.body.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? this.close).focus({ preventScroll: true });
    } else if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
  }
  /** Optional floor context keeps old callers working while Game supplies the actual dungeon floor. */
  show(mode: 'enter' | 'leave', currentFloor?: number): void {
    this.mode = mode;
    this.currentFloor = currentFloor ?? this.cb.getCurrentFloor?.() ?? 1;
    this.setOpen(true);
  }
  refresh(): void {
    const campaign = this.cb.getCampaign?.() ?? this.fallbackCampaign;
    this.body.replaceChildren();
    const note = document.createElement('p');
    note.className = 'campaign-muted';
    note.textContent = this.mode === 'enter'
      ? 'Choose an unlocked floor. Earlier areas remain open for optional farming.'
      : 'Return to town anytime. Objectives and claimed story keys are saved; ordinary world drops disappear when you leave.';
    this.body.appendChild(note);
    if (this.mode === 'enter') {
      const list = document.createElement('div');
      list.className = 'campaign-gate-list';
      for (let floor = 1; floor <= 8; floor++) list.appendChild(this.floorButton(floor, campaign));
      this.body.appendChild(list);
    } else {
      const floor = Math.max(1, Math.min(8, this.currentFloor));
      const heading = document.createElement('h3');
      heading.textContent = 'Floor ' + floor + ' — ' + FLOOR_STORIES[floor].name;
      const objective = document.createElement('p');
      objective.className = 'campaign-journal-current';
      objective.textContent = campaign.objective(floor);
      this.body.append(heading, objective);
      const actions = document.createElement('div');
      actions.className = 'campaign-gate-actions';
      const leave = document.createElement('button');
      leave.type = 'button';
      leave.className = 'menu-btn primary';
      leave.id = 'gate-leave';
      leave.textContent = 'Return to Meadow Outpost';
      leave.addEventListener('click', () => { this.setOpen(false); this.cb.onLeave(); });
      actions.appendChild(leave);
      if (floor < 8) {
        const next = this.floorButton(floor + 1, campaign);
        next.classList.add('campaign-next-floor');
        actions.appendChild(next);
      }
      this.body.appendChild(actions);
    }
  }

  private floorButton(floor: number, campaign: Campaign): HTMLButtonElement {
    const story = FLOOR_STORIES[floor];
    const unlocked = campaign.canEnter(floor);
    const cleared = campaign.hasCleared(floor);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'campaign-gate-floor' + (cleared ? ' cleared' : '');
    button.disabled = !unlocked;
    button.dataset.campaignFloor = String(floor);
    if (floor === 1) button.id = 'gate-enter';
    const number = document.createElement('span');
    number.className = 'campaign-gate-number';
    number.textContent = String(floor).padStart(2, '0');
    const text = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = story.name;
    const sub = document.createElement('small');
    sub.textContent = !unlocked
      ? floor === 2 && campaign.hasCleared(1) && !campaign.state.sealReturned
        ? 'Bring the soldier’s seal to Mira'
        : 'Locked · Clear and claim Floor ' + (floor - 1)
      : cleared
        ? !campaign.hasReward(floorRewardId(floor)) ? 'Cleared · Reward waiting in journal' : 'Cleared · Revisit'
        : floor === 1 ? 'Harmless training · Tier 1' : 'Tier ' + floor + ' · Suggested level ' + story.recommendedLevel;
    text.append(name, sub);
    const status = document.createElement('span');
    status.className = 'campaign-gate-status';
    status.textContent = !unlocked ? 'Locked' : cleared ? '↻' : '→';
    button.append(number, text, status);
    button.addEventListener('click', () => {
      // Recheck current state so an old dialog never bypasses progression.
      if (!(this.cb.getCampaign?.() ?? this.fallbackCampaign).canEnter(floor)) return;
      this.setOpen(false);
      this.cb.onEnter(floor);
    });
    return button;
  }
}

