import Phaser from 'phaser';
import type { LevelSelectScene } from '../scenes/LevelSelectScene';
import { getRegistry } from '../core/registry';
import { UNLOCKS, type UnlockDef } from '../state/unlocks';
import { SOFT_CAP_LEVEL } from '../state/PlayerProgressState';

/**
 * Modal overlay opened by tapping the LV pill on LevelSelect. Shows
 * the player's current level + a prominent XP bar, what they've
 * unlocked so far, and what's coming on the next levels. Mirrors the
 * UpgradePanel pattern: backdrop click or × to close.
 */
export class PlayerProfilePanel {
  private root: Phaser.GameObjects.Container;
  private destroyed = false;
  private scene: LevelSelectScene;
  private onClose: () => void;

  constructor(scene: LevelSelectScene, onClose: () => void) {
    this.scene = scene;
    this.onClose = onClose;

    const p = (v: number) => scene.p(v);
    const fs = (v: number) => scene.fs(v);
    const W = scene.scale.width;
    const H = scene.scale.height;

    const progress = getRegistry(scene.game).get('playerProgress');
    const lvl = progress.level;
    const inLvl = progress.xpInCurrentLevel;
    const need = progress.xpToNextLevel;
    const total = progress.totalXp;

    // Split unlocks into already-earned vs upcoming. Upcoming is sorted
    // by requiredLevel so the next unlock is at the top of the list.
    const earned: UnlockDef[] = UNLOCKS.filter((u) => u.requiredLevel <= lvl);
    const upcoming: UnlockDef[] = UNLOCKS
      .filter((u) => u.requiredLevel > lvl)
      .slice()
      .sort((a, b) => a.requiredLevel - b.requiredLevel);

    // Panel sized to comfortably fit a big XP bar + two unlock columns.
    const panelW = p(420);
    const baseH = p(360);
    const listRowH = p(34);
    const listHeaderH = p(28);
    const listsH =
      (earned.length > 0 ? listHeaderH + earned.length * listRowH : listHeaderH + listRowH) +
      (upcoming.length > 0 ? listHeaderH + upcoming.length * listRowH : listHeaderH + listRowH);
    const panelH = baseH + listsH;
    const panelX = W / 2 - panelW / 2;
    const panelY = Math.max(p(20), H / 2 - panelH / 2);
    const r = p(12);

    const backdrop = scene.add.rectangle(0, 0, W, H, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    backdrop.on('pointerdown', () => this.close());

    const panelBg = scene.add.graphics();
    panelBg.fillStyle(0x0b0f1a, 0.97);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, r);
    panelBg.lineStyle(p(1), 0x2a3760, 0.7);
    panelBg.strokeRoundedRect(panelX + p(3), panelY + p(3), panelW - p(6), panelH - p(6), r - p(2));
    panelBg.lineStyle(p(2), 0x8a78ff, 0.9);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, r);

