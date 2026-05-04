import type { Step, StepContext } from '../Step';

/**
 * "Kill the spawned enemies." Counts kills toward 6, then advances to
 * game_loot_coins.
 *
 * onKill also fires while this step is *pending* (during the 2s
 * post-stand_still lead-in) — at high game speeds the player can shred
 * the spawned enemies before the step transitions, and without counting
 * those kills the tutorial gets stuck. The TutorialScene dispatcher
 * routes onKill to the pending step's handler when one is set.
 */
export class GameKillStep implements Step {
  readonly name = 'game_kill' as const;

  private kills = 0;

  enter() {
    this.kills = 0;
  }

  render(ctx: StepContext) {
    ctx.showPrompt(`Enemies incoming! Shoot them down!\nKills: ${this.kills}/6`, ctx.p(150));
  }

  onKill(ctx: StepContext) {
    this.kills++;
    if (this.kills >= 6) {
      // If we're still pending (the 2s lead-in hasn't finished), skip the
      // game_kill render entirely — the player already cleared the spawn.
      if (ctx.pendingStep === 'game_kill') {
        ctx.setPendingStep('game_loot_coins');
      } else {
        ctx.advanceTo('game_loot_coins', 1500);
      }
    } else if (ctx.step === 'game_kill') {
      // Re-render to update the counter in the prompt.
      ctx.showStep();
    }
  }
}
