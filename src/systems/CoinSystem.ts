import Phaser from 'phaser';
import { CFG } from '../config';
import { SFX } from '../audio/sfx';
import { Coin } from '../entities/Coin';
import type { GameScene } from '../scenes/GameScene';

/**
 * Owns coin magnet/pickup logic and the pooled fx-pop sprites that play on
 * pickup. Constructed fresh per GameScene.create(), so the pool starts empty
 * each level — no need for an explicit reset across scene restarts.
 */
export class CoinSystem {
  /**
   * Pool of hidden fx-pop sprites reused for coin pickups. Big bursts (wave
   * ends with many coins magneting in at once) used to allocate + destroy a
   * Sprite per coin, churning the display list. Same texture/animation as
   * before — just recycled instead of recreated.
   */
  private fxPool: Phaser.GameObjects.Sprite[] = [];

  constructor(private scene: GameScene) {}

  update(delta: number) {
    const dt = delta / 1000;
    const scene = this.scene;
    scene.coins.children.iterate((c: any) => {
      const coin = c as Coin;
      if (!coin || !coin.active) return true;
      const dx = scene.player.x - coin.x;
      const dy = scene.player.y - coin.y;
      // Squared-distance early reject: avoids sqrt for the common case of
      // coins far outside magnet range.
      const sqDist = dx * dx + dy * dy;
      const magnetR = CFG.coin.magnetRange;
      if (sqDist > magnetR * magnetR) return true;
      const d = Math.sqrt(sqDist);
      if (d < 18) {
        // collect
        scene.player.money += coin.value;
        scene.hud.pushHud();
        SFX.play('coin');
        // Tutorial event: only emit when the tutorial is active. Otherwise
        // every coin pickup paid for an event dispatch with no listeners.
        if (scene.game.registry.get('tutorialActive')) {
          scene.game.events.emit('tutorial-coin-collected');
        }
        this.playFxPop(coin.x, coin.y);
        coin.destroy();
        return true;
      }
      const speed = CFG.coin.magnetSpeed * (1 - d / magnetR + 0.2);
      coin.x += (dx / d) * speed * dt;
      coin.y += (dy / d) * speed * dt;
      return true;
    });
  }

  private playFxPop(x: number, y: number) {
    let pop = this.fxPool.pop();
    // A pooled sprite can be stale if it was destroyed (anims is gone) —
    // drop it and create a fresh sprite instead of crashing on .play().
    if (pop && !pop.anims) pop = undefined;
    if (pop) {
      pop.setPosition(x, y);
      pop.setActive(true).setVisible(true);
    } else {
      pop = this.scene.add.sprite(x, y, 'fx_pop_0').setDepth(15).setScale(0.5);
    }
    pop.play('fx-pop');
    pop.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      pop!.setActive(false).setVisible(false);
      this.fxPool.push(pop!);
    });
  }
}
