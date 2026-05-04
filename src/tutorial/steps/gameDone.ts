import type { Step, StepContext } from '../Step';

/** "Great job, Ranger!" — final beat before the tutorial wraps up. */
export const gameDone: Step = {
  name: 'game_done',

  render(ctx: StepContext) {
    ctx.showClickPrompt(
      'Great job, Ranger!\nEnemies will find a path around walls — use them wisely.\nGood luck!',
      ctx.p(150),
      'complete',
    );
  },
};
