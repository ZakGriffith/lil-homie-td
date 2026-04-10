import Phaser from 'phaser';
import { CFG } from '../config';

export class Wall extends Phaser.Physics.Arcade.Sprite {
  hp = CFG.wall.hp;
  maxHp = CFG.wall.hp;
  tileX: number;
  tileY: number;

  constructor(scene: Phaser.Scene, tileX: number, tileY: number) {
    const wx = tileX * CFG.tile + CFG.tile / 2;
    const wy = tileY * CFG.tile + CFG.tile / 2;
    super(scene, wx, wy, 'wall');
    this.setScale(0.5);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.tileX = tileX;
    this.tileY = tileY;
    this.setDepth(5);
  }

  hurt(amount: number) {
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.clearTint());
    if (this.hp < this.maxHp * 0.5) this.setTexture('wall_dmg');
  }
}
