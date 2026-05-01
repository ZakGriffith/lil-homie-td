import Phaser from 'phaser';
import { CFG } from '../config';
import { Difficulty, saveMedal, LEVELS, Biome } from '../levels';
import { SFX } from '../audio/sfx';
import { VirtualJoystick } from '../ui/VirtualJoystick';

export class UIScene extends Phaser.Scene {
  hpBarGfx!: Phaser.GameObjects.Graphics;
  private hpBarX = 0; private hpBarY = 0; private hpBarW = 0; private hpBarH = 0;
  nameText!: Phaser.GameObjects.Text;
  moneyText!: Phaser.GameObjects.Text;
  btnTower!: Phaser.GameObjects.Container;
  btnCannon!: Phaser.GameObjects.Container;
  btnMage!: Phaser.GameObjects.Container;
  btnWall!: Phaser.GameObjects.Container;
  btnSpeed!: Phaser.GameObjects.Container;
  speedLabel!: Phaser.GameObjects.Text;
  speedIdx = 0;
  endPanel?: Phaser.GameObjects.Container;
  bossBarGfx?: Phaser.GameObjects.Graphics;
  private bossBarX = 0; private bossBarY = 0; private bossBarW = 0; private bossBarH = 0;
  private bossBarMaxHp = 1;
  bossLabel?: Phaser.GameObjects.Text;
  waveBarGfx!: Phaser.GameObjects.Graphics;
  private waveBarX = 0; private waveBarY = 0; private waveBarW = 0; private waveBarH = 0;
  waveLabel!: Phaser.GameObjects.Text;
  progressCircles: Phaser.GameObjects.Arc[] = [];
  progressLabels: Phaser.GameObjects.Text[] = [];
  progressLines: Phaser.GameObjects.Rectangle[] = [];
  progressContainer!: Phaser.GameObjects.Container;
  countdownText!: Phaser.GameObjects.Text;
  buildErrorText!: Phaser.GameObjects.Text;
  buildHintText!: Phaser.GameObjects.Text;

  /** Off-screen markers — drawn here so they sit above the HUD elements
   *  rather than under them (would happen if drawn in GameScene since
   *  scenes layer in registration order). */
  private towerIndicators = new Map<any, { bg: Phaser.GameObjects.Sprite; ptr: Phaser.GameObjects.Sprite }>();
  private bossIndicator: { bg: Phaser.GameObjects.Sprite; ptr: Phaser.GameObjects.Sprite } | null = null;

  /** Speed-cycle lock state — true while the tutorial is running. Locks the
   *  speed hotbar slot, the SPACE keybind, and the new `5` keybind. */
  private speedLocked = false;
  private speedLockOverlay: Phaser.GameObjects.Graphics | null = null;

  levelId = 1;
  difficulty: Difficulty = 'easy';
  biome: Biome = 'grasslands';

  /** Scale factor for native resolution rendering */
  private sf = 1;
  /** Scale a base-resolution value to native */
  private p(v: number) { return v * this.sf; }
  /** Build a font-size string at scaled resolution */
  private fs(px: number) { return `${Math.round(px * this.sf)}px`; }
  /** Design-space width (canvas divided by uiScale) — how many base units of
   *  horizontal room the UI has. Elements sized in base units must fit inside
   *  this number or they overflow the canvas. */
  private dw() { return this.scale.width / this.sf; }
  /** Design-space height. */
  private dh() { return this.scale.height / this.sf; }
  /** Mobile flag (from registry). */
  private isMobile = false;
  /** Virtual joystick (mobile only). */
  private joystick: VirtualJoystick | null = null;

  constructor() { super({ key: 'UI', active: false }); }

  init(data: any) {
    this.levelId = data?.levelId ?? 1;
    this.difficulty = data?.difficulty ?? 'easy';
    const levelDef = LEVELS.find(l => l.id === this.levelId);
    this.biome = levelDef?.biome ?? 'grasslands';
    this.endPanel = undefined;
    this.bossBarGfx = undefined;
    this.bossLabel = undefined;
    this.towerIndicators = new Map();
    this.bossIndicator = null;
    // Restore speedIdx if a prior incarnation persisted it (e.g. across a
    // viewport-driven scene restart on rotation). Default to 0 for fresh runs.
    this.speedIdx = (this.game.registry.get('uiSpeedIdx') as number) ?? 0;
  }

