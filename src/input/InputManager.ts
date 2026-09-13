/**
 * Central keyboard + mouse state with REMAPPABLE bindings.
 * Gameplay code polls actions (no DOM logic elsewhere).
 * Bindings persist via SaveManager; the pause menu edits them live.
 */
import type { KeyBindings } from '../systems/SaveManager';

export type ActionName =
  | 'moveLeft'
  | 'moveRight'
  | 'jump'
  | 'attack'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'useHp'
  | 'useMp'
  | 'stats'
  | 'inventory'
  | 'interact'
  | 'pause';

export const ACTION_LABELS: Record<ActionName, string> = {
  moveLeft: 'Move Left',
  moveRight: 'Move Right',
  jump: 'Jump',
  attack: 'Attack',
  skill1: 'Skill 1: Dash Slash',
  skill2: 'Skill 2: Sword Rain',
  skill3: 'Skill 3: Berserk',
  useHp: 'Use HP Potion',
  useMp: 'Use MP Potion',
  stats: 'Character Panel',
  inventory: 'Inventory',
  interact: 'Interact / Talk',
  pause: 'Pause',
};

export const DEFAULT_BINDINGS: KeyBindings = {
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  attack: ['KeyJ'],
  skill1: ['KeyK'],
  skill2: ['KeyL'],
  skill3: ['Semicolon'],
  useHp: ['Digit1'],
  useMp: ['Digit2'],
  stats: ['KeyC'],
  inventory: ['KeyI'],
  interact: ['KeyE'],
  pause: ['Escape', 'KeyP'],
};

/** Human-friendly key names for the controls menu + HUD hint. */
export function prettyKey(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const names: Record<string, string> = {
    Space: 'SPACE',
    Escape: 'ESC',
    ShiftLeft: 'L-SHIFT',
    ShiftRight: 'R-SHIFT',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
  };
  return names[code] ?? code;
}

export class InputManager {
  private readonly down = new Set<string>();
  private bindings: KeyBindings = structuredClone(DEFAULT_BINDINGS);
  private jumpQueued = false;
  private attackQueued = false;
  private pauseQueued = false;
  /** Edge-triggered presses for any bound action (skills, potions, panels...). */
  private readonly genericQueued = new Set<ActionName>();
  private captureCallback: ((code: string) => void) | null = null;

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    // While capturing a rebind, swallow the key for the menu instead of gameplay.
    if (this.captureCallback) {
      e.preventDefault();
      e.stopPropagation();
      const cb = this.captureCallback;
      this.captureCallback = null;
      cb(e.code);
      return;
    }
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (e.repeat) return;
    this.down.add(e.code);
    if (this.bindings.jump.includes(e.code)) this.jumpQueued = true;
    if (this.bindings.attack.includes(e.code)) this.attackQueued = true;
    if (this.bindings.pause.includes(e.code)) this.pauseQueued = true;
    for (const action of Object.keys(this.bindings) as ActionName[]) {
      if (this.bindings[action].includes(e.code)) this.genericQueued.add(action);
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
  };

  private readonly onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) this.attackQueued = true; // left click always attacks
  };

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousedown', this.onMouseDown);
  }

  // --- Bindings API (used by SaveManager + controls menu) ---

  getBindings(): KeyBindings {
    return structuredClone(this.bindings);
  }

  setBindings(bindings: KeyBindings): void {
    this.bindings = { ...structuredClone(DEFAULT_BINDINGS), ...structuredClone(bindings) };
  }

  resetBindings(): void {
    this.bindings = structuredClone(DEFAULT_BINDINGS);
  }

  /** Assign `code` to a binding slot, removing it from any other action. */
  setBinding(action: ActionName, slot: number, code: string): void {
    for (const other of Object.keys(this.bindings) as ActionName[]) {
      this.bindings[other] = this.bindings[other].filter((c) => c !== code);
    }
    const list = [...this.bindings[action]];
    list[slot] = code;
    this.bindings[action] = list.filter((c) => c !== undefined && c !== '');
  }

  /**
   * Capture the next physical key press (for "press a key..." rebinding).
   * Resolves with the KeyboardEvent.code, or 'Escape' if the user cancels.
   */
  captureNextKey(callback: (code: string) => void): void {
    this.captureCallback = callback;
  }

  cancelCapture(): void {
    this.captureCallback = null;
  }

  get isCapturing(): boolean {
    return this.captureCallback !== null;
  }

  // --- Gameplay polling ---

  /** -1 (left) / 0 / +1 (right) from bound keys. */
  get moveAxis(): number {
    const left = this.bindings.moveLeft.some((c) => this.down.has(c));
    const right = this.bindings.moveRight.some((c) => this.down.has(c));
    return (right ? 1 : 0) - (left ? 1 : 0);
  }

  /** True once per bound jump press. */
  consumeJump(): boolean {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }

  /** True once per bound attack press or left mouse click. */
  consumeAttack(): boolean {
    const queued = this.attackQueued;
    this.attackQueued = false;
    return queued;
  }

  /** True once per bound pause press. */
  consumePause(): boolean {
    const queued = this.pauseQueued;
    this.pauseQueued = false;
    return queued;
  }

  /** True once per press of any bound action (skills, potions, panel toggles). */
  consumeAction(action: ActionName): boolean {
    const queued = this.genericQueued.has(action);
    this.genericQueued.delete(action);
    return queued;
  }

  /** Drop stale queued presses (called when pausing so unpause doesn't attack). */
  clearQueues(): void {
    this.jumpQueued = false;
    this.attackQueued = false;
    this.pauseQueued = false;
    this.genericQueued.clear();
  }

  /** Clear held keys too when a game loses focus. */
  releaseKeys(): void {
    this.down.clear();
    this.clearQueues();
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
