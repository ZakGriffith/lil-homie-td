import type { Step, StepContext } from '../Step';

/**
 * "Click/Tap UPGRADE." Prompt sits at the bottom of the canvas so it
 * doesn't overlap the tower-select panel that pops up above the tower.
 */
export const gameUpgradeTower: Step = {
  name: 'game_upgrade_tower',

  render(ctx: StepContext) {
    ctx.showPrompt(
      ctx.isMobile
        ? 'Tap the Upgrade button to make your tower stronger!'
        : 'Click the Upgrade button to make your tower stronger!',
      ctx.H - ctx.p(120),
    );
  },

  onTowerUpgraded(ctx: StepContext) {
    ctx.advanceTo('game_deselect_tower', 1500);
  },
};
