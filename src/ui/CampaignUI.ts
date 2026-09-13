/** Campaign tracker, journal and short modal story conversations. */
import {
  Campaign, CAMPAIGN_TITLE, FLOOR_STORIES, GUARDIAN_REWARD_ID, floorRewardId,
  type CampaignData,
} from '../campaign/Campaign';
import { ROUTES, type RouteRoom } from '../campaign/CampaignRoutes';
import { enemyToken } from '../campaign/RouteProgress';

export interface CampaignAction { label: string; onClick: () => void; primary?: boolean; disabled?: boolean }
export interface CampaignUICallbacks { onOpenSkills?: () => void; onClaimReward?: (id: string) => void; onReturnTown?: () => void }

export class CampaignUI {
  private readonly tracker: HTMLDivElement;
  private readonly trackerObjective: HTMLParagraphElement;
  private readonly trackerProgress: HTMLSpanElement;
  private readonly journalButton: HTMLButtonElement;
  private readonly overlay: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly content: HTMLDivElement;
  private readonly actions: HTMLDivElement;
  private readonly closeButton: HTMLButtonElement;
  private campaign = new Campaign();
  private currentFloor = 0;
  private cacheKey = '';
  private open = false;
  private journalOpen = false;
  private returnFocus: HTMLElement | null = null;

