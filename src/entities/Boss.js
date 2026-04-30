import Phaser from 'phaser';
export class Boss extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, biome = 'grasslands', bossKind = '') {
        const prefix = bossKind === 'queen' ? 'cqboss'
            : bossKind === 'dragon' ? 'cdboss'
                : biome === 'forest' ? 'fboss'
                    : biome === 'infected' ? 'iboss'
                        : biome === 'river' ? 'rboss'
                            : 'ram';
        super(scene, x, y, `${prefix}_idle0`);
        this.hp = 1500;
        this.maxHp = 1500;
        this.speed = 28;
        this.dmg = 20; // contact damage
        this.state = 'chase';
        this.stateEnd = 0;
        this.nextSlam = 0;
        this.nextBirth = 0;
        this.nextCharge = 0;
        this.nextBoulder = 0;
        this.contactCd = 0;
        this.dying = false;
        this.chargeDirX = 1;
        this.chargeDirY = 0;
        this.lastSmoke = 0;
        // Pathfinding state (same as Enemy)
        this.path = [];
        this.pathIdx = 0;
        this.lastPath = 0;
        this._pv = -1; // grid version tracker
        this.bossKind = ''; // e.g. 'queen', 'dragon' for castle bosses
        this.bossKind = bossKind;
        this.animPrefix = prefix;
        this.setScale(0.5);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDepth(9);
        this.setSize(44, 44).setOffset(42, 52);
        this.play(`${prefix}-idle`);
        this.hpBar = scene.add.graphics().setDepth(20);
        const now = scene.vTime ?? scene.time.now;
        this.nextBirth = now + 4000;
        this.nextCharge = now + 7500;
        this.nextSlam = now + 1500;
        this.nextBoulder = now + 3000;
    }
    drawHpBar() {
        this.hpBar.clear();
        if (this.dying || !this.active)
            return;
        const pct = Math.max(0, this.hp / this.maxHp);
        const w = 44, h = 4;
        const bx = this.x - w / 2;
        const by = this.y + 30;
        this.hpBar.fillStyle(0x111826, 0.85);
        this.hpBar.fillRect(bx - 1, by - 1, w + 2, h + 2);
        const color = pct > 0.5 ? 0xd94a4a : pct > 0.25 ? 0xd97a4a : 0xff3030;
        this.hpBar.fillStyle(color, 1);
        this.hpBar.fillRect(bx, by, w * pct, h);
    }
    hurt(amount) {
        if (this.dying)
            return;
        this.hp -= amount;
        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(60, () => { if (!this.dying)
            this.clearTint(); });
        if (this.hp <= 0) {
            this.dying = true;
            this.state = 'dying';
            this.setVelocity(0, 0);
            this.body.enable = false;
            this.hpBar.destroy();
            const dieAnim = `${this.animPrefix}-die`;
            this.play(dieAnim);
            this.once(`animationcomplete-${dieAnim}`, () => this.destroy());
        }
    }
}
