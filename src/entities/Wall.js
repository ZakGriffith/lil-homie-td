import Phaser from 'phaser';
import { CFG } from '../config';
export class Wall extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, tileX, tileY) {
        const wx = tileX * CFG.tile + CFG.tile / 2;
        const wy = tileY * CFG.tile + CFG.tile / 2;
        super(scene, wx, wy, 'wall_0');
        this.hp = CFG.wall.hp;
        this.maxHp = CFG.wall.hp;
        this.neighborMask = 0; // N=1, E=2, S=4, W=8
        this.setScale(0.5);
        scene.add.existing(this);
        scene.physics.add.existing(this, true);
        // Full tile body
        const wallBody = CFG.tile;
        const body = this.body;
        body.setSize(wallBody, wallBody);
        body.position.set(wx - wallBody / 2, wy - wallBody / 2);
        this.tileX = tileX;
        this.tileY = tileY;
        this.setDepth(5);
    }
    hurt(amount) {
        this.hp -= amount;
        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(60, () => this.clearTint());
        this.updateTexture();
    }
    /** Update texture based on current neighborMask and damage state */
    updateTexture() {
        const dmg = this.hp < this.maxHp * 0.5;
        const key = dmg ? `wall_${this.neighborMask}_dmg` : `wall_${this.neighborMask}`;
        this.setTexture(key);
    }
}