  constructor(private readonly cb: CampaignUICallbacks = {}) {
    const hud = document.getElementById('hud') ?? document.body;
    this.tracker = document.createElement('div');
    this.tracker.id = 'campaign-tracker';
    const heading = document.createElement('div');
    heading.className = 'campaign-tracker-heading';
    const label = document.createElement('span');
    label.textContent = 'THE LAST LIGHT';
    this.journalButton = document.createElement('button');
    this.journalButton.type = 'button';
    this.journalButton.className = 'campaign-journal-button';
    this.journalButton.setAttribute('aria-label', 'Open quest journal');
    this.journalButton.setAttribute('aria-controls', 'campaign-overlay');
    this.journalButton.setAttribute('aria-expanded', 'false');
    this.journalButton.textContent = 'Journal';
    this.journalButton.addEventListener('click', () => this.showJournal());
    this.journalButton.addEventListener('keydown', (event) => {
      if (event.code === 'Space' || event.code === 'Enter') event.stopPropagation();
    });
    heading.append(label, this.journalButton);
    this.trackerObjective = document.createElement('p');
    this.trackerObjective.className = 'campaign-objective';
    this.trackerProgress = document.createElement('span');
    this.trackerProgress.className = 'campaign-progress';
    this.tracker.append(heading, this.trackerObjective, this.trackerProgress);
    hud.appendChild(this.tracker);

    this.overlay = document.createElement('div');
    this.overlay.id = 'campaign-overlay';
    this.overlay.className = 'panel-overlay hidden';
    const panel = document.createElement('div');
    panel.className = 'campaign-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'campaign-dialog-title');
    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.setOpen(false);
      } else if (event.key === 'Tab') {
        const focusable = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]'));
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      } else if (event.code === 'Space' || event.code === 'Enter') event.stopPropagation();
    });
    const header = document.createElement('div');
    header.className = 'campaign-dialog-header';
    this.title = document.createElement('h2');
    this.title.id = 'campaign-dialog-title';
    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.className = 'menu-btn small';
    this.closeButton.textContent = 'Close';
    this.closeButton.setAttribute('aria-label', 'Close story or journal');
    this.closeButton.addEventListener('click', () => this.setOpen(false));
    header.append(this.title, this.closeButton);
    this.content = document.createElement('div');
    this.content.className = 'campaign-dialog-content';
    this.actions = document.createElement('div');
    this.actions.className = 'campaign-dialog-actions';
    panel.append(header, this.content, this.actions);
    this.overlay.appendChild(panel);
    hud.appendChild(this.overlay);
    this.update(this.campaign, 0);
  }

  isOpen(): boolean { return this.open; }
  setOpen(open: boolean): void {
    if (open && !this.open) this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.open = open;
    this.overlay.classList.toggle('hidden', !open);
    this.journalButton.setAttribute('aria-expanded', String(open && this.journalOpen));
    if (open) {
      (this.actions.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? this.closeButton).focus({ preventScroll: true });
    } else if (this.returnFocus?.isConnected) {
      this.returnFocus.focus({ preventScroll: true });
    }
  }

  update(state: CampaignData | Campaign, currentFloor: number): void {
    const data = state instanceof Campaign ? state.serialize() : state;
    const key = JSON.stringify(data) + ':' + currentFloor;
    if (key === this.cacheKey) return;
    this.cacheKey = key;
    this.campaign.deserialize(data);
    this.currentFloor = currentFloor;
    this.trackerObjective.textContent = this.campaign.objective(currentFloor);
    this.trackerProgress.textContent = this.campaign.state.endingSeen
      ? 'Story complete · Free exploration'
      : this.campaign.state.clearedFloors.length + '/8 floors cleared';
    if (this.open && this.journalOpen) this.renderJournal();
  }

  showDialogue(title: string, lines: readonly string[], actions: CampaignAction[] = []): void {
    this.journalOpen = false;
    this.title.textContent = title;
    this.content.replaceChildren();
    for (const line of lines) {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      this.content.appendChild(paragraph);
    }
    this.renderActions(actions.length ? actions : [{ label: 'Continue', primary: true, onClick() {} }]);
    this.setOpen(true);
  }

  showJournal(): void {
    this.journalOpen = true;
    this.renderJournal();
    this.setOpen(true);
  }

  private renderActions(actions: CampaignAction[]): void {
    this.actions.replaceChildren();
    for (const action of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'menu-btn small' + (action.primary ? ' primary' : '');
      button.textContent = action.label;
      button.disabled = action.disabled === true;
      button.addEventListener('click', () => {
        this.setOpen(false);
        action.onClick();
      });
      this.actions.appendChild(button);
    }
  }

  private renderJournal(): void {
    const scroll = this.content.scrollTop;
    const expandedRooms = new Set(Array.from(this.content.querySelectorAll<HTMLDetailsElement>('details[data-room-record][open]'))
      .map((record) => record.dataset.roomRecord));
    this.title.textContent = CAMPAIGN_TITLE;
    this.content.replaceChildren();
    const now = document.createElement('p');
    now.className = 'campaign-journal-current';
    now.textContent = this.campaign.objective(this.currentFloor);
    this.content.appendChild(now);
    const intro = document.createElement('p');
    intro.className = 'campaign-muted';
    intro.textContent = 'Mira’s village crystal is fading. Trace the stolen light through the buried kingdom, free its king and restore the royal heart.';
    this.content.appendChild(intro);
    for (let floor = 1; floor <= 8; floor++) {
      const story = FLOOR_STORIES[floor];
      const entry = document.createElement('section');
      const cleared = this.campaign.hasCleared(floor);
      const unlocked = this.campaign.canEnter(floor);
      entry.className = 'campaign-journal-floor' + (unlocked ? '' : ' locked');
      const heading = document.createElement('h3');
      heading.textContent = floor + ' · ' + story.name;
      const status = document.createElement('span');
      status.className = 'campaign-floor-status';
      status.textContent = cleared ? 'Cleared' : unlocked ? 'Available' : 'Locked';
      heading.appendChild(status);
      entry.appendChild(heading);
      if (unlocked || cleared) {
        const objectives = document.createElement('ul');
        const rooms = ROUTES[floor] ?? [];
        const roomIds = new Set(rooms.map((room) => room.id));
        for (const objective of this.campaign.objectives(floor)) {
          // Chambers have their own collapsed records below; avoid repeating a
          // second full list of room names above those same records.
          if (roomIds.has(objective.id)) continue;
          const li = document.createElement('li');
          li.classList.toggle('done', objective.done);
          li.textContent = (objective.done ? '✓ ' : '○ ') + objective.label;
          objectives.appendChild(li);
        }
        const boss = document.createElement('li');
        boss.classList.toggle('done', cleared);
        boss.textContent = (cleared ? '✓ ' : '○ ') + (floor === 1 ? 'Harmless trial: ' : 'Defeat ') + story.bossName;
        objectives.appendChild(boss);
        if (floor === 8) {
          const guardian = document.createElement('li');
          const equipped = this.campaign.hasReward(GUARDIAN_REWARD_ID);
          guardian.classList.toggle('done', equipped);
          guardian.textContent = (equipped ? '✓ ' : '○ ') + 'Defeat the Last Guardian and claim the Tier 8 equipment reward first';
          objectives.prepend(guardian);
          const core = document.createElement('li');
          core.classList.toggle('done', this.campaign.state.completed);
          core.textContent = (this.campaign.state.completed ? '✓ ' : '○ ') + 'Purify the core and bring the light home';
          objectives.appendChild(core);
        }
        entry.appendChild(objectives);
        const roomProgress = document.createElement('p');
        roomProgress.className = 'campaign-muted';
        roomProgress.textContent = 'Chambers restored: ' + rooms.filter((room) => this.campaign.journey.completed.has(room.id)).length + '/' + rooms.length +
          ' · Open a chamber record to review your discoveries.';
        entry.appendChild(roomProgress);
        for (const room of rooms) entry.appendChild(this.roomRecord(room, floor, expandedRooms.has(room.id)));
        for (const station of story.stations) {
          if (!this.campaign.hasInteraction(station.id)) continue;
          const record = document.createElement('details');
          const summary = document.createElement('summary');
          summary.textContent = 'Read: ' + station.title;
          record.appendChild(summary);
          for (const line of station.lines) {
            const p = document.createElement('p'); p.textContent = line; record.appendChild(p);
          }
          entry.appendChild(record);
        }
        if (cleared) {
          const key = document.createElement('p');
          key.className = 'campaign-key';
          key.textContent = 'Story key: ' + story.keyName + ' · kept permanently';
          entry.appendChild(key);
        }
        const rewardId = floorRewardId(floor);
        if (cleared && !this.campaign.hasReward(rewardId)) this.appendRewardButton(entry, rewardId, 'Claim Floor ' + floor + ' reward');
        if (floor === 8 && this.campaign.hasInteraction('f8-guardian') && !this.campaign.hasReward(GUARDIAN_REWARD_ID)) {
          this.appendRewardButton(entry, GUARDIAN_REWARD_ID, 'Claim guardian’s Tier 8 reward');
        }
      } else {
        const hint = document.createElement('p');
        hint.className = 'campaign-muted';
        hint.textContent = floor === 2 && this.campaign.hasCleared(1) && !this.campaign.state.sealReturned
          ? 'Bring the soldier’s seal to Mira.'
          : 'Clear Floor ' + (floor - 1) + ' and claim its guaranteed reward.';
        entry.appendChild(hint);
      }
      this.content.appendChild(entry);
    }
    this.renderActions([
      ...(this.cb.onOpenSkills ? [{ label: 'Open skill training', onClick: this.cb.onOpenSkills }] : []),
      ...(this.currentFloor && this.cb.onReturnTown ? [{ label: 'Return to town · progress saved', onClick: this.cb.onReturnTown }] : []),
      { label: 'Return to adventure', primary: true, onClick() {} },
    ]);
    this.content.scrollTop = scroll;
  }

  private roomRecord(room: RouteRoom, floor: number, expanded: boolean): HTMLDetailsElement {
    const journey = this.campaign.journey;
    const completed = journey.completed.has(room.id) || this.campaign.hasCleared(floor);
    const active = this.currentFloor === floor && journey.active(floor)?.id === room.id;
    const remaining = room.waves.map((group, wave) => completed ? 0 : group.filter((_, index) => !journey.defeated.has(enemyToken(room, wave, index))).length);
    const totalTargets = room.waves.reduce((total, wave) => total + wave.length, 0);
    const remainingTargets = remaining.reduce((total, count) => total + count, 0);
    const discovered = completed || active || remainingTargets < totalTargets;

    const record = document.createElement('details');
    record.className = 'campaign-room-record';
    record.dataset.roomRecord = room.id;
    record.open = expanded;
    const summary = document.createElement('summary');
    summary.textContent = (completed ? '✓ ' : '○ ') + room.title + ' · ' +
      (completed ? 'Restored' : !discovered ? 'Unexplored' : (active ? 'Current · ' : '') + 'Progressing');
    record.appendChild(summary);
    const paragraph = (text: string, className = ''): HTMLParagraphElement => {
      const p = document.createElement('p');
      p.textContent = text;
      if (className) p.className = className;
      return p;
    };
    if (!discovered) {
      record.appendChild(paragraph('Reach this chamber and clear its encounters to progress.', 'campaign-muted'));
      return record;
    }
    record.appendChild(paragraph(
      'Encounters: ' + remaining.filter((count) => count === 0).length + '/' + room.waves.length +
      ' groups cleared · ' + remainingTargets + ' targets remaining.', 'campaign-room-wave-progress'));
    const waves = document.createElement('ul');
    const nextWave = remaining.findIndex((count) => count > 0);
    remaining.forEach((count, index) => {
      const wave = document.createElement('li');
      wave.classList.toggle('done', count === 0);
      wave.textContent = 'Group ' + (index + 1) + ': ' + (count === 0 ? 'cleared' : count + '/' + room.waves[index].length + ' remaining' + (index === nextWave ? ' · next encounter' : ''));
      waves.appendChild(wave);
    });
    record.appendChild(waves);
    return record;
  }

  private appendRewardButton(parent: HTMLElement, id: string, label: string): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'menu-btn small primary campaign-claim';
    button.textContent = label;
    button.disabled = !this.cb.onClaimReward;
    button.addEventListener('click', () => {
      this.setOpen(false);
      this.cb.onClaimReward?.(id);
    });
    parent.appendChild(button);
    const note = document.createElement('p');
    note.className = 'campaign-muted';
    note.textContent = 'Reward saved until claimed. Make room in your bag if needed.';
    parent.appendChild(note);
  }
}
