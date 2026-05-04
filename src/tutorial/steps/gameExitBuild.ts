import type { Step, StepContext, TutorialStepName } from '../Step';
import { CFG } from '../../config';

/** Pick the next step depending on whether the player can already afford
 *  the first tower upgrade (so we skip the coin-grind tutorial). */
function nextStepAfterBuild(ctx: StepContext): TutorialStepName {
  const upgradeCost = CFG.tower.kinds.arrow.levels[0].upgradeCost;
  const money = ctx.gameScene?.player?.money ?? 0;
  return money >= upgradeCost ? 'game_click_tower' : 'game_collect_60';
}

/**
 * "Exit build mode." Highlights the wall icon on mobile, just shows a
 * desktop-flavoured prompt otherwise. If the player has already left
 * build mode by the time this step renders (build menu was already
 * closed during the previous step's delay), skip straight to the next
 * step — no point hanging on a tooltip the player can't act on.
 *
 * The pending-step override (player exits build mode during the delay
 * before this step renders) is handled in TutorialScene's dispatcher.
 */
export const gameExitBuild: Step = {
  name: 'game_exit_build',

  render(ctx: StepContext) {
    const { W, H, p } = ctx;
    if (ctx.gameScene?.buildState?.kind === 'none' || !ctx.gameScene?.buildState?.kind) {
      ctx.advanceTo(nextStepAfterBuild(ctx), 1500);
      return;
    }
    if (ctx.isMobile) {
      ctx.showPrompt('Tap the wall icon in the hotbar to leave build menu.', H - p(140));
      // Highlight the wall hotbar slot so the player knows where to tap.
      const slotSize = p(48);
      const slotGap = p(10);
      const hotbarY = H - slotSize - p(32);
      const barCenterX = W / 2;
      const slots = 5;
      const wallSlotX = barCenterX - (slots * slotSize + (slots - 1) * slotGap) / 2 + 3 * (slotSize + slotGap) + slotSize / 2;
      ctx.drawDimWithRect(wallSlotX - slotSize / 2 - p(4), hotbarY - p(4), slotSize + p(8), slotSize + p(8));
      ctx.drawArrow(wallSlotX, hotbarY - p(12), 'down');
    } else {
      ctx.showPrompt('Right-click or press ESC to leave build menu.', p(150));
    }
  },

  onBuildMode(ctx: StepContext, active: boolean) {
    // Fires either while game_exit_build is active OR pending — the
    // dispatcher routes to both. If pending and the player already left
    // build mode, override the pending step so we skip game_exit_build.
    if (active) return;
    if (ctx.step === 'game_exit_build') {
      ctx.advanceTo(nextStepAfterBuild(ctx), 1500);
    } else if (ctx.pendingStep === 'game_exit_build') {
      ctx.setPendingStep(nextStepAfterBuild(ctx));
    }
  },
};
