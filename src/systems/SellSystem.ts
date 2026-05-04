import Phaser from 'phaser';
import { getRegistry } from '../core/registry';
import { CFG } from '../config';
import { Tower } from '../entities/Tower';
import { Wall } from '../entities/Wall';
import { SFX } from '../audio/sfx';
import { gridSet } from './Pathfinding';
import type { GameScene } from '../scenes/GameScene';

/**
 * Sell-timer / structure-destruction lifecycle. Walls and towers can be
 * marked for sell (red-pie countdown) or destroyed outright by bosses.
 * Owns the wall-neighbor recalc that keeps wall sprites stitched together.
 */
export class SellSystem {
  constructor(private scene: GameScene) {}

  sellAt(tx: number, ty: number) {
    const scene = this.scene;
    if (getRegistry(scene.game).get('tutorialActive')) return;
    // tower: click anywhere inside the footprint
    const ti = scene.towers.findIndex(t =>
      tx >= t.tileX && tx < t.tileX + t.size &&
      ty >= t.tileY && ty < t.tileY + t.size);
    if (ti >= 0) {
      this.startSellTimer(scene.towers[ti]);
      return;
    }
    const wi = scene.walls.findIndex(w => w.tileX === tx && w.tileY === ty);
    if (wi >= 0) {
      this.startSellTimer(scene.walls[wi]);
    }
  }

  startSellTimer(target: Tower | Wall) {
    const scene = this.scene;
    // If already pending, cancel instead (click again to cancel)
    if (scene.sellTimers.has(target)) {
      this.cancelSellTimer(target);
      return;
    }
    SFX.play('click');
    const gfx = scene.add.graphics().setDepth(200);
    scene.sellTimers.set(target, { startTime: scene.vTime, duration: 3000, gfx });
    // Paint at 100% remaining immediately so the marker is visible even
    // when the click happens during a paused build menu — updateSellTimers
    // doesn't run while paused, so without this initial draw the pie
    // stays invisible until the player exits build mode.
    this.drawSellTimerGfx(target, gfx, 1);
  }

  private drawSellTimerGfx(target: Tower | Wall, gfx: Phaser.GameObjects.Graphics, remaining: number) {
    const cx = target.x, cy = target.y;
    const radius = target instanceof Tower ? CFG.tile * 0.9 : CFG.tile * 0.45;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + remaining * Math.PI * 2;
    gfx.clear();
    // Red pie countdown
    gfx.fillStyle(0xff2222, 0.3);
    gfx.beginPath();
    gfx.moveTo(cx, cy);
    gfx.arc(cx, cy, radius, startAngle, endAngle, false);
    gfx.closePath();
    gfx.fillPath();
    gfx.lineStyle(2, 0xff4444, 0.6);
    gfx.beginPath();
    gfx.arc(cx, cy, radius, startAngle, endAngle, false);
    gfx.strokePath();
    // Persistent dark-red X — keeps the "marked for destruction" read
    // even when the pie shrinks down toward the wedge.
    const xr = radius * 0.5;
    gfx.lineStyle(3, 0x8a0000, 0.95);
    gfx.lineBetween(cx - xr, cy - xr, cx + xr, cy + xr);
    gfx.lineBetween(cx - xr, cy + xr, cx + xr, cy - xr);
  }

  cancelSellTimer(target: Tower | Wall) {
    const timer = this.scene.sellTimers.get(target);
    if (timer) {
      timer.gfx.destroy();
      this.scene.sellTimers.delete(target);
    }
  }

  updateSellTimers() {
    const scene = this.scene;
    for (const [target, timer] of scene.sellTimers) {
      const elapsed = scene.vTime - timer.startTime;
      const progress = Math.min(elapsed / timer.duration, 1);

      if (progress >= 1) {
        // Timer complete — execute sell
        timer.gfx.destroy();
        scene.sellTimers.delete(target);
        this.executeSell(target);
        continue;
      }

      this.drawSellTimerGfx(target, timer.gfx, 1 - progress);
    }
  }

