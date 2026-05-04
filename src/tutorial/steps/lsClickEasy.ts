import type { Step, StepContext } from '../Step';

/**
 * Difficulty-panel step — highlight the Easy button. The panel rebuilds
 * with mobile-specific button geometry (see LevelSelectScene
 * .openDifficultyPanel), so the cutout is derived from the same numbers
 * rather than desktop-only literals.
 */
export const lsClickEasy: Step = {
  name: 'ls_click_easy',

  render(ctx: StepContext) {
    const { W, H, p, lsP } = ctx;
    if (ctx.isMobile) {
      const btnH = lsP(60);
      const btnGap = lsP(12);
      const btnBlockH = 4 * btnH + 3 * btnGap;
      const easyCenterY = H / 2 - btnBlockH / 2 + btnH / 2;
      const ph = H * 0.92;
      const pw = Math.min(lsP(560), W * 0.92);
      const btnW = Math.min(lsP(460), pw - lsP(40));
      ctx.drawDimWithCutout(W / 2 - btnW / 2, easyCenterY - btnH / 2, btnW, btnH);
      ctx.drawArrow(W / 2 - btnW / 2 - lsP(20), easyCenterY, 'right');
      // Prompt text moves to the bottom of the viewport.
      ctx.showPrompt('Tap Easy difficulty to start.', H - p(20), 1);
    } else {
      ctx.showPrompt('Select Easy difficulty to start.', p(80));
      ctx.drawDimWithCutout(W / 2 - p(115), H / 2 - p(60), p(230), p(38));
      ctx.drawArrow(W / 2 - p(130), H / 2 - p(41), 'right');
    }
  },

  onDiffClicked(ctx: StepContext, diff: string) {
    if (diff === 'easy') ctx.advanceTo('ls_click_start');
  },
};
