import Phaser from 'phaser';
import { CFG } from '../config';

export type EnemyKind = 'basic' | 'heavy' | 'runner';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  coin: number;
  baseTint = 0xffffff;
  path: { x: number; y: number }[] = [];
  pathIdx = 0;
  lastPath = 0;
  attackCd = 0;
  dying = false;
  targetRef: any = null; // current target object (player, tower, wall)

  constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind) {
    const data =
      kind === 'basic'  ? CFG.enemy.basic  :
      kind === 'heavy'  ? CFG.enemy.heavy  :
                          CFG.enemy.runner;
    // Runner reuses basic's spritesheet/anims with a green tint + smaller scale.
    const texPrefix = kind === 'heavy' ? 'eh' : 'eb';
    super(scene, x, y, `${texPrefix}_move0`);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.kind = kind;
    this.hp = data.hp;
    this.maxHp = data.hp;
    this.speed = data.speed;
    this.dmg = data.dmg;
    this.coin = data.coin;
    this.setDepth(8);

    if (kind === 'basic') {
      this.setSize(12, 12).setOffset(10, 12);
      this.play('eb-move');
    } else if (kind === 'heavy') {
      this.setSize(16, 16).setOffset(8, 10);
      this.play('eh-move');
    } else {
      // runner
      this.setSize(10, 10).setOffset(11, 13);
      this.setScale(0.85);
      this.play('eb-move');
      this.baseTint = 0x6af078;
      this.setTint(this.baseTint);
    }
  }

  hurt(amount: number) {
    if (this.dying) return;
    this.hp -= amount;
    const prefix = this.kind === 'heavy' ? 'eh' : 'eb';
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.dying) return;
      if (this.baseTint !== 0xffffff) this.setTint(this.baseTint);
      else this.clearTint();
    });
    if (this.hp <= 0) {
      this.dying = true;
      this.setVelocity(0, 0);
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
      this.play(`${prefix}-die`);
      this.once('animationcomplete', () => this.destroy());
    }
  }
}
