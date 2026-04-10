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
    this.kind = kind;
    this.hp = data.hp;
    this.maxHp = data.hp;
    this.speed = data.speed;
    this.dmg = data.dmg;
    this.coin = data.coin;

    if (kind === 'basic') {
      this.setScale(0.5);
    } else if (kind === 'heavy') {
      this.setScale(0.5);
    } else {
      this.setScale(0.425);
    }

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(8);

    if (kind === 'basic') {
      this.setSize(24, 24).setOffset(20, 24);
      this.play('eb-move');
    } else if (kind === 'heavy') {
      this.setSize(32, 32).setOffset(16, 20);
      this.play('eh-move');
    } else {
      // runner
      this.setSize(20, 20).setOffset(22, 26);
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
