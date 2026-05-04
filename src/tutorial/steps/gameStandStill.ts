import type { Step, StepContext } from '../Step';

/**
 * "Stand still and the ranger fires faster." After a 7s read window we
 * spawn 6 enemies and queue game_kill with a 2s lead-in.
 */
export class GameStandStillStep implements Step {
  readonly name = 'game_stand_still' as const;

  /** vTime when the read window ends (0 = not started). */
  private dismissAt = 0;

  enter() {
    this.dismissAt = 0;
  }

  render(ctx: StepContext) {
    ctx.showPrompt(
      'Your ranger fires automatically!\nStanding still shoots faster than while moving.',
      ctx.p(150),
    );
  }

  update(ctx: StepContext, time: number) {
    if (this.dismissAt === 0) {
      this.dismissAt = time + 7000;
      return;
    }
    if (time > this.dismissAt) {
      this.dismissAt = 0;
      ctx.spawnTutorialEnemies(6);
      ctx.advanceTo('game_kill', 2000);
    }
  }
}
