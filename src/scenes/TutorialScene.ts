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
  private isMobile = false;
  private p(v: number) { return v * this.sf; }
  private fs(px: number) { return `${Math.round(px * this.sf)}px`; }
  /** LevelSelect-canvas scaling: matches LevelSelectScene's sf = nativeW/CFG.width.
   *  Tutorial's regular `p()` uses uiScale (different on mobile), so use this for
   *  any coordinate that targets a node/panel rendered by LevelSelectScene. */
  private lsP(v: number) { return v * (this.scale.width / CFG.width); }

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
    this.isMobile = !!this.game.registry.get('isMobile');
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

    // Skip button — position depends on orientation, see repositionSkipBtn().
    this.skipBtn = this.add.text(0, 0, 'Skip Tutorial', {
      fontFamily: 'monospace', fontSize: this.fs(10), color: '#888',
      stroke: '#000', strokeThickness: this.p(2)
    }).setDepth(103).setInteractive({ useHandCursor: true });
    this.skipBtn.on('pointerdown', () => this.finish());
    this.skipBtn.on('pointerover', () => this.skipBtn.setColor('#ccc'));
    this.skipBtn.on('pointerout', () => this.skipBtn.setColor('#888'));
    this.repositionSkipBtn();

    // Re-render the active step + reposition skip button on viewport change
    // (rotation, browser resize). Mobile portrait → landscape changes every
    // tutorial element's coordinates, so we need to redraw them. Defer one
    // microtask so GameScene's viewport-changed handler (which calls
    // setGameSize) runs first and this.scale reflects the new dimensions.
    const onViewportChanged = () => {
      queueMicrotask(() => {
        this.sf = this.game.registry.get('sf') || 1;
        this.isMobile = !!this.game.registry.get('isMobile');
        this.repositionSkipBtn();
        // Skip the redraw if a delayed transition is in flight — the screen
        // is intentionally blank until pendingStep fires.
        if (!this.pendingStep) this.showStep();
      });
    };
    this.game.events.on('viewport-changed', onViewportChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('viewport-changed', onViewportChanged);
    });

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
    // If player exits build mode during the delay before game_exit_build shows, skip it
    if (this.pendingStep === 'game_exit_build' && !active) {
      this.pendingStep = 'game_loot_coins';
    }
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
    }
  };

  onTowerSelected = () => {
    if (this.step === 'game_click_tower') { this.resumeGame(); this.advanceTo('game_upgrade_tower'); }
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
      if (this.wallsPlaced >= 3) this.advanceTo('game_exit_build');
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
      case 'ls_click_meadow': {
        const verb = this.isMobile ? 'Tap' : 'Click';
        this.showPrompt(`Welcome, Ranger!\n${verb} on the Meadow to begin your training.`, this.p(80));
        // Meadow node lives in LevelSelect's coord system (sf = nativeW/960),
        // not the tutorial's uiScale-based one — they differ on mobile.
        this.drawDimWithHole(this.lsP(150), this.lsP(345), this.lsP(40));
        this.drawArrow(this.lsP(150), this.lsP(295), 'down');
        break;
      }

      case 'ls_click_easy': {
        // The difficulty panel rebuilds with mobile-specific button geometry
        // (see LevelSelectScene.openDifficultyPanel), so derive the cutout
        // from the same numbers rather than the desktop-only literals.
        if (this.isMobile) {
          const btnH = this.lsP(60);
          const btnGap = this.lsP(12);
          const btnBlockH = 4 * btnH + 3 * btnGap;
          const easyCenterY = H / 2 - btnBlockH / 2 + btnH / 2;
          const ph = H * 0.92;
          const pw = Math.min(this.lsP(560), W * 0.92);
          const btnW = Math.min(this.lsP(460), pw - this.lsP(40));
          this.drawDimWithCutout(W / 2 - btnW / 2, easyCenterY - btnH / 2, btnW, btnH);
          this.drawArrow(W / 2 - btnW / 2 - this.lsP(20), easyCenterY, 'right');
          // Prompt text moves to the bottom of the viewport.
          this.showPrompt('Tap Easy difficulty to start.', H - this.p(20), 1);
        } else {
          this.showPrompt('Select Easy difficulty to start.', this.p(80));
          this.drawDimWithCutout(W / 2 - this.p(115), H / 2 - this.p(60), this.p(230), this.p(38));
          this.drawArrow(W / 2 - this.p(130), H / 2 - this.p(41), 'right');
        }
        break;
      }

      case 'ls_click_start': {
        const verb = this.isMobile ? 'Tap' : 'Click';
        this.showPrompt(`${verb} START to begin!`, this.p(80));
        if (this.isMobile) {
          // Mobile panel: ph = H*0.92, START button at (panel center) + (ph/2 - p(80)).
          // Absolute top of START = H/2 + ph/2 - p_ls(80).
          const ph = H * 0.92;
          const startBtnH = this.lsP(56);
          const startBtnW = this.lsP(220);
          const startTop = H / 2 + ph / 2 - startBtnH - this.lsP(24);
          this.drawDimWithCutout(W / 2 - startBtnW / 2, startTop, startBtnW, startBtnH);
          // Arrow moved up 1 button height so it sits above the START button.
          this.drawArrow(W / 2, startTop - this.lsP(8), 'down');
        } else {
          this.drawDimWithCutout(W / 2 - this.p(60), H / 2 + this.p(128), this.p(120), this.p(36));
          this.drawArrow(W / 2, H / 2 + this.p(120), 'down');
        }
        break;
      }

      case 'game_move':
        this.showPrompt(
          this.isMobile ? 'Use the joystick to move.' : 'Use WASD or Arrow Keys to move.',
          this.p(150)
        );
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
        this.showPrompt(
          this.isMobile
            ? 'Keep an eye on your HUD!\nHealth, wave progress, and gold reserves.\n\nTAP anywhere to continue.'
            : 'Keep an eye on your HUD!\nHealth, wave progress, and gold reserves.\n\nClick anywhere to continue.',
          this.p(180)
        );

        // Click anywhere to advance
        this.hudClickZone = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
          .setInteractive({ useHandCursor: true }).setDepth(100);
        this.hudClickZone.on('pointerdown', () => {
          this.cleanupHudLabels();
          this.resumeGame();
          this.advanceTo('game_stand_still', 2000);
        });
        break;
      }

      case 'game_stand_still':
        this.showPrompt('Your ranger fires automatically!\nStanding still shoots faster than when moving.', this.p(150));
        break;

      case 'game_kill':
        this.showPrompt(`Enemies incoming! Shoot them down!\nKills: ${this.tutorialKills}/6`, this.p(150));
        break;

      case 'game_press_1': {
        this.pauseGame();
        this.showPrompt(
          this.isMobile
            ? 'Time to build defenses!\nTap the hotbar to select the Arrow Tower.'
            : 'Time to build defenses!\nPress 1 or click the hotbar to select the Arrow Tower.',
          H - this.p(140)
        );
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
        this.showPrompt(
          this.isMobile
            ? 'Tap near your ranger to place the Arrow Tower.'
            : 'Click near your ranger to place the Arrow Tower.\nThe green ghost shows where it will go.',
          this.p(150)
        );
        // Light dim, no specific hole — player needs to see the grid
        this.overlay.fillStyle(0x000000, 0.2);
        this.overlay.fillRect(0, 0, W, H);
        break;

      case 'game_watch_tower':
        this.tutorialKills = 0; // reset from game_kill phase
        this.watchTimer = 0;
        this.showPrompt('Your tower shoots enemies automatically!', this.p(150));
        break;

      case 'game_press_4': {
        this.pauseGame();
        this.showPrompt(
          this.isMobile
            ? 'Walls block enemy paths!\nTap the hotbar to select Wall.'
            : 'Walls block enemy paths!\nPress 4 or click the hotbar to select Wall.',
          H - this.p(140)
        );
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

      case 'game_exit_build': {
        // If the player already exited build mode, skip this step
        const gs = this.scene.get('Game') as any;
        if (gs?.buildKind === 'none' || !gs?.buildKind) {
          this.advanceTo('game_loot_coins', 1500);
          return;
        }
        if (this.isMobile) {
          this.showPrompt('Tap the wall icon in the hotbar to leave build menu.', H - this.p(140));
          // Highlight the wall hotbar slot so the player knows where to tap.
          const slotSize3 = this.p(48);
          const slotGap3 = this.p(10);
          const hotbarY3 = H - slotSize3 - this.p(32);
          const barCenterX3 = W / 2;
          const slots3 = 5;
          const wallSlotX2 = barCenterX3 - (slots3 * slotSize3 + (slots3 - 1) * slotGap3) / 2 + 3 * (slotSize3 + slotGap3) + slotSize3 / 2;
          this.drawDimWithRect(wallSlotX2 - slotSize3 / 2 - this.p(4), hotbarY3 - this.p(4), slotSize3 + this.p(8), slotSize3 + this.p(8));
          this.drawArrow(wallSlotX2, hotbarY3 - this.p(12), 'down');
        } else {
          this.showPrompt('Right-click or press ESC to leave build menu.', this.p(150));
        }
        break;
      }

      case 'game_loot_coins':
        this.showPrompt('Enemies drop coins when defeated!\nYou will automatically gather them when nearby.', this.p(150));
        break;

      case 'game_click_tower': {
        this.pauseGame();
        this.showPrompt(
          this.isMobile
            ? 'Tap on your Arrow Tower to select it.'
            : 'Click on your Arrow Tower to select it.',
          this.p(150)
        );
        // Highlight the first arrow tower placed. Tower coords are WORLD-
        // space (Phaser GameObject) — convert to screen-space via the Game
        // camera so the highlight lands on the tower regardless of where
        // the camera is panned (camera follows the player).
        const gsTower = this.scene.get('Game') as any;
        const tower = gsTower?.towers?.[0];
        if (tower) {
          const cam = gsTower.cameras.main;
          const sx = (tower.x - cam.scrollX) * cam.zoom;
          const sy = (tower.y - cam.scrollY) * cam.zoom;
          // Tower footprint = CFG.tower.tiles * CFG.tile world units, scaled by camera zoom.
          const towerWorldSize = CFG.tower.tiles * CFG.tile;
          const ts = towerWorldSize * cam.zoom + this.p(8);
          this.drawDimWithRect(sx - ts / 2, sy - ts / 2, ts, ts);
          this.drawArrow(sx, sy - ts / 2 - this.p(8), 'down');
        }
        break;
      }

      case 'game_upgrade_tower':
        this.showPrompt(
          this.isMobile
            ? 'Tap the Upgrade button to make your tower stronger!'
            : 'Click the Upgrade button to make your tower stronger!',
          this.p(150)
        );
        break;

      case 'game_deselect_tower':
        this.showPrompt(
          this.isMobile
            ? 'Tap somewhere else to close the tower panel.'
            : 'Click somewhere else to close the tower panel.',
          this.p(150)
        );
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

  /** Place the skip-tutorial link based on viewport / orientation:
   *   - Mobile portrait: vertically centered on the right edge so the user's
   *     thumb (which usually rests near the bottom holding the phone) doesn't
   *     hit it accidentally.
   *   - Mobile landscape & desktop: lower-right corner (the legacy spot). */
  private repositionSkipBtn() {
    if (!this.skipBtn) return;
    const W = this.scale.width;
    const H = this.scale.height;
    const isPortraitMobile = this.isMobile && H > W;
    if (isPortraitMobile) {
      this.skipBtn.setPosition(W - this.p(20), H / 2).setOrigin(1, 0.5);
    } else {
      this.skipBtn.setPosition(W - this.p(20), H - this.p(12)).setOrigin(1, 1);
    }
  }

  showPrompt(text: string, y: number, anchorY: number = 0.5) {
    const W = this.scale.width;
    this.promptText.setOrigin(0.5, anchorY).setText(text).setPosition(W / 2, y);

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
        if (this.stepDelay === 0) this.stepDelay = this.time.now + 7000; // show prompt for 7s
        if (this.stepDelay > 0 && this.time.now > this.stepDelay) {
          this.stepDelay = 0;
          // Hide prompt, then wait 2s before spawning enemies
          this.spawnTutorialEnemies(gameScene, 6);
          this.advanceTo('game_kill', 2000);
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