    // Eat clicks inside the panel so empty space doesn't close it.
    const panelHit = scene.add.rectangle(panelX, panelY, panelW, panelH, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive();

    // Title
    const title = scene.add.text(panelX + panelW / 2, panelY + p(28), 'PLAYER PROFILE', {
      fontFamily: 'monospace', fontSize: fs(16), fontStyle: 'bold', color: '#b4a8ff',
      stroke: '#0b0f1a', strokeThickness: p(2),
    }).setOrigin(0.5);

    // Close ×
    const closeCx = panelX + panelW - p(20);
    const closeCy = panelY + p(20);
    const closeText = scene.add.text(closeCx, closeCy, '×', {
      fontFamily: 'monospace', fontSize: fs(22), fontStyle: 'bold', color: '#ff8a8a',
    }).setOrigin(0.5);
    const closeHit = scene.add.rectangle(closeCx, closeCy, p(36), p(28), 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    closeHit.on('pointerdown', () => this.close());

    // Big LEVEL number
    const levelY = panelY + p(72);
    const lvlText = scene.add.text(panelX + panelW / 2, levelY, `LVL ${lvl}`, {
      fontFamily: 'monospace', fontSize: fs(46), fontStyle: 'bold', color: '#dfe8ff',
      stroke: '#0b0f1a', strokeThickness: p(4),
    }).setOrigin(0.5);

    // Soft-cap hint when the player is past the unlock cap
    let capHint: Phaser.GameObjects.Text | undefined;
    if (lvl >= SOFT_CAP_LEVEL) {
      capHint = scene.add.text(panelX + panelW / 2, levelY + p(28),
        'Soft cap reached — every level beyond is bragging rights.', {
          fontFamily: 'monospace', fontSize: fs(10), color: '#9ab0d0',
        }).setOrigin(0.5);
    }

    // Big XP bar
    const barW = panelW - p(60);
    const barH = p(28);
    const barX = panelX + p(30);
    const barY = levelY + p(58);
    const pct = Math.max(0, Math.min(1, inLvl / need));
    const barG = scene.add.graphics();
    barG.fillStyle(0x0b0f1a, 0.95);
    barG.fillRoundedRect(barX, barY, barW, barH, p(6));
    barG.lineStyle(p(1), 0x2a3760, 0.7);
    barG.strokeRoundedRect(barX, barY, barW, barH, p(6));
    barG.fillStyle(0x8a78ff, 0.95);
    barG.fillRoundedRect(barX + p(2), barY + p(2), Math.max(0, (barW - p(4)) * pct), barH - p(4), p(5));

    const barLabel = scene.add.text(panelX + panelW / 2, barY + barH / 2, `${inLvl} / ${need} XP`, {
      fontFamily: 'monospace', fontSize: fs(13), fontStyle: 'bold', color: '#ffffff',
      stroke: '#0b0f1a', strokeThickness: p(3),
    }).setOrigin(0.5);

    const xpTotal = scene.add.text(panelX + panelW / 2, barY + barH + p(14),
      `${total.toLocaleString()} XP total`, {
        fontFamily: 'monospace', fontSize: fs(11), color: '#9ab0d0',
      }).setOrigin(0.5);

    // ---- Lists ----
    let cursorY = barY + barH + p(40);

    const children: Phaser.GameObjects.GameObject[] = [
      backdrop, panelBg, panelHit, title, closeText, closeHit,
      lvlText, barG, barLabel, xpTotal,
    ];
    if (capHint) children.push(capHint);

    const drawListHeader = (label: string, accentHex: string) => {
      const t = scene.add.text(panelX + p(28), cursorY, label, {
        fontFamily: 'monospace', fontSize: fs(12), fontStyle: 'bold', color: accentHex,
        stroke: '#0b0f1a', strokeThickness: p(2),
      }).setOrigin(0, 0.5);
      // Divider line to the right of the header
      const lineG = scene.add.graphics();
      const labelW = t.width;
      const lineStartX = panelX + p(28) + labelW + p(10);
      const lineEndX = panelX + panelW - p(28);
      lineG.lineStyle(p(1), 0x2a3760, 0.7);
      lineG.lineBetween(lineStartX, cursorY, lineEndX, cursorY);
      children.push(t, lineG);
      cursorY += p(22);
    };

    const drawUnlockRow = (def: UnlockDef, isEarned: boolean) => {
      const rowX = panelX + p(28);
      const rowW = panelW - p(56);
      const rowH = p(28);
      const rowG = scene.add.graphics();
      rowG.fillStyle(isEarned ? 0x1a2a1a : 0x141a28, 0.85);
      rowG.fillRoundedRect(rowX, cursorY, rowW, rowH, p(5));
      rowG.lineStyle(p(1), isEarned ? 0x4ad96a : 0x2a3760, 0.6);
      rowG.strokeRoundedRect(rowX, cursorY, rowW, rowH, p(5));

      const icon = scene.add.text(rowX + p(10), cursorY + rowH / 2, isEarned ? '✓' : '🔒', {
        fontFamily: 'monospace', fontSize: fs(13), fontStyle: 'bold',
        color: isEarned ? '#7cf29a' : '#b4a8ff',
      }).setOrigin(0, 0.5);

      const label = scene.add.text(rowX + p(34), cursorY + rowH / 2, def.label, {
        fontFamily: 'monospace', fontSize: fs(12), color: isEarned ? '#dfffe8' : '#dfe8ff',
      }).setOrigin(0, 0.5);

      const right = scene.add.text(rowX + rowW - p(10), cursorY + rowH / 2,
        isEarned ? 'UNLOCKED' : `LVL ${def.requiredLevel}`, {
          fontFamily: 'monospace', fontSize: fs(11), fontStyle: 'bold',
          color: isEarned ? '#7cf29a' : '#b4a8ff',
        }).setOrigin(1, 0.5);

      children.push(rowG, icon, label, right);
      cursorY += p(34);
    };

    const drawEmptyNote = (note: string) => {
      const t = scene.add.text(panelX + panelW / 2, cursorY + p(8), note, {
        fontFamily: 'monospace', fontSize: fs(10), color: '#6e7a98', fontStyle: 'italic',
      }).setOrigin(0.5, 0);
      children.push(t);
      cursorY += p(34);
    };

    drawListHeader('UNLOCKED', '#7cf29a');
    if (earned.length === 0) drawEmptyNote('Nothing unlocked yet — level up to start collecting rewards.');
    else earned.forEach((d) => drawUnlockRow(d, true));

    cursorY += p(6);

    drawListHeader('UPCOMING', '#b4a8ff');
    if (upcoming.length === 0) drawEmptyNote('All current rewards collected. More coming in future updates.');
    else upcoming.forEach((d) => drawUnlockRow(d, false));

    this.root = scene.add.container(0, 0, children).setDepth(3000);
  }

  close() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.root.destroy();
    this.onClose();
  }
}
