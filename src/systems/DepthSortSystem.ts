import { Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import type { GameScene } from '../scenes/GameScene';

/**
 * Per-frame depth sorting for the player, enemies, and arrow projectiles, plus
 * the one-shot tower depth applied at placement. Towers + coins are sorted
 * once at spawn (see applyTowerDepth + Coin constructor's hardcoded formula)
 * and skipped each frame.
 */
export class DepthSortSystem {
  /**
   * y-based depth formula. Coin.ts has its own hardcoded copy of this — if
   * the formula ever changes, update it there too.
   */
  private static yDepth(y: number) { return 100 + y * 0.1; }

  constructor(private scene: GameScene) {}

  applyTowerDepth(t: Tower) {
    const d = DepthSortSystem.yDepth(t.y);
    t.setDepth(d);
    if (t.stand) t.stand.setDepth(d + 0.1);
    t.top.setDepth(d + 0.2);
    if (t.nockedArrow) t.nockedArrow.setDepth(d + 5);
  }

  update() {
    const scene = this.scene;
    const yD = DepthSortSystem.yDepth;

    // Player (and bow/nocked arrow ride with it)
    const py = scene.player.y;
    const pd = yD(py);
    scene.player.setDepth(pd);
    scene.player.bow.setDepth(pd + 0.5);
    scene.player.nockedArrow.setDepth(pd + 1);

    // Enemies move every frame — keep sorting them.
    const enemies = scene.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[];
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.active) e.setDepth(yD(e.y));
    }

    // Arrow projectiles fly across the map, so depth needs to track y.
    // Cannonballs keep their fixed (high) depth because they arc above
    // terrain visually.
    const projs = scene.projectiles.getChildren() as Projectile[];
    for (let i = 0; i < projs.length; i++) {
      const p = projs[i];
      if (!p.active || p.groundTarget) continue;
      p.setDepth(yD(p.y) + 5);
    }

    // Towers + coins are static — depth is set once at spawn (see
    // applyTowerDepth + Coin constructor) and skipped here every frame.
  }
}
