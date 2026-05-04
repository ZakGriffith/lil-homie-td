import type { Step, StepContext } from '../Step';
import { CFG } from '../../config';

/**
 * "Gather enough gold to upgrade the tower." Drip-feeds enemies so coin
 * drops keep coming while the player grinds toward the upgrade cost.
 */
export const gameCollect60: Step = {
  name: 'game_collect_60',

  render(ctx: StepContext) {
    ctx.showPrompt('Gather 60 coins to upgrade your tower!', ctx.p(150));
  },

  update(ctx: StepContext) {
    const enemies = ctx.gameScene?.enemies;
    if (enemies?.countActive() < 2) {
      ctx.spawnTutorialEnemies(2);
    }
    const upgradeCost = CFG.tower.kinds.arrow.levels[0].upgradeCost;
    if ((ctx.gameScene?.player?.money ?? 0) >= upgradeCost) {
      ctx.advanceTo('game_click_tower', 1500);
    }
  },
};
