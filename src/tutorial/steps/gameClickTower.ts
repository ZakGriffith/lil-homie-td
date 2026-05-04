import type { Step, StepContext } from '../Step';

/** "Click/Tap your Arrow Tower." Advances to game_upgrade_tower on selection. */
export const gameClickTower: Step = {
  name: 'game_click_tower',

  render(ctx: StepContext) {
    ctx.showPrompt(
      ctx.isMobile
        ? 'Tap on your Arrow Tower to select it.'
        : 'Click on your Arrow Tower to select it.',
      ctx.p(150),
    );
  },

  onTowerSelected(ctx: StepContext) {
    ctx.resumeGame();
    ctx.advanceTo('game_upgrade_tower');
  },
};