  create() {
    this.sf = this.game.registry.get('sf') || 1;
    this.isMobile = !!this.game.registry.get('isMobile');
    const W = this.scale.width;
    const H = this.scale.height;
    const T = this.p(20); // top padding

    // top-left HUD — bar is 25% narrower on mobile to leave room for the
    // centered wave bar. On portrait mobile the bar nudges up ~5px to tuck
    // closer under the Ranger label (label stays put).
    this.nameText = this.add.text(this.p(12), T, '', { fontFamily: 'monospace', fontSize: this.fs(14), color: '#7cc4ff' });
    const hpBarBaseW = this.isMobile ? 135 : 180;
    const isPortraitMobile = this.isMobile && H > W;
    const hpBarYOffset = isPortraitMobile ? this.p(17) : this.p(22);
    this.hpBarX = this.p(12);
    this.hpBarY = T + hpBarYOffset;
    this.hpBarW = this.p(hpBarBaseW);
    this.hpBarH = this.p(14);
    this.hpBarGfx = this.add.graphics();

    // Top-right gold badge (WoW-style, rounded). On portrait mobile, shift
    // right so the rightmost element (the coin circle, which extends to
    // coinX+p(25)) aligns with the right edge of the centered wave bar at
    // W-p(20).
    const coinX = isPortraitMobile ? W - this.p(45) : W - this.p(60);
    const coinY = T + this.p(14);
    // Dark inset panel behind the number — rounded corners
    const gbW = this.p(80), gbH = this.p(26), gbR = this.p(6);
    const gbX = coinX + this.p(6) - gbW, gbY = coinY - gbH / 2;
    const gbGfx = this.add.graphics();
    gbGfx.fillStyle(0x0b0f1a, 0.85);
    gbGfx.fillRoundedRect(gbX, gbY, gbW, gbH, gbR);
    gbGfx.lineStyle(this.p(1.5), 0x5a4a1a, 0.7);
    gbGfx.strokeRoundedRect(gbX, gbY, gbW, gbH, gbR);
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

    const slotX = (i: number) => barCenterX - (slots * slotSize + (slots - 1) * slotGap) / 2 + i * (slotSize + slotGap) + slotSize / 2;

    this.btnTower = this.makeHotbarSlot(slotX(0), hotbarY, slotSize, slotSize, '1', 'arrow', 'ARROW', '$60',
      () => this.game.events.emit('ui-build', 'tower', 'arrow'));
    // Cannon is locked on the meadow level (intro) — unlocks from forest on.
    const cannonLocked = this.levelId === 1;
    this.btnCannon = this.makeHotbarSlot(slotX(1), hotbarY, slotSize, slotSize, '2', 'cannon', 'CANNON', '$60',
      cannonLocked
        ? () => { /* locked on meadow */ }
        : () => this.game.events.emit('ui-build', 'tower', 'cannon'));
    this.btnMage = this.makeHotbarSlot(slotX(2), hotbarY, slotSize, slotSize, '3', 'mage', 'MAGE', '$80',
      () => { /* locked — mage tower not yet implemented */ });

    /** Build the padlock + dim overlay used on locked hotbar slots. */
    const buildLockOverlay = () => {
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.5);
      g.fillRoundedRect(-slotSize / 2, -slotSize / 2, slotSize, slotSize, this.p(3));
      const lx = 0, ly = this.p(2);
      g.fillStyle(0x8a8a8a, 0.9);
      g.fillRoundedRect(lx - this.p(7), ly, this.p(14), this.p(10), this.p(2));
      g.lineStyle(this.p(2.5), 0x8a8a8a, 0.9);
      g.beginPath();
      g.arc(lx, ly - this.p(1), this.p(5), Math.PI, 0, false);
      g.strokePath();
      g.fillStyle(0x222222, 1);
      g.fillCircle(lx, ly + this.p(4), this.p(2));
      g.fillRect(lx - this.p(1), ly + this.p(5), this.p(2), this.p(3));
      return g;
    };
    this.btnMage.add(buildLockOverlay());
    if (cannonLocked) this.btnCannon.add(buildLockOverlay());
    this.btnWall = this.makeHotbarSlot(slotX(3), hotbarY, slotSize, slotSize, '4', 'wall', 'WALL', `$${CFG.wall.cost}`,
      () => this.game.events.emit('ui-build', 'wall'));
    this.btnSpeed = this.makeHotbarSlot(slotX(4), hotbarY, slotSize, slotSize, 'SPC', 'speed', 'SPEED', '',
      () => { if (!this.speedLocked) this.cycleSpeed(); });
    // Speed cycle text overlay — initial text matches the persisted speedIdx
    // so a restart (e.g. viewport rotation) doesn't desync from GameScene.
    const speedLabels = ['>', '>>', '>>>'];
    this.speedLabel = this.add.text(0, 0, speedLabels[this.speedIdx] ?? '>', {
      fontFamily: 'monospace', fontSize: this.fs(16), fontStyle: 'bold', color: '#c4a850',
      stroke: '#0a0e1a', strokeThickness: this.p(3),
    }).setOrigin(0.5);
    this.btnSpeed.add(this.speedLabel);

    // Speed is locked during the tutorial. Lock state survives the lock
    // overlay so SPACE / 5 / hotbar-click all share the same gate, and we
    // can tear the overlay back off later from showSpeedUnlockToast.
    this.speedLocked = !!this.game.registry.get('tutorialActive');
    if (this.speedLocked) {
      this.speedLockOverlay = buildLockOverlay();
      this.btnSpeed.add(this.speedLockOverlay);
    }

    const tryCycleSpeed = () => {
      // While a build mode is active, the speed key bails out of build
      // instead of cycling — gives the player a quick exit during wall
      // placement without reaching for ESC.
      const game = this.scene.get('Game') as any;
      if (game?.buildKind && game.buildKind !== 'none') {
        game.setBuild('none');
        return;
      }
      if (!this.speedLocked) this.cycleSpeed();
    };
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', tryCycleSpeed);

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
    const items: Phaser.GameObjects.GameObject[] = [];

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

    // Wave progress bar (centered, same position as boss bar). Clamp to the
    // available design width so it doesn't overflow narrow mobile canvases.
    const waveBarBaseW = Math.min(420, this.dw() - 40);
    const barW = this.p(waveBarBaseW);
    const barX = (W - barW) / 2;
    const barY = T + this.p(38);
    this.waveLabel = this.add.text(W / 2, barY - this.p(16), 'WAVE 1', {
      fontFamily: 'monospace', fontSize: this.fs(14), color: '#7cc4ff',
      stroke: '#0b0f1a', strokeThickness: this.p(3)
    }).setOrigin(0.5);
    this.waveBarX = barX;
    this.waveBarY = barY;
    this.waveBarW = barW;
    this.waveBarH = this.p(14);
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
    this.buildHintText = this.add.text(W / 2, hotbarTop - this.p(38),
      this.isMobile
        ? 'Tap selected item again to leave build menu'
        : 'Right-click or ESC to leave build menu',
      {
        fontFamily: 'monospace', fontSize: this.fs(12), color: '#c8d8e8',
        stroke: '#0b0f1a', strokeThickness: this.p(3),
        backgroundColor: '#11172aDD', padding: { x: Number(this.p(8)), y: Number(this.p(4)) }
      }
    ).setOrigin(0.5, 1).setDepth(900).setVisible(false);