  executeSell(target: Tower | Wall) {
    const scene = this.scene;
    SFX.play('structDestroy');
    if (target instanceof Tower) {
      const t = target;
      if (scene.selectedTower === t) scene.towerSelect.deselectTower();
      scene.player.money += Math.floor(t.totalSpent * 0.5);
      for (let j = 0; j < t.size; j++)
        for (let i = 0; i < t.size; i++)
          gridSet(scene.grid, t.tileX + i, t.tileY + j, 0);
      const idx = scene.towers.indexOf(t);
      if (idx >= 0) scene.towers.splice(idx, 1);
      t.destroyTower();
    } else {
      const w = target;
      // Walls refund $2 (cost is $3) — slight loss to discourage churn but
      // not so harsh that re-routing your defenses feels punishing.
      scene.player.money += 2;
      const idx = scene.walls.indexOf(w);
      if (idx >= 0) scene.walls.splice(idx, 1);
      gridSet(scene.grid, w.tileX, w.tileY, 0);
      scene.pathing.syncWallTile(w.tileX, w.tileY, false);
      this.updateWallNeighbors(w.tileX, w.tileY);
      w.destroy();
    }
    scene.gridVersion++; scene._wallCheckCache.clear(); scene.pathing.rebuildGapBlockers();
    scene.hud.pushHud();
  }

  destroyTower(t: Tower) {
    const scene = this.scene;
    this.cancelSellTimer(t);
    if (scene.selectedTower === t) scene.towerSelect.deselectTower();
    // Off-screen indicator cleanup happens in UIScene.updateIndicators()
    // (it owns those sprites now).
    const idx = scene.towers.indexOf(t);
    if (idx >= 0) scene.towers.splice(idx, 1);
    for (let j = 0; j < t.size; j++)
      for (let i = 0; i < t.size; i++)
        gridSet(scene.grid, t.tileX + i, t.tileY + j, 0);
    scene.gridVersion++; scene._wallCheckCache.clear(); scene.pathing.rebuildGapBlockers();
    const burst = scene.add.sprite(t.x, t.y, 'fx_death_0').setDepth(15).setScale(0.5);
    burst.play('fx-death');
    burst.once('animationcomplete', () => burst.destroy());
    SFX.play('structDestroy');
    t.destroyTower();
  }

  destroyWall(w: Wall) {
    const scene = this.scene;
    this.cancelSellTimer(w);
    const idx = scene.walls.indexOf(w);
    if (idx >= 0) scene.walls.splice(idx, 1);
    scene.runStats.wallsDestroyed++;
    const tx = w.tileX, ty = w.tileY;
    gridSet(scene.grid, tx, ty, 0);
    scene.pathing.syncWallTile(tx, ty, false);
    scene.gridVersion++; scene._wallCheckCache.clear(); scene.pathing.rebuildGapBlockers();
    SFX.play('structDestroy');
    w.destroy();
    this.updateWallNeighbors(tx, ty);
  }

  /** Recalculate neighbor masks for wall at (tx,ty) and its 4 cardinal neighbors */
  updateWallNeighbors(tx: number, ty: number) {
    const scene = this.scene;
    const dirs: [number, number, number][] = [
      [0, -1, 1],  // N
      [1, 0, 2],   // E
      [0, 1, 4],   // S
      [-1, 0, 8],  // W
    ];
    // Update the wall at (tx,ty) and each neighbor
    for (const [dx, dy] of [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const wx = tx + dx, wy = ty + dy;
      const wall = scene.walls.find(w => w.tileX === wx && w.tileY === wy);
      if (!wall) continue;
      let mask = 0;
      for (const [ndx, ndy, bit] of dirs) {
        if (scene.walls.some(w => w.tileX === wx + ndx && w.tileY === wy + ndy)) {
          mask |= bit;
        }
      }
      wall.neighborMask = mask;
      wall.updateTexture();
    }
  }
}
