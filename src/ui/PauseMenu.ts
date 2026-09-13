/**
 * PauseMenu — ESC / ⏸ button overlay with:
 * resume, auto-attack toggle, click-to-rebind controls, save / erase save.
 * Built as DOM so it works while the canvas loop is frozen.
 */
import {
  ACTION_LABELS,
  prettyKey,
  type ActionName,
  type InputManager,
} from '../input/InputManager';
import { createHudAction } from './HudActions';

export interface PauseMenuCallbacks {
  onTogglePause: () => void;
  onResume: () => void;
  /** Persist now; returns a status line shown in the menu. */
  onSave: () => string;
  /** Erase progress (Game confirms + reloads). */
  onResetSave: () => void;
  isAutoAttack: () => boolean;
  onToggleAutoAttack: (enabled: boolean) => void;
  /** Fired after bindings/auto-attack change (HUD hint refresh, ...). */
  onBindingsChanged: () => void;
}

const ACTION_ORDER: ActionName[] = [
  'moveLeft',
  'moveRight',
  'jump',
  'attack',
  'skill1',
  'skill2',
  'skill3',
  'useHp',
  'useMp',
  'stats',
  'inventory',
  'interact',
  'pause',
];
const SLOTS_PER_ACTION = 2;

export class PauseMenu {
  private readonly overlay: HTMLDivElement;
  private readonly statusEl: HTMLDivElement;
  private readonly controlsEl: HTMLDivElement;
  private readonly autoAttackBox: HTMLInputElement;
  private readonly button: HTMLButtonElement;
  private open = false;

  constructor(
    private readonly input: InputManager,
    private readonly cb: PauseMenuCallbacks,
  ) {
    const hud = document.getElementById('hud') ?? document.body;

    this.button = createHudAction('pause', () => this.cb.onTogglePause());

    this.overlay = document.createElement('div');
    this.overlay.id = 'pause-overlay';
    this.overlay.classList.add('hidden');

    const panel = document.createElement('div');
    panel.className = 'pause-panel';

    const title = document.createElement('h2');
    title.textContent = 'PAUSED';
    panel.appendChild(title);

    const autoRow = document.createElement('label');
    autoRow.className = 'pause-row';
    this.autoAttackBox = document.createElement('input');
    this.autoAttackBox.type = 'checkbox';
    this.autoAttackBox.addEventListener('change', () => {
      this.cb.onToggleAutoAttack(this.autoAttackBox.checked);
      this.cb.onBindingsChanged();
    });
    autoRow.appendChild(this.autoAttackBox);
    autoRow.appendChild(document.createTextNode(' Auto-attack nearby monsters'));
    panel.appendChild(autoRow);

    const controlsTitle = document.createElement('h3');
    controlsTitle.textContent = 'CONTROLS';
    panel.appendChild(controlsTitle);

    const controlsHint = document.createElement('div');
    controlsHint.className = 'pause-note';
    controlsHint.textContent = 'Click a key, then press a new one. ESC cancels.';
    panel.appendChild(controlsHint);

    this.controlsEl = document.createElement('div');
    this.controlsEl.id = 'controls-list';
    panel.appendChild(this.controlsEl);

    const mouseNote = document.createElement('div');
    mouseNote.className = 'pause-note';
    mouseNote.textContent = 'Left mouse click always attacks too.';
    panel.appendChild(mouseNote);

    const buttonRow = document.createElement('div');
    buttonRow.className = 'pause-buttons';
    buttonRow.appendChild(this.makeButton('Save Game', () => {
      this.statusEl.textContent = this.cb.onSave();
    }));
    buttonRow.appendChild(this.makeButton('Reset Keys', () => {
      this.input.resetBindings();
      this.cb.onBindingsChanged();
      this.refresh();
      this.statusEl.textContent = 'Keys reset to defaults.';
    }));
    buttonRow.appendChild(this.makeButton('Erase Save', () => {
      if (window.confirm('Erase all progress and restart?')) this.cb.onResetSave();
    }));
    buttonRow.appendChild(this.makeButton('Resume', () => this.cb.onResume(), true));
    panel.appendChild(buttonRow);

    this.statusEl = document.createElement('div');
    this.statusEl.id = 'pause-status';
    panel.appendChild(this.statusEl);

    this.overlay.appendChild(panel);
    hud.appendChild(this.overlay);
  }

  isOpen(): boolean {
    return this.open;
  }

  setOpen(open: boolean): void {
    this.open = open;
    this.button.setAttribute('aria-expanded', String(open));
    this.overlay.classList.toggle('hidden', !open);
    if (open) {
      this.input.cancelCapture();
      this.refresh();
    }
  }

  private makeButton(label: string, onClick: () => void, primary = false): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = primary ? 'menu-btn primary' : 'menu-btn';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private refresh(): void {
    this.autoAttackBox.checked = this.cb.isAutoAttack();
    this.statusEl.textContent = '';
    this.controlsEl.replaceChildren();
    const bindings = this.input.getBindings();
    for (const action of ACTION_ORDER) {
      const row = document.createElement('div');
      row.className = 'ctl-row';
      const label = document.createElement('span');
      label.textContent = ACTION_LABELS[action];
      row.appendChild(label);
      const keys = document.createElement('span');
      keys.className = 'ctl-keys';
      for (let slot = 0; slot < SLOTS_PER_ACTION; slot += 1) {
        const code = bindings[action][slot];
        const btn = document.createElement('button');
        btn.className = 'key-btn';
        btn.textContent = code ? prettyKey(code) : '+';
        btn.title = `Rebind ${ACTION_LABELS[action]}`;
        btn.addEventListener('click', () => this.beginCapture(action, slot, btn));
        keys.appendChild(btn);
      }
      row.appendChild(keys);
      this.controlsEl.appendChild(row);
    }
  }

  private beginCapture(action: ActionName, slot: number, btn: HTMLButtonElement): void {
    btn.textContent = '…';
    btn.classList.add('capturing');
    this.input.captureNextKey((code) => {
      // Escape cancels instead of binding (keeps a way out of the menu).
      if (code !== 'Escape') {
        this.input.setBinding(action, slot, code);
        this.cb.onBindingsChanged();
      }
      this.refresh();
    });
  }
}