    // listen for HUD updates
    this.game.events.on('hud', (s: any) => this.updateHud(s));
    this.game.events.on('game-end', (s: any) => this.showEnd(s));
    this.game.events.on('boss-spawn', (s: any) => this.showBossBar(s));
    this.game.events.on('boss-hp', (s: any) => this.updateBossBar(s));
    this.game.events.on('boss-died', () => this.hideBossBar());
    // After the tutorial wraps, give the player a couple seconds to read
    // "Great job, Ranger!", then pop the speed-up unlock toast and
    // remove the speed slot's padlock.
    this.game.events.on('tutorial-finished', () => {
      this.time.delayedCall(2000, () => this.showSpeedUnlockToast());
    });
    this.game.events.on('build-error', (msg: string) => {
      if (msg) {
        this.buildErrorText.setText(msg).setVisible(true);
      } else {
        this.buildErrorText.setVisible(false);
      }
    });
    this.game.events.on('build-mode', (active: boolean, kind?: string, towerKind?: string) => {
      this.buildHintText.setVisible(active);
      if (!active) this.buildErrorText.setVisible(false);
      // Highlight the matching hotbar slot so the player can see at a glance
      // which build is active (and which to re-tap to exit on mobile).
      (this.btnTower as any).setSelected?.(active && kind === 'tower' && towerKind === 'arrow');
      (this.btnCannon as any).setSelected?.(active && kind === 'tower' && towerKind === 'cannon');
      (this.btnWall as any).setSelected?.(active && kind === 'wall');
    });

    // Recover the end-panel after a UI restart (e.g. mid-rotation): if the
    // game already ended and we missed the live event, replay it now.
    const gameEndState = this.game.registry.get('gameEndState') as any;
    if (gameEndState) this.showEnd(gameEndState);

    // Pull the current HUD state from GameScene so the HP / wave bars
    // render at their real values immediately on rotation, instead of
    // showing as empty until the next hud event fires.
    const game = this.scene.get('Game') as any;
    if (game && typeof game.hudState === 'function') {
      this.updateHud(game.hudState());
    }

    // Re-apply the active build-mode highlight after a UI restart (rotation),
    // since the new hotbar slots default to !isSelected. Also reshow the
    // build hint text if a build is in progress.
    const activeKind = game?.buildKind;
    const activeTowerKind = game?.buildTowerKind;
    if (activeKind && activeKind !== 'none') {
      (this.btnTower as any).setSelected?.(activeKind === 'tower' && activeTowerKind === 'arrow');
      (this.btnCannon as any).setSelected?.(activeKind === 'tower' && activeTowerKind === 'cannon');
      (this.btnWall as any).setSelected?.(activeKind === 'wall');
      this.buildHintText.setVisible(true);
    }

    // GameScene runs setGameSize during its create() and immediately
    // schedules a UIScene restart so the HUD lays out at the final size.
    // On that throwaway first pass we skip one-time side effects (intro
    // toasts) — they'd fire against the wrong layout, set their
    // localStorage flags, and then get cancelled by the restart, eating
    // the player's only chance to see them.
    const bootingForResize = !!this.game.registry.get('uiBootingForResize');

    // First time the player drops into the forest level (level 2), pop a
    // 6-second tooltip introducing the now-unlocked cannon tower. Flag is
    // stored in localStorage so it only fires once across sessions.
    if (!bootingForResize && this.levelId === 2 && localStorage.getItem('td_seen_forest_intro') !== 'true') {
      this.showForestIntroToast();
      localStorage.setItem('td_seen_forest_intro', 'true');
    }

    // First time the player drops into the infected level (level 3),
    // warn them about ranged enemies — toads here, mosquitos and others
    // later — and explain that some projectiles arc over walls/towers
    // while others get blocked.
    if (!bootingForResize && this.levelId === 3 && localStorage.getItem('td_seen_infected_intro') !== 'true') {
      this.showInfectedIntroToast();
      localStorage.setItem('td_seen_infected_intro', 'true');
    }

    // First time the player drops into the castle level (level 5), warn
    // them about the unique 2-boss / 4-wave structure so they pace
    // resources accordingly (mid-boss after wave 2, final after wave 4).
    if (!bootingForResize && this.levelId === 5 && localStorage.getItem('td_seen_castle_intro') !== 'true') {
      this.showCastleIntroToast();
      localStorage.setItem('td_seen_castle_intro', 'true');
    }


    // ---- Mobile virtual joystick (lower-left) ----
    if (this.isMobile) {
      const outerR = this.p(60);
      const innerR = this.p(28);
      // Portrait: lift the joystick above the bottom hotbar (slot top at
      // H - p(80), labels extend below to ~H - p(18)). Landscape: hotbar is
      // horizontally centered with no overlap on the left, so we can sit lower.
      const isPortraitNow = this.scale.height > this.scale.width;
      const margin = this.p(isPortraitNow ? 130 : 60);
      const cx = this.p(40) + outerR;
      const cy = H - margin - outerR;
      const touchPad = this.p(20);
      this.joystick = new VirtualJoystick(this, cx, cy, outerR, innerR, outerR + touchPad);

      // Publish the joystick's screen-space hit rect so GameScene can ignore
      // taps in this region (otherwise tapping the stick during build mode
      // would also fire handleClick and try to place a tower under your thumb).
      const halfSize = outerR + touchPad;
      this.game.registry.set('joystickBounds', {
        x: cx - halfSize,
        y: cy - halfSize,
        w: halfSize * 2,
        h: halfSize * 2,
      });
    }

    // Publish joystick state to the registry every frame so GameScene can read
    // it from updatePlayer without coupling the two scenes through events.
    this.events.on(Phaser.Scenes.Events.UPDATE, () => {
      if (this.joystick) {
        this.game.registry.set('joystickX', this.joystick.x);
        this.game.registry.set('joystickY', this.joystick.y);
      }
    });

    // If a boss is alive (e.g. we just restarted on rotation), rebuild the
    // boss bar from registry state since boss-spawn is one-shot and we missed
    // the original event.
    if (this.game.registry.get('bossActive')) {
      const bossMaxHp = (this.game.registry.get('bossMaxHp') as number) || 1;
      const bossHp = (this.game.registry.get('bossHp') as number) || 0;
      const biome = this.game.registry.get('bossBiome') as string;
      this.showBossBar({ maxHp: bossMaxHp, biome });
      this.updateBossBar({ hp: bossHp, maxHp: bossMaxHp });
    }

