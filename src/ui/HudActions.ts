import { DEFAULT_BINDINGS, prettyKey } from '../input/InputManager';

type HudAction = 'pause' | 'stats' | 'inventory';
type HudActionKeys = Record<HudAction, string[]>;

const ACTION_ORDER: HudAction[] = ['pause', 'stats', 'inventory'];
const ACTIONS: Record<HudAction, { id: string; overlay: string; label: string; icon: string }> = {
  pause: {
    id: 'pause-button',
    overlay: 'pause-overlay',
    label: 'Pause',
    icon: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>',
  },
  stats: {
    id: 'stats-button',
    overlay: 'stats-overlay',
    label: 'Stats',
    icon: '<circle cx="9" cy="7" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3Z"/><path d="M18 7h3M18 12h3M18 17h3"/>',
  },
  inventory: {
    id: 'bag-button',
    overlay: 'bag-overlay',
    label: 'Inventory',
    icon: '<path d="M8 7V5a4 4 0 0 1 8 0v2M5 7h14l1 13H4Z"/><path d="M4.7 11.5c4.8 3.3 9.8 3.3 14.6 0"/><path d="M10 13h4v4h-4Z"/>',
  },
};

/** Native menu buttons share the same order, artwork and shortcut descriptions. */
export function createHudAction(action: HudAction, onClick: () => void): HTMLButtonElement {
  const def = ACTIONS[action];
  const button = document.createElement('button');
  button.type = 'button';
  button.id = def.id;
  button.className = 'hud-action';
  button.dataset.hudAction = action;
  button.setAttribute('aria-controls', def.overlay);
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-describedby', `${def.id}-tooltip`);
  button.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${def.icon}</svg>`;

  const tooltip = document.createElement('span');
  tooltip.className = 'hud-action-tooltip';
  tooltip.id = `${def.id}-tooltip`;
  tooltip.setAttribute('role', 'tooltip');
  button.appendChild(tooltip);
  button.addEventListener('click', onClick);
  button.addEventListener('keydown', (event) => {
    // Preserve native activation while preventing a focused menu button from
    // also queuing an attack/jump through InputManager's window listener.
    if (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') {
      event.stopPropagation();
    }
  });

  let actions = document.getElementById('hud-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.id = 'hud-actions';
    (document.getElementById('hud') ?? document.body).appendChild(actions);
  }
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', 'Game menus');
  const following = Array.from(actions.querySelectorAll<HTMLButtonElement>('[data-hud-action]'))
    .find((other) => ACTION_ORDER.indexOf(other.dataset.hudAction as HudAction) > ACTION_ORDER.indexOf(action));
  actions.insertBefore(button, following ?? null);
  updateActionKeys(action, DEFAULT_BINDINGS[action]);
  return button;
}

function updateActionKeys(action: HudAction, codes: string[]): void {
  const def = ACTIONS[action];
  const keys = codes.filter(Boolean).map(prettyKey).join(' / ');
  const description = keys ? `${def.label} (${keys})` : def.label;
  document.getElementById(def.id)?.setAttribute('aria-label', description);
  const tooltip = document.getElementById(`${def.id}-tooltip`);
  if (tooltip) tooltip.textContent = description;
  const close = document.querySelector<HTMLElement>(`[data-hud-close="${action}"]`);
  if (close) close.textContent = keys ? `Close (${keys})` : 'Close';
}

/** Receives physical KeyboardEvent.code strings from the saved input bindings. */
export function updateHudActionKeys(bindings: HudActionKeys): void {
  for (const action of ACTION_ORDER) updateActionKeys(action, bindings[action]);
}
