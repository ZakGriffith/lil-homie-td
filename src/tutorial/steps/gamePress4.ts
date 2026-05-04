import type { Step, StepContext } from '../Step';

/**
 * "Walls block enemy paths — select Wall." Highlights hotbar slot 4.
 * Pauses the world. Advances to game_place_walls when build-mode flips
 * to 'wall'.
 */
export const gamePress4: Step = {
  name: 'game_press_4',

  enter(ctx: StepContext) {
    ctx.pauseGame();
  },

  render(ctx: StepContext) {
    const { W, H, p } = ctx;
    ctx.showPrompt(
      ctx.isMobile
        ? 'Walls block enemy paths!\nTap the hotbar to select Wall.'
        : 'Walls block enemy paths!\nPress 4 or click the hotbar to select Wall.',
      H - p(140),
    );
    const slotSize = p(48);
    const slotGap = p(10);
    const hotbarY = H - slotSize - p(32);
    const barCenterX = W / 2;
    const slots = 5;
    const wallSlotX = barCenterX - (slots * slotSize + (slots - 1) * slotGap) / 2 + 3 * (slotSize + slotGap) + slotSize / 2;
    ctx.drawDimWithRect(wallSlotX - slotSize / 2 - p(4), hotbarY - p(4), slotSize + p(8), slotSize + p(8));
    ctx.drawArrow(wallSlotX, hotbarY - p(12), 'down');
  },

  onBuildMode(ctx: StepContext, _active: boolean, kind: string) {
    if (kind === 'wall') {
      ctx.resumeGame();
      ctx.advanceTo('game_place_walls');
    }
  },
};
