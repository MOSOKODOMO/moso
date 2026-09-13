/** Translates raw input into player intents. Combat execution lives in Game. */
import type { InputManager } from '../input/InputManager';
import type { Player } from './Player';

export class PlayerController {
  constructor(
    private readonly player: Player,
    private readonly input: InputManager,
  ) {}

  /** Returns true when the player wants to attack this frame. */
  update(): boolean {
    this.player.setMoveAxis(this.input.moveAxis);
    if (this.input.consumeJump()) this.player.tryJump();
    return this.input.consumeAttack();
  }
}
