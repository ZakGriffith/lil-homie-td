import Phaser from 'phaser';
import { CFG } from '../config';
import { loadMedals, totalMedals } from '../levels';
import { Enemy } from '../entities/Enemy';

const STORAGE_KEY = 'td_tutorial_done';

export function isTutorialNeeded(): boolean {
  if (localStorage.getItem(STORAGE_KEY) === 'true') return false;
  return totalMedals(loadMedals()) === 0;
}

export function markTutorialDone(): void {
  localStorage.setItem(STORAGE_KEY, 'true');
}

type Step =
  | 'ls_click_meadow'
  | 'ls_click_easy'
  | 'ls_click_start'
  | 'game_move'
  | 'game_hud'
  | 'game_stand_still'
  | 'game_kill'
  | 'game_press_1'
  | 'game_place_tower'
  | 'game_watch_tower'
  | 'game_press_4'
  | 'game_place_walls'
  | 'game_exit_build'
  | 'game_loot_coins'
  | 'game_click_tower'
  | 'game_upgrade_tower'
  | 'game_deselect_tower'
  | 'game_done'
  | 'complete';

export class TutorialScene extends Phaser.Scene {
  step: Step = 'ls_click_meadow';
  overlay!: Phaser.GameObjects.Graphics;
  textBg!: Phaser.GameObjects.Graphics;
  promptText!: Phaser.GameObjects.Text;
  arrowGfx!: Phaser.GameObjects.Graphics;
  skipBtn!: Phaser.GameObjects.Text;
  private sf = 1;
  private p(v: number) { return v * this.sf; }
  private fs(px: number) { return `${Math.round(px * this.sf)}px`; }

  hudLabels: Phaser.GameObjects.GameObject[] = [];
  hudClickZone: Phaser.GameObjects.Rectangle | null = null;
  continueZone: Phaser.GameObjects.Rectangle | null = null;

  // Tracking
  moveDist = 0;
  lastPx = 0;
  lastPy = 0;
  tutorialKills = 0;
  wallsPlaced = 0;
  watchTimer = 0;
  stepDelay = 0;

  constructor() { super('Tutorial'); }

  create() {
    this.sf = this.game.registry.get('sf') || 1;
    const W = this.scale.width;
    const H = this.scale.height;

    // Full-screen dim overlay
    this.overlay = this.add.graphics().setDepth(100);

    // Text prompt background
    this.textBg = this.add.graphics().setDepth(101);

    // Prompt text
    this.promptText = this.add.text(W / 2, this.p(80), '', {
      fontFamily: 'monospace', fontSize: this.fs(16), color: '#ffffff',
      stroke: '#000000', strokeThickness: this.p(3),
      align: 'center', wordWrap: { width: W - this.p(100) }
    }).setOrigin(0.5).setDepth(102);

    // Arrow graphic (pulsing pointer)
    this.arrowGfx = this.add.graphics().setDepth(101);

    // Skip button
    this.skipBtn = this.add.text(W - this.p(20), H - this.p(12), 'Skip Tutorial', {
      fontFamily: 'monospace', fontSize: this.fs(10), color: '#888',
      stroke: '#000', strokeThickness: this.p(2)
    }).setOrigin(1, 1).setDepth(103).setInteractive({ useHandCursor: true });
    this.skipBtn.on('pointerdown', () => this.finish());
    this.skipBtn.on('pointerover', () => this.skipBtn.setColor('#ccc'));
    this.skipBtn.on('pointerout', () => this.skipBtn.setColor('#888'));

    // Listen for events
    this.game.events.on('tutorial-level-clicked', this.onLevelClicked, this);
    this.game.events.on('tutorial-diff-clicked', this.onDiffClicked, this);
    this.game.events.on('tutorial-kill', this.onKill, this);
    this.game.events.on('tutorial-tower-placed', this.onTowerPlaced, this);
    this.game.events.on('tutorial-wall-placed', this.onWallPlaced, this);
    this.game.events.on('game-ready', this.onGameReady, this);
    this.game.events.on('build-mode', this.onBuildMode, this);
    this.game.events.on('tutorial-coin-collected', this.onCoinCollected, this);
    this.game.events.on('tutorial-tower-selected', this.onTowerSelected, this);
    this.game.events.on('tutorial-tower-upgraded', this.onTowerUpgraded, this);
    this.game.events.on('tutorial-tower-deselected', this.onTowerDeselected, this);

    this.step = 'ls_click_meadow';
    this.game.registry.set('tutorialStep', this.step);
    this.moveDist = 0;
    this.tutorialKills = 0;
    this.wallsPlaced = 0;
    this.coinsCollected = 0;
    this.watchTimer = 0;
    this.stepDelay = 0;

    this.showStep();
  }

