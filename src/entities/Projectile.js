import Phaser from 'phaser';
export class Projectile extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'arrow_0');
        this.damage = 10;
        this.lifetime = 1500;
        this.born = 0;
        this.splashRadius = 0;
        // Ground-target for cannonballs — explodes on arrival, not on enemy hit
        this.groundTarget = false;
        this.groundX = 0;
        this.groundY = 0;
        this.startX = 0;
        this.startY = 0;
        this.totalDist = 0;
        this.shadow = null;
        this.arcOffset = 0; // current visual Y offset (pixels above ground)
        this.homingTarget = null;
        this.speed = 0;
        this.setScale(0.5);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDepth(9);
        this.play('arrow-spin');
        this.setSize(20, 8).setOffset(20, 28);
    }
    fire(tx, ty, speed, damage, splashRadius = 0, scale = 0.5, tint = 0, homingTarget = null) {
        this.damage = damage;
        this.splashRadius = splashRadius;
        this.speed = speed;
        this.homingTarget = homingTarget;
        this.born = this.scene.vTime ?? this.scene.time.now;
        const angle = Math.atan2(ty - this.y, tx - this.x);
        this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        this.setActive(true).setVisible(true);
        this.arcOffset = 0;
        if (splashRadius > 0) {
            // Cannonball
            this.groundTarget = true;
            this.groundX = tx;
            this.groundY = ty;
            this.startX = this.x;
            this.startY = this.y;
            this.totalDist = Math.hypot(tx - this.x, ty - this.y) || 1;
            this.setTexture('cball_0');
            this.play('cball-spin');
            this.setRotation(0);
            this.setScale(scale);
            if (tint)
                this.setTint(tint);
            else
                this.clearTint();
            this.setSize(16, 16).setOffset(24, 24);
            this.setDepth(14);
            // Ground shadow
            this.shadow = this.scene.add.sprite(this.x, this.y, 'cball_shadow')
                .setDepth(5)
                .setAlpha(0.35)
                .setScale(scale * 0.5);
        }
        else {
            // Arrow
            this.groundTarget = false;
            this.setTexture('arrow_0');
            this.play('arrow-spin');
            this.setRotation(angle);
            this.setScale(scale);
            if (tint)
                this.setTint(tint);
            else
                this.clearTint();
            this.setSize(20, 8).setOffset(20, 28);
            this.setDepth(9);
            if (this.shadow) {
                this.shadow.destroy();
                this.shadow = null;
            }
        }
    }
    preDestroy() {
        if (this.shadow) {
            this.shadow.destroy();
            this.shadow = null;
        }
    }
}
