import Phaser from 'phaser';
import { CFG } from '../config';
import { saveMedal, LEVELS } from '../levels';
import { SFX } from '../audio/sfx';
export class UIScene extends Phaser.Scene {
    /** Scale a base-resolution value to native */
    p(v) { return v * this.sf; }
    /** Build a font-size string at scaled resolution */
    fs(px) { return `${Math.round(px * this.sf)}px`; }
    constructor() {
        super({ key: 'UI', active: false });
        this.speedIdx = 0;
        this.bossBarMaxW = 0;
        this.bossBarMaxHp = 1;
        this.progressCircles = [];
        this.progressLabels = [];
        this.progressLines = [];
        this.levelId = 1;
        this.difficulty = 'easy';
        this.biome = 'grasslands';
        /** Scale factor for native resolution rendering */
        this.sf = 1;
    }
    init(data) {
        this.levelId = data?.levelId ?? 1;
        this.difficulty = data?.difficulty ?? 'easy';
        const levelDef = LEVELS.find(l => l.id === this.levelId);
        this.biome = levelDef?.biome ?? 'grasslands';
        this.endPanel = undefined;
        this.bossBarGfx = undefined;
        this.bossLabel = undefined;
        this.speedIdx = 0;
    }
    create() {
        this.events.on('shutdown', this.shutdown, this);
        this.sf = this.game.registry.get('sf') || 1;
        const W = this.scale.width;
        const H = this.scale.height;
        const T = this.p(20); // top padding
        // top-left HUD
        this.nameText = this.add.text(this.p(12), T, '', { fontFamily: 'monospace', fontSize: this.fs(14), color: '#7cc4ff' });
        this.hpBarGfx = this.add.graphics();
        // Top-right gold badge (WoW-style)
        const coinX = W - this.p(60);
        const coinY = T + this.p(14);
        // Dark inset panel with rounded corners
        this.goldBadgeGfx = this.add.graphics();
        const gbW = this.p(80), gbH = this.p(26), gbR = this.p(6);
        const gbX = coinX + this.p(6) - gbW, gbY = coinY - gbH / 2;
        this.goldBadgeGfx.fillStyle(0x0b0f1a, 0.85);
        this.goldBadgeGfx.fillRoundedRect(gbX, gbY, gbW, gbH, gbR);
        this.goldBadgeGfx.lineStyle(this.p(1.5), 0x5a4a1a, 0.7);
        this.goldBadgeGfx.strokeRoundedRect(gbX, gbY, gbW, gbH, gbR);
        // Gold coin circle
        this.add.circle(coinX + this.p(12), coinY, this.p(13), 0x8a6a1a).setStrokeStyle(this.p(2), 0xc4a030);
        this.add.circle(coinX + this.p(12), coinY, this.p(9), 0xd4a820).setStrokeStyle(this.p(1), 0xffd84a);
        this.add.text(coinX + this.p(12), coinY, '$', {
            fontFamily: 'monospace', fontSize: this.fs(12), fontStyle: 'bold', color: '#1a1000',
        }).setOrigin(0.5);
        // Money amount text
        this.moneyText = this.add.text(coinX - this.p(2), coinY, '0', {
            fontFamily: 'monospace', fontSize: this.fs(15), fontStyle: 'bold', color: '#ffd84a',
            stroke: '#0b0f1a', strokeThickness: this.p(3),
        }).setOrigin(1, 0.5);
        // Bottom-center minimal hotbar (#7 style — slots with labels below)
        const slotSize = this.p(48);
        const slotGap = this.p(10);
        const slots = 5;
        const hotbarY = H - slotSize - this.p(32); // extra room for labels below
        const barCenterX = W / 2;
        const slotX = (i) => barCenterX - (slots * slotSize + (slots - 1) * slotGap) / 2 + i * (slotSize + slotGap) + slotSize / 2;
        this.btnTower = this.makeHotbarSlot(slotX(0), hotbarY, slotSize, slotSize, '1', 'arrow', 'ARROW', '$60', () => this.game.events.emit('ui-build', 'tower', 'arrow'));
        this.btnCannon = this.makeHotbarSlot(slotX(1), hotbarY, slotSize, slotSize, '2', 'cannon', 'CANNON', '$60', () => this.game.events.emit('ui-build', 'tower', 'cannon'));
        this.btnMage = this.makeHotbarSlot(slotX(2), hotbarY, slotSize, slotSize, '3', 'mage', 'MAGE', '$80', () => { });
        // Lock overlay on mage slot
        const lockG = this.add.graphics();
        const ls = this.sf;
        // Dim overlay
        lockG.fillStyle(0x000000, 0.5);
        lockG.fillRoundedRect(-slotSize / 2, -slotSize / 2, slotSize, slotSize, this.p(3));
        // Padlock body
        const lx = 0, ly = this.p(2);
        lockG.fillStyle(0x8a8a8a, 0.9);
        lockG.fillRoundedRect(lx - this.p(7), ly, this.p(14), this.p(10), this.p(2));
        // Shackle
        lockG.lineStyle(this.p(2.5), 0x8a8a8a, 0.9);
        lockG.beginPath();
        lockG.arc(lx, ly - this.p(1), this.p(5), Math.PI, 0, false);
        lockG.strokePath();
        // Keyhole
        lockG.fillStyle(0x222222, 1);
        lockG.fillCircle(lx, ly + this.p(4), this.p(2));
        lockG.fillRect(lx - this.p(1), ly + this.p(5), this.p(2), this.p(3));
        this.btnMage.add(lockG);
        this.btnWall = this.makeHotbarSlot(slotX(3), hotbarY, slotSize, slotSize, '4', 'wall', 'WALL', '$5', () => this.game.events.emit('ui-build', 'wall'));
        this.btnSpeed = this.makeHotbarSlot(slotX(4), hotbarY, slotSize, slotSize, 'SPC', 'speed', 'SPEED', '', () => this.cycleSpeed());
        // Speed cycle text overlay
        this.speedLabel = this.add.text(0, 0, '>', {
            fontFamily: 'monospace', fontSize: this.fs(16), fontStyle: 'bold', color: '#c4a850',
            stroke: '#0a0e1a', strokeThickness: this.p(3),
        }).setOrigin(0.5);
        this.btnSpeed.add(this.speedLabel);
        this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
            .on('down', () => this.cycleSpeed());
        // Level progress graphic (wave circles + boss skull)
        this.progressCircles = [];
        this.progressLabels = [];
        this.progressLines = [];
        // Castle: 4 waves + queen skull + dragon skull = 6 nodes
        // Others: waveCount waves + 1 boss = waveCount+1 nodes
        const totalNodes = this.biome === 'castle' ? 6 : CFG.spawn.waveCount + 1;
        const nodeSpacing = this.p(36);
        const totalW = (totalNodes - 1) * nodeSpacing;
        const startX = (W - totalW) / 2;
        const nodeY = T;
        const nodeR = this.p(9);
        const items = [];
        for (let i = 0; i < totalNodes; i++) {
            const nx = startX + i * nodeSpacing;
            // connecting line to next node
            if (i < totalNodes - 1) {
                const line = this.add.rectangle(nx + nodeR + this.p(2), nodeY, nodeSpacing - nodeR * 2 - this.p(4), this.p(2), 0x2a3760).setOrigin(0, 0.5);
                this.progressLines.push(line);
                items.push(line);
            }
            // circle
            const circle = this.add.circle(nx, nodeY, nodeR, 0x11172a).setStrokeStyle(this.p(2), 0x2a3760);
            this.progressCircles.push(circle);
            items.push(circle);
            // label (number or skull)
            // Castle: nodes 2 (queen) and 5 (dragon) are boss skulls
            const isBoss = this.biome === 'castle' ? (i === 2 || i === 5) : i === totalNodes - 1;
            const waveNum = this.biome === 'castle'
                ? (i < 2 ? i + 1 : i === 2 ? 0 : i < 5 ? i : 0) // 1,2,skull,3,4,skull
                : i + 1;
            const label = this.add.text(nx, nodeY, isBoss ? '\u2620' : `${waveNum}`, {
                fontFamily: 'monospace', fontSize: isBoss ? this.fs(12) : this.fs(10), color: '#556',
            }).setOrigin(0.5);
            this.progressLabels.push(label);
            items.push(label);
        }
        this.progressContainer = this.add.container(0, 0, items);
        // Countdown text (shares space with progress graphic — only one visible at a time)
        this.countdownText = this.add.text(W / 2, nodeY, '', {
            fontFamily: 'monospace', fontSize: this.fs(18), color: '#7cc4ff',
            stroke: '#0b0f1a', strokeThickness: this.p(4)
        }).setOrigin(0.5).setVisible(false);
        // Wave progress bar (centered, same position as boss bar)
        const barW = this.p(420);
        const barX = (W - barW) / 2;
        const barY = T + this.p(38);
        this.waveLabel = this.add.text(W / 2, barY - this.p(16), 'WAVE 1', {
            fontFamily: 'monospace', fontSize: this.fs(14), color: '#7cc4ff',
            stroke: '#0b0f1a', strokeThickness: this.p(3)
        }).setOrigin(0.5);
        this.waveBarGfx = this.add.graphics();
        // Build error message (persistent while hovering invalid tile)
        const hotbarTop = H - this.p(48) - this.p(32); // matches hotbarY
        this.buildErrorText = this.add.text(W / 2, hotbarTop - this.p(18), '', {
            fontFamily: 'monospace', fontSize: this.fs(13), color: '#ff6a6a',
            stroke: '#0b0f1a', strokeThickness: this.p(3),
            backgroundColor: '#1a0a0aCC',
            padding: { x: Number(this.p(10)), y: Number(this.p(4)) }
        }).setOrigin(0.5, 1).setDepth(900).setVisible(false);
        // Build mode cancel hint
        this.buildHintText = this.add.text(W / 2, hotbarTop - this.p(38), 'Right-click or ESC to leave build menu', {
            fontFamily: 'monospace', fontSize: this.fs(12), color: '#c8d8e8',
            stroke: '#0b0f1a', strokeThickness: this.p(3),
            backgroundColor: '#11172aDD', padding: { x: Number(this.p(8)), y: Number(this.p(4)) }
        }).setOrigin(0.5, 1).setDepth(900).setVisible(false);
        // listen for HUD updates
        this.game.events.on('hud', (s) => this.updateHud(s));
        this.game.events.on('game-end', (s) => this.showEnd(s));
        this.game.events.on('boss-spawn', (s) => this.showBossBar(s));
        this.game.events.on('boss-hp', (s) => this.updateBossBar(s));
        this.game.events.on('boss-died', () => this.hideBossBar());
        this.game.events.on('build-error', (msg) => {
            if (msg) {
                this.buildErrorText.setText(msg).setVisible(true);
            }
            else {
                this.buildErrorText.setVisible(false);
            }
        });
        this.game.events.on('build-mode', (active) => {
            this.buildHintText.setVisible(active);
            if (!active)
                this.buildErrorText.setVisible(false);
        });
    }
    showBossBar(s) {
        const W = this.scale.width;
        const barW = this.p(420);
        const x = (W - barW) / 2;
        const y = this.p(58); // 20 (top pad) + 38
        // Destroy previous boss bar if any (for multi-boss levels)
        this.hideBossBar();
        if (this.bossBarGfx)
            return;
        const bossName = s?.bossKind === 'queen' ? 'THE PHANTOM QUEEN'
            : s?.bossKind === 'dragon' ? 'THE CASTLE DRAGON'
                : s?.biome === 'forest' ? 'THE WENDIGO'
                    : s?.biome === 'infected' ? 'THE BLIGHTED ONE'
                        : s?.biome === 'river' ? 'THE FOG PHANTOM'
                            : 'THE ANCIENT RAM';
        this.bossLabel = this.add.text(W / 2, y - this.p(16), bossName, {
            fontFamily: 'monospace', fontSize: this.fs(14), color: '#ff6a6a',
            stroke: '#0b0f1a', strokeThickness: this.p(3)
        }).setOrigin(0.5);
        this.bossBarGfx = this.add.graphics();
        this.bossBarMaxW = barW - this.p(4);
        this.bossBarMaxHp = s?.maxHp ?? 1;
    }
    hideBossBar() {
        if (this.bossBarGfx) {
            this.bossBarGfx.destroy();
            this.bossBarGfx = undefined;
        }
        if (this.bossLabel) {
            this.bossLabel.destroy();
            this.bossLabel = undefined;
        }
    }
    updateBossBar(s) {
        if (!this.bossBarGfx)
            return;
        const W = this.scale.width;
        const barW = this.p(420);
        const x = (W - barW) / 2;
        const y = this.p(58);
        const bH = this.p(14), bR = this.p(5);
        const maxHp = this.bossBarMaxHp || s.maxHp || 1;
        const pct = Math.max(0, (s.hp ?? 0) / maxHp);
        const bossColor = pct > 0.5 ? 0xd94a4a : pct > 0.25 ? 0xd97a4a : 0xff3030;
        this.bossBarGfx.clear();
        // Background
        this.bossBarGfx.fillStyle(0x11172a, 1);
        this.bossBarGfx.fillRoundedRect(x, y, barW, bH, bR);
        this.bossBarGfx.lineStyle(this.p(1.5), 0x6a2a2a, 0.8);
        this.bossBarGfx.strokeRoundedRect(x, y, barW, bH, bR);
        // Fill
        const fillW = this.bossBarMaxW * pct;
        if (fillW > 0) {
            this.bossBarGfx.fillStyle(bossColor, 1);
            this.bossBarGfx.fillRoundedRect(x + this.p(2), y + this.p(2), fillW, bH - this.p(4), bR - this.p(1));
        }
    }
    cycleSpeed() {
        const speeds = [1.25, 2, 3.75];
        const labels = ['>', '>>', '>>>'];
        this.speedIdx = (this.speedIdx + 1) % speeds.length;
        this.speedLabel.setText(labels[this.speedIdx]);
        this.game.events.emit('ui-speed', speeds[this.speedIdx]);
    }
    makeButton(x, y, w, h, label, onClick) {
        const c = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, w, h, 0x2a3760).setStrokeStyle(this.p(1), 0x556);
        const t = this.add.text(0, 0, label, { fontFamily: 'monospace', fontSize: this.fs(12), color: '#fff' }).setOrigin(0.5);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => { SFX.play('click'); onClick(); });
        bg.on('pointerover', () => bg.setFillStyle(0x3b4d84));
        bg.on('pointerout', () => bg.setFillStyle(0x2a3760));
        c.add([bg, t]);
        return c;
    }
    makeHotbarSlot(cx, topY, w, h, key, icon, name, cost, onClick) {
        const my = topY + h / 2;
        const c = this.add.container(cx, my);
        const g = this.add.graphics();
        const drawSlot = (hover) => {
            g.clear();
            // Slot fill
            g.fillStyle(hover ? 0x141c30 : 0x0a0e1a, 1);
            g.fillRoundedRect(-w / 2, -h / 2, w, h, this.p(3));
            // Gold border
            g.lineStyle(this.p(1.5), hover ? 0xc4a030 : 0x8a6a20, 1);
            g.strokeRoundedRect(-w / 2, -h / 2, w, h, this.p(3));
            // Inner glow
            g.lineStyle(this.p(1), hover ? 0xa08830 : 0xa08030, hover ? 0.2 : 0.12);
            g.strokeRoundedRect(-w / 2 + this.p(2), -h / 2 + this.p(2), w - this.p(4), h - this.p(4), this.p(2));
        };
        drawSlot(false);
        // Hit area
        const hitRect = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
        hitRect.on('pointerdown', () => { SFX.play('click'); onClick(); });
        hitRect.on('pointerover', () => drawSlot(true));
        hitRect.on('pointerout', () => drawSlot(false));
        // Draw icon
        const iconG = this.add.graphics();
        this.drawSlotIcon(iconG, icon);
        // Keybind badge (top-left corner)
        const badgeW = key.length > 2 ? this.p(22) : this.p(13);
        const badgeBg = this.add.rectangle(-w / 2 + badgeW / 2 + this.p(1), -h / 2 + this.p(7), badgeW, this.p(12), 0x0a0e1a, 0.9)
            .setStrokeStyle(this.p(0.5), 0x8a6a20, 0.5);
        const badge = this.add.text(-w / 2 + badgeW / 2 + this.p(1), -h / 2 + this.p(7), key, {
            fontFamily: 'monospace', fontSize: this.fs(8), color: '#a08830',
        }).setOrigin(0.5);
        // Name label below slot
        const nameLabel = this.add.text(0, h / 2 + this.p(4), name, {
            fontFamily: 'monospace', fontSize: this.fs(8), color: '#8a9ab0',
        }).setOrigin(0.5, 0);
        const items = [g, hitRect, iconG, badgeBg, badge, nameLabel];
        // Cost label below name
        if (cost) {
            const costLabel = this.add.text(0, h / 2 + this.p(14), cost, {
                fontFamily: 'monospace', fontSize: this.fs(8), color: '#ffd84a',
            }).setOrigin(0.5, 0);
            items.push(costLabel);
        }
        c.add(items);
        return c;
    }
    drawSlotIcon(g, icon) {
        const cx = 0, cy = 0;
        const s = this.sf;
        switch (icon) {
            case 'arrow': {
                // Arrow shaft (diagonal)
                g.lineStyle(2.5 * s, 0xc4a850, 1);
                g.lineBetween(cx + 10 * s, cy + 10 * s, cx - 8 * s, cy - 8 * s);
                // Arrowhead
                g.fillStyle(0xc4a850, 1);
                g.fillTriangle(cx - 12 * s, cy - 12 * s, cx - 4 * s, cy - 10 * s, cx - 10 * s, cy - 2 * s);
                // Fletching
                g.lineStyle(1.5 * s, 0xa08830, 0.8);
                g.lineBetween(cx + 10 * s, cy + 10 * s, cx + 12 * s, cy + 6 * s);
                g.lineBetween(cx + 10 * s, cy + 10 * s, cx + 6 * s, cy + 12 * s);
                break;
            }
            case 'cannon': {
                // Cannonball shadow
                g.fillStyle(0x1a1a1a, 0.5);
                g.fillCircle(cx + 1 * s, cy + 2 * s, 9 * s);
                // Main ball
                g.fillStyle(0x2a2a2a, 1);
                g.fillCircle(cx, cy, 9 * s);
                // Subtle gradient layers
                g.fillStyle(0x3a3a3a, 1);
                g.fillCircle(cx - 1 * s, cy - 1 * s, 8 * s);
                // Primary light reflection (top-left)
                g.fillStyle(0x606060, 0.7);
                g.fillCircle(cx - 3 * s, cy - 3 * s, 4 * s);
                // Bright highlight spot
                g.fillStyle(0x8a8a8a, 0.6);
                g.fillCircle(cx - 4 * s, cy - 4 * s, 2 * s);
                // Small specular dot
                g.fillStyle(0xbbbbbb, 0.5);
                g.fillCircle(cx - 4.5 * s, cy - 4.5 * s, 1 * s);
                break;
            }
            case 'mage': {
                // Staff
                g.lineStyle(2.5 * s, 0x8a6adf, 1);
                g.lineBetween(cx, cy - 10 * s, cx, cy + 10 * s);
                // Orb glow
                g.fillStyle(0xb090ff, 0.3);
                g.fillCircle(cx, cy - 10 * s, 5 * s);
                // Orb
                g.fillStyle(0xb090ff, 0.9);
                g.fillCircle(cx, cy - 10 * s, 3.5 * s);
                g.fillStyle(0xd0c0ff, 1);
                g.fillCircle(cx, cy - 10 * s, 2 * s);
                // Specular
                g.fillStyle(0xffffff, 0.8);
                g.fillCircle(cx - 1 * s, cy - 11 * s, 1 * s);
                // Side wisps
                g.lineStyle(1 * s, 0x9a7aef, 0.5);
                g.lineBetween(cx, cy - 6 * s, cx - 4 * s, cy - 9 * s);
                g.lineBetween(cx, cy - 6 * s, cx + 4 * s, cy - 9 * s);
                g.fillStyle(0xb090ff, 0.4);
                g.fillCircle(cx - 4 * s, cy - 9 * s, 1 * s);
                g.fillCircle(cx + 4 * s, cy - 9 * s, 1 * s);
                // Staff base
                g.lineStyle(2 * s, 0x8a6adf, 1);
                g.lineBetween(cx - 3 * s, cy + 10 * s, cx + 3 * s, cy + 10 * s);
                break;
            }
            case 'wall': {
                // 3-row brick wall matching HTML mockup SVG layout
                // SVG viewBox is 28x28, icon area +-14 from center
                const bw = 11 * s, bh = 6 * s;
                const colors = [0xb0a080, 0x8a7a60];
                const ox = cx - 14 * s; // origin offset to match SVG viewBox 0,0
                const oy = cy - 14 * s;
                // Row 0 (y=4): two full-width bricks
                g.fillStyle(colors[0], 1);
                g.fillRect(ox + 2 * s, oy + 4 * s, bw, bh);
                g.fillStyle(colors[1], 1);
                g.fillRect(ox + 15 * s, oy + 4 * s, bw, bh);
                // Row 1 (y=11): offset — half brick, full brick, half brick
                g.fillStyle(colors[1], 1);
                g.fillRect(ox + 8 * s, oy + 11 * s, bw, bh);
                g.fillStyle(colors[0], 1);
                g.fillRect(ox + 2 * s, oy + 11 * s, 5 * s, bh);
                g.fillStyle(colors[0], 1);
                g.fillRect(ox + 20 * s, oy + 11 * s, 6 * s, bh);
                // Row 2 (y=18): two full-width bricks
                g.fillStyle(colors[0], 1);
                g.fillRect(ox + 2 * s, oy + 18 * s, bw, bh);
                g.fillStyle(colors[1], 1);
                g.fillRect(ox + 15 * s, oy + 18 * s, bw, bh);
                // Mortar lines on all bricks
                g.lineStyle(0.5 * s, 0x4a3a2a, 0.5);
                g.strokeRect(ox + 2 * s, oy + 4 * s, bw, bh);
                g.strokeRect(ox + 15 * s, oy + 4 * s, bw, bh);
                g.strokeRect(ox + 8 * s, oy + 11 * s, bw, bh);
                g.strokeRect(ox + 2 * s, oy + 11 * s, 5 * s, bh);
                g.strokeRect(ox + 20 * s, oy + 11 * s, 6 * s, bh);
                g.strokeRect(ox + 2 * s, oy + 18 * s, bw, bh);
                g.strokeRect(ox + 15 * s, oy + 18 * s, bw, bh);
                break;
            }
            case 'speed': {
                // Drawn via text overlay (speedLabel)
                break;
            }
        }
    }
    updateHud(s) {
        if (!s)
            return;
        this.nameText.setText(s.name ?? 'Ranger');
        const pct = Math.max(0, s.hp / s.maxHp);
        const T = this.p(20);
        const hpX = this.p(12), hpY = T + this.p(22);
        const hpW = this.p(180), hpH = this.p(14), hpR = this.p(5);
        const hpColor = pct > 0.5 ? 0x4ad96a : pct > 0.25 ? 0xd9a84a : 0xd94a4a;
        this.hpBarGfx.clear();
        // Background
        this.hpBarGfx.fillStyle(0x111826, 1);
        this.hpBarGfx.fillRoundedRect(hpX, hpY, hpW, hpH, hpR);
        this.hpBarGfx.lineStyle(this.p(1.5), 0x3a4a70, 0.8);
        this.hpBarGfx.strokeRoundedRect(hpX, hpY, hpW, hpH, hpR);
        // Fill
        const fillW = (hpW - this.p(4)) * pct;
        if (fillW > 0) {
            this.hpBarGfx.fillStyle(hpColor, 1);
            this.hpBarGfx.fillRoundedRect(hpX + this.p(2), hpY + this.p(2), fillW, hpH - this.p(4), hpR - this.p(1));
        }
        this.moneyText.setText(`${s.money}`);
        // Toggle countdown text vs progress graphic
        if (s.countdownMsg) {
            this.countdownText.setText(s.countdownMsg);
            this.countdownText.setColor(s.countdownColor ?? '#7cc4ff');
            this.countdownText.setVisible(true);
            this.progressContainer.setVisible(false);
        }
        else {
            this.countdownText.setVisible(false);
            this.progressContainer.setVisible(true);
        }
        // Update level progress circles
        const currentWave = s.wave ?? 1; // 1-indexed
        if (this.biome === 'castle') {
            // Castle: 6 nodes — W1, W2, Queen, W3, W4, Dragon
            // Map node index to progress state
            const cp = s.castlePhase ?? 0;
            for (let i = 0; i < this.progressCircles.length; i++) {
                const isBossNode = (i === 2 || i === 5);
                let completed = false;
                let active = false;
                let current = false;
                if (i === 0) { // Wave 1
                    completed = currentWave > 1 || cp >= 1;
                    current = currentWave === 1 && cp === 0;
                }
                else if (i === 1) { // Wave 2
                    completed = cp >= 1;
                    current = currentWave === 2 && cp === 0;
                }
                else if (i === 2) { // Queen boss
                    completed = s.midBossDefeated;
                    active = cp === 1 && s.bossSpawned;
                }
                else if (i === 3) { // Wave 3
                    completed = (cp >= 2 && currentWave > 3) || cp >= 3;
                    current = currentWave === 3 && cp === 2;
                }
                else if (i === 4) { // Wave 4
                    completed = cp >= 3;
                    current = currentWave === 4 && cp === 2;
                }
                else if (i === 5) { // Dragon boss
                    active = cp === 3 && s.bossSpawned;
                }
                if (isBossNode) {
                    if (completed) {
                        this.progressCircles[i].setStrokeStyle(this.p(2), 0x4ad96a);
                        this.progressCircles[i].setFillStyle(0x1a3a1a);
                        this.progressLabels[i].setColor('#4ad96a');
                    }
                    else if (active) {
                        this.progressCircles[i].setStrokeStyle(this.p(2), 0xff6a6a);
                        this.progressCircles[i].setFillStyle(0x3a1010);
                        this.progressLabels[i].setColor('#ff6a6a');
                    }
                    else {
                        this.progressCircles[i].setStrokeStyle(this.p(2), 0x2a3760);
                        this.progressCircles[i].setFillStyle(0x11172a);
                        this.progressLabels[i].setColor('#556');
                    }
                }
                else if (completed) {
                    this.progressCircles[i].setStrokeStyle(this.p(2), 0x4ad96a);
                    this.progressCircles[i].setFillStyle(0x1a3a1a);
                    this.progressLabels[i].setText('\u2713');
                    this.progressLabels[i].setColor('#4ad96a');
                }
                else if (current) {
                    this.progressCircles[i].setStrokeStyle(this.p(2), 0x7cc4ff);
                    this.progressCircles[i].setFillStyle(0x1a2a4a);
                    this.progressLabels[i].setColor('#7cc4ff');
                }
                else {
                    this.progressCircles[i].setStrokeStyle(this.p(2), 0x2a3760);
                    this.progressCircles[i].setFillStyle(0x11172a);
                    this.progressLabels[i].setColor('#556');
                }
                if (i < this.progressLines.length) {
                    if (completed)
                        this.progressLines[i].setFillStyle(0x4ad96a);
                    else if (current || active)
                        this.progressLines[i].setFillStyle(0x7cc4ff);
                    else
                        this.progressLines[i].setFillStyle(0x2a3760);
                }
            }
        }
        else {
            const waveCount = CFG.spawn.waveCount;
            for (let i = 0; i < this.progressCircles.length; i++) {
                const isBoss = i === waveCount;
                const waveNum = i + 1; // 1-indexed wave for this node
                if (isBoss) {
                    if (s.bossSpawned) {
                        this.progressCircles[i].setStrokeStyle(this.p(2), 0xff6a6a);
                        this.progressCircles[i].setFillStyle(0x3a1010);
                        this.progressLabels[i].setColor('#ff6a6a');
                    }
                    else {
                        this.progressCircles[i].setStrokeStyle(this.p(2), 0x2a3760);
                        this.progressCircles[i].setFillStyle(0x11172a);
                        this.progressLabels[i].setColor('#556');
                    }
                }
                else if (waveNum < currentWave || (waveNum === currentWave && s.bossSpawned)) {
                    this.progressCircles[i].setStrokeStyle(this.p(2), 0x4ad96a);
                    this.progressCircles[i].setFillStyle(0x1a3a1a);
                    this.progressLabels[i].setText('\u2713');
                    this.progressLabels[i].setColor('#4ad96a');
                }
                else if (waveNum === currentWave) {
                    this.progressCircles[i].setStrokeStyle(this.p(2), 0x7cc4ff);
                    this.progressCircles[i].setFillStyle(0x1a2a4a);
                    this.progressLabels[i].setText(`${waveNum}`);
                    this.progressLabels[i].setColor('#7cc4ff');
                }
                else {
                    this.progressCircles[i].setStrokeStyle(this.p(2), 0x2a3760);
                    this.progressCircles[i].setFillStyle(0x11172a);
                    this.progressLabels[i].setText(`${waveNum}`);
                    this.progressLabels[i].setColor('#556');
                }
                if (i < this.progressLines.length) {
                    if (waveNum < currentWave || (waveNum === currentWave && s.bossSpawned)) {
                        this.progressLines[i].setFillStyle(0x4ad96a);
                    }
                    else if (waveNum === currentWave) {
                        this.progressLines[i].setFillStyle(0x7cc4ff);
                    }
                    else {
                        this.progressLines[i].setFillStyle(0x2a3760);
                    }
                }
            }
        }
        // Wave progress bar
        const W = this.scale.width;
        const wbW = this.p(420), wbH = this.p(14), wbR = this.p(5);
        const wbX = (W - wbW) / 2, wbY = this.p(20) + this.p(38);
        this.waveBarGfx.clear();
        if (s.bossSpawned) {
            this.waveLabel.setVisible(false);
            this.waveBarGfx.setVisible(false);
        }
        else {
            this.waveBarGfx.setVisible(true);
            this.waveLabel.setVisible(true);
            // Background
            this.waveBarGfx.fillStyle(0x11172a, 1);
            this.waveBarGfx.fillRoundedRect(wbX, wbY, wbW, wbH, wbR);
            this.waveBarGfx.lineStyle(this.p(1.5), 0x3a4a70, 0.8);
            this.waveBarGfx.strokeRoundedRect(wbX, wbY, wbW, wbH, wbR);
            // Fill (remaining enemies)
            const wavePct = s.waveSize > 0 ? Math.min(1, s.waveKills / s.waveSize) : 0;
            const fillW = (wbW - this.p(4)) * (1 - wavePct);
            if (fillW > 0) {
                this.waveBarGfx.fillStyle(0x4a8ad9, 1);
                this.waveBarGfx.fillRoundedRect(wbX + this.p(2), wbY + this.p(2), fillW, wbH - this.p(4), wbR - this.p(1));
            }
            if (s.waveBreakUntil > 0 && s.vTime < s.waveBreakUntil) {
                const secs = Math.ceil((s.waveBreakUntil - s.vTime) / 1000);
                this.waveLabel.setText(`WAVE ${s.wave} IN ${secs}s`);
                this.waveLabel.setColor('#ffd84a');
            }
            else {
                this.waveLabel.setText(`WAVE ${s.wave}`);
                this.waveLabel.setColor('#7cc4ff');
            }
        }
    }
    showEnd(s) {
        if (this.endPanel)
            return;
        if (s.win)
            saveMedal(this.levelId, this.difficulty);
        const W = this.scale.width, H = this.scale.height;
        const isWin = !!s.win;
        const accent = isWin ? 0x4ad96a : 0xd94a4a;
        const accentHex = isWin ? '#4ad96a' : '#d94a4a';
        const accentBright = isWin ? '#7cf29a' : '#ff6a6a';
        const panelW = this.p(340), panelH = this.p(240), panelR = this.p(14);
        const px = W / 2 - panelW / 2, py = H / 2 - panelH / 2;
        // Dim background
        const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.75).setOrigin(0);
        // Panel with rounded corners and layered border
        const panelGfx = this.add.graphics();
        // Outer glow
        panelGfx.lineStyle(this.p(4), accent, 0.15);
        panelGfx.strokeRoundedRect(px - this.p(3), py - this.p(3), panelW + this.p(6), panelH + this.p(6), panelR + this.p(2));
        // Main panel fill
        panelGfx.fillStyle(0x0d1220, 0.95);
        panelGfx.fillRoundedRect(px, py, panelW, panelH, panelR);
        // Inner border
        panelGfx.lineStyle(this.p(1.5), accent, 0.5);
        panelGfx.strokeRoundedRect(px, py, panelW, panelH, panelR);
        // Decorative top accent line
        panelGfx.lineStyle(this.p(2), accent, 0.8);
        const lineInset = this.p(30);
        panelGfx.lineBetween(px + lineInset, py + this.p(1), px + panelW - lineInset, py + this.p(1));
        // Title
        const title = this.add.text(W / 2, py + this.p(40), isWin ? 'VICTORY' : 'DEFEAT', {
            fontFamily: 'monospace', fontSize: this.fs(30), fontStyle: 'bold',
            color: accentBright,
            stroke: '#000000', strokeThickness: this.p(4),
        }).setOrigin(0.5);
        // Divider line under title
        panelGfx.lineStyle(this.p(1), 0x2a3760, 0.6);
        panelGfx.lineBetween(px + this.p(20), py + this.p(62), px + panelW - this.p(20), py + this.p(62));
        // Stats row
        const statsY = py + this.p(90);
        const statSpacing = this.p(90);
        const statStartX = W / 2 - statSpacing;
        // Kills stat
        const killsLabel = this.add.text(statStartX, statsY - this.p(10), 'KILLS', {
            fontFamily: 'monospace', fontSize: this.fs(9), color: '#6a7a8a',
            letterSpacing: 2,
        }).setOrigin(0.5);
        const killsVal = this.add.text(statStartX, statsY + this.p(10), `${s.kills}`, {
            fontFamily: 'monospace', fontSize: this.fs(20), fontStyle: 'bold', color: '#e0e8f0',
            stroke: '#0b0f1a', strokeThickness: this.p(2),
        }).setOrigin(0.5);
        // Gold stat
        const goldLabel = this.add.text(W / 2, statsY - this.p(10), 'GOLD', {
            fontFamily: 'monospace', fontSize: this.fs(9), color: '#6a7a8a',
            letterSpacing: 2,
        }).setOrigin(0.5);
        const goldVal = this.add.text(W / 2, statsY + this.p(10), `$${s.money}`, {
            fontFamily: 'monospace', fontSize: this.fs(20), fontStyle: 'bold', color: '#ffd84a',
            stroke: '#0b0f1a', strokeThickness: this.p(2),
        }).setOrigin(0.5);
        // Ranger name stat
        const nameLabel = this.add.text(statStartX + statSpacing * 2, statsY - this.p(10), 'RANGER', {
            fontFamily: 'monospace', fontSize: this.fs(9), color: '#6a7a8a',
            letterSpacing: 2,
        }).setOrigin(0.5);
        const nameVal = this.add.text(statStartX + statSpacing * 2, statsY + this.p(10), `${s.name}`, {
            fontFamily: 'monospace', fontSize: this.fs(16), fontStyle: 'bold', color: '#7cc4ff',
            stroke: '#0b0f1a', strokeThickness: this.p(2),
        }).setOrigin(0.5);
        // Divider line above button
        panelGfx.lineStyle(this.p(1), 0x2a3760, 0.4);
        panelGfx.lineBetween(px + this.p(20), py + panelH - this.p(68), px + panelW - this.p(20), py + panelH - this.p(68));
        // Return button — styled with accent color
        const btnW = this.p(180), btnH = this.p(36), btnR = this.p(8);
        const btnX = W / 2 - btnW / 2, btnY = py + panelH - this.p(52);
        const btnGfx = this.add.graphics();
        const drawBtn = (hover) => {
            btnGfx.clear();
            btnGfx.fillStyle(hover ? (isWin ? 0x2a5a3e : 0x5a2a2a) : (isWin ? 0x1a3a2a : 0x3a1a1a), 1);
            btnGfx.fillRoundedRect(btnX, btnY, btnW, btnH, btnR);
            btnGfx.lineStyle(this.p(1.5), accent, 0.7);
            btnGfx.strokeRoundedRect(btnX, btnY, btnW, btnH, btnR);
        };
        drawBtn(false);
        const btnText = this.add.text(W / 2, btnY + btnH / 2, 'RETURN TO MAP', {
            fontFamily: 'monospace', fontSize: this.fs(12), fontStyle: 'bold', color: accentHex,
        }).setOrigin(0.5);
        const btnHit = this.add.rectangle(W / 2, btnY + btnH / 2, btnW, btnH, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        btnHit.on('pointerover', () => drawBtn(true));
        btnHit.on('pointerout', () => drawBtn(false));
        btnHit.on('pointerdown', () => {
            SFX.play('click');
            this.scene.stop('Game');
            this.scene.stop('UI');
            this.scene.start('LevelSelect');
        });
        this.endPanel = this.add.container(0, 0, [
            bg, panelGfx, title,
            killsLabel, killsVal, goldLabel, goldVal, nameLabel, nameVal,
            btnGfx, btnText, btnHit,
        ]);
    }
    shutdown() {
        this.game.events.off('hud');
        this.game.events.off('game-end');
        this.game.events.off('boss-spawn');
        this.game.events.off('boss-hp');
        this.game.events.off('boss-died');
        this.game.events.off('build-error');
        this.game.events.off('build-mode');
    }
}
