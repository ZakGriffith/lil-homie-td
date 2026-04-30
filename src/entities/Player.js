import Phaser from 'phaser';
import { CFG } from '../config';
import { SFX } from '../audio/sfx';
export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'p_idle_0');
        this.hp = CFG.player.hp;
        this.maxHp = CFG.player.hp;
        this.money = CFG.startMoney;
        this.kills = 0;
        this.lastShot = 0;
        this.invuln = 0;
        this.facing = 0; // radians
        this.facingRight = true; // last horizontal direction
        this.setScale(0.5);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setCircle(14, 18, 22);
        this.setDepth(10);
        this.play('player-idle');
        // Separate bow sprite that rotates to aim
        this.bow = scene.add.sprite(x, y, 'bow_0').setDepth(11).setOrigin(0.25, 0.5).setScale(0.5);
        // Real arrow nocked on the bow — the same projectile sprite that will fly when firing
        this.nockedArrow = scene.add.sprite(x, y, 'arrow_0').setDepth(11.5).setScale(0.5);
    }
    hurt(amount, scene) {
        const now = scene.vTime ?? scene.time.now;
        if (this.invuln > now)
            return;
        this.hp -= amount;
        this.invuln = now + 500;
        SFX.play('playerHurt');
        this.play('player-hit', true);
        scene.tweens.add({
            targets: this, alpha: 0.3, yoyo: true, duration: 80, repeat: 3,
            onComplete: () => this.setAlpha(1)
        });
        scene.cameras.main.shake(120, 0.006);
    }
}
