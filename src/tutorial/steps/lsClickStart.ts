import type { Step, StepContext } from '../Step';
import type { LevelSelectScene } from '../../scenes/LevelSelectScene';

/** Highlight the START button on the difficulty panel. */
export const lsClickStart: Step = {
  name: 'ls_click_start',

  render(ctx: StepContext) {
    const { W, H, p } = ctx;
    const verb = ctx.isMobile ? 'Tap' : 'Click';
    ctx.showPrompt(`${verb} START to begin!`, p(80));
    // Read the live position from LevelSelectScene so the highlight
    // tracks any layout change (e.g. adding a difficulty) without us
    // having to mirror the math here.
    const ls = ctx.scene.scene.get('LevelSelect') as LevelSelectScene | null;
    if (ls && ls.startBtnG && ls.startBtnW > 0 && ls.startBtnH > 0) {
      // startBtnY is panel-relative; the panel sits at canvas center.
      const absStartTop = H / 2 + ls.startBtnY;
      ctx.drawDimWithCutout(W / 2 - ls.startBtnW / 2, absStartTop, ls.startBtnW, ls.startBtnH);
      ctx.drawArrow(W / 2, absStartTop - p(8), 'down');
    }
  },

  onGameReady(ctx: StepContext) {
    // Game loaded — suppress normal spawning, advance to game_move.
    const gameScene = ctx.gameScene;
    if (gameScene?.waveState) {
      gameScene.waveState.suspendInitialBuildPhase();
    }
    ctx.advanceTo('game_move');
  },
};
