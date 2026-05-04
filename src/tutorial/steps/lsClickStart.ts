import type { Step, StepContext } from '../Step';

/** Highlight the START button on the difficulty panel. */
export const lsClickStart: Step = {
  name: 'ls_click_start',

  render(ctx: StepContext) {
    const { W, H, p, lsP } = ctx;
    const verb = ctx.isMobile ? 'Tap' : 'Click';
    ctx.showPrompt(`${verb} START to begin!`, p(80));
    if (ctx.isMobile) {
      // Mobile panel: ph = H*0.92, START button at (panel center) + (ph/2 - p(80)).
      // Absolute top of START = H/2 + ph/2 - p_ls(80).
      const ph = H * 0.92;
      const startBtnH = lsP(56);
      const startBtnW = lsP(220);
      const startTop = H / 2 + ph / 2 - startBtnH - lsP(24);
      ctx.drawDimWithCutout(W / 2 - startBtnW / 2, startTop, startBtnW, startBtnH);
      // Arrow moved up 1 button height so it sits above the START button.
      ctx.drawArrow(W / 2, startTop - lsP(8), 'down');
    } else {
      ctx.drawDimWithCutout(W / 2 - p(60), H / 2 + p(128), p(120), p(36));
      ctx.drawArrow(W / 2, H / 2 + p(120), 'down');
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
