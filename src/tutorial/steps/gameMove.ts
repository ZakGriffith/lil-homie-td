import type { Step, StepContext } from '../Step';

/**
 * "Use WASD/joystick to move." Tracks how far the player has moved and
 * advances once they've covered enough ground.
 */
export class GameMoveStep implements Step {
  readonly name = 'game_move' as const;

  private moveDist = 0;
  private lastPx = 0;
  private lastPy = 0;

  enter() {
    this.moveDist = 0;
    this.lastPx = 0;
    this.lastPy = 0;
  }

  render(ctx: StepContext) {
    ctx.showPrompt(
      ctx.isMobile ? 'Use the joystick to move.' : 'Use WASD or Arrow Keys to move.',
      ctx.p(150),
    );
  }

  update(ctx: StepContext, _time: number, _delta: number) {
    const player = ctx.gameScene?.player;
    if (!player) return;
    const px = player.x;
    const py = player.y;
    if (this.lastPx !== 0 || this.lastPy !== 0) {
      this.moveDist += Math.hypot(px - this.lastPx, py - this.lastPy);
    }
    this.lastPx = px;
    this.lastPy = py;
    if (this.moveDist > 150) {
      ctx.advanceTo('game_hud', 2000);
    }
  }
}
