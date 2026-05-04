import type { Step, StepContext } from '../Step';

/**
 * "Enemies drop coins — collect them." Auto-advances after the field is
 * clear: 1.2s read pause if the player actively grabbed at least one
 * coin, or 3s if no kills had landed yet. Hard 6s fallback so the tip
 * dismisses even when the player ignores everything.
 */
export class GameLootCoinsStep implements Step {
  readonly name = 'game_loot_coins' as const;

  private coinsCollected = 0;
  /** Real-time timestamp at which the step should auto-advance. */
  private advanceAt = 0;

  enter(ctx: StepContext) {
    this.coinsCollected = 0;
    this.advanceAt = ctx.scene.time.now + 6000;
  }

  render(ctx: StepContext) {
    ctx.showPrompt('Enemies drop coins when defeated!\nCollect them by getting close.', ctx.p(150));
  }

  update(ctx: StepContext, time: number) {
    const coinsLeft = ctx.gameScene?.coins?.countActive() ?? 0;
    if (coinsLeft === 0) {
      const tighter = this.coinsCollected >= 1
        ? time + 1200
        : time + 3000;
      if (this.advanceAt > tighter) this.advanceAt = tighter;
    }
    if (this.advanceAt > 0 && time >= this.advanceAt) {
      this.advanceAt = 0;
      ctx.advanceTo('game_press_1', 2000);
    }
  }

  onCoinCollected() {
    this.coinsCollected++;
  }
}