  onLevelClicked = (_id: number) => {
    if (this.step === 'ls_click_meadow') this.advanceTo('ls_click_easy');
  };

  onDiffClicked = (diff: string) => {
    if (this.step === 'ls_click_easy' && diff === 'easy') this.advanceTo('ls_click_start');
  };

  onGameReady = () => {
    // Game loaded — stop the tutorial overlay on level select, restart on game
    if (this.step === 'ls_click_start') {
      // Suppress normal spawning
      const gameScene = this.scene.get('Game') as any;
      if (gameScene) {
        gameScene.waveStartAt = Infinity;
      }
      this.advanceTo('game_move');
    }
  };

  onBuildMode = (active: boolean, kind: string, _towerKind?: string) => {
    if (this.step === 'game_press_1' && kind === 'tower') { this.resumeGame(); this.advanceTo('game_place_tower'); }
    if (this.step === 'game_press_4' && kind === 'wall') { this.resumeGame(); this.advanceTo('game_place_walls'); }
    if (this.step === 'game_exit_build' && !active) { this.advanceTo('game_loot_coins', 1500); }
  };

  onKill = () => {
    if (this.step === 'game_kill') {
      this.tutorialKills++;
      if (this.tutorialKills >= 6) this.advanceTo('game_press_1', 2000);
      else this.showStep(); // update counter
    } else if (this.step === 'game_watch_tower') {
      this.tutorialKills++;
    }
  };

  onTowerPlaced = () => {
    if (this.step === 'game_place_tower') this.advanceTo('game_watch_tower', 2000);
  };

  coinsCollected = 0;

  onCoinCollected = () => {
    if (this.step === 'game_loot_coins') {
      this.coinsCollected++;
      this.showStep(); // update counter
    }
  };

  onTowerSelected = () => {
    if (this.step === 'game_click_tower') this.advanceTo('game_upgrade_tower');
  };

  onTowerDeselected = () => {
    if (this.step === 'game_deselect_tower') this.advanceTo('game_done', 1500);
  };

  onTowerUpgraded = () => {
    if (this.step === 'game_upgrade_tower') this.advanceTo('game_deselect_tower', 1500);
  };

  onWallPlaced = () => {
    if (this.step === 'game_place_walls') {
      this.wallsPlaced++;
      if (this.wallsPlaced >= 3) this.advanceTo('game_exit_build', 1500);
      else this.showStep(); // update counter
    }
  };

  pendingStep: Step | null = null;

  advanceTo(step: Step, delayMs = 0) {
    if (delayMs > 0) {
      if (this.pendingStep) return; // already waiting for a delayed transition
      // Clear the screen during the delay
      this.overlay.clear();
      this.textBg.clear();
      this.arrowGfx.clear();
      this.promptText.setText('');
      this.cleanupHudLabels();
      this.pendingStep = step;
      this.stepDelay = this.time.now + delayMs;
      return;
    }
    this.pendingStep = null;
    this.step = step;
    this.game.registry.set('tutorialStep', step);
    this.showStep();
  }

  showStep() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.overlay.clear();
    this.textBg.clear();
    this.arrowGfx.clear();
    this.cleanupContinueZone();
    this.cleanupHudLabels();

