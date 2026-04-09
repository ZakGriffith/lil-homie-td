import Phaser from 'phaser';
import { CFG } from '../config';

export type TowerKind = 'arrow' | 'cannon';

export class Tower extends Phaser.Physics.Arcade.Sprite {
  kind: TowerKind;
  level = 0;
  hp: number;
  maxHp: number;
  totalSpent: number;
  lastShot = 0;
  top: Phaser.GameObjects.Sprite;
  tileX: number;
  tileY: number;
  size = CFG.tower.tiles;

  // visual tint per level per kind
  static readonly TIER_TINT: Record<TowerKind, number[]> = {
    arrow:  [0xffffff, 0x9fd9ff, 0xffd67a],
    cannon: [0x6a6a78, 0xb07a3a, 0xd94a2a]
  };

  constructor(scene: Phaser.Scene, tileX: number, tileY: number, kind: TowerKind = 'arrow') {
    const size = CFG.tower.tiles;
    const wx = (tileX + size / 2) * CFG.tile;
    const wy = (tileY + size / 2) * CFG.tile;
    super(scene, wx, wy, 't_base');
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static
    this.kind = kind;
    this.tileX = tileX;
    this.tileY = tileY;
    this.setDepth(6);
    const bodySize = CFG.tile * this.size - 10;
    (this.body as Phaser.Physics.Arcade.StaticBody).setSize(bodySize, bodySize);
    (this.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    const topTex = kind === 'cannon' ? 'c_top_0' : 't_top_0';
    this.top = scene.add.sprite(wx, wy, topTex).setDepth(7);

    const s = this.stats();
    this.hp = s.hp;
    this.maxHp = s.hp;
    this.totalSpent = CFG.tower.kinds[kind].cost;
    this.applyTierVisual();
  }

  stats() {
    return CFG.tower.kinds[this.kind].levels[this.level];
  }

  canUpgrade(): boolean {
    return this.level < CFG.tower.kinds[this.kind].levels.length - 1;
  }

  upgradeCost(): number {
    return this.stats().upgradeCost;
  }

  upgrade(): boolean {
    if (!this.canUpgrade()) return false;
    this.level++;
    const s = this.stats();
    const ratio = this.hp / this.maxHp;
    this.maxHp = s.hp;
    this.hp = Math.ceil(s.hp * ratio);
    this.applyTierVisual();
    // pop fx
    this.scene.tweens.add({
      targets: [this, this.top],
      scale: { from: 1.15, to: 1 },
      duration: 220,
      ease: 'Back.Out'
    });
    return true;
  }

  applyTierVisual() {
    const tint = Tower.TIER_TINT[this.kind][this.level] ?? 0xffffff;
    this.setTint(tint);
    // Cannon top is already dark pixel art — don't wash it with tint.
    if (this.kind === 'cannon') this.top.clearTint();
    else this.top.setTint(tint);
  }

  hurt(amount: number) {
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.top.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => { this.applyTierVisual(); });
  }

  destroyTower() {
    this.top.destroy();
    this.destroy();
  }
}
