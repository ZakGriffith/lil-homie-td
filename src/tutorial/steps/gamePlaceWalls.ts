import type { Step, StepContext } from '../Step';

/**
 * "Place 3 walls to funnel enemies." Prompt updates with wall-placed
 * count; advances to game_exit_build at 3.
 */
export class GamePlaceWallsStep implements Step {
  readonly name = 'game_place_walls' as const;

  private wallsPlaced = 0;

  enter() {
    this.wallsPlaced = 0;
  }

  render(ctx: StepContext) {
    const { W, H, p } = ctx;
    ctx.showPrompt(
      `Place walls to funnel enemies past your tower! (${this.wallsPlaced}/3)\nEnemies will pathfind around walls.`,
      p(150),
    );
    ctx.overlay.fillStyle(0x000000, 0.15);
    ctx.overlay.fillRect(0, 0, W, H);
  }

  onWallPlaced(ctx: StepContext) {
    this.wallsPlaced++;
    if (this.wallsPlaced >= 3) {
      ctx.advanceTo('game_exit_build');
    } else {
      ctx.showStep();
    }
  }
}