    switch (this.step) {
      case 'ls_click_meadow':
        this.showPrompt('Welcome, Ranger!\nClick on the Meadow to begin your training.', this.p(80));
        this.drawDimWithHole(this.p(150), this.p(345), this.p(40));
        this.drawArrow(this.p(150), this.p(295), 'down');
        break;

      case 'ls_click_easy':
        this.showPrompt('Select Easy difficulty to start.', this.p(80));
        this.drawDimWithCutout(W / 2 - this.p(115), H / 2 - this.p(60), this.p(230), this.p(38));
        this.drawArrow(W / 2 - this.p(130), H / 2 - this.p(41), 'right');
        break;

      case 'ls_click_start':
        this.showPrompt('Click START to begin!', this.p(80));
        this.drawDimWithCutout(W / 2 - this.p(60), H / 2 + this.p(128), this.p(120), this.p(36));
        this.drawArrow(W / 2, H / 2 + this.p(120), 'down');
        break;

      case 'game_move':
        this.showPrompt('Use WASD or Arrow Keys to move.', this.p(150));
        break;

      case 'game_hud': {
        this.pauseGame();
        // Highlight the full top HUD bar with labeled callouts
        // UIScene layout: circles at y=p(20) r=p(9), wave bar bottom at p(20)+p(52)=p(72)
        const hudTop = this.p(4);       // above the progress circle tops
        const hudBottom = this.p(80);   // below wave bar with padding
        // Dim everything below the HUD
        this.overlay.fillStyle(0x000000, 0.55);
        this.overlay.fillRect(0, hudBottom + this.p(6), W, H - hudBottom - this.p(6));
        // Highlight border around top bar
        this.overlay.lineStyle(this.p(2), 0x4ad96a, 0.8);
        this.overlay.strokeRoundedRect(this.p(4), hudTop, W - this.p(8), hudBottom - hudTop + this.p(4), this.p(6));

        // HP label — arrow pointing up to HP bar (top-left)
        const hpLabelY = hudBottom + this.p(28);
        const hpCenterX = this.p(100);
        this.drawArrow(hpCenterX, hudBottom + this.p(10), 'up');
        const hpLabel = this.add.text(hpCenterX, hpLabelY, 'HEALTH', {
          fontFamily: 'monospace', fontSize: this.fs(11), color: '#d94a4a',
          stroke: '#000', strokeThickness: this.p(2)
        }).setOrigin(0.5).setDepth(102);
        this.hudLabels.push(hpLabel);

        // Wave progress label — arrow pointing up to center progress circles
        const waveCenterX = W / 2;
        this.arrowGfx.fillStyle(0x4ad96a, 0.9);
        const asz = this.p(10);
        const ay = hudBottom + this.p(10);
        this.arrowGfx.fillTriangle(waveCenterX - asz, ay, waveCenterX + asz, ay, waveCenterX, ay - asz * 1.5);
        const waveLabel = this.add.text(waveCenterX, hpLabelY, 'WAVE PROGRESS', {
          fontFamily: 'monospace', fontSize: this.fs(11), color: '#7cc4ff',
          stroke: '#000', strokeThickness: this.p(2)
        }).setOrigin(0.5).setDepth(102);
        this.hudLabels.push(waveLabel);

        // Gold label — arrow pointing up to gold badge (top-right)
        const goldCenterX = W - this.p(80);
        this.arrowGfx.fillTriangle(goldCenterX - asz, ay, goldCenterX + asz, ay, goldCenterX, ay - asz * 1.5);
        const goldLabel = this.add.text(goldCenterX, hpLabelY, 'GOLD', {
          fontFamily: 'monospace', fontSize: this.fs(11), color: '#ffd84a',
          stroke: '#000', strokeThickness: this.p(2)
        }).setOrigin(0.5).setDepth(102);
        this.hudLabels.push(goldLabel);

        // Main prompt below labels
        this.showPrompt('Keep an eye on your HUD!\nHealth, wave progress, and gold reserves.\n\nClick anywhere to continue.', this.p(180));

        // Click anywhere to advance
        this.hudClickZone = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
          .setInteractive({ useHandCursor: true }).setDepth(100);
        this.hudClickZone.on('pointerdown', () => {
          this.cleanupHudLabels();
          this.resumeGame();
          this.advanceTo('game_stand_still');
        });
        break;
      }

      case 'game_stand_still':
        this.showPrompt('Your ranger fires automatically!\nStanding still gives full fire rate.\nMoving cuts your fire rate in half.', this.p(150));
        break;

      case 'game_kill':
        this.showPrompt(`Enemies incoming! Shoot them down!\nKills: ${this.tutorialKills}/6`, this.p(150));
        break;

      case 'game_press_1': {
        this.pauseGame();
        this.showPrompt('Time to build defenses!\nPress 1 or click the hotbar to select the Arrow Tower.', H - this.p(140));
        // Highlight hotbar slot 1 area — hotbarY is the TOP of the slot
        const slotSize = this.p(48);
        const slotGap = this.p(10);
        const hotbarY = H - slotSize - this.p(32);
        const barCenterX = W / 2;
        const slots = 5;
        const slotX = barCenterX - (slots * slotSize + (slots - 1) * slotGap) / 2 + slotSize / 2;
        this.drawDimWithRect(slotX - slotSize / 2 - this.p(4), hotbarY - this.p(4), slotSize + this.p(8), slotSize + this.p(8));
        this.drawArrow(slotX, hotbarY - this.p(12), 'down');
        break;
      }

      case 'game_place_tower':
        this.showPrompt('Click near your ranger to place the Arrow Tower.\nThe green ghost shows where it will go.', this.p(150));
        // Light dim, no specific hole — player needs to see the grid
        this.overlay.fillStyle(0x000000, 0.2);
        this.overlay.fillRect(0, 0, W, H);
        break;

      case 'game_watch_tower':
        this.showPrompt('Your tower shoots enemies automatically!\nWatch it defend.', this.p(150));
        break;

      case 'game_press_4': {
        this.pauseGame();
        this.showPrompt('Walls block enemy paths!\nPress 4 or click the hotbar to select Wall.', H - this.p(140));
        const slotSize2 = this.p(48);
        const slotGap2 = this.p(10);
        const hotbarY2 = H - slotSize2 - this.p(32);
        const barCenterX2 = W / 2;
        const slots2 = 5;
        const wallSlotX = barCenterX2 - (slots2 * slotSize2 + (slots2 - 1) * slotGap2) / 2 + 3 * (slotSize2 + slotGap2) + slotSize2 / 2;
        this.drawDimWithRect(wallSlotX - slotSize2 / 2 - this.p(4), hotbarY2 - this.p(4), slotSize2 + this.p(8), slotSize2 + this.p(8));
        this.drawArrow(wallSlotX, hotbarY2 - this.p(12), 'down');
        break;
      }

      case 'game_place_walls':
        this.showPrompt(`Place walls to funnel enemies past your tower! (${this.wallsPlaced}/3)\nEnemies will pathfind around walls.`, this.p(150));
        this.overlay.fillStyle(0x000000, 0.15);
        this.overlay.fillRect(0, 0, W, H);
        break;

      case 'game_exit_build':
        this.showPrompt('Right-click or press ESC to leave build menu.', this.p(150));
        break;

      case 'game_loot_coins': {
        // Spawn enemies so coins drop near the tower
        const gs = this.scene.get('Game') as any;
        if (gs?.enemies?.countActive() < 3) {
          this.spawnTutorialEnemies(gs, 3);
        }
        this.showPrompt('Enemies drop coins when defeated!\nWalk over coins to collect them.', this.p(150));
        break;
      }

      case 'game_click_tower':
        this.showPrompt('Click on your Arrow Tower to select it.', this.p(150));
        break;

      case 'game_upgrade_tower':
        this.showPrompt('Click the Upgrade button to make your tower stronger!', this.p(150));
        break;

      case 'game_deselect_tower':
        this.showPrompt('Click somewhere else to close the tower panel.', this.p(150));
        break;

      case 'game_done':
        this.showClickPrompt('Great job, Ranger!\nEnemies will find a path around walls — use them wisely.\nGood luck!', this.p(150), 'complete');
        break;

      case 'complete':
        this.finish();
        break;
    }
  }

  pauseGame() {
    const gameScene = this.scene.get('Game') as any;
    if (gameScene?.physics?.world) gameScene.physics.pause();
  }

  resumeGame() {
    const gameScene = this.scene.get('Game') as any;
    if (gameScene?.physics?.world) gameScene.physics.resume();
  }

  /** Show prompt with "Click to continue" and advance to nextStep on click */
  showClickPrompt(text: string, y: number, nextStep: Step, nextDelay = 0) {
    this.showPrompt(text + '\n\nClick to continue.', y);
    const W = this.scale.width;
    const H = this.scale.height;
    this.continueZone = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(100);
    this.continueZone.on('pointerdown', () => {
      this.cleanupContinueZone();
      this.advanceTo(nextStep, nextDelay);
    });
  }

  cleanupContinueZone() {
    if (this.continueZone) { this.continueZone.destroy(); this.continueZone = null; }
  }

  cleanupHudLabels() {
    for (const obj of this.hudLabels) obj.destroy();
    this.hudLabels = [];
    if (this.hudClickZone) { this.hudClickZone.destroy(); this.hudClickZone = null; }
  }

  showPrompt(text: string, y: number) {
    const W = this.scale.width;
    this.promptText.setText(text).setPosition(W / 2, y);

    // Draw text background panel
    const bounds = this.promptText.getBounds();
    const pad = this.p(14);
    this.textBg.fillStyle(0x0d1220, 0.9);
    this.textBg.fillRoundedRect(bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2, this.p(8));
    this.textBg.lineStyle(this.p(1), 0x4a8acc, 0.6);
    this.textBg.strokeRoundedRect(bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2, this.p(8));
  }

  drawDimWithHole(cx: number, cy: number, r: number) {
    const W = this.scale.width;
    const H = this.scale.height;
    // Draw 4 rects around the circular hole (approximated as square cutout)
    const s = r + this.p(6);
    this.overlay.fillStyle(0x000000, 0.6);
    this.overlay.fillRect(0, 0, W, cy - s);           // top
    this.overlay.fillRect(0, cy + s, W, H - cy - s);  // bottom
    this.overlay.fillRect(0, cy - s, cx - s, s * 2);  // left
    this.overlay.fillRect(cx + s, cy - s, W - cx - s, s * 2); // right
    // Pulsing ring around cutout
    this.overlay.lineStyle(this.p(2), 0x4ad96a, 0.8);
    this.overlay.strokeCircle(cx, cy, r + this.p(4));
  }

  drawDimWithCutout(x: number, y: number, w: number, h: number) {
    const W = this.scale.width;
    const H = this.scale.height;
    const pad = this.p(4);
    this.overlay.fillStyle(0x000000, 0.6);
    this.overlay.fillRect(0, 0, W, y - pad);                          // top
    this.overlay.fillRect(0, y + h + pad, W, H - y - h - pad);       // bottom
    this.overlay.fillRect(0, y - pad, x - pad, h + pad * 2);         // left
    this.overlay.fillRect(x + w + pad, y - pad, W - x - w - pad, h + pad * 2); // right
  }

  drawDimWithRect(x: number, y: number, w: number, h: number) {
    const W = this.scale.width;
    const H = this.scale.height;
    const pad = this.p(4);
    this.overlay.fillStyle(0x000000, 0.6);
    this.overlay.fillRect(0, 0, W, y - pad);                          // top
    this.overlay.fillRect(0, y + h + pad, W, H - y - h - pad);       // bottom
    this.overlay.fillRect(0, y - pad, x - pad, h + pad * 2);         // left
    this.overlay.fillRect(x + w + pad, y - pad, W - x - w - pad, h + pad * 2); // right
    // Highlight border
    this.overlay.lineStyle(this.p(2), 0x4ad96a, 0.8);
    this.overlay.strokeRoundedRect(x - pad, y - pad, w + pad * 2, h + pad * 2, this.p(4));
  }

  drawArrow(x: number, y: number, dir: 'down' | 'up' | 'right') {
    const sz = this.p(10);
    this.arrowGfx.fillStyle(0x4ad96a, 0.9);
    if (dir === 'down') {
      this.arrowGfx.fillTriangle(x - sz, y, x + sz, y, x, y + sz * 1.5);
    } else if (dir === 'up') {
      this.arrowGfx.fillTriangle(x - sz, y, x + sz, y, x, y - sz * 1.5);
    } else {
      this.arrowGfx.fillTriangle(x, y - sz, x, y + sz, x + sz * 1.5, y);
    }
    // Pulse the arrow
    this.tweens.killTweensOf(this.arrowGfx);
    this.arrowGfx.setAlpha(1);
    this.tweens.add({ targets: this.arrowGfx, alpha: 0.4, yoyo: true, repeat: -1, duration: 600 });
  }

  update() {
    // Handle delayed transitions
    if (this.pendingStep && this.stepDelay > 0 && this.time.now > this.stepDelay) {
      const next = this.pendingStep;
      this.pendingStep = null;
      this.stepDelay = 0;
      this.step = next;
      this.game.registry.set('tutorialStep', next);
      this.showStep();
      return;
    }

    // Skip step logic while waiting for a delayed transition
    if (this.pendingStep) return;

    // Handle step-specific update logic
    const gameScene = this.scene.get('Game') as any;

    switch (this.step) {
      case 'game_move':
        if (gameScene?.player) {
          const px = gameScene.player.x;
          const py = gameScene.player.y;
          if (this.lastPx !== 0 || this.lastPy !== 0) {
            this.moveDist += Math.hypot(px - this.lastPx, py - this.lastPy);
          }
          this.lastPx = px;
          this.lastPy = py;
          if (this.moveDist > 150) {
            this.advanceTo('game_hud', 2000);
          }
        }
        break;

      case 'game_stand_still':
        if (this.stepDelay === 0) this.stepDelay = this.time.now + 5000;
        if (this.time.now > this.stepDelay) {
          this.stepDelay = 0;
          this.spawnTutorialEnemies(gameScene, 6);
          this.advanceTo('game_kill');
        }
        break;

      case 'game_watch_tower': {
        this.watchTimer += this.game.loop.delta;
        // Spawn a wave of enemies for the tower to kill (wait 3s so player can read prompt)
        if (this.watchTimer > 3000 && this.tutorialKills < 6 && gameScene?.enemies?.countActive() < 3) {
          this.spawnTutorialEnemies(gameScene, 2);
        }
        // Wait until the tower has killed them all before moving on
        if (this.tutorialKills >= 6 && gameScene?.enemies?.countActive() === 0) {
          this.watchTimer = 0;
          this.tutorialKills = 0;
          this.advanceTo('game_press_4', 2000);
        }
        break;
      }

      case 'game_loot_coins':
        // Hide the prompt after 10s
        if (this.stepDelay === 0) this.stepDelay = this.time.now + 10000;
        if (this.stepDelay > 0 && this.time.now > this.stepDelay) {
          this.stepDelay = -1; // mark as done
          this.overlay.clear();
          this.textBg.clear();
          this.promptText.setText('');
        }
        // Keep spawning enemies so coins keep dropping
        if (gameScene?.enemies?.countActive() < 2) {
          this.spawnTutorialEnemies(gameScene, 2);
        }
        // Once the player has enough money to upgrade, move on
        const upgradeCost = CFG.tower.kinds.arrow.levels[0].upgradeCost;
        if (gameScene?.player?.money >= upgradeCost) {
          this.advanceTo('game_click_tower', 1500);
        }
        break;

      // game_done handled by click-to-continue
    }
  }

  spawnTutorialEnemies(gameScene: any, count: number) {
    if (!gameScene?.player) return;
    const px = gameScene.player.x;
    const py = gameScene.player.y;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const dist = 480 + Math.random() * 80;
      const ex = px + Math.cos(angle) * dist;
      const ey = py + Math.sin(angle) * dist;
      const e = new Enemy(gameScene, ex, ey, 'snake');
      gameScene.enemies.add(e);
    }
  }

  finish() {
    markTutorialDone();
    this.game.registry.set('tutorialActive', false);
    this.game.registry.set('tutorialStep', null);
    this.cleanupContinueZone();
    this.resumeGame();

    // Resume normal spawning in GameScene
    const gameScene = this.scene.get('Game') as any;
    if (gameScene?.loadingDone) {
      gameScene.waveStartAt = gameScene.vTime + CFG.spawn.startDelay;
    }

    // Clean up listeners
    this.game.events.off('tutorial-level-clicked', this.onLevelClicked, this);
    this.game.events.off('tutorial-diff-clicked', this.onDiffClicked, this);
    this.game.events.off('tutorial-kill', this.onKill, this);
    this.game.events.off('tutorial-tower-placed', this.onTowerPlaced, this);
    this.game.events.off('tutorial-wall-placed', this.onWallPlaced, this);
    this.game.events.off('game-ready', this.onGameReady, this);
    this.game.events.off('build-mode', this.onBuildMode, this);
    this.game.events.off('tutorial-coin-collected', this.onCoinCollected, this);
    this.game.events.off('tutorial-tower-selected', this.onTowerSelected, this);
    this.game.events.off('tutorial-tower-upgraded', this.onTowerUpgraded, this);
    this.game.events.off('tutorial-tower-deselected', this.onTowerDeselected, this);

    this.scene.stop('Tutorial');
  }

  shutdown() {
    this.game.events.off('tutorial-level-clicked', this.onLevelClicked, this);
    this.game.events.off('tutorial-diff-clicked', this.onDiffClicked, this);
    this.game.events.off('tutorial-kill', this.onKill, this);
    this.game.events.off('tutorial-tower-placed', this.onTowerPlaced, this);
    this.game.events.off('tutorial-wall-placed', this.onWallPlaced, this);
    this.game.events.off('game-ready', this.onGameReady, this);
    this.game.events.off('build-mode', this.onBuildMode, this);
    this.game.events.off('tutorial-coin-collected', this.onCoinCollected, this);
    this.game.events.off('tutorial-tower-selected', this.onTowerSelected, this);
    this.game.events.off('tutorial-tower-upgraded', this.onTowerUpgraded, this);
    this.game.events.off('tutorial-tower-deselected', this.onTowerDeselected, this);
  }
}
