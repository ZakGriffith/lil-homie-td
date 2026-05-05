import type { Step, StepContext } from '../Step';
import type { LevelSelectScene } from '../../scenes/LevelSelectScene';

/**
 * Difficulty-panel step — highlight the Easy button. Reads the live
 * panel geometry off LevelSelectScene so this step automatically tracks
 * any future layout change (e.g. another difficulty being added).
 */
export const lsClickEasy: Step = {
  name: 'ls_click_easy',

  render(ctx: StepContext) {
    const { W, H, p, lsP } = ctx;
    if (ctx.isMobile) {
      ctx.showPrompt('Tap Easy difficulty to start.', H - p(20), 1);
    } else {
      ctx.showPrompt('Select Easy difficulty to start.', p(80));
    }
    const ls = ctx.scene.scene.get('LevelSelect') as LevelSelectScene | null;
    const easyBtn = ls?.diffButtons.find(b => b.diff === 'easy');
    if (!ls || !easyBtn || ls.diffBtnW <= 0 || ls.diffBtnH <= 0) return;
    // diffButtons items live inside the panel container at (W/2, H/2);
    // text.y is the panel-relative center y of the Easy row.
    const cx = W / 2;
    const cy = H / 2 + easyBtn.text.y;
    const btnW = ls.diffBtnW;
    const btnH = ls.diffBtnH;
    ctx.drawDimWithCutout(cx - btnW / 2, cy - btnH / 2, btnW, btnH);
    ctx.drawArrow(cx - btnW / 2 - lsP(20), cy, 'right');
  },

  onDiffClicked(ctx: StepContext, diff: string) {
    if (diff === 'easy') ctx.advanceTo('ls_click_start');
  },
};
