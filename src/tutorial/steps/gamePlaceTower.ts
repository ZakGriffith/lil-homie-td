import type { Step, StepContext } from '../Step';

/** "Click/Tap near your ranger to place the Arrow Tower." */
export const gamePlaceTower: Step = {
  name: 'game_place_tower',

  render(ctx: StepContext) {
    const { W, H, p } = ctx;
    ctx.showPrompt(
      ctx.isMobile
        ? 'Tap near your ranger to place the Arrow Tower.'
        : 'Click near your ranger to place the Arrow Tower.\nThe green ghost shows where it will go.',
      p(150),
    );
    // Light dim, no specific hole — player needs to see the grid
    ctx.overlay.fillStyle(0x000000, 0.2);
    ctx.overlay.fillRect(0, 0, W, H);
  },

  onTowerPlaced(ctx: StepContext) {
    ctx.advanceTo('game_watch_tower', 2000);
  },
};
