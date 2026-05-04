import type { Step, StepContext } from '../Step';

/**
 * Highlights the top HUD bar with HEALTH / WAVE PROGRESS / GOLD callouts
 * and a click-anywhere-to-continue zone. Pauses the world while the
 * tooltip is up.
 */
export const gameHud: Step = {
  name: 'game_hud',

  enter(ctx: StepContext) {
    ctx.pauseGame();
  },

  render(ctx: StepContext) {
    const { W, H, p, fs } = ctx;
    // UIScene layout: circles at y=p(20) r=p(9), wave bar bottom at p(20)+p(52)=p(72)
    const hudTop = p(4);
    const hudBottom = p(80);
    // Dim everything below the HUD
    ctx.overlay.fillStyle(0x000000, 0.55);
    ctx.overlay.fillRect(0, hudBottom + p(6), W, H - hudBottom - p(6));
    // Highlight border around top bar
    ctx.overlay.lineStyle(p(2), 0x4ad96a, 0.8);
    ctx.overlay.strokeRoundedRect(p(4), hudTop, W - p(8), hudBottom - hudTop + p(4), p(6));

    // HP label — arrow pointing up to HP bar (top-left)
    const hpLabelY = hudBottom + p(28);
    const hpCenterX = p(100);
    ctx.drawArrow(hpCenterX, hudBottom + p(10), 'up');
    const hpLabel = ctx.scene.add.text(hpCenterX, hpLabelY, 'HEALTH', {
      fontFamily: 'monospace', fontSize: fs(11), color: '#d94a4a',
      stroke: '#000', strokeThickness: p(2),
    }).setOrigin(0.5).setDepth(102);
    ctx.trackLabel(hpLabel);

    // Wave progress label — arrow pointing up to center progress circles
    const waveCenterX = W / 2;
    ctx.arrowGfx.fillStyle(0x4ad96a, 0.9);
    const asz = p(10);
    const ay = hudBottom + p(10);
    ctx.arrowGfx.fillTriangle(waveCenterX - asz, ay, waveCenterX + asz, ay, waveCenterX, ay - asz * 1.5);
    const waveLabel = ctx.scene.add.text(waveCenterX, hpLabelY, 'WAVE PROGRESS', {
      fontFamily: 'monospace', fontSize: fs(11), color: '#7cc4ff',
      stroke: '#000', strokeThickness: p(2),
    }).setOrigin(0.5).setDepth(102);
    ctx.trackLabel(waveLabel);

    // Gold label — arrow pointing up to gold badge (top-right)
    const goldCenterX = W - p(80);
    ctx.arrowGfx.fillTriangle(goldCenterX - asz, ay, goldCenterX + asz, ay, goldCenterX, ay - asz * 1.5);
    const goldLabel = ctx.scene.add.text(goldCenterX, hpLabelY, 'GOLD', {
      fontFamily: 'monospace', fontSize: fs(11), color: '#ffd84a',
      stroke: '#000', strokeThickness: p(2),
    }).setOrigin(0.5).setDepth(102);
    ctx.trackLabel(goldLabel);

    // Main prompt below labels
    ctx.showPrompt(
      ctx.isMobile
        ? 'Keep an eye on your HUD!\nIt shows your health, wave progress, and gold reserves.\n\nTAP anywhere to continue.'
        : 'Keep an eye on your HUD!\nIt shows your health, wave progress, and gold reserves.\n\nClick anywhere to continue.',
      p(180),
    );

    // Click-anywhere-to-advance zone
    const zone = ctx.scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(100);
    zone.on('pointerdown', () => {
      ctx.resumeGame();
      ctx.advanceTo('game_stand_still', 2000);
    });
    ctx.setHudClickZone(zone);
  },
};