    // Re-layout on rotation / window resize. Restarting cleanly rebuilds every
    // element at the new uiScale; shutdown() above unbinds the listeners so
    // they don't accumulate across restarts.
    const onViewportChanged = () => {
      // Clear joystick state so the player doesn't drift after restart.
      this.game.registry.set('joystickX', 0);
      this.game.registry.set('joystickY', 0);
      if (this.scene.isActive('UI')) this.scene.restart();
    };
    this.game.events.on('viewport-changed', onViewportChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('viewport-changed', onViewportChanged);
    });
  }

  showBossBar(s: any) {
    const W = this.scale.width;
    const barW = this.p(Math.min(420, this.dw() - 40));
    const x = (W - barW) / 2;
    const y = this.p(58); // 20 (top pad) + 38
    // Destroy previous boss bar if any (for multi-boss levels like Castle)
    this.hideBossBar();

    // First time the player ever sees a boss spawn (always the meadow's
    // Ancient Ram, even during the tutorial), pop a quick warning so they
    // know bosses are dangerous and will smash structures.
    if (s?.biome === 'grasslands' && localStorage.getItem('td_seen_first_boss_intro') !== 'true') {
      this.showFirstBossIntroToast();
      localStorage.setItem('td_seen_first_boss_intro', 'true');
    }
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
    this.bossBarX = x;
    this.bossBarY = y;
    this.bossBarW = barW;
    this.bossBarH = this.p(14);
    this.bossBarMaxHp = s?.maxHp ?? 1;
    this.bossBarGfx = this.add.graphics();
    // Draw immediately at full HP so the bar appears the moment the boss spawns
    this.updateBossBar({ hp: this.bossBarMaxHp, maxHp: this.bossBarMaxHp });
  }

  hideBossBar() {
    if (this.bossBarGfx) { this.bossBarGfx.destroy(); this.bossBarGfx = undefined; }
    if (this.bossLabel) { this.bossLabel.destroy(); this.bossLabel = undefined; }
  }

  updateBossBar(s: any) {
    if (!this.bossBarGfx) return;
    const maxHp = this.bossBarMaxHp || s.maxHp || 1;
    const pct = Math.max(0, (s.hp ?? 0) / maxHp);
    const x = this.bossBarX, y = this.bossBarY, w = this.bossBarW, h = this.bossBarH;
    const r = this.p(5);
    const bossColor = pct > 0.5 ? 0xd94a4a : pct > 0.25 ? 0xd97a4a : 0xff3030;
    this.bossBarGfx.clear();
    this.bossBarGfx.fillStyle(0x11172a, 1);
    this.bossBarGfx.fillRoundedRect(x, y, w, h, r);
    this.bossBarGfx.lineStyle(this.p(1.5), 0x6a2a2a, 0.8);
    this.bossBarGfx.strokeRoundedRect(x, y, w, h, r);
    const fillW = (w - this.p(4)) * pct;
    if (fillW > 0) {
      this.bossBarGfx.fillStyle(bossColor, 1);
      this.bossBarGfx.fillRoundedRect(x + this.p(2), y + this.p(2), fillW, h - this.p(4), r - this.p(1));
    }
  }

  cycleSpeed() {
    const speeds = [1.25, 2, 3.75];
    const labels = ['>', '>>', '>>>'];
    this.speedIdx = (this.speedIdx + 1) % speeds.length;
    this.speedLabel.setText(labels[this.speedIdx]);
    this.game.events.emit('ui-speed', speeds[this.speedIdx]);
    // Persist so a viewport-driven scene restart preserves the chosen speed.
    this.game.registry.set('uiSpeedIdx', this.speedIdx);
  }

  makeButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void) {
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

  makeHotbarSlot(cx: number, topY: number, w: number, h: number, key: string, icon: string, name: string, cost: string, onClick: () => void) {
    const my = topY + h / 2;
    const c = this.add.container(cx, my);

    const g = this.add.graphics();
    let isHover = false;
    let isSelected = false;
    const drawSlot = () => {
      g.clear();
      // Outer glow ring + thicker border when this slot's build kind is the
      // active one (mobile only — desktop has the keybind badge / right-click
      // affordance to communicate selection).
      if (isSelected && this.isMobile) {
        g.lineStyle(this.p(2), 0xffd84a, 0.5);
        g.strokeRoundedRect(-w / 2 - this.p(3), -h / 2 - this.p(3), w + this.p(6), h + this.p(6), this.p(5));
        g.lineStyle(this.p(1.5), 0xffd84a, 0.25);
        g.strokeRoundedRect(-w / 2 - this.p(5), -h / 2 - this.p(5), w + this.p(10), h + this.p(10), this.p(6));
      }
      // Slot fill
      g.fillStyle(isHover ? 0x141c30 : 0x0a0e1a, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, this.p(3));
      // Gold border — thicker / brighter when selected on mobile.
      const borderW = (isSelected && this.isMobile) ? this.p(3) : this.p(1.5);
      const borderColor = (isSelected && this.isMobile)
        ? 0xffd84a
        : (isHover ? 0xc4a030 : 0x8a6a20);
      g.lineStyle(borderW, borderColor, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, this.p(3));
      // Inner glow
      g.lineStyle(this.p(1), isHover ? 0xa08830 : 0xa08030, isHover ? 0.2 : 0.12);
      g.strokeRoundedRect(-w / 2 + this.p(2), -h / 2 + this.p(2), w - this.p(4), h - this.p(4), this.p(2));
    };
    drawSlot();

    // Hit area
    const hitRect = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    hitRect.on('pointerdown', () => { SFX.play('click'); onClick(); });
    hitRect.on('pointerover', () => { isHover = true; drawSlot(); });
    hitRect.on('pointerout', () => { isHover = false; drawSlot(); });

    // Draw icon
    const iconG = this.add.graphics();
    this.drawSlotIcon(iconG, icon);

    // Keybind badge (top-left corner) — desktop only; the keys it displays
    // (1/2/3/4/SPC) don't apply on touch devices.
    const items: Phaser.GameObjects.GameObject[] = [g, hitRect, iconG];
    if (!this.isMobile) {
      const badgeW = key.length > 2 ? this.p(22) : this.p(13);
      const badgeBg = this.add.rectangle(-w / 2 + badgeW / 2 + this.p(1), -h / 2 + this.p(7), badgeW, this.p(12), 0x0a0e1a, 0.9)
        .setStrokeStyle(this.p(0.5), 0x8a6a20, 0.5);
      const badge = this.add.text(-w / 2 + badgeW / 2 + this.p(1), -h / 2 + this.p(7), key, {
        fontFamily: 'monospace', fontSize: this.fs(8), color: '#a08830',
      }).setOrigin(0.5);
      items.push(badgeBg, badge);
    }

    // Name label below slot
    const nameLabel = this.add.text(0, h / 2 + this.p(4), name, {
      fontFamily: 'monospace', fontSize: this.fs(8), color: '#8a9ab0',
    }).setOrigin(0.5, 0);

    items.push(nameLabel);

    // Cost label below name
    if (cost) {
      const costLabel = this.add.text(0, h / 2 + this.p(14), cost, {
        fontFamily: 'monospace', fontSize: this.fs(8), color: '#ffd84a',
      }).setOrigin(0.5, 0);
      items.push(costLabel);
    }

    c.add(items);
    // Expose a setter so the build-mode listener can highlight this slot
    // when it matches the active build kind.
    (c as any).setSelected = (sel: boolean) => { isSelected = sel; drawSlot(); };
    return c;
  }

  drawSlotIcon(g: Phaser.GameObjects.Graphics, icon: string) {
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
        g.fillStyle(colors[0], 1); g.fillRect(ox + 2 * s, oy + 4 * s, bw, bh);
        g.fillStyle(colors[1], 1); g.fillRect(ox + 15 * s, oy + 4 * s, bw, bh);
        // Row 1 (y=11): offset — half brick, full brick, half brick
        g.fillStyle(colors[1], 1); g.fillRect(ox + 8 * s, oy + 11 * s, bw, bh);
        g.fillStyle(colors[0], 1); g.fillRect(ox + 2 * s, oy + 11 * s, 5 * s, bh);
        g.fillStyle(colors[0], 1); g.fillRect(ox + 20 * s, oy + 11 * s, 6 * s, bh);
        // Row 2 (y=18): two full-width bricks
        g.fillStyle(colors[0], 1); g.fillRect(ox + 2 * s, oy + 18 * s, bw, bh);
        g.fillStyle(colors[1], 1); g.fillRect(ox + 15 * s, oy + 18 * s, bw, bh);
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

  updateHud(s: any) {
    if (!s) return;
    this.nameText.setText(s.name ?? 'Ranger');
    const pct = Math.max(0, s.hp / s.maxHp);
    const hpColor = pct > 0.5 ? 0x4ad96a : pct > 0.25 ? 0xd9a84a : 0xd94a4a;
    const hpX = this.hpBarX, hpY = this.hpBarY, hpW = this.hpBarW, hpH = this.hpBarH;
    const hpR = this.p(5);
    this.hpBarGfx.clear();
    this.hpBarGfx.fillStyle(0x111826, 1);
    this.hpBarGfx.fillRoundedRect(hpX, hpY, hpW, hpH, hpR);
    this.hpBarGfx.lineStyle(this.p(1.5), 0x3a4a70, 0.8);
    this.hpBarGfx.strokeRoundedRect(hpX, hpY, hpW, hpH, hpR);
    const hpFillW = (hpW - this.p(4)) * pct;
    if (hpFillW > 0) {
      this.hpBarGfx.fillStyle(hpColor, 1);
      this.hpBarGfx.fillRoundedRect(hpX + this.p(2), hpY + this.p(2), hpFillW, hpH - this.p(4), hpR - this.p(1));
    }
    this.moneyText.setText(`${s.money}`);

    // Toggle countdown text vs progress graphic
    if (s.countdownMsg) {
      this.countdownText.setText(s.countdownMsg);
      this.countdownText.setColor(s.countdownColor ?? '#7cc4ff');
      this.countdownText.setVisible(true);
      this.progressContainer.setVisible(false);
    } else {
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
        } else if (i === 1) { // Wave 2
          completed = cp >= 1;
          current = currentWave === 2 && cp === 0;
        } else if (i === 2) { // Queen boss
          completed = s.midBossDefeated;
          active = cp === 1 && s.bossSpawned;
        } else if (i === 3) { // Wave 3
          completed = (cp >= 2 && currentWave > 3) || cp >= 3;
          current = currentWave === 3 && cp === 2;
        } else if (i === 4) { // Wave 4
          completed = cp >= 3;
          current = currentWave === 4 && cp === 2;
        } else if (i === 5) { // Dragon boss
          active = cp === 3 && s.bossSpawned;
        }

        if (isBossNode) {
          if (completed) {
            this.progressCircles[i].setStrokeStyle(this.p(2), 0x4ad96a);
            this.progressCircles[i].setFillStyle(0x1a3a1a);
            this.progressLabels[i].setColor('#4ad96a');
          } else if (active) {
            this.progressCircles[i].setStrokeStyle(this.p(2), 0xff6a6a);
            this.progressCircles[i].setFillStyle(0x3a1010);
            this.progressLabels[i].setColor('#ff6a6a');
          } else {
            this.progressCircles[i].setStrokeStyle(this.p(2), 0x2a3760);
            this.progressCircles[i].setFillStyle(0x11172a);
            this.progressLabels[i].setColor('#556');
          }
        } else if (completed) {
          this.progressCircles[i].setStrokeStyle(this.p(2), 0x4ad96a);
          this.progressCircles[i].setFillStyle(0x1a3a1a);
          this.progressLabels[i].setText('\u2713');
          this.progressLabels[i].setColor('#4ad96a');
        } else if (current) {
          this.progressCircles[i].setStrokeStyle(this.p(2), 0x7cc4ff);
          this.progressCircles[i].setFillStyle(0x1a2a4a);
          this.progressLabels[i].setColor('#7cc4ff');
        } else {
          this.progressCircles[i].setStrokeStyle(this.p(2), 0x2a3760);
          this.progressCircles[i].setFillStyle(0x11172a);
          this.progressLabels[i].setColor('#556');
        }
        if (i < this.progressLines.length) {
          if (completed) this.progressLines[i].setFillStyle(0x4ad96a);
          else if (current || active) this.progressLines[i].setFillStyle(0x7cc4ff);
          else this.progressLines[i].setFillStyle(0x2a3760);
        }
      }
    } else {
      const waveCount = CFG.spawn.waveCount;
      for (let i = 0; i < this.progressCircles.length; i++) {
        const isBoss = i === waveCount;
        const waveNum = i + 1; // 1-indexed wave for this node
        if (isBoss) {
          if (s.bossSpawned) {
            // Boss active - highlight red
            this.progressCircles[i].setStrokeStyle(this.p(2), 0xff6a6a);
            this.progressCircles[i].setFillStyle(0x3a1010);
            this.progressLabels[i].setColor('#ff6a6a');
          } else {
            // Boss not yet
            this.progressCircles[i].setStrokeStyle(this.p(2), 0x2a3760);
            this.progressCircles[i].setFillStyle(0x11172a);
            this.progressLabels[i].setColor('#556');
          }
        } else if (waveNum < currentWave || (waveNum === currentWave && s.bossSpawned)) {
          // Completed wave - green with checkmark
          this.progressCircles[i].setStrokeStyle(this.p(2), 0x4ad96a);
          this.progressCircles[i].setFillStyle(0x1a3a1a);
          this.progressLabels[i].setText('\u2713');
          this.progressLabels[i].setColor('#4ad96a');
        } else if (waveNum === currentWave) {
          // Current wave - bright blue highlight
          this.progressCircles[i].setStrokeStyle(this.p(2), 0x7cc4ff);
          this.progressCircles[i].setFillStyle(0x1a2a4a);
          this.progressLabels[i].setText(`${waveNum}`);
          this.progressLabels[i].setColor('#7cc4ff');
        } else {
          // Future wave - dim
          this.progressCircles[i].setStrokeStyle(this.p(2), 0x2a3760);
          this.progressCircles[i].setFillStyle(0x11172a);
          this.progressLabels[i].setText(`${waveNum}`);
          this.progressLabels[i].setColor('#556');
        }
        // Update connecting line colors
        if (i < this.progressLines.length) {
          if (waveNum < currentWave || (waveNum === currentWave && s.bossSpawned)) {
            this.progressLines[i].setFillStyle(0x4ad96a);
          } else if (waveNum === currentWave) {
            this.progressLines[i].setFillStyle(0x7cc4ff);
          } else {
            this.progressLines[i].setFillStyle(0x2a3760);
          }
        }
      }
    }

    // Wave progress bar
    this.waveBarGfx.clear();
    if (s.bossSpawned) {
      // Hide wave bar when boss is active (boss bar takes its place)
      this.waveLabel.setVisible(false);
      this.waveBarGfx.setVisible(false);
    } else {
      this.waveBarGfx.setVisible(true);
      this.waveLabel.setVisible(true);
      const wbX = this.waveBarX, wbY = this.waveBarY, wbW = this.waveBarW, wbH = this.waveBarH;
      const wbR = this.p(5);
      this.waveBarGfx.fillStyle(0x11172a, 1);
      this.waveBarGfx.fillRoundedRect(wbX, wbY, wbW, wbH, wbR);
      this.waveBarGfx.lineStyle(this.p(1.5), 0x3a4a70, 0.8);
      this.waveBarGfx.strokeRoundedRect(wbX, wbY, wbW, wbH, wbR);
      const wavePct = s.waveSize > 0 ? Math.min(1, s.waveKills / s.waveSize) : 0;
      const wbFillW = (wbW - this.p(4)) * (1 - wavePct);
      if (wbFillW > 0) {
        this.waveBarGfx.fillStyle(0x4a8ad9, 1);
        this.waveBarGfx.fillRoundedRect(wbX + this.p(2), wbY + this.p(2), wbFillW, wbH - this.p(4), wbR - this.p(1));
      }

      if (s.waveBreakUntil > 0 && s.vTime < s.waveBreakUntil) {
        const secs = Math.ceil((s.waveBreakUntil - s.vTime) / 1000);
        this.waveLabel.setText(`WAVE ${s.wave} IN ${secs}s`);
        this.waveLabel.setColor('#ffd84a');
      } else {
        this.waveLabel.setText(`WAVE ${s.wave}`);
        this.waveLabel.setColor('#7cc4ff');
      }
    }
  }

  /** Per-frame loop — Phaser auto-calls this on a running scene. We use it
   *  to refresh the off-screen tower / boss indicators against GameScene
   *  state. The indicators live here so they render above the HUD. */
  update() {
    this.updateIndicators();
  }

  private updateIndicators() {
    const game = this.scene.get('Game') as any;
    if (!game || !game.cameras?.main || !game.towers) return;
    const gameCam = game.cameras.main;
    const wv = gameCam.worldView;
    const mid = gameCam.midPoint;

    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2, cy = H / 2;
    const pad = this.p(28);
    const margin = 40;
    const offset = this.p(18);
    const iconScale = this.p(0.5);

    // ---- Tower indicators
    const towers = game.towers as any[];
    const alive = new Set(towers);
    for (const t of towers) {
      const onScreen = t.x > wv.x - margin && t.x < wv.right + margin &&
                       t.y > wv.y - margin && t.y < wv.bottom + margin;
      let ind = this.towerIndicators.get(t);
      if (!ind) {
        const texKey = t.kind === 'arrow' ? 'ind_arrow' : 'ind_cannon';
        const bg = this.add.sprite(0, 0, texKey)
          .setDepth(950).setScale(iconScale).setAlpha(0.9).setVisible(false);
        const ptr = this.add.sprite(0, 0, 'ind_ptr')
          .setDepth(950.1).setScale(iconScale).setAlpha(0.9).setVisible(false);
        ind = { bg, ptr };
        this.towerIndicators.set(t, ind);
      }
      if (onScreen) {
        ind.bg.setVisible(false);
        ind.ptr.setVisible(false);
        continue;
      }
      const dx = t.x - mid.x;
      const dy = t.y - mid.y;
      if (dx === 0 && dy === 0) continue;
      const sX = dx !== 0 ? (cx - pad) / Math.abs(dx) : Infinity;
      const sY = dy !== 0 ? (cy - pad) / Math.abs(dy) : Infinity;
      const s = Math.min(sX, sY);
      const edgeX = cx + dx * s;
      const edgeY = cy + dy * s;
      const angle = Math.atan2(dy, dx);
      ind.bg.setPosition(edgeX, edgeY).setVisible(true);
      ind.ptr.setPosition(edgeX + Math.cos(angle) * offset, edgeY + Math.sin(angle) * offset)
        .setRotation(angle).setVisible(true);
    }
    // Cleanup destroyed towers
    for (const [t, ind] of this.towerIndicators) {
      if (!alive.has(t)) {
        ind.bg.destroy();
        ind.ptr.destroy();
        this.towerIndicators.delete(t);
      }
    }

    // ---- Boss indicator (regular bosses + castle queen/dragon)
    const b = game.boss;
    if (b && b.active && !b.dying) {
      const bossOnScreen = b.x > wv.x - margin && b.x < wv.right + margin &&
                           b.y > wv.y - margin && b.y < wv.bottom + margin;
      if (!this.bossIndicator) {
        const bg = this.add.sprite(0, 0, 'ind_boss')
          .setDepth(950).setScale(iconScale).setAlpha(0.9).setVisible(false);
        const ptr = this.add.sprite(0, 0, 'ind_ptr')
          .setDepth(950.1).setScale(iconScale).setAlpha(0.9).setVisible(false);
        this.bossIndicator = { bg, ptr };
      }
      if (bossOnScreen) {
        this.bossIndicator.bg.setVisible(false);
        this.bossIndicator.ptr.setVisible(false);
      } else {
        const dx = b.x - mid.x;
        const dy = b.y - mid.y;
        if (dx !== 0 || dy !== 0) {
          const sX = dx !== 0 ? (cx - pad) / Math.abs(dx) : Infinity;
          const sY = dy !== 0 ? (cy - pad) / Math.abs(dy) : Infinity;
          const s = Math.min(sX, sY);
          const edgeX = cx + dx * s;
          const edgeY = cy + dy * s;
          const angle = Math.atan2(dy, dx);
          this.bossIndicator.bg.setPosition(edgeX, edgeY).setVisible(true);
          this.bossIndicator.ptr.setPosition(edgeX + Math.cos(angle) * offset, edgeY + Math.sin(angle) * offset)
            .setRotation(angle).setVisible(true);
        }
      }
    } else if (this.bossIndicator) {
      this.bossIndicator.bg.destroy();
      this.bossIndicator.ptr.destroy();
      this.bossIndicator = null;
    }
  }

  /** Shared rounded-toast helper used by the one-time intro tooltips
   *  (cannon unlock, first boss warning, ...). `accent` colors the outer
   *  border; `totalDurationMs` is the on-screen lifetime (last 500ms is a
   *  fade), defaulting to 6000ms (5500 visible + 500 fade). */
  private showIntroToast(message: string, accent: number, y: number, totalDurationMs = 6000) {
    const W = this.scale.width;
    const H = this.scale.height;
    const text = this.add.text(W / 2, y, message, {
      fontFamily: 'monospace', fontSize: this.fs(14), fontStyle: 'bold',
      color: '#ffffff', align: 'center', stroke: '#0b0f1a', strokeThickness: this.p(3),
    }).setOrigin(0.5).setDepth(951);

    // Mobile landscape: float toasts on the right edge so they don't cover
    // the centered gameplay area. Matches the TutorialScene in-game prompt
    // anchoring so all in-game tutorial guidance reads in the same place.
    if (this.isMobile && W > H) {
      text.setOrigin(1, 0.5).setPosition(W - this.p(20), H / 2);
    }

    const tb = text.getBounds();
    const padX = this.p(20), padY = this.p(14);
    const boxX = tb.x - padX, boxY = tb.y - padY;
    const boxW = tb.width + padX * 2, boxH = tb.height + padY * 2;
    const r = this.p(8);
    const panel = this.add.graphics().setDepth(950);
    panel.fillStyle(0x11172a, 0.95);
    panel.fillRoundedRect(boxX, boxY, boxW, boxH, r);
    panel.lineStyle(this.p(1), 0x2a3760, 0.7);
    panel.strokeRoundedRect(boxX + this.p(3), boxY + this.p(3), boxW - this.p(6), boxH - this.p(6), r - this.p(2));
    panel.lineStyle(this.p(2), accent, 0.9);
    panel.strokeRoundedRect(boxX, boxY, boxW, boxH, r);

    this.time.delayedCall(Math.max(0, totalDurationMs - 500), () => {
      this.tweens.add({
        targets: [panel, text],
        alpha: 0,
        duration: 500,
        onComplete: () => { panel.destroy(); text.destroy(); }
      });
    });
  }

  /** First time the player enters the forest — introduces cannon tower. */
  private showForestIntroToast() {
    this.showIntroToast(
      'CANNON TOWER UNLOCKED!\n\nGreat for AoE damage against\nclusters of enemies.',
      0x4a8acc, // blue info accent
      this.p(150) // sit below the wave/phase bar so it doesn't cover it
    );
  }

  /** First time the player enters the infected level — first ranged
   *  enemies. Sets expectations for both styles: blockable line-of-sight
   *  shots and arcing projectiles that ignore walls and towers. */
  private showInfectedIntroToast() {
    this.showIntroToast(
      'RANGED ENEMIES INCOMING!\n\nSome projectiles can\'t shoot through\nwalls or towers — others arc right over them.\nPosition your defenses carefully.',
      0x9a5ac0, // purple/infected accent
      this.p(110)
    );
  }

  /** First time the player enters the castle level — heads-up that this
   *  level breaks the usual "waves then a boss" pattern: two bosses and
   *  only four waves total (mid-boss after wave 2, final after wave 4). */
  private showCastleIntroToast() {
    this.showIntroToast(
      'WATCH OUT!\n\nThere will be more waves and\ntwo bosses on this level!',
      0xc4a850, // gold accent — castle / royalty vibe
      this.p(150)
    );
  }

  /** First time the player ever fights a boss — danger warning. Lower
   *  on the screen so it doesn't overlap the just-appeared boss HP bar. */
  private showFirstBossIntroToast() {
    this.showIntroToast(
      'YOUR FIRST BOSS IS SPAWNING!\n\nCareful — bosses have special abilities\nand can destroy walls and towers.',
      0xd94a4a, // red danger accent
      this.p(160)
    );
  }

  /** Speed-up tutorial — fired ~2s after the tutorial finishes. Removes
   *  the speed-slot lock at the moment the tip shows so the player can
   *  try it immediately. Stays on screen for 5s total. */
  private showSpeedUnlockToast() {
    this.speedLocked = false;
    if (this.speedLockOverlay) {
      this.speedLockOverlay.destroy();
      this.speedLockOverlay = null;
    }
    this.showIntroToast(
      this.isMobile
        ? 'SPEED UP UNLOCKED!\n\nTap the speed slot to cycle through game speeds.'
        : 'SPEED UP UNLOCKED!\n\nClick the speed slot or press SPACE\nto cycle through game speeds.',
      0xc4a850, // gold/yellow accent matching the speed label
      this.p(150), // matches the in-game tutorial prompt y so it clears the wave bar
      5000
    );
  }

  showEnd(s: any) {
    if (this.endPanel) return;
    if (s.win) saveMedal(this.levelId, this.difficulty);
    const W = this.scale.width, H = this.scale.height;

    // Themed colors — green for VICTORY, red for DEFEAT. Hex strings used
    // for text, packed ints for Graphics fills/strokes.
    const accent = s.win ? 0x4ad96a : 0xd94a4a;
    const titleHex = s.win ? '#7cf29a' : '#ff6a6a';

    // Fullscreen dim
    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0);

    // Modal panel — matches the HUD's rounded-rect language: dark navy fill,
    // subtle inner stroke, themed outer stroke. Same colour family as the
    // HP / wave / boss bars.
    const boxW = this.p(380), boxH = this.p(200);
    const boxX = W / 2 - boxW / 2, boxY = H / 2 - boxH / 2;
    const boxR = this.p(10);
    const panel = this.add.graphics();
    panel.fillStyle(0x11172a, 0.97);
    panel.fillRoundedRect(boxX, boxY, boxW, boxH, boxR);
    panel.lineStyle(this.p(1), 0x2a3760, 0.7);
    panel.strokeRoundedRect(boxX + this.p(3), boxY + this.p(3), boxW - this.p(6), boxH - this.p(6), boxR - this.p(2));
    panel.lineStyle(this.p(2), accent, 0.9);
    panel.strokeRoundedRect(boxX, boxY, boxW, boxH, boxR);

    // Title
    const title = this.add.text(W / 2, H / 2 - this.p(60), s.win ? 'VICTORY' : 'DEFEAT', {
      fontFamily: 'monospace', fontSize: this.fs(32), fontStyle: 'bold',
      color: titleHex, stroke: '#0b0f1a', strokeThickness: this.p(4)
    }).setOrigin(0.5);

    // Stats line
    const sub = this.add.text(W / 2, H / 2 - this.p(15), `${s.name}   Kills: ${s.kills}   $ ${s.money}`, {
      fontFamily: 'monospace', fontSize: this.fs(14), color: '#ccd',
      stroke: '#0b0f1a', strokeThickness: this.p(2)
    }).setOrigin(0.5);

    // RETURN TO MAP button — rounded, themed border, text in accent colour.
    const btnW = this.p(160), btnH = this.p(36);
    const btnCX = W / 2, btnCY = H / 2 + this.p(45);
    const btnX = btnCX - btnW / 2, btnY = btnCY - btnH / 2;
    const btnR = this.p(7);
    const btnG = this.add.graphics();
    const drawBtn = (hover: boolean) => {
      btnG.clear();
      btnG.fillStyle(hover ? 0x1a2238 : 0x0b0f1a, 0.95);
      btnG.fillRoundedRect(btnX, btnY, btnW, btnH, btnR);
      btnG.lineStyle(this.p(1.5), accent, hover ? 1 : 0.85);
      btnG.strokeRoundedRect(btnX, btnY, btnW, btnH, btnR);
    };
    drawBtn(false);
    const btnText = this.add.text(btnCX, btnCY, 'RETURN TO MAP', {
      fontFamily: 'monospace', fontSize: this.fs(13), fontStyle: 'bold',
      color: titleHex, stroke: '#0b0f1a', strokeThickness: this.p(2)
    }).setOrigin(0.5);
    const btnHit = this.add.rectangle(btnCX, btnCY, btnW, btnH, 0x000000, 0).setInteractive({ useHandCursor: true });
    btnHit.on('pointerdown', () => {
      SFX.play('click');
      this.scene.stop('Game');
      this.scene.stop('UI');
      this.scene.start('LevelSelect');
    });
    btnHit.on('pointerover', () => drawBtn(true));
    btnHit.on('pointerout', () => drawBtn(false));

    this.endPanel = this.add.container(0, 0, [bg, panel, title, sub, btnG, btnText, btnHit]).setDepth(1000);
  }

  shutdown() {
    // Drop any lingering off-screen indicator sprites — they're tied to the
    // GameScene tower/boss instances which don't survive a scene restart.
    for (const [, ind] of this.towerIndicators) { ind.bg.destroy(); ind.ptr.destroy(); }
    this.towerIndicators.clear();
    if (this.bossIndicator) {
      this.bossIndicator.bg.destroy();
      this.bossIndicator.ptr.destroy();
      this.bossIndicator = null;
    }
    this.game.events.off('hud');
    this.game.events.off('game-end');
    this.game.events.off('boss-spawn');
    this.game.events.off('boss-hp');
    this.game.events.off('boss-died');
    this.game.events.off('tutorial-finished');
    this.game.events.off('build-error');
    this.game.events.off('build-mode');
  }
}
