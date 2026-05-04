import type { Step, StepContext } from '../Step';

/**
 * "Time to build defenses — select the Arrow Tower." Highlights hotbar
 * slot 1. Pauses the world while the tooltip is up. Advances to
 * game_place_tower when build-mode flips to 'tower'.
 */
export const gamePress1: Step = {
  name: 'game_press_1',

  enter(ctx: StepContext) {
    ctx.pauseGame();
  },

  render(ctx: StepContext) {
    const { W, H, p } = ctx;
    ctx.showPrompt(
      ctx.isMobile
        ? 'Time to build defenses!\nTap the hotbar to select the Arrow Tower.'
        : 'Time to build defenses!\nPress 1 or click the hotbar to select the Arrow Tower.',
      H - p(140),
    );
    // Highlight hotbar slot 1
    const slotSize = p(48);
    const slotGap = p(10);
    const hotbarY = H - slotSize - p(32);
    const barCenterX = W / 2;
    const slots = 5;
    const slotX = barCenterX - (slots * slotSize + (slots - 1) * slotGap) / 2 + slotSize / 2;
    ctx.drawDimWithRect(slotX - slotSize / 2 - p(4), hotbarY - p(4), slotSize + p(8), slotSize + p(8));
    ctx.drawArrow(slotX, hotbarY - p(12), 'down');
  },

  onBuildMode(ctx: StepContext, _active: boolean, kind: string) {
    if (kind === 'tower') {
      ctx.resumeGame();
      ctx.advanceTo('game_place_tower');
    }
  },
};
