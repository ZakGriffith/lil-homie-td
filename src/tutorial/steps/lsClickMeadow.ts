import type { Step, StepContext } from '../Step';

/**
 * Level-select welcome — point at the Meadow node. Coords are computed in
 * LevelSelectScene's coord system (sf = nativeW/960), not the tutorial's
 * uiScale-based one.
 */
export const lsClickMeadow: Step = {
  name: 'ls_click_meadow',

  render(ctx: StepContext) {
    const verb = ctx.isMobile ? 'Tap' : 'Click';
    ctx.showPrompt(`Welcome, Ranger!\n${verb} on the Meadow to begin your training.`, ctx.p(80));
    ctx.drawDimWithHole(ctx.lsP(150), ctx.lsP(345), ctx.lsP(40));
    ctx.drawArrow(ctx.lsP(150), ctx.lsP(295), 'down');
  },

  onLevelClicked(ctx: StepContext) {
    ctx.advanceTo('ls_click_easy');
  },
};
