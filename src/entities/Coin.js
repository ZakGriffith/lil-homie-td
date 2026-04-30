import Phaser from 'phaser';
export class Coin extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, tier = 'bronze') {
        super(scene, x, y, `coin_${tier}_0`);
        this.value = 1;
        this.tier = 'bronze';
        this.born = 0;
        this.collecting = false;
        this.setScale(0.5);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.tier = tier;
        this.value = tier === 'gold' ? 3 : tier === 'silver' ? 2 : 1;
        this.born = scene.vTime ?? scene.time.now;
        this.setDepth(7);
        this.setSize(24, 24).setOffset(20, 20);
        this.play(`coin-${tier}-spin`);
        // little pop on spawn
        this.setScale(0.3);
        scene.tweens.add({ targets: this, scale: 0.5, duration: 180, ease: 'Back.Out' });
    }
}
