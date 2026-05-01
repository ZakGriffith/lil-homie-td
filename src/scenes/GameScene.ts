import Phaser from 'phaser';
import { CFG } from '../config';
import { Player } from '../entities/Player';
import { Enemy, EnemyKind } from '../entities/Enemy';
import { Tower, TowerKind } from '../entities/Tower';
import { Wall } from '../entities/Wall';
import { Projectile } from '../entities/Projectile';
import { Coin } from '../entities/Coin';
import { Boss } from '../entities/Boss';
import { createSparseGrid, findPath, canReachFromSpawnDirections, gridGet, gridSet, SparseGrid } from '../systems/Pathfinding';
import { SFX } from '../audio/sfx';
import { createGroundChunk, TREE_PATTERNS, SPIKE_PATTERNS, SPIKE_VARIANT_COUNT, generateAllArt, registerAnimations, getRiverTileGrid, riverCenterPx, RIVER_HALF_W, riverHorizontalCenterY } from '../assets/generateArt';
import { Difficulty, Biome, LEVELS } from '../levels';
import { computeViewport, viewportWorldSize } from '../viewport';

// Tower-base sprites used by generateAllArt() in create(). Kept out of
// BootScene so they don't block PLAY → level-select.
import towerBaseImg from '../assets/sprites/tower_base.png';
import arrowBase1Img from '../assets/sprites/arrow_base_1.png';
import arrowBase2Img from '../assets/sprites/arrow_base_2.png';
import cannonBaseImg from '../assets/sprites/cannon_base.png';
import cannonBase1Img from '../assets/sprites/cannon_base_1.png';
import cannonBase2Img from '../assets/sprites/cannon_base_2.png';

type BuildKind = 'none' | 'tower' | 'wall';

export class GameScene extends Phaser.Scene {
  player!: Player;
  enemies!: Phaser.Physics.Arcade.Group;
  projectiles!: Phaser.Physics.Arcade.Group;
  enemyDarts!: Phaser.Physics.Arcade.Group;
  toadGlobs!: Phaser.Physics.Arcade.Group;
  coins!: Phaser.Physics.Arcade.Group;
  walls: Wall[] = [];
  towers: Tower[] = [];
  wallGroup!: Phaser.Physics.Arcade.StaticGroup;
  towerGroup!: Phaser.Physics.Arcade.StaticGroup;

  grid: SparseGrid = createSparseGrid();
  gridVersion = 0;
  generatedChunks = new Set<string>();
  chunkImages = new Map<string, Phaser.GameObjects.Image>();
  pendingChunks: { cx: number; cy: number }[] = [];
  lastChunkCx = -9999;
  lastChunkCy = -9999;
  loadingDone = false;

  keys!: any;
  buildKind: BuildKind = 'none';
  buildTowerKind: TowerKind = 'arrow';
  buildPaused = false;
  // Bound listeners stored so shutdown() can remove the exact handlers it
  // registered. Calling game.events.off(name) without a fn ref nukes ALL
  // listeners for that event — including ones the next GameScene's create()
  // may have already registered if Phaser interleaves shutdown/create.
  private _onUiBuild?: (k: BuildKind, tk?: TowerKind) => void;
  private _onUiSell?: () => void;
  private _onUiSpeed?: (mult: number) => void;
  nextRunnerPack = 0;
  playerStoppedAt = 0;
  ghost!: Phaser.GameObjects.Sprite;
  deleteIcon!: Phaser.GameObjects.Graphics;
  gridOverlay!: Phaser.GameObjects.Graphics;

  spawnTimer = 0;
  spawnInterval = CFG.spawn.initialInterval;
  rampTimer = 0;
  heavyChance = CFG.spawn.heavyChanceStart;
  waveStartAt = 0;
  wave = 0;               // 0-indexed current wave
  waveSpawned = 0;        // enemies spawned in the current wave
  waveKills = 0;          // kills counted for the current wave
  pathsThisFrame = 0;     // BFS pathfinding budget per frame
  waveBreakUntil = 0;     // timestamp when the inter-wave build break ends
  countdownMsg = '';
  countdownColor = '#7cc4ff';

  // Virtual / scalable game time so the "speed up" button affects all
  // cooldown / spawn logic, not just physics and animations.
  timeMult = 1.25;
  vTime = 0;

  selectedTower: Tower | null = null;
  selectionRing!: Phaser.GameObjects.Graphics;
  towerPanel!: Phaser.GameObjects.Container;
  towerPanelBounds = { x: 0, y: 0, w: 0, h: 0 };
  gapBlockers: Phaser.Physics.Arcade.StaticGroup | null = null;
  wallTilemap!: Phaser.Tilemaps.Tilemap;
  wallLayer!: Phaser.Tilemaps.TilemapLayer;
  sellTimers = new Map<Tower | Wall, { startTime: number; duration: number; gfx: Phaser.GameObjects.Graphics }>();

  boss: Boss | null = null;
  bossSpawned = false;
  bossCountdownUntil = 0;       // set once the last wave is cleared, boss spawns at this time

  // Castle multi-boss state
  castlePhase = 0;              // 0 = waves 1-2, 1 = queen boss, 2 = waves 3-4, 3 = dragon boss
  midBoss: Boss | null = null;
  midBossDefeated = false;
  warlockBolts!: Phaser.Physics.Arcade.Group;
  queenOrbs!: Phaser.Physics.Arcade.Group;
  dragonFireballs!: Phaser.Physics.Arcade.Group;
  nextQueenTeleport = 0;
  nextQueenOrb = 0;
  nextQueenAura = 0;
  nextDragonFireball = 0;

  killsTarget = CFG.winKills;
  gameOver = false;
  levelId = 1;
  difficulty: Difficulty = 'easy';
  biome: Biome = 'grasslands';
  enemyHpMult = 1;
  enemySpeedMult = 1;
  levelRampFactor = CFG.spawn.rampFactor;
  levelMinInterval = CFG.spawn.minInterval;
  levelWaveSize = CFG.spawn.waveSize;
  levelClusterMax = 4;
  boulders: { sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Sprite; sx: number; sy: number; tx: number; ty: number; totalDist: number; speed: number; dmg: number; splashRadius: number; born: number }[] = [];
  webs: { x: number; y: number; sprite: Phaser.GameObjects.Sprite; expireAt: number }[] = [];
  gasClouds: { x: number; y: number; sprites: Phaser.GameObjects.Arc[]; expireAt: number; dmgCd: number }[] = [];
  birdPoops: { sprite: Phaser.GameObjects.Image; expireAt: number; dmgCd: number }[] = [];
  treeSprites: Phaser.GameObjects.GameObject[] = [];
  treeChunksGenerated = new Set<string>();
  // Castle-only floor-spike obstacles. Same chunk-level deterministic
  // generator as trees, but spikes block enemy pathing while letting the
  // player walk through (with a slow + DOT applied in updatePlayer).
  spikeSprites: Phaser.GameObjects.GameObject[] = [];
  spikeChunksGenerated = new Set<string>();
  /** Real-time timestamp the player can next take spike damage. Throttled
   *  so a brief stumble onto a spike doesn't melt the HP bar. */
  private nextSpikeDmgAt = 0;
  riverChunksGenerated = new Set<string>();
  riverSquiggles: { sprite: Phaser.GameObjects.Image; age: number; life: number; dx: number; dy: number }[] = [];
  squiggleTimer = 0;
  treeSeed = 0;
  sf = 1; // native resolution scale factor
  /** Effective spawn/chunk radius in tiles. Always grown to cover the
   *  current camera's visible-corner distance plus a margin so enemies
   *  spawn comfortably off-screen even with camera-follow lerp lag. */
  spawnDist = CFG.spawnDist;
  /** Per-tile cache of "would placing a wall here strangle pathing?" Cleared
   *  whenever the grid changes (wall/tower placed/destroyed/sold) or the
   *  player moves to a new tile. Sweeping the cursor across already-hovered
   *  tiles is then free — only the first hover of each tile pays for BFS. */
  _wallCheckCache = new Map<string, boolean>();
  _lastWallCheckPlayerTile = '';
  _warmupFrames = 0;

  constructor() { super('Game'); }

  init(data: any) {
    this.levelId = data?.levelId ?? 1;
    this.difficulty = data?.difficulty ?? 'easy';
    const levelDef = LEVELS.find(l => l.id === this.levelId);
    this.biome = levelDef?.biome ?? 'grasslands';

    // Reset mutable state for scene re-entry
    this.walls = [];
    this.towers = [];
    this.grid = createSparseGrid();
    this.gridVersion = 0;
    this.generatedChunks = new Set();
    this.chunkImages = new Map();
    this.pendingChunks = [];
    this.lastChunkCx = -9999;
    this.lastChunkCy = -9999;
    this.loadingDone = false;
    this.buildKind = 'none';
    this.buildTowerKind = 'arrow';
    this.buildPaused = false;
    this.nextRunnerPack = 0;
    this.playerStoppedAt = 0;
    this.spawnTimer = 0;
    this.spawnInterval = CFG.spawn.initialInterval;
    this.rampTimer = 0;
    this.heavyChance = CFG.spawn.heavyChanceStart;
    this.waveStartAt = 0;
    this.wave = 0;
    this.waveSpawned = 0;
    this.waveKills = 0;
    this.waveBreakUntil = 0;
    this.timeMult = 1.25;
    this.vTime = 0;
    this.selectedTower = null;
    this.sellTimers = new Map();
    this.boss = null;
    this.bossSpawned = false;
    this.bossCountdownUntil = 0;
    // Clear any persisted boss state from the previous run/level.
    this.game.registry.set('bossActive', false);
    this.game.registry.set('bossHp', 0);
    this.game.registry.set('bossMaxHp', 0);
    this.game.registry.set('bossBiome', '');
    this.game.registry.set('gameEndState', null);
    this.killsTarget = CFG.winKills;
    this.gameOver = false;
    this.boulders = [];
    this.webs = [];
    this.gasClouds = [];
    this.birdPoops = [];
    this.treeSprites = [];
    this.treeChunksGenerated = new Set();
    this.spikeSprites = [];
    this.spikeChunksGenerated = new Set();
    this.nextSpikeDmgAt = 0;
    this.riverChunksGenerated = new Set();
    this.riverSquiggles = [];
    this.squiggleTimer = 0;
    this.treeSeed = Math.floor(Math.random() * 2147483647) || 1;
    this.dying = false;
    this.winDelayUntil = 0;
    this.winCollectedAt = 0;
    this.castlePhase = 0;
    this.midBoss = null;
    this.midBossDefeated = false;
    this.nextQueenTeleport = 0;
    this.nextQueenOrb = 0;
    this.nextQueenAura = 0;
    this.nextDragonFireball = 0;

    // Per-level spawn tuning (from level def, fall back to CFG defaults)
    this.levelRampFactor = levelDef?.rampFactor ?? CFG.spawn.rampFactor;
    this.levelMinInterval = levelDef?.minInterval ?? CFG.spawn.minInterval;
    this.levelWaveSize = levelDef?.waveSize ?? CFG.spawn.waveSize;
    this.levelClusterMax = levelDef?.clusterMax ?? 4;

    // Difficulty multipliers (don't mutate CFG). Harder modes get tougher
    // enemies, more of them, and faster spawn pacing — but the same
    // starting gold across all modes.
    this.enemySpeedMult = 1;
    let waveSizeMult = 1;
    let intervalMult = 1;
    switch (this.difficulty) {
      case 'medium':
        this.enemyHpMult = 1.3;
        waveSizeMult = 1.25;
        intervalMult = 0.85;
        break;
      case 'hard':
      case 'oneHP':
        this.enemyHpMult = 1.6;
        waveSizeMult = 1.5;
        intervalMult = 0.7;
        break;
      default:
        this.enemyHpMult = 1;
    }
    this.levelWaveSize = Math.round(this.levelWaveSize * waveSizeMult);
    this.levelMinInterval = Math.round(this.levelMinInterval * intervalMult);
  }

  preload() {
    // Tower-base textures consumed by generateAllArt() during create().
    // Loaded here (under "Generating world..." overlay) instead of in
    // BootScene so PLAY → level-select isn't gated on them. Phaser's
    // loader is idempotent on the texture key, so re-entering a level
    // is a no-op.
    if (!this.textures.exists('t_base_png')) this.load.image('t_base_png', towerBaseImg);
    if (!this.textures.exists('t_base_1_png')) this.load.image('t_base_1_png', arrowBase1Img);
    if (!this.textures.exists('t_base_2_png')) this.load.image('t_base_2_png', arrowBase2Img);
    if (!this.textures.exists('c_base_png')) this.load.image('c_base_png', cannonBaseImg);
    if (!this.textures.exists('c_base_1_png')) this.load.image('c_base_1_png', cannonBase1Img);
    if (!this.textures.exists('c_base_2_png')) this.load.image('c_base_2_png', cannonBase2Img);
  }

  create() {
    this.events.on('shutdown', this.shutdown, this);

    // Generate art on first game start (deferred from boot for instant level select)
    generateAllArt(this);
    registerAnimations(this);

    // Keep FIT mode — native resolution already matches viewport
    this.scale.scaleMode = Phaser.Scale.ScaleModes.FIT;
    this.scale.refresh();

    // Resume systems in case previous run ended while paused
    this.physics.resume();
    this.anims.resumeAll();

    // Infinite world — no physics bounds, no camera bounds
    this.physics.world.setBounds(-1e6, -1e6, 2e6, 2e6);
    this.physics.world.setBoundsCollision(false);

    // groups
    this.enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: false });
    this.projectiles = this.physics.add.group({ classType: Projectile, runChildUpdate: false });
    this.enemyDarts = this.physics.add.group({ runChildUpdate: false });
    this.toadGlobs = this.physics.add.group({ runChildUpdate: false });
    this.coins = this.physics.add.group({ classType: Coin, runChildUpdate: false });
    this.warlockBolts = this.physics.add.group({ runChildUpdate: false });
    this.queenOrbs = this.physics.add.group({ runChildUpdate: false });
    this.dragonFireballs = this.physics.add.group({ runChildUpdate: false });
    this.wallGroup = this.physics.add.staticGroup();
    this.towerGroup = this.physics.add.staticGroup();
    this.gapBlockers = this.physics.add.staticGroup();

    // Collision tilemap for player-wall collision (no seam issues unlike individual bodies)
    const mapSize = 400; // 400x400 tiles centered on origin
    this.wallTilemap = this.make.tilemap({
      tileWidth: CFG.tile, tileHeight: CFG.tile,
      width: mapSize, height: mapSize
    });
    // 1px transparent + 1px solid tileset (registered once at the global
    // texture manager — the canvas/texture survive scene shutdowns, so on
    // subsequent runs we just reuse the existing entry instead of warning).
    const tilesetKey = 'wall_collision_tileset';
    if (!this.textures.exists(tilesetKey)) {
      const canvas = document.createElement('canvas');
      canvas.width = CFG.tile * 2; canvas.height = CFG.tile;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(CFG.tile, 0, CFG.tile, CFG.tile); // tile index 1 = solid
      this.textures.addCanvas(tilesetKey, canvas);
    }
    const tileset = this.wallTilemap.addTilesetImage(tilesetKey, tilesetKey, CFG.tile, CFG.tile)!;
    this.wallLayer = this.wallTilemap.createBlankLayer('walls', tileset,
      -(mapSize / 2) * CFG.tile, -(mapSize / 2) * CFG.tile)!;
    this.wallLayer.setCollision(1);
    this.wallLayer.setVisible(false); // invisible — walls have their own sprites
    this.wallLayer.setDepth(-1);

    // Expand the canvas back to the full device viewport (LevelSelectScene
    // shrunk it to a 3:2 fit). On desktop this widens past 3:2; on mobile
    // it kills the letterbox.
    {
      const vp = computeViewport();
      // Tell UIScene to skip its one-time side effects (intro toasts) on
      // its first create — that initial pass runs against the old
      // LevelSelect gameSize and is about to be restarted at the right
      // size on the next tick.
      this.game.registry.set('uiBootingForResize', true);
      this.scale.setGameSize(vp.renderW, vp.renderH);
      this.scale.refresh();
      this.time.delayedCall(0, () => {
        this.game.registry.set('uiBootingForResize', false);
        const ui = this.scene.get('UI');
        if (ui?.scene.isActive()) ui.scene.restart();
      });
    }

    // player — starts at origin, camera follows
    this.player = new Player(this, 0, 0);
    this.sf = this.game.registry.get('sf') || 1;
    const cameraZoom = this.game.registry.get('cameraZoom') ?? this.sf;
    this.cameras.main.setZoom(cameraZoom);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // Viewport-aware spawn radius. Desktop keeps CFG.spawnDist exactly (hard
    // requirement). On mobile the view aspect differs from 3:2, so the corner
    // distance can exceed 18 tiles (notably in portrait) — grow to cover it.
    this.recomputeSpawnDist();

    // React to rotation / window resize: resize the canvas to the new device
    // viewport, pull the new camera zoom out of the registry, and grow chunk/
    // spawn radius to match. World state (player, towers, enemies) stays
    // untouched.
    const onViewportChanged = () => {
      const vp = computeViewport();
      this.scale.setGameSize(vp.renderW, vp.renderH);
      this.scale.refresh();
      this.cameras.main.setZoom(vp.cameraZoom);
      this.recomputeSpawnDist();
      // Force chunk regeneration around player at the new view radius.
      this.lastChunkCx = -9999;
      this.lastChunkCy = -9999;
    };
    this.game.events.on('viewport-changed', onViewportChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('viewport-changed', onViewportChanged);
    });

    // Apply difficulty adjustments. Starting gold is now uniform across all
    // modes (CFG.startMoney); harder modes are tuned via wave size + spawn
    // pacing in init() instead.
    if (this.difficulty === 'oneHP') {
      this.player.hp = 1;
      this.player.maxHp = 1;
    }

    // Generate all initial ground chunks before the game starts (no time limit)
    this.generateChunksAround(0, 0);
    this.processChunkQueue(0);

    // Place trees in the initial chunks around spawn
    if (this.biome === 'forest' || this.biome === 'infected') {
      this.generatedChunks.forEach(key => {
        const [cx, cy] = key.split(',').map(Number);
        this.placeTreesInChunk(cx, cy);
      });
    }
    // Castle gets floor spikes — same deterministic chunk generator.
    if (this.biome === 'castle') {
      this.generatedChunks.forEach(key => {
        const [cx, cy] = key.split(',').map(Number);
        this.placeSpikesInChunk(cx, cy);
      });
    }

    // collisions — player uses tilemap layer for walls (no seams) + wallGroup for tree blockers
    this.physics.add.collider(this.player, this.wallLayer);
    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.player, this.towerGroup);
    this.physics.add.collider(this.player, this.gapBlockers);
    this.physics.add.collider(this.enemies, this.wallGroup, (e, w) => this.enemyHitsWall(e as Enemy, w as Wall), (_e, _w) => !((_e as Enemy).flying));
    this.physics.add.collider(this.enemies, this.towerGroup, (e, t) => this.enemyHitsTower(e as Enemy, t as Tower), (_e, _t) => !((_e as Enemy).flying));
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.enemyHitsPlayer(e as Enemy));
    this.physics.add.overlap(this.projectiles, this.enemies, (pr, en) => this.projectileHitsEnemy(pr as Projectile, en as Enemy));
    this.physics.add.overlap(this.player, this.enemyDarts, (_p, d) => this.enemyDartHitsPlayer(d as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.enemyDarts, this.wallGroup, (_d, _w) => { (_d as Phaser.Physics.Arcade.Sprite).destroy(); });
    this.physics.add.overlap(this.enemyDarts, this.towerGroup, (_d, _t) => { (_d as Phaser.Physics.Arcade.Sprite).destroy(); });
    // Toad globs hit the player (they arc over walls/towers — no wall/tower overlap)
    this.physics.add.overlap(this.player, this.toadGlobs, (_p, g) => this.toadGlobHitsPlayer(g as Phaser.Physics.Arcade.Sprite));
    // Castle warlock bolts, queen orbs, dragon fireballs
    this.physics.add.overlap(this.player, this.warlockBolts, (_p, b) => this.castleBoltHitsPlayer(b as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.warlockBolts, this.wallGroup, (_b, _w) => { (_b as Phaser.Physics.Arcade.Sprite).destroy(); });
    this.physics.add.overlap(this.player, this.queenOrbs, (_p, o) => this.castleBoltHitsPlayer(o as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.dragonFireballs, (_p, f) => this.dragonFireballHitsPlayer(f as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.dragonFireballs, this.wallGroup, (_f, _w) => this.dragonFireballExplode(_f as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.dragonFireballs, this.towerGroup, (_f, _t) => this.dragonFireballExplode(_f as Phaser.Physics.Arcade.Sprite));
    // boss overlaps set up when boss spawns (since it's created later)

    // input
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,ONE,TWO,THREE,FOUR,X,ESC');
    this.input.keyboard!.on('keydown-ONE', () => {
      const ts = this.game.registry.get('tutorialStep');
      if (ts && ts !== 'game_press_1' && ts !== 'game_place_tower') return;
      this.toggleBuild('tower', 'arrow');
    });
    this.input.keyboard!.on('keydown-TWO', () => {
      if (this.game.registry.get('tutorialStep')) return; // blocked during tutorial
      // Cannon is locked on the meadow level (intro). Unlocked from forest on.
      if (this.biome === 'grasslands') return;
      this.toggleBuild('tower', 'cannon');
    });
    // Key 3 reserved for mage tower (not yet implemented)
    this.input.keyboard!.on('keydown-FOUR', () => {
      const ts = this.game.registry.get('tutorialStep');
      if (ts && ts !== 'game_press_4' && ts !== 'game_place_walls') return;
      this.toggleBuild('wall');
    });
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.selectedTower) this.deselectTower();
      else this.setBuild('none');
    });
    // 'B' is a dedicated build-cancel key — handy while wall-building since
    // the wall hotkey is '4' (not adjacent to ESC). No-ops outside of
    // build mode so it won't fight other bindings.
    this.input.keyboard!.on('keydown-B', () => {
      if (this.buildKind !== 'none') this.setBuild('none');
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.handleClick(p));
    this.input.mouse!.disableContextMenu();

    // build ghost
    this.ghost = this.add.sprite(0, 0, 'wall').setAlpha(0.5).setDepth(800).setVisible(false).setOrigin(0.5).setScale(0.5);

    // Red X overlay shown in wall build mode when the cursor is on an
    // existing wall — hint that clicking will start the sell countdown.
    this.deleteIcon = this.add.graphics().setDepth(801).setVisible(false);
    const dr = CFG.tile * 0.32;
    this.deleteIcon.lineStyle(4, 0x000000, 0.6);
    this.deleteIcon.lineBetween(-dr, -dr, dr, dr);
    this.deleteIcon.lineBetween(-dr, dr, dr, -dr);
    this.deleteIcon.lineStyle(2.5, 0xff4040, 1);
    this.deleteIcon.lineBetween(-dr, -dr, dr, dr);
    this.deleteIcon.lineBetween(-dr, dr, dr, -dr);

    // grid overlay (redrawn each frame while building)
    this.gridOverlay = this.add.graphics().setDepth(799).setVisible(false);

    // selection ring (tower range visualizer)
    this.selectionRing = this.add.graphics().setDepth(798).setVisible(false);

    // tower upgrade panel (built once, positioned/shown on selection)
    this.towerPanel = this.add.container(0, 0).setDepth(900).setVisible(false);

    // events from UI
    this.events.emit('hud', this.hudState());
    // Defensive: drop any leftover listeners from a previous run before
    // registering ours. The old shutdown path doesn't always fire in time
    // (e.g. on win the panel→stop happens synchronously inside an input
    // handler and Phaser can interleave the create of the next run before
    // the previous shutdown), which would leave us with two listeners both
    // toggling buildKind on the same singleton scene instance — they cancel
    // each other and the build menu never opens.
    this.game.events.off('ui-build');
    this.game.events.off('ui-sell');
    this.game.events.off('ui-speed');
    this._onUiBuild = (k: BuildKind, tk?: TowerKind) => {
      const ts = this.game.registry.get('tutorialStep');
      if (ts) {
        if (ts === 'game_press_1' && k === 'tower' && tk === 'arrow') { /* allowed */ }
        // Tutorial caps placements at 3 walls — once 3 are down, don't let
        // the player re-enter wall build mode and click into a dead state.
        else if ((ts === 'game_press_4' || ts === 'game_place_walls') && k === 'wall' && this.walls.length < 3) { /* allowed */ }
        // Tutorial caps placements at 1 arrow tower — once placed, don't let
        // the player re-enter tower build mode and try to place another.
        else if (ts === 'game_place_tower' && k === 'tower' && tk === 'arrow' && this.towers.length === 0) { /* allowed */ }
        // Mobile has no right-click / ESC, so tapping the (already-active)
        // wall slot is the only way to exit build mode during this step.
        // Only permit it when wall mode is currently on (i.e. the toggle
        // turns it OFF) so the player can't re-enter wall mode after exit.
        else if (ts === 'game_exit_build' && k === 'wall' && this.buildKind === 'wall') { /* allowed — toggles off */ }
        else return; // block everything else during tutorial
      }
      this.toggleBuild(k, tk);
    };
    this._onUiSell = () => this.setBuild('none');
    this._onUiSpeed = (mult: number) => this.setTimeScale(mult);
    this.game.events.on('ui-build', this._onUiBuild);
    this.game.events.on('ui-sell', this._onUiSell);
    this.game.events.on('ui-speed', this._onUiSpeed);

    // Apply default game speed (1.25x base)
    this.setTimeScale(this.timeMult);

    // initial UI update
    this.scene.get('UI').events.emit('hud', this.hudState());

    // pre-wave build phase
    this.waveStartAt = CFG.spawn.startDelay;
    this.countdownMsg = '';
    this.countdownColor = '#7cc4ff';

    // Biome atmosphere effects
    if (this.biome === 'forest') {
      // Firefly particles
      const fireflyEmitter = this.add.particles(0, 0, 'firefly', {
        follow: this.player,
        lifespan: 4000,
        speed: { min: 3, max: 15 },
        scale: { start: 0.4, end: 0.1 },
        alpha: { start: 0.7, end: 0 },
        frequency: 250,
        blendMode: 'ADD'
      });
      fireflyEmitter.setDepth(15);
      fireflyEmitter.addEmitZone({ type: 'random', source: new Phaser.Geom.Rectangle(-400, -300, 800, 600) } as any);

      // removed vignette — was too distracting
    }

    if (this.biome === 'infected') {
      // Purple infection spores — dense, drifting slowly, fade in then out
      const sporeEmitter = this.add.particles(0, 0, 'infection_spore', {
        follow: this.player,
        lifespan: 6000,
        speed: { min: 2, max: 14 },
        scale: { start: 0.6, end: 0.15 },
        alpha: { values: [0, 0.85, 0.85, 0] },
        frequency: 60,
        blendMode: 'ADD'
      });
      sporeEmitter.setDepth(15);
      sporeEmitter.addEmitZone({ type: 'random', source: new Phaser.Geom.Rectangle(-500, -400, 1000, 800) } as any);

      // Green infection spores — medium density, slightly faster
      const sporeGreenEmitter = this.add.particles(0, 0, 'infection_spore_green', {
        follow: this.player,
        lifespan: 5000,
        speed: { min: 3, max: 20 },
        scale: { start: 0.5, end: 0.1 },
        alpha: { values: [0, 0.7, 0.7, 0] },
        frequency: 100,
        blendMode: 'ADD'
      });
      sporeGreenEmitter.setDepth(15);
      sporeGreenEmitter.addEmitZone({ type: 'random', source: new Phaser.Geom.Rectangle(-500, -400, 1000, 800) } as any);
    }

    // Warm-up phase: pause physics and run several real frames so the browser
    // JIT-compiles the update loop and uploads textures to the GPU. The loading
    // overlay stays visible until we're done, then the game starts stutter-free.
    this.loadingDone = false;
    this.physics.pause();
    this._warmupFrames = 0;
  }

  hudState() {
    return {
      name: 'Ranger',
      hp: this.player?.hp ?? CFG.player.hp,
      maxHp: this.player?.maxHp ?? CFG.player.hp,
      money: this.player?.money ?? 0,
      kills: this.player?.kills ?? 0,
      target: this.killsTarget,
      build: this.buildKind === 'tower' ? this.buildTowerKind : this.buildKind,
      bossSpawned: this.bossSpawned,
      wave: this.wave + 1,
      waveKills: this.waveKills,
      waveSize: this.levelWaveSize,
      waveBreakUntil: this.waveBreakUntil,
      vTime: this.vTime,
      countdownMsg: this.countdownMsg,
      countdownColor: this.countdownColor,
      castlePhase: this.castlePhase,
      midBossDefeated: this.midBossDefeated,
    };
  }

  /** Set true while a hud emit is pending for the current frame. Many callers
   *  (each kill, each coin pickup, each tower place) trigger pushHud in
   *  bursts; UIScene.updateHud is heavy enough that running it 20+ times per
   *  frame on mobile drops the framerate noticeably. Coalesce all calls in a
   *  single frame into one emit at POST_UPDATE so updateHud runs at most once
   *  per frame regardless of how many pickups happen. */
  private _hudFlushScheduled = false;

  pushHud() {
    if (this._hudFlushScheduled) return;
    this._hudFlushScheduled = true;
    this.events.once(Phaser.Scenes.Events.POST_UPDATE, () => {
      this._hudFlushScheduled = false;
      this.game.events.emit('hud', this.hudState());
    });
  }

  // Per-frame countdown branches were calling pushHud 60×/sec even when the
  // displayed text/color had not changed. UIScene.updateHud is heavy
  // (HP redraw, progress-circle restyles, wave-bar fill), so the redundant
  // emits caused mobile chop. syncCountdown only emits on a real change.
  private syncCountdown(msg: string, color?: string) {
    const nextColor = color ?? this.countdownColor;
    if (this.countdownMsg === msg && this.countdownColor === nextColor) return;
    this.countdownMsg = msg;
    this.countdownColor = nextColor;
    this.pushHud();
  }

  // The wave-break "WAVE N IN Ns" label is rendered in UIScene from
  // s.waveBreakUntil and s.vTime, so we have to push HUD updates while the
  // break is ticking. Track the last-emitted integer second so we push
  // ~5–6 times per break instead of ~300 (5s × 60fps).
  private _lastWaveBreakUntil = 0;
  private _lastWaveBreakSecond = -1;

  // Pool of hidden fx-pop sprites reused for coin pickups. Big bursts (wave
  // ends with many coins magneting in at once) used to allocate + destroy a
  // Sprite + its physics-free GameObject per coin, churning the display list.
  // Same texture/animation as before — just recycled instead of recreated.
  private _coinFxPool: Phaser.GameObjects.Sprite[] = [];

  private playCoinFxPop(x: number, y: number) {
    let pop = this._coinFxPool.pop();
    if (pop) {
      pop.setPosition(x, y);
      pop.setActive(true).setVisible(true);
    } else {
      pop = this.add.sprite(x, y, 'fx_pop_0').setDepth(15).setScale(0.5);
    }
    pop.play('fx-pop');
    pop.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      pop!.setActive(false).setVisible(false);
      this._coinFxPool.push(pop!);
    });
  }

  setTimeScale(mult: number) {
    this.timeMult = mult;
    // Phaser's physics.world.timeScale is inverted: lower = faster.
    this.physics.world.timeScale = 1 / mult;
    this.anims.globalTimeScale = mult;
    this.tweens.timeScale = mult;
    this.time.timeScale = mult;
  }

  toggleBuild(k: BuildKind, towerKind?: TowerKind) {
    // If same build mode is already active, cancel it (toggle off)
    if (k === 'wall' && this.buildKind === 'wall') {
      this.setBuild('none');
      return;
    }
    if (k === 'tower' && this.buildKind === 'tower' && towerKind === this.buildTowerKind) {
      this.setBuild('none');
      return;
    }
    this.setBuild(k, towerKind);
  }

  setBuild(k: BuildKind, towerKind?: TowerKind) {
    this.buildKind = k;
    if (k === 'tower' && towerKind) this.buildTowerKind = towerKind;
    this.ghost.setVisible(k !== 'none');
    if (this.deleteIcon) this.deleteIcon.setVisible(false);
    if (this.gridOverlay) this.gridOverlay.setVisible(k !== 'none');
    this.game.events.emit('build-mode', k !== 'none', k, towerKind);
    if (k === 'none') {
      this.game.events.emit('build-error', '');
      this._lastBuildErr = '';
    }
    if (k === 'tower') {
      this.ghost.setTexture(this.buildTowerKind === 'cannon' ? 'c_base' : 't_base');
      const baseTint = Tower.TIER_TINT[this.buildTowerKind][0];
      this.ghost.setTint(baseTint);
    }
    if (k === 'wall') {
      this.ghost.setTexture('wall');
      this.ghost.clearTint();
    }
    if (k !== 'none') this.deselectTower();

    // Pause/unpause game world for build mode
    if (k !== 'none' && !this.buildPaused) {
      this.buildPaused = true;
      this.physics.pause();
      this.tweens.pauseAll();
      this.anims.pauseAll();
    } else if (k === 'none' && this.buildPaused) {
      this.buildPaused = false;
      this.physics.resume();
      this.tweens.resumeAll();
      this.anims.resumeAll();
    }

    this.pushHud();
  }

  // Check if a 2x2 block with top-left at (tx,ty) is all free, not under player,
  // and wouldn't block enemy pathing from all 4 edges to the player.
  canPlaceTower(tx: number, ty: number): boolean {
    const s = CFG.tower.tiles;
    const pt = this.worldToTile(this.player.x, this.player.y);
    for (let j = 0; j < s; j++) {
      for (let i = 0; i < s; i++) {
        if (gridGet(this.grid, tx + i, ty + j) !== 0) return false;
      }
    }
    // Temporarily block tiles and check spawn directions can still reach the player
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) gridSet(this.grid, tx + i, ty + j, 2);
    const ok = canReachFromSpawnDirections(this.grid, pt.x, pt.y, this.spawnDist);
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) gridSet(this.grid, tx + i, ty + j, 0);
    return ok;
  }

  handleClick(p: Phaser.Input.Pointer) {
    if (this.gameOver) return;

    // Right-click cancels build mode
    if (p.rightButtonDown() && this.buildKind !== 'none') {
      this.setBuild('none');
      return;
    }

    // Ignore taps that land inside the mobile joystick's hit zone — otherwise
    // dragging the stick during build mode would also place a tower beneath
    // the thumb. Bounds are published by UIScene in screen-space pixels.
    const jb = this.game.registry.get('joystickBounds') as
      | { x: number; y: number; w: number; h: number }
      | undefined;
    if (jb && p.x >= jb.x && p.x <= jb.x + jb.w && p.y >= jb.y && p.y <= jb.y + jb.h) {
      return;
    }

    const wx = p.worldX, wy = p.worldY;

    // panel takes priority — clicks inside it are handled by button hit areas
    if (this.selectedTower && this.pointInPanel(wx, wy)) return;

    const tx = Math.floor(wx / CFG.tile);
    const ty = Math.floor(wy / CFG.tile);

    // sell with X held + click
    if (this.keys.X.isDown) {
      if (this.game.registry.get('tutorialActive')) return; // no selling during tutorial
      this.sellAt(tx, ty);
      return;
    }

    // click an existing tower with no active build = select it
    if (this.buildKind === 'none') {
      const hit = this.towers.find(t =>
        tx >= t.tileX && tx < t.tileX + t.size &&
        ty >= t.tileY && ty < t.tileY + t.size);
      if (hit) {
        this.selectTower(hit);
        return;
      }
      // No tower under cursor — if it's a wall, start the sell countdown
      // (click it again to cancel). Towers still need the upgrade panel
      // for sell, so we don't auto-sell them on click.
      if (!this.game.registry.get('tutorialActive')) {
        const wHit = this.walls.find(w => w.tileX === tx && w.tileY === ty);
        if (wHit) {
          this.startSellTimer(wHit);
          return;
        }
      }
      this.deselectTower();
      return;
    }

    // entering build mode cancels selection
    this.deselectTower();

    if (this.buildKind === 'tower') {
      // Tutorial caps placements at 1 tower; ignore further click-to-place
      // even if the player somehow stays in tower build mode.
      if (this.game.registry.get('tutorialActive') && this.towers.length >= 1) return;
      const s = CFG.tower.tiles;
      // For even-size footprints, snap to the nearest grid intersection
      // so the tower centers under the cursor. For odd, snap to tile center.
      const ox = s % 2 === 0
        ? Math.round(wx / CFG.tile) - s / 2
        : Math.floor(wx / CFG.tile) - Math.floor(s / 2);
      const oy = s % 2 === 0
        ? Math.round(wy / CFG.tile) - s / 2
        : Math.floor(wy / CFG.tile) - Math.floor(s / 2);
      if (!this.canPlaceTower(ox, oy)) return;
      const kindCost = CFG.tower.kinds[this.buildTowerKind].cost;
      if (this.player.money < kindCost) return;
      this.player.money -= kindCost;
      const t = new Tower(this, ox, oy, this.buildTowerKind);
      this.towers.push(t);
      this.towerGroup.add(t);
      this.applyTowerDepth(t); // static — set once, skipped in updateDepthSort
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) gridSet(this.grid, ox + i, oy + j, 2);
      this.gridVersion++; this._wallCheckCache.clear(); this.rebuildGapBlockers(); this.rebuildGapBlockers();
      this.pushHud();
      SFX.play('towerPlace');
      if (this.game.registry.get('tutorialActive')) this.game.events.emit('tutorial-tower-placed');
      this.setBuild('none');
      return;
    }

    // wall
    // Click on an existing wall while in wall build mode = start the
    // sell countdown instead of trying (and failing) to place. Skip
    // during tutorial since we don't allow selling there.
    if (!this.game.registry.get('tutorialActive')) {
      const wHit = this.walls.find(w => w.tileX === tx && w.tileY === ty);
      if (wHit) {
        this.startSellTimer(wHit);
        return;
      }
    }
    // Tutorial caps placements at 3 walls.
    if (this.game.registry.get('tutorialActive') && this.walls.length >= 3) return;
    if (gridGet(this.grid, tx, ty) !== 0) return;
    if (this.player.money < CFG.wall.cost) return;
    const pt = this.worldToTile(this.player.x, this.player.y);
    // Check placing this wall won't reduce reachable spawn directions below minimum
    const beforeReach = this.countReachableDirections(pt.x, pt.y);
    gridSet(this.grid, tx, ty, 1);
    const afterReach = this.countReachableDirections(pt.x, pt.y);
    gridSet(this.grid, tx, ty, 0);
    if (afterReach < Math.min(beforeReach, 2)) return;
    this.player.money -= CFG.wall.cost;
    const w = new Wall(this, tx, ty);
    this.walls.push(w);
    this.wallGroup.add(w);
    gridSet(this.grid, tx, ty, 1);
    this.syncWallTile(tx, ty, true);
    this.updateWallNeighbors(tx, ty);
    this.gridVersion++; this._wallCheckCache.clear(); this.rebuildGapBlockers();
    this.pushHud();
    SFX.play('wallPlace');
    if (this.game.registry.get('tutorialActive')) this.game.events.emit('tutorial-wall-placed');
  }

  sellAt(tx: number, ty: number) {
    if (this.game.registry.get('tutorialActive')) return;
    // tower: click anywhere inside the footprint
    const ti = this.towers.findIndex(t =>
      tx >= t.tileX && tx < t.tileX + t.size &&
      ty >= t.tileY && ty < t.tileY + t.size);
    if (ti >= 0) {
      this.startSellTimer(this.towers[ti]);
      return;
    }
    const wi = this.walls.findIndex(w => w.tileX === tx && w.tileY === ty);
    if (wi >= 0) {
      this.startSellTimer(this.walls[wi]);
    }
  }

  startSellTimer(target: Tower | Wall) {
    // If already pending, cancel instead (click again to cancel)
    if (this.sellTimers.has(target)) {
      this.cancelSellTimer(target);
      return;
    }
    SFX.play('click');
    const gfx = this.add.graphics().setDepth(200);
    this.sellTimers.set(target, { startTime: this.vTime, duration: 3000, gfx });
    // Paint at 100% remaining immediately so the marker is visible even
    // when the click happens during a paused build menu — updateSellTimers
    // doesn't run while paused, so without this initial draw the pie
    // stays invisible until the player exits build mode.
    this.drawSellTimerGfx(target, gfx, 1);
  }

  private drawSellTimerGfx(target: Tower | Wall, gfx: Phaser.GameObjects.Graphics, remaining: number) {
    const cx = target.x, cy = target.y;
    const radius = target instanceof Tower ? CFG.tile * 0.9 : CFG.tile * 0.45;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + remaining * Math.PI * 2;
    gfx.clear();
    // Red pie countdown
    gfx.fillStyle(0xff2222, 0.3);
    gfx.beginPath();
    gfx.moveTo(cx, cy);
    gfx.arc(cx, cy, radius, startAngle, endAngle, false);
    gfx.closePath();
    gfx.fillPath();
    gfx.lineStyle(2, 0xff4444, 0.6);
    gfx.beginPath();
    gfx.arc(cx, cy, radius, startAngle, endAngle, false);
    gfx.strokePath();
    // Persistent dark-red X — keeps the "marked for destruction" read
    // even when the pie shrinks down toward the wedge.
    const xr = radius * 0.5;
    gfx.lineStyle(3, 0x8a0000, 0.95);
    gfx.lineBetween(cx - xr, cy - xr, cx + xr, cy + xr);
    gfx.lineBetween(cx - xr, cy + xr, cx + xr, cy - xr);
  }

  cancelSellTimer(target: Tower | Wall) {
    const timer = this.sellTimers.get(target);
    if (timer) {
      timer.gfx.destroy();
      this.sellTimers.delete(target);
    }
  }

  updateSellTimers() {
    for (const [target, timer] of this.sellTimers) {
      const elapsed = this.vTime - timer.startTime;
      const progress = Math.min(elapsed / timer.duration, 1);

      if (progress >= 1) {
        // Timer complete — execute sell
        timer.gfx.destroy();
        this.sellTimers.delete(target);
        this.executeSell(target);
        continue;
      }

      this.drawSellTimerGfx(target, timer.gfx, 1 - progress);
    }
  }

  updateWebs(time: number) {
    // Expire old webs
    for (let i = this.webs.length - 1; i >= 0; i--) {
      const w = this.webs[i];
      if (time >= w.expireAt) {
        // Fade out
        this.tweens.add({
          targets: w.sprite, alpha: 0, duration: 300,
          onComplete: () => w.sprite.destroy()
        });
        this.webs.splice(i, 1);
      }
    }
    // Slow enemies standing on webs
    if (this.webs.length > 0) {
      const slowFactor = CFG.forest.spiderWebSlowFactor;
      for (const e of this.enemies.getChildren() as Enemy[]) {
        if (!e.active || e.dying) continue;
        let onWeb = false;
        for (const w of this.webs) {
          const dx = e.x - w.x, dy = e.y - w.y;
          if (dx * dx + dy * dy < 24 * 24) { onWeb = true; break; }
        }
        if (onWeb) {
          const body = e.body as Phaser.Physics.Arcade.Body;
          body.velocity.x *= slowFactor;
          body.velocity.y *= slowFactor;
        }
      }
    }
  }

  executeSell(target: Tower | Wall) {
    SFX.play('structDestroy');
    if (target instanceof Tower) {
      const t = target;
      if (this.selectedTower === t) this.deselectTower();
      this.player.money += Math.floor(t.totalSpent * 0.5);
      for (let j = 0; j < t.size; j++)
        for (let i = 0; i < t.size; i++)
          gridSet(this.grid, t.tileX + i, t.tileY + j, 0);
      const idx = this.towers.indexOf(t);
      if (idx >= 0) this.towers.splice(idx, 1);
      t.destroyTower();
    } else {
      const w = target;
      // Walls refund $2 (cost is $3) — slight loss to discourage churn but
      // not so harsh that re-routing your defenses feels punishing.
      this.player.money += 2;
      const idx = this.walls.indexOf(w);
      if (idx >= 0) this.walls.splice(idx, 1);
      gridSet(this.grid, w.tileX, w.tileY, 0);
      this.syncWallTile(w.tileX, w.tileY, false);
      this.updateWallNeighbors(w.tileX, w.tileY);
      w.destroy();
    }
    this.gridVersion++; this._wallCheckCache.clear(); this.rebuildGapBlockers();
    this.pushHud();
  }

  selectTower(t: Tower) {
    this.selectedTower = t;
    this.drawSelectionRing(t);
    this.buildTowerPanel(t);
    this.game.events.emit('tutorial-tower-selected');
    // Freeze game while tower panel is open
    if (!this.buildPaused) {
      this.buildPaused = true;
      this.physics.pause();
      this.tweens.pauseAll();
      this.anims.pauseAll();
    }
  }

  deselectTower() {
    this.selectedTower = null;
    this.selectionRing.clear().setVisible(false);
    this.towerPanel.removeAll(true);
    this.towerPanel.setVisible(false);
    this.game.events.emit('tutorial-tower-deselected');
    // Unfreeze if no build mode active either
    if (this.buildPaused && this.buildKind === 'none') {
      this.buildPaused = false;
      this.physics.resume();
      this.tweens.resumeAll();
      this.anims.resumeAll();
    }
  }

  drawSelectionRing(t: Tower) {
    const st = t.stats();
    const g = this.selectionRing;
    g.clear();
    g.lineStyle(2, 0x7cc4ff, 0.8);
    g.strokeCircle(t.x, t.y, st.range);
    g.lineStyle(1, 0x7cc4ff, 0.25);
    g.strokeCircle(t.x, t.y, st.range - 3);
    g.setVisible(true);
  }

  pointInPanel(wx: number, wy: number): boolean {
    if (!this.towerPanel.visible) return false;
    const b = this.towerPanelBounds;
    return wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h;
  }

  buildTowerPanel(t: Tower) {
    const panel = this.towerPanel;
    panel.removeAll(true);

    // Mobile gets a 1.5× larger panel so the buttons are tap-friendly. Every
    // literal pixel size below is multiplied by `ms` so the layout stays
    // proportional at the larger size (text included via fontSize: `${n*ms}px`).
    const isMobile = !!this.game.registry.get('isMobile');
    const ms = isMobile ? 1.5 : 1;

    const W = 184 * ms, H = 76 * ms;
    const towerHalfH = CFG.tile * t.size / 2;
    const standoff = 10 * ms;

    // Default: panel above the tower with the nub pointing down at it.
    let py = t.y - towerHalfH - H / 2 - standoff;
    let nubAtBottom = true;

    // Mobile: if the panel would clip off the top of the screen OR sit
    // underneath the HUD (which lives in the top ~80 design-pixels of the
    // canvas), flip below the tower with the nub pointing up. The HUD is
    // rendered in canvas pixels, so convert that vertical extent to world
    // units via uiScale / camera zoom before comparing against worldView.
    if (isMobile) {
      const view = this.cameras.main.worldView;
      const sf = this.game.registry.get('sf') || 1;
      const camZoom = this.cameras.main.zoom || 1;
      const hudClearWorld = (90 * sf) / camZoom; // 80px HUD region + a little padding
      if (py - H / 2 < view.y + hudClearWorld) {
        py = t.y + towerHalfH + H / 2 + standoff;
        nubAtBottom = false;
      }
    }

    const px = t.x;
    panel.setPosition(px, py);
    panel.setVisible(true);
    this.towerPanelBounds = { x: px - W / 2, y: py - H / 2, w: W, h: H };

    // Themed accent — same blue accent the HUD uses for info/wave bars.
    const accent = 0x4a8acc;
    const panelR = 8 * ms;

    // Rounded panel — matches Victory/Defeat language: dark navy fill,
    // subtle inner stroke, themed outer stroke.
    const panelG = this.add.graphics();
    panelG.fillStyle(0x11172a, 0.97);
    panelG.fillRoundedRect(-W / 2, -H / 2, W, H, panelR);
    panelG.lineStyle(1 * ms, 0x2a3760, 0.7);
    panelG.strokeRoundedRect(-W / 2 + 3 * ms, -H / 2 + 3 * ms, W - 6 * ms, H - 6 * ms, panelR - 2 * ms);
    panelG.lineStyle(2 * ms, accent, 0.85);
    panelG.strokeRoundedRect(-W / 2, -H / 2, W, H, panelR);
    panel.add(panelG);

    // Pointer nub — drawn with Graphics rather than the Triangle Shape so
    // it (a) lands centered horizontally on the panel (Phaser's Triangle
    // Shape uses Math.max(x1,x2,x3) for its width, which throws centering
    // off when vertex coords straddle 0), and (b) has its base flush with
    // the panel edge so the nub and panel touch with no visible gap.
    const nubHalfW = 6 * ms;
    const nubH = 8 * ms;
    const baseY = nubAtBottom ? H / 2 : -H / 2;
    const apexY = nubAtBottom ? baseY + nubH : baseY - nubH;
    const nubG = this.add.graphics();
    nubG.fillStyle(0x11172a, 1);
    nubG.beginPath();
    nubG.moveTo(-nubHalfW, baseY);
    nubG.lineTo(nubHalfW, baseY);
    nubG.lineTo(0, apexY);
    nubG.closePath();
    nubG.fillPath();
    // Stroke only the two slanted sides — the base sits on top of the
    // panel's outline, so a base stroke would just double-draw it.
    nubG.lineStyle(1 * ms, accent, 1);
    nubG.beginPath();
    nubG.moveTo(-nubHalfW, baseY);
    nubG.lineTo(0, apexY);
    nubG.lineTo(nubHalfW, baseY);
    nubG.strokePath();
    panel.add(nubG);

    // Title
    const tr = this.sf;
    const title = this.add.text(-W / 2 + 10 * ms, -H / 2 + 7 * ms, `${t.kind.toUpperCase()}  LVL ${t.level + 1}`, {
      fontFamily: 'monospace', fontSize: `${12 * ms}px`, fontStyle: 'bold', color: '#7cc4ff',
      stroke: '#0b0f1a', strokeThickness: 2 * ms
    }).setResolution(tr);
    panel.add(title);

    const sellVal = Math.floor(t.totalSpent * 0.5);

    // Stats
    const st = t.stats();
    const splashLine = st.splashRadius > 0 ? `  AOE ${st.splashRadius}` : '';
    const stats = this.add.text(-W / 2 + 10 * ms, -H / 2 + 24 * ms,
      `DMG ${st.damage}  RNG ${st.range}${splashLine}\nFIRE ${(1000 / st.fireRate).toFixed(1)}/s  HP ${t.hp}/${t.maxHp}`,
      { fontFamily: 'monospace', fontSize: `${10 * ms}px`, color: '#ccd' }).setResolution(tr);
    panel.add(stats);

    // ---- Buttons — rounded, themed strokes (green=affordable, red=can't / sell)
    const btnW = 80 * ms, btnH = 22 * ms, btnR = 5 * ms;
    const btnY = H / 2 - btnH / 2 - 6 * ms;

    // Upgrade
    const canUp = t.canUpgrade();
    const upCost = t.upgradeCost();
    const affordable = canUp && this.player.money >= upCost;
    const upLabel = canUp ? `UPGRADE $${upCost}` : 'MAX LEVEL';
    const upStroke = !canUp ? 0x556677 : affordable ? 0x4ad96a : 0xd94a4a;
    const upTextColor = !canUp ? '#888' : affordable ? '#7cf29a' : '#ff9a9a';
    const upX = -W / 2 + 8 * ms, upCX = upX + btnW / 2;
    const upG = this.add.graphics();
    let upHover = false;
    const drawUp = () => {
      upG.clear();
      upG.fillStyle(upHover && canUp ? 0x1a2238 : 0x0b0f1a, 0.95);
      upG.fillRoundedRect(upX, btnY - btnH / 2, btnW, btnH, btnR);
      upG.lineStyle(1.5 * ms, upStroke, upHover && canUp ? 1 : 0.85);
      upG.strokeRoundedRect(upX, btnY - btnH / 2, btnW, btnH, btnR);
    };
    drawUp();
    const upTxt = this.add.text(upCX, btnY, upLabel, {
      fontFamily: 'monospace', fontSize: `${10 * ms}px`, fontStyle: 'bold', color: upTextColor,
      stroke: '#0b0f1a', strokeThickness: 2 * ms
    }).setOrigin(0.5).setResolution(tr);
    panel.add([upG, upTxt]);
    if (canUp) {
      const upHit = this.add.rectangle(upCX, btnY, btnW, btnH, 0x000000, 0).setInteractive({ useHandCursor: true });
      upHit.on('pointerdown', (_p: any, _lx: any, _ly: any, ev: any) => {
        ev?.stopPropagation?.();
        this.doUpgradeSelected();
      });
      upHit.on('pointerover', () => { upHover = true; drawUp(); });
      upHit.on('pointerout',  () => { upHover = false; drawUp(); });
      panel.add(upHit);
    }

    // Sell
    const sellX = W / 2 - 8 * ms - btnW, sellCX = sellX + btnW / 2;
    const sellG = this.add.graphics();
    let sellHover = false;
    const drawSell = () => {
      sellG.clear();
      sellG.fillStyle(sellHover ? 0x1a2238 : 0x0b0f1a, 0.95);
      sellG.fillRoundedRect(sellX, btnY - btnH / 2, btnW, btnH, btnR);
      sellG.lineStyle(1.5 * ms, 0xd94a4a, sellHover ? 1 : 0.85);
      sellG.strokeRoundedRect(sellX, btnY - btnH / 2, btnW, btnH, btnR);
    };
    drawSell();
    const sellTxt = this.add.text(sellCX, btnY, `SELL $${sellVal}`, {
      fontFamily: 'monospace', fontSize: `${10 * ms}px`, fontStyle: 'bold', color: '#ffd6c0',
      stroke: '#0b0f1a', strokeThickness: 2 * ms
    }).setOrigin(0.5).setResolution(tr);
    const sellHit = this.add.rectangle(sellCX, btnY, btnW, btnH, 0x000000, 0).setInteractive({ useHandCursor: true });
    sellHit.on('pointerdown', (_p: any, _lx: any, _ly: any, ev: any) => {
      ev?.stopPropagation?.();
      if (this.game.registry.get('tutorialActive')) return;
      this.doSellSelected();
    });
    sellHit.on('pointerover', () => { sellHover = true; drawSell(); });
    sellHit.on('pointerout',  () => { sellHover = false; drawSell(); });
    panel.add([sellG, sellTxt, sellHit]);
  }

  doUpgradeSelected() {
    const t = this.selectedTower;
    if (!t) return;
    if (!t.canUpgrade()) return;
    const cost = t.upgradeCost();
    if (this.player.money < cost) {
      this.floatText(t.x, t.y - 40, `NEED $${cost}`, '#ff6a6a');
      return;
    }
    this.player.money -= cost;
    t.totalSpent += cost;
    t.upgrade();
    SFX.play('upgrade');
    this.floatText(t.x, t.y - 40, `LVL ${t.level + 1}`, '#7cf29a');
    this.game.events.emit('tutorial-tower-upgraded');
    this.pushHud();
    // Auto-close the panel — the upgrade succeeded so the player isn't
    // about to do anything else with this tower.
    this.deselectTower();
  }

  doSellSelected() {
    const t = this.selectedTower;
    if (!t) return;
    // Start the same red-pie countdown walls use, then close the panel
    // immediately so the world resumes — towers no longer sell instantly.
    this.startSellTimer(t);
    this.deselectTower();
  }

  floatText(x: number, y: number, msg: string, color: string) {
    const txt = this.add.text(x, y, msg, {
      fontFamily: 'monospace', fontSize: '12px', color,
      stroke: '#0b0f1a', strokeThickness: 3
    }).setOrigin(0.5).setDepth(950).setResolution(this.sf);
    this.tweens.add({
      targets: txt,
      y: y - 18,
      alpha: { from: 1, to: 0 },
      duration: 700,
      ease: 'Sine.Out',
      onComplete: () => txt.destroy()
    });
  }

  worldToTile(x: number, y: number) {
    return { x: Math.floor(x / CFG.tile), y: Math.floor(y / CFG.tile) };
  }

  /** Tile-grid raycast: returns true if no wall (1) or tower (2) tiles block the line. */
  hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const t = CFG.tile;
    let tx = Math.floor(x1 / t), ty = Math.floor(y1 / t);
    const ex = Math.floor(x2 / t), ey = Math.floor(y2 / t);
    const dx = Math.abs(ex - tx), dy = Math.abs(ey - ty);
    const sx = tx < ex ? 1 : -1, sy = ty < ey ? 1 : -1;
    let err = dx - dy;
    while (true) {
      if (tx === ex && ty === ey) return true;
      const v = gridGet(this.grid, tx, ty);
      if (v === 1 || v === 2) return false; // wall or tower blocks
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; tx += sx; }
      if (e2 < dx)  { err += dx; ty += sy; }
    }
  }

  /** Recompute the effective spawn radius from the current viewport. Uses
   *  the camera's corner distance (in tiles) plus a 4-tile margin so
   *  enemies still spawn off-screen even when the camera lerp is trailing
   *  the player, regardless of platform or window aspect. CFG.spawnDist
   *  is the floor — the formula only grows it. */
  recomputeSpawnDist() {
    const vp = computeViewport();
    const { w: viewW, h: viewH } = viewportWorldSize(vp);
    const cornerTiles = Math.ceil(Math.hypot(viewW / 2, viewH / 2) / CFG.tile);
    this.spawnDist = Math.max(CFG.spawnDist, cornerTiles + 4);
  }

  /** Count how many of the 4 cardinal spawn directions can reach (px, py). */
  countReachableDirections(px: number, py: number): number {
    const dist = this.spawnDist;
    const testPoints = [
      { x: px, y: py - dist },
      { x: px, y: py + dist },
      { x: px - dist, y: py },
      { x: px + dist, y: py },
    ];
    let reachable = 0;
    for (const tp of testPoints) {
      let found = false;
      for (let r = 0; r <= 3 && !found; r++) {
        for (let dy = -r; dy <= r && !found; dy++) {
          for (let dx = -r; dx <= r && !found; dx++) {
            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
            const sx = tp.x + dx, sy = tp.y + dy;
            const sv = gridGet(this.grid, sx, sy);
            if (sv === 0 || sv === 5) {
              const path = findPath(this.grid, sx, sy, px, py);
              if (path.length > 0) found = true;
            }
          }
        }
      }
      if (found) reachable++;
    }
    return reachable;
  }

  // Queue ground chunks around a world position (deferred generation)
  generateChunksAround(wx: number, wy: number, force = false) {
    const cs = CFG.chunkSize;
    const tile = CFG.tile;
    const cx = Math.floor(wx / (cs * tile));
    const cy = Math.floor(wy / (cs * tile));
    // Skip if player is still in the same chunk (unless forced at startup)
    if (!force && cx === this.lastChunkCx && cy === this.lastChunkCy) return;
    this.lastChunkCx = cx;
    this.lastChunkCy = cy;
    const cs2 = CFG.chunkSize;
    const tile2 = CFG.tile;
    const chunkPx = cs2 * tile2;
    const radius = 3; // generate around viewport
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const ck = `${cx + dx},${cy + dy}`;
        // Already have a display image? skip
        if (this.chunkImages.has(ck)) continue;
        // Texture already cached from a previous visit? Just create image, no re-render
        const texKey = `gnd_chunk_${this.biome}_${cx + dx}_${cy + dy}`;
        if (this.generatedChunks.has(ck) && this.textures.exists(texKey)) {
          const img = this.add.image((cx + dx) * chunkPx + chunkPx / 2, (cy + dy) * chunkPx + chunkPx / 2, texKey).setDepth(-1000);
          this.chunkImages.set(ck, img);
          continue;
        }
        // New chunk — queue for generation
        if (!this.generatedChunks.has(ck)) {
          this.generatedChunks.add(ck);
          this.pendingChunks.push({ cx: cx + dx, cy: cy + dy });
        }
      }
    }
    // Sort by distance to player chunk so nearest chunks render first
    this.pendingChunks.sort((a, b) =>
      ((a.cx - cx) ** 2 + (a.cy - cy) ** 2) - ((b.cx - cx) ** 2 + (b.cy - cy) ** 2)
    );

    // Destroy distant chunk images (textures stay cached for instant re-creation)
    const cullRadius = radius + 3;
    for (const [key, img] of this.chunkImages) {
      const [kcx, kcy] = key.split(',').map(Number);
      if (Math.abs(kcx - cx) > cullRadius || Math.abs(kcy - cy) > cullRadius) {
        img.destroy();
        this.chunkImages.delete(key);
      }
    }
  }

  /**
   * Process pending chunks with a time budget.
   * @param budgetMs max milliseconds to spend (0 = unlimited, process all)
   */
  processChunkQueue(budgetMs: number) {
    const cs = CFG.chunkSize;
    const tile = CFG.tile;
    const chunkPx = cs * tile;
    const start = performance.now();
    // Hard cap: at most 1 chunk per frame when budgeted (river chunks are expensive)
    const maxPerFrame = budgetMs > 0 ? 1 : Infinity;
    let processed = 0;
    while (this.pendingChunks.length > 0 && processed < maxPerFrame) {
      // Time-budget check (skip on unlimited/startup)
      if (budgetMs > 0 && performance.now() - start >= budgetMs) break;
      const { cx: ccx, cy: ccy } = this.pendingChunks.shift()!;
      const texKey = createGroundChunk(this, ccx, ccy, cs, 32, this.biome);
      const chunkImg = this.add.image(ccx * chunkPx + chunkPx / 2, ccy * chunkPx + chunkPx / 2, texKey).setDepth(-1000);
      this.chunkImages.set(`${ccx},${ccy}`, chunkImg);
      // Generate trees for this chunk if forest biome
      if (this.biome === 'forest' || this.biome === 'infected') this.placeTreesInChunk(ccx, ccy);
      if (this.biome === 'castle') this.placeSpikesInChunk(ccx, ccy);
      // Generate river terrain blockers
      if (this.biome === 'river') this.placeRiverInChunk(ccx, ccy);
      processed++;
    }
  }

  // Redraw the grid overlay around the current camera view
  /** Last camera scroll tile + zoom we drew the grid overlay against —
   *  skip the redraw entirely when nothing relevant changed (which is
   *  most frames while the player is standing or barely drifting). */
  private _lastGridOverlayLeft = NaN;
  private _lastGridOverlayTop = NaN;
  private _lastGridOverlayZoom = NaN;
  private _lastGridOverlayCols = NaN;
  private _lastGridOverlayRows = NaN;
  /** Last build-error string emitted — skip the per-frame event re-emit
   *  when the message didn't change so UIScene doesn't churn its toast. */
  private _lastBuildErr = '';

  redrawGridOverlay() {
    const cam = this.cameras.main;
    const tile = CFG.tile;
    // cam.worldView is Phaser's authoritative visible-world rectangle —
    // it accounts for zoom and origin correctly. cam.scrollX/scrollY are
    // pixel-space scroll offsets, NOT the visible-world left/top, so using
    // them here would (and did) draw the grid offset and at the wrong size
    // when zoom != 1.
    const view = cam.worldView;
    const left = Math.floor(view.x / tile) - 1;
    const top = Math.floor(view.y / tile) - 1;
    const cols = Math.ceil(view.width / tile) + 2;
    const rows = Math.ceil(view.height / tile) + 2;
    if (left === this._lastGridOverlayLeft &&
        top === this._lastGridOverlayTop &&
        cam.zoom === this._lastGridOverlayZoom &&
        cols === this._lastGridOverlayCols &&
        rows === this._lastGridOverlayRows) {
      return;
    }
    this._lastGridOverlayLeft = left;
    this._lastGridOverlayTop = top;
    this._lastGridOverlayZoom = cam.zoom;
    this._lastGridOverlayCols = cols;
    this._lastGridOverlayRows = rows;
    const right = left + cols;
    const bottom = top + rows;
    const g = this.gridOverlay;
    g.clear();
    g.lineStyle(1, 0xffffff, 0.18);
    for (let x = left; x <= right; x++) {
      g.lineBetween(x * tile, top * tile, x * tile, bottom * tile);
    }
    for (let y = top; y <= bottom; y++) {
      g.lineBetween(left * tile, y * tile, right * tile, y * tile);
    }
  }

  update(_realTime: number, delta: number) {
    if (this.gameOver) return;

    // Warm-up: let a few render frames pass (physics paused, loading overlay visible)
    // so the browser JIT-compiles and GPU uploads textures before gameplay starts.
    if (!this.loadingDone) {
      this._warmupFrames++;
      if (this._warmupFrames >= 10) {
        this.loadingDone = true;
        this.physics.resume();
        this.pushHud();
        this.game.events.emit('game-ready');
        // Pick the biome's BGM. Falls through to 'castle' for any biome
        // that doesn't yet have its own track.
        const bgmKey = (['grasslands', 'forest', 'infected', 'river', 'castle'] as const)
          .includes(this.biome as any) ? this.biome : 'castle';
        SFX.playBgm(bgmKey);
      }
      return;
    }

    // Ghost follow pointer (runs even while build-paused)
    if (this.buildKind !== 'none') {
      const p = this.input.activePointer;
      // Don't snap the ghost onto the joystick when the player's thumb is on
      // the stick — keep it at its last position until they tap elsewhere.
      const jb = this.game.registry.get('joystickBounds') as
        | { x: number; y: number; w: number; h: number }
        | undefined;
      const overJoystick = !!jb && p.x >= jb.x && p.x <= jb.x + jb.w && p.y >= jb.y && p.y <= jb.y + jb.h;
      if (!overJoystick) {
      const tx = Math.floor(p.worldX / CFG.tile);
      const ty = Math.floor(p.worldY / CFG.tile);
      let buildErr = '';
      if (this.buildKind === 'tower') {
        const s = CFG.tower.tiles;
        const ox = s % 2 === 0
          ? Math.round(p.worldX / CFG.tile) - s / 2
          : Math.floor(p.worldX / CFG.tile) - Math.floor(s / 2);
        const oy = s % 2 === 0
          ? Math.round(p.worldY / CFG.tile) - s / 2
          : Math.floor(p.worldY / CFG.tile) - Math.floor(s / 2);
        this.ghost.setPosition((ox + s / 2) * CFG.tile, (oy + s / 2) * CFG.tile);
        const towerCost = CFG.tower.kinds[this.buildTowerKind].cost;
        const canAffordTower = this.player.money >= towerCost;
        const canPlace = this.canPlaceTower(ox, oy);
        if (!canAffordTower) buildErr = 'Not enough gold';
        else if (!canPlace) buildErr = 'Blocked';
        this.ghost.setTint(canPlace && canAffordTower ? 0x88ff88 : 0xff8888);
      } else {
        this.ghost.setPosition(tx * CFG.tile + CFG.tile / 2, ty * CFG.tile + CFG.tile / 2);
        // Hovering an existing wall? Show a red X — clicking will start
        // the sell countdown to tear it down. Skip the BFS pathing check
        // entirely (way cheaper, and there's nothing to validate). Mobile
        // has no real hover (the pointer stays parked on the last touch),
        // so suppress the red X there — it would spuriously appear over
        // the just-placed wall every time the player taps to build. Tap-
        // to-sell still works through the regular pointer-down handler.
        const wallHere = !this.game.registry.get('tutorialActive')
          && !this.game.registry.get('isMobile')
          && this.walls.find(w => w.tileX === tx && w.tileY === ty);
        if (wallHere) {
          this.ghost.setVisible(false);
          // If the wall already has a pending sell timer the marker is
          // drawn over the wall itself — skip the hover hint to avoid a
          // doubled-up X.
          if (this.sellTimers.has(wallHere)) {
            this.deleteIcon.setVisible(false);
          } else {
            this.deleteIcon.setPosition(tx * CFG.tile + CFG.tile / 2, ty * CFG.tile + CFG.tile / 2)
              .setVisible(true);
          }
        } else {
          this.ghost.setVisible(true);
          this.deleteIcon.setVisible(false);

          // Invalidate cache when player moves to a new tile
          const ptKey = `${Math.floor(this.player.x / CFG.tile)},${Math.floor(this.player.y / CFG.tile)}`;
          if (ptKey !== this._lastWallCheckPlayerTile) {
            this._lastWallCheckPlayerTile = ptKey;
            this._wallCheckCache.clear();
          }
          let valid = gridGet(this.grid, tx, ty) === 0;
          let tileBlocked = !valid;
          if (valid) {
            // Per-tile cache — cleared on player move and on any grid
            // change. Sweeping the cursor over already-hovered tiles is
            // free; only first-hovered tiles pay for BFS.
            const cacheKey = `${tx},${ty}`;
            const cached = this._wallCheckCache.get(cacheKey);
            if (cached !== undefined) {
              valid = cached;
            } else {
              const pt = this.worldToTile(this.player.x, this.player.y);
              const beforeReach = this.countReachableDirections(pt.x, pt.y);
              gridSet(this.grid, tx, ty, 1);
              const afterReach = this.countReachableDirections(pt.x, pt.y);
              gridSet(this.grid, tx, ty, 0);
              valid = afterReach >= Math.min(beforeReach, 2);
              this._wallCheckCache.set(cacheKey, valid);
            }
          }
          const canAffordWall = this.player.money >= CFG.wall.cost;
          // Suppress the "Blocked" / "Blocks path" toasts on mobile when
          // building walls — the pointer parks on the last touch position,
          // so these would spuriously fire over the just-placed tile every
          // frame. The red ghost tint already conveys "can't place here".
          // The "Not enough gold" toast still shows since it isn't tied to
          // cursor location.
          const suppressPlacementToast = !!this.game.registry.get('isMobile');
          if (!canAffordWall) buildErr = 'Not enough gold';
          else if (tileBlocked && !suppressPlacementToast) buildErr = 'Blocked';
          else if (!valid && !suppressPlacementToast) buildErr = 'Blocks path';
          this.ghost.setTint(valid && canAffordWall ? 0x88ff88 : 0xff8888);
        }
      }
      if (buildErr !== this._lastBuildErr) {
        this._lastBuildErr = buildErr;
        this.game.events.emit('build-error', buildErr);
      }
      } // end !overJoystick
    }

    // Generate ground chunks around player as they move (4ms budget per frame)
    this.generateChunksAround(this.player.x, this.player.y);
    this.processChunkQueue(4);

    // River squiggle animation
    if (this.biome === 'river') this.updateRiverSquiggles(delta);

    // Redraw grid overlay around the camera if building
    if (this.buildKind !== 'none') this.redrawGridOverlay();

    // When build-paused, only update ghost/grid — skip all game simulation
    if (this.buildPaused) return;

    // Virtual time advances at timeMult speed; all downstream systems use it.
    const vd = delta * this.timeMult;
    this.vTime += vd;
    const time = this.vTime;

    // While dying, keep the world alive for the death animation but skip player input
    if (this.dying) return;

    this.pathsThisFrame = 0;
    this.updatePlayer(time, vd);
    this.updateTowers(time);
    this.updateEnemies(time, vd);
    this.updateBoss(time);
    this.updateGasClouds(time);
    this.updateBirdPoops(time);
    this.updateProjectiles(time);
    this.updateEnemyDarts();
    this.updateToadGlobs();
    this.updateBoulders(time);
    this.updateCastleProjectiles();
    this.updateCoins(vd);
    this.updateSpawning(time, vd);
    this.updateDepthSort();
    this.updateSellTimers();
    this.checkEndConditions();
  }

  // Y-based depth sort: objects lower on screen render in front
  /** Y-based depth used by everything that sorts by world position. Inlined
   *  so the per-frame depth-sort loop doesn't pay for a function call per
   *  entity. */
  private static yDepth(y: number) { return 100 + y * 0.1; }

  /** Apply tower-base + stand + top + nocked-arrow depths once. Towers
   *  don't move so this is set at placement and the per-frame loop skips
   *  them entirely. */
  applyTowerDepth(t: Tower) {
    const d = GameScene.yDepth(t.y);
    t.setDepth(d);
    if (t.stand) t.stand.setDepth(d + 0.1);
    t.top.setDepth(d + 0.2);
    if (t.nockedArrow) t.nockedArrow.setDepth(d + 5);
  }

  updateDepthSort() {
    const yD = GameScene.yDepth;

    // Player (and bow/nocked arrow ride with it)
    const py = this.player.y;
    const pd = yD(py);
    this.player.setDepth(pd);
    this.player.bow.setDepth(pd + 0.5);
    this.player.nockedArrow.setDepth(pd + 1);

    // Enemies move every frame — keep sorting them.
    const enemies = this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[];
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.active) e.setDepth(yD(e.y));
    }

    // Arrow projectiles fly across the map, so depth needs to track y.
    // Cannonballs keep their fixed (high) depth because they arc above
    // terrain visually.
    const projs = this.projectiles.getChildren() as Projectile[];
    for (let i = 0; i < projs.length; i++) {
      const p = projs[i];
      if (!p.active || p.groundTarget) continue;
      p.setDepth(yD(p.y) + 5);
    }

    // Towers + coins are static — depth is set once at spawn (see
    // applyTowerDepth + Coin constructor) and skipped here every frame.
  }

  // Sync a single tile in the collision tilemap (wall placed or removed)
  syncWallTile(tx: number, ty: number, blocked: boolean) {
    const mapOffset = (this.wallTilemap.width / 2);
    const mx = tx + mapOffset, my = ty + mapOffset;
    if (mx >= 0 && mx < this.wallTilemap.width && my >= 0 && my < this.wallTilemap.height) {
      this.wallLayer.putTileAt(blocked ? 1 : -1, mx, my);
    }
  }

  // Place invisible physics rectangles at diagonal gaps between walls and towers
  // so the player can't squeeze through. Rebuilds from scratch each call.
  rebuildGapBlockers() {
    if (!this.gapBlockers) return;
    this.gapBlockers.clear(true, true);
    const t = CFG.tile;
    const checked = new Set<string>();

    // Scan all blocked tiles and check their corners
    for (const [key] of this.grid) {
      const [kx, ky] = key.split(',').map(Number);
      // Check all 4 corners of this tile
      for (const [cx, cy] of [[kx, ky], [kx+1, ky], [kx, ky+1], [kx+1, ky+1]]) {
        const ckey = `${cx},${cy}`;
        if (checked.has(ckey)) continue;
        checked.add(ckey);

        // 4 tiles around this corner
        const tl = gridGet(this.grid, cx - 1, cy - 1);
        const tr = gridGet(this.grid, cx,     cy - 1);
        const bl = gridGet(this.grid, cx - 1, cy);
        const br = gridGet(this.grid, cx,     cy);

        // Only block corners where a wall/tree (solid) meets a tower (2) diagonally.
        // Wall-to-wall corners don't need blockers (both are full-tile rectangles).
        // Tower-to-tower corners are intentional gaps (gameplay feature).
        const isSolid = (v: number) => v === 1 || v === 3 || v === 4; // wall, tree, or water/rock
        const tlbrNeedBlock = (isSolid(tr) && bl === 2) || (tr === 2 && isSolid(bl));
        const trblNeedBlock = (isSolid(tl) && br === 2) || (tl === 2 && isSolid(br));

        if (!tlbrNeedBlock && !trblNeedBlock) continue;

        // Place a small square blocker at this corner
        const wx = cx * t, wy = cy * t;
        const size = 18; // big enough to block the player's radius-14 circle
        const blocker = this.add.zone(wx, wy, size, size);
        this.physics.add.existing(blocker, true);
        (blocker.body as Phaser.Physics.Arcade.StaticBody).setSize(size, size);
        (blocker.body as Phaser.Physics.Arcade.StaticBody).position.set(wx - size/2, wy - size/2);
        this.gapBlockers!.add(blocker);
      }
    }
  }

  /** Destroy a tree tile at grid coords, removing its blocker and sprite. */
  destroyTreeTile(gx: number, gy: number) {
    const t = CFG.tile;
    gridSet(this.grid, gx, gy, 0);
    this.syncWallTile(gx, gy, false);

    // Remove the physics blocker zone at this tile
    const wx = gx * t + t / 2;
    const wy = gy * t + t / 2;
    for (const child of this.wallGroup.getChildren()) {
      if (Math.abs((child as any).x - wx) < 2 && Math.abs((child as any).y - wy) < 2) {
        child.destroy();
        break;
      }
    }

    // Destroy any tree sprite overlapping this tile
    const px = gx * t + t / 2;
    const py = gy * t + t / 2;
    for (let i = this.treeSprites.length - 1; i >= 0; i--) {
      const spr = this.treeSprites[i] as Phaser.GameObjects.Image;
      const hw = spr.width * spr.scaleX / 2;
      const hh = spr.height * spr.scaleY / 2;
      if (px >= spr.x - hw && px <= spr.x + hw && py >= spr.y - hh && py <= spr.y + hh) {
        spr.destroy();
        this.treeSprites.splice(i, 1);
      }
    }

    this.gridVersion++; this._wallCheckCache.clear();
  }

  // ---------- RIVER TERRAIN (river biome) ----------
  placeRiverInChunk(cx: number, cy: number) {
    const chunkKey = `${cx},${cy}`;
    if (this.riverChunksGenerated.has(chunkKey)) return;
    this.riverChunksGenerated.add(chunkKey);

    const t = CFG.tile;
    const cs = CFG.chunkSize;
    const chunkTileX = cx * cs;
    const chunkTileY = cy * cs;

    for (let ty = 0; ty < cs; ty++) {
      for (let tx = 0; tx < cs; tx++) {
        const gx = chunkTileX + tx;
        const gy = chunkTileY + ty;
        const gridVal = getRiverTileGrid(gx, gy);
        if (gridVal === 4) {
          gridSet(this.grid, gx, gy, 4);
          this.syncWallTile(gx, gy, true);
        } else if (gridVal === 5) {
          gridSet(this.grid, gx, gy, 5);
          // No physics blocker — bridges are walkable
        }
      }
    }
    // Don't bump gridVersion here — river terrain is static and shouldn't
    // force all enemies to recalculate paths on every chunk load.
  }

  // ---------- RIVER SQUIGGLES (animated water flow lines) ----------
  updateRiverSquiggles(delta: number) {
    const cam = this.cameras.main;
    const camL = cam.scrollX - 50;
    const camR = cam.scrollX + cam.width + 50;
    const camT = cam.scrollY - 50;
    const camB = cam.scrollY + cam.height + 50;
    const MAX_SQUIGGLES = 12;

    // Spawn new squiggles periodically
    this.squiggleTimer -= delta;
    if (this.squiggleTimer <= 0 && this.riverSquiggles.length < MAX_SQUIGGLES) {
      this.squiggleTimer = 200 + Math.random() * 250;
      const vertical = Math.random() < 0.5;
      const texKey = `river_squig_${Math.floor(Math.random() * 5)}`;
      const speed = 0.005 + Math.random() * 0.006;

      if (vertical) {
        // Vertical river: spawn at random Y, position on river center X
        const spawnY = camT + Math.random() * (camB - camT);
        const cx = riverCenterPx(0, spawnY);
        if (cx > camL && cx < camR) {
          const ox = (Math.random() - 0.5) * RIVER_HALF_W * 1.2;
          const sprite = this.add.image(cx + ox, spawnY, texKey).setDepth(-999).setAlpha(0);
          this.riverSquiggles.push({ sprite, age: 0, life: 1500 + Math.random() * 1000, dx: 0, dy: speed });
        }
      } else {
        // Horizontal river: spawn at random X, position on river center Y
        const spawnX = camL + Math.random() * (camR - camL);
        const cy = riverHorizontalCenterY(spawnX);
        if (cy > camT && cy < camB) {
          const oy = (Math.random() - 0.5) * RIVER_HALF_W * 1.2;
          const sprite = this.add.image(spawnX, cy + oy, texKey).setDepth(-999).setAlpha(0);
          this.riverSquiggles.push({ sprite, age: 0, life: 1500 + Math.random() * 1000, dx: speed, dy: 0 });
        }
      }
    }

    // Update sprites
    for (let i = this.riverSquiggles.length - 1; i >= 0; i--) {
      const sq = this.riverSquiggles[i];
      sq.age += delta;
      sq.sprite.x += sq.dx * delta;
      sq.sprite.y += sq.dy * delta;

      const sx = sq.sprite.x, sy = sq.sprite.y;
      if (sq.age >= sq.life || sx < camL - 80 || sx > camR + 80 || sy < camT - 80 || sy > camB + 80) {
        sq.sprite.destroy();
        this.riverSquiggles.splice(i, 1);
        continue;
      }

      const t = sq.age / sq.life;
      const alpha = t < 0.2 ? t / 0.2 : t > 0.7 ? (1 - t) / 0.3 : 1.0;
      sq.sprite.setAlpha(alpha * 0.15);
    }
  }

  // ---------- TREE OBSTACLES (forest biome) ----------
  /** Place tree clusters in a single chunk. Deterministic per chunk coords + treeSeed. */
  placeTreesInChunk(cx: number, cy: number) {
    const chunkKey = `${cx},${cy}`;
    if (this.treeChunksGenerated.has(chunkKey)) return;
    this.treeChunksGenerated.add(chunkKey);

    const t = CFG.tile;
    const cs = CFG.chunkSize; // tiles per chunk
    const clustersPerChunk = 2; // target clusters per chunk
    const maxAttempts = clustersPerChunk * 6;

    // Deterministic RNG for this chunk (same treeSeed + chunk coords = same trees)
    let seed = ((this.treeSeed + cx * 73856093 + cy * 19349669) >>> 0) || 1;
    const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    const ptx = Math.floor(this.player.x / t);
    const pty = Math.floor(this.player.y / t);
    // Only do pathfinding checks near spawn (within spawnDist + margin)
    const nearSpawn = Math.abs(cx * cs) < this.spawnDist + cs && Math.abs(cy * cs) < this.spawnDist + cs;

    // Chunk tile origin
    const chunkTileX = cx * cs;
    const chunkTileY = cy * cs;

    let placed = 0;
    let attempts = 0;
    while (placed < clustersPerChunk && attempts < maxAttempts) {
      attempts++;
      const pattern = TREE_PATTERNS[Math.floor(rng() * TREE_PATTERNS.length)];
      // Random tile within this chunk
      const ox = chunkTileX + Math.floor(rng() * (cs - pattern.w));
      const oy = chunkTileY + Math.floor(rng() * (cs - pattern.h));

      // Don't place too close to player spawn
      if (Math.abs(ox) < 3 && Math.abs(oy) < 3) continue;

      // Check all tiles in pattern are free
      let blocked = false;
      for (const tile of pattern.tiles) {
        const gx = ox + tile.dx, gy = oy + tile.dy;
        if (gridGet(this.grid, gx, gy) !== 0) { blocked = true; break; }
        if (Math.abs(gx - ptx) <= 1 && Math.abs(gy - pty) <= 1) { blocked = true; break; }
      }
      if (blocked) continue;

      // Tentatively place on grid
      for (const tile of pattern.tiles) {
        gridSet(this.grid, ox + tile.dx, oy + tile.dy, 3);
      }

      // Pathfinding check only near spawn area
      if (nearSpawn && !canReachFromSpawnDirections(this.grid, ptx, pty, this.spawnDist, 3)) {
        for (const tile of pattern.tiles) {
          gridSet(this.grid, ox + tile.dx, oy + tile.dy, 0);
        }
        continue;
      }

      // Place cluster sprite
      const patIdx = TREE_PATTERNS.indexOf(pattern);
      const sprX = ox * t + (pattern.w * t) / 2;
      const sprY = oy * t + (pattern.h * t) / 2;
      const bottomY = oy * t + pattern.h * t;
      const texKey = this.biome === 'infected' ? `infected_plant_${patIdx}` : `tree_cluster_${patIdx}`;
      const spr = this.add.image(sprX, sprY, texKey).setDepth(100 + bottomY * 0.1);
      this.treeSprites.push(spr);

      // Place per-tile collision blockers
      for (const tile of pattern.tiles) {
        const gx = ox + tile.dx, gy = oy + tile.dy;
        const wx = gx * t + t / 2;
        const wy = gy * t + t / 2;

        const blocker = this.add.zone(wx, wy, t, t);
        this.physics.add.existing(blocker, true);
        (blocker.body as Phaser.Physics.Arcade.StaticBody).setSize(t, t);
        (blocker.body as Phaser.Physics.Arcade.StaticBody).position.set(wx - t / 2, wy - t / 2);
        this.wallGroup.add(blocker);

        this.syncWallTile(gx, gy, true);
      }
      placed++;
    }
  }

  /** Castle floor spikes — same deterministic chunk generator as trees,
   *  but spikes block enemy pathing only (grid value 6) without joining
   *  wallGroup, so the player can walk through and take damage. */
  placeSpikesInChunk(cx: number, cy: number) {
    const chunkKey = `${cx},${cy}`;
    if (this.spikeChunksGenerated.has(chunkKey)) return;
    this.spikeChunksGenerated.add(chunkKey);

    const t = CFG.tile;
    const cs = CFG.chunkSize;
    const spikesPerChunk = 4; // a touch denser than tree clusters
    const maxAttempts = spikesPerChunk * 6;

    // Independent seed from trees so swapping biomes doesn't reuse layouts.
    let seed = ((this.treeSeed * 2654435761 + cx * 73856093 + cy * 19349669 + 31337) >>> 0) || 1;
    const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    const ptx = Math.floor(this.player.x / t);
    const pty = Math.floor(this.player.y / t);
    const nearSpawn = Math.abs(cx * cs) < this.spawnDist + cs && Math.abs(cy * cs) < this.spawnDist + cs;

    const chunkTileX = cx * cs;
    const chunkTileY = cy * cs;

    let placed = 0;
    let attempts = 0;
    while (placed < spikesPerChunk && attempts < maxAttempts) {
      attempts++;
      const pattern = SPIKE_PATTERNS[Math.floor(rng() * SPIKE_PATTERNS.length)];
      const ox = chunkTileX + Math.floor(rng() * (cs - pattern.w));
      const oy = chunkTileY + Math.floor(rng() * (cs - pattern.h));

      // Don't place too close to player spawn
      if (Math.abs(ox) < 3 && Math.abs(oy) < 3) continue;

      // All target tiles must be empty AND not adjacent to player spawn
      let blocked = false;
      for (const tile of pattern.tiles) {
        const gx = ox + tile.dx, gy = oy + tile.dy;
        if (gridGet(this.grid, gx, gy) !== 0) { blocked = true; break; }
        if (Math.abs(gx - ptx) <= 1 && Math.abs(gy - pty) <= 1) { blocked = true; break; }
      }
      if (blocked) continue;

      // Tentatively mark as obstacles (grid value 6 = spike)
      for (const tile of pattern.tiles) {
        gridSet(this.grid, ox + tile.dx, oy + tile.dy, 6);
      }

      // Don't strangle pathing near spawn — same check trees use.
      if (nearSpawn && !canReachFromSpawnDirections(this.grid, ptx, pty, this.spawnDist, 3)) {
        for (const tile of pattern.tiles) {
          gridSet(this.grid, ox + tile.dx, oy + tile.dy, 0);
        }
        continue;
      }

      // Per-tile spike sprite (no wallGroup → player walks through). Each
      // tile within a cluster picks its own jitter variant so a 3-tile
      // strip doesn't look stamped.
      for (const tile of pattern.tiles) {
        const gx = ox + tile.dx, gy = oy + tile.dy;
        const wx = gx * t + t / 2;
        const wy = gy * t + t / 2;
        const variant = Math.floor(rng() * SPIKE_VARIANT_COUNT);
        const spr = this.add.image(wx, wy, `castle_spikes_${variant}`).setDepth(100 + wy * 0.1);
        this.spikeSprites.push(spr);
      }
      placed++;
    }
  }

  // ---------- PLAYER ----------
  updatePlayer(time: number, _delta: number) {
    const k = this.keys;
    let vx = 0, vy = 0;
    if (k.A.isDown || k.LEFT.isDown) vx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) vx += 1;
    if (k.W.isDown || k.UP.isDown) vy -= 1;
    if (k.S.isDown || k.DOWN.isDown) vy += 1;

    // Mobile virtual joystick contribution. UIScene publishes the current
    // stick vector to the registry every frame. A generous deadzone (0.3
    // magnitude) ignores thumb rest / jitter; outside the deadzone the input
    // snaps to a unit vector so movement is binary (full speed, no analog).
    const jx = (this.game.registry.get('joystickX') as number) || 0;
    const jy = (this.game.registry.get('joystickY') as number) || 0;
    const jmag2 = jx * jx + jy * jy;
    const JOYSTICK_DEADZONE_SQ = 0.3 * 0.3;
    if (jmag2 >= JOYSTICK_DEADZONE_SQ) {
      const jmag = Math.sqrt(jmag2);
      vx += jx / jmag;
      vy += jy / jmag;
    }

    // Castle floor spikes — when the player's tile is a spike (grid value
    // 6), halve their move speed and tick contact damage every 500ms.
    const playerTx = Math.floor(this.player.x / CFG.tile);
    const playerTy = Math.floor(this.player.y / CFG.tile);
    const onSpike = gridGet(this.grid, playerTx, playerTy) === 6;
    if (onSpike) {
      if (time >= this.nextSpikeDmgAt) {
        this.nextSpikeDmgAt = time + 500;
        this.player.hurt(5, this);
        this.pushHud();
        if (this.player.hp <= 0) this.lose();
      }
    } else {
      // Reset cooldown the moment they step off — re-entering should bite
      // immediately, not wait for a stale timer.
      this.nextSpikeDmgAt = 0;
    }
    const speedMult = onSpike ? 0.5 : 1;

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const len = Math.hypot(vx, vy);
      vx /= len; vy /= len;
      this.player.setVelocity(vx * CFG.player.speed * speedMult, vy * CFG.player.speed * speedMult);
      if (vx !== 0) this.player.facingRight = vx > 0;
      this.player.setFlipX(!this.player.facingRight);
      if (this.player.anims.currentAnim?.key !== 'player-move') this.player.play('player-move');
    } else {
      this.player.setVelocity(0, 0);
      if (
        this.player.anims.currentAnim?.key !== 'player-idle'
      ) this.player.play('player-idle');
    }

    // Tutorial leash: keep tower visible on screen
    if (this.game.registry.get('tutorialActive') && this.towers.length > 0) {
      const anchor = this.towers[0];
      const cam = this.cameras.main;
      const margin = 40; // keep tower at least this far from screen edge
      const maxDx = (cam.width / 2) - margin;
      const maxDy = (cam.height / 2) - margin;
      // Clamp player position so the tower stays within the viewport
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      let clamped = false;
      if (this.player.x > anchor.x + maxDx) { this.player.x = anchor.x + maxDx; clamped = true; }
      if (this.player.x < anchor.x - maxDx) { this.player.x = anchor.x - maxDx; clamped = true; }
      if (this.player.y > anchor.y + maxDy) { this.player.y = anchor.y + maxDy; clamped = true; }
      if (this.player.y < anchor.y - maxDy) { this.player.y = anchor.y - maxDy; clamped = true; }
      if (clamped) {
        // Zero out velocity on clamped axes
        if (this.player.x === anchor.x + maxDx || this.player.x === anchor.x - maxDx) body.velocity.x = 0;
        if (this.player.y === anchor.y + maxDy || this.player.y === anchor.y - maxDy) body.velocity.y = 0;
      }
    }

    // Bow follows player with offset based on aim direction
    const bow = this.player.bow;
    const nock = this.player.nockedArrow;

    // Find most threatening enemy — prioritizes shortest path distance, not euclidean
    const target = this.findMostThreateningEnemy(this.player.x, this.player.y, CFG.player.range);

    if (target) {
      // Aim bow at target
      const aimAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
      bow.setRotation(aimAngle);
      bow.setFlipY(Math.abs(aimAngle) > Math.PI / 2);

      // Push bow outward from body center along the aim direction
      // More offset when aiming horizontally, less when vertical
      const horizFactor = Math.abs(Math.cos(aimAngle)); // 1 at sides, 0 at top/bottom
      const offset = 6 + horizFactor * 5; // 6px minimum, up to 11px at the sides
      bow.setPosition(
        this.player.x + Math.cos(aimAngle) * offset,
        this.player.y + 2 + Math.sin(aimAngle) * offset
      );

      // Flip player body to face target
      this.player.setFlipX(target.x < this.player.x);
      if (target.x >= this.player.x) this.player.facingRight = true;
      else this.player.facingRight = false;

      // Fire rate: half speed while moving, full speed after standing still for 400ms
      if (moving) {
        this.playerStoppedAt = 0;
      } else if (this.playerStoppedAt === 0) {
        this.playerStoppedAt = time;
      }
      const stoodLongEnough = !moving && this.playerStoppedAt > 0 && (time - this.playerStoppedAt) >= 400;
      const rate = stoodLongEnough ? CFG.player.fireRate : CFG.player.fireRate * 2;
      if (time > this.player.lastShot + rate) {
        this.player.lastShot = time;
        SFX.play('arrowShoot');
        bow.play('bow-shoot', true);
        nock.setVisible(false);
        bow.once('animationcomplete-bow-shoot', () => {
          bow.play('bow-idle');
          nock.setVisible(true);
        });
        // Lead the target
        let aimX = target.x, aimY = target.y;
        if (target.body) {
          const dist = Math.hypot(target.x - this.player.x, target.y - this.player.y) || 1;
          const travelTime = dist / CFG.player.projectileSpeed;
          const tb = target.body as Phaser.Physics.Arcade.Body;
          aimX = target.x + tb.velocity.x * travelTime;
          aimY = target.y + tb.velocity.y * travelTime;
        }
        // Spawn the projectile at the nocked-arrow position so it emanates from the bow
        const spawnX = bow.x + Math.cos(bow.rotation) * 15;
        const spawnY = bow.y + Math.sin(bow.rotation) * 15;
        this.spawnProjectile(spawnX, spawnY, aimX, aimY, CFG.player.projectileSpeed, CFG.player.damage, 0, 0.5, 0, target);
      }
    } else {
      // No target — bow points in the direction the player faces, held out to the side
      const idleDir = this.player.facingRight ? 1 : -1;
      bow.setRotation(this.player.facingRight ? 0 : Math.PI);
      bow.setFlipY(!this.player.facingRight);
      bow.setPosition(this.player.x + idleDir * 10, this.player.y + 2);
    }

    // Nocked arrow rides with the bow — fletching tip sits on the bowstring.
    // Offset = (bowstring_x - bow_origin_x) + (arrow_center_x - arrow_back_x) = 1 + 14 = 15 world px.
    nock.setPosition(bow.x + Math.cos(bow.rotation) * 15, bow.y + Math.sin(bow.rotation) * 15);
    nock.setRotation(bow.rotation);
  }

  // ---------- TOWERS ----------
  updateTowers(time: number) {
    for (const tower of this.towers) {
      tower.drawHpBar();
      // Pending sale — tower stops firing during the sell countdown so the
      // player can't milk damage from a tower they've already cashed out.
      // Walls keep blocking enemies until the timer completes (handled by
      // the grid still containing them until executeSell).
      if (this.sellTimers.has(tower)) continue;
      const st = tower.stats();

      if (st.splashRadius > 0) {
        // Cannon: aim at the spot that hits the most enemies
        const aim = this.findBestCannonTarget(tower.x, tower.y, st.range, st.splashRadius, st.projectileSpeed);
        if (!aim) continue;
        const launchY = tower.top.y; // fire from the barrel position, not base center
        const angle = Math.atan2(aim.y - launchY, aim.x - tower.x);
        tower.top.setRotation(angle);
        if (time > tower.lastShot + st.fireRate) {
          tower.lastShot = time;
          SFX.play('cannonShoot');
          tower.top.play('cannon-top-shoot', true);
          const cScale = 0.5 + tower.level * 0.15;
          this.spawnProjectile(tower.x, launchY, aim.x, aim.y, st.projectileSpeed, st.damage, st.splashRadius, cScale);
        }
      } else {
        // Arrow: shoot at nearest enemy with lead targeting
        const tgt = this.findNearestEnemy(tower.x, tower.y, st.range);
        if (!tgt) {
          // Reset shoot pose if the shot animation window has elapsed —
          // otherwise a target that disappears right after firing leaves the
          // bow stuck pulled back with the nocked arrow invisible forever.
          if (time > tower.lastShot + 150) {
            tower.top.setTexture('t_top_0');
            if (tower.nockedArrow) tower.nockedArrow.setVisible(true);
          }
          // Keep the nocked arrow aligned with the bow's current rotation while idle
          if (tower.nockedArrow) {
            tower.nockedArrow.setPosition(
              tower.top.x + Math.cos(tower.top.rotation) * 23,
              tower.top.y + Math.sin(tower.top.rotation) * 23
            );
            tower.nockedArrow.setRotation(tower.top.rotation);
          }
          continue;
        }
        let aimX = tgt.x, aimY = tgt.y;
        if (tgt.body) {
          const dist = Math.hypot(tgt.x - tower.x, tgt.y - tower.y) || 1;
          const travelTime = dist / st.projectileSpeed;
          const tb = tgt.body as Phaser.Physics.Arcade.Body;
          aimX = tgt.x + tb.velocity.x * travelTime;
          aimY = tgt.y + tb.velocity.y * travelTime;
        }
        const launchY = tower.top.y; // fire from the bow/archer position, not base center
        const angle = Math.atan2(aimY - launchY, aimX - tower.x);
        tower.top.setRotation(angle);
        if (time > tower.lastShot + st.fireRate) {
          tower.lastShot = time;
          SFX.play('arrowShoot');
          tower.top.setTexture('t_top_1');
          if (tower.nockedArrow) tower.nockedArrow.setVisible(false);
          const aScale = 0.5 + tower.level * 0.12;
          const aTint = tower.level === 2 ? 0xffd67a : tower.level === 1 ? 0x9fd9ff : 0;
          // Spawn at the nocked-arrow position so the shot emanates from the bow
          const spawnX = tower.top.x + Math.cos(angle) * 23;
          const spawnY = tower.top.y + Math.sin(angle) * 23;
          this.spawnProjectile(spawnX, spawnY, aimX, aimY, st.projectileSpeed, st.damage, 0, aScale, aTint, tgt);
        } else if (time > tower.lastShot + 150) {
          tower.top.setTexture('t_top_0');
          if (tower.nockedArrow) tower.nockedArrow.setVisible(true);
        }

        // Nocked arrow rides with the bow — fletching tip aligned with the bowstring
        if (tower.nockedArrow) {
          tower.nockedArrow.setPosition(
            tower.top.x + Math.cos(angle) * 23,
            tower.top.y + Math.sin(angle) * 23
          );
          tower.nockedArrow.setRotation(angle);
        }
      }
    }
  }

  // Find the aim point within range that maximizes enemies hit by splash.
  // Considers each enemy's predicted position when the cannonball arrives.
  findBestCannonTarget(tx: number, ty: number, range: number, splash: number, projSpeed: number): { x: number; y: number } | null {
    const r2 = range * range;
    const s2 = splash * splash;

    // Collect predicted positions for all enemies in range
    const candidates: { px: number; py: number }[] = [];
    this.enemies.children.iterate((c: any) => {
      const e = c as Enemy;
      if (!e || !e.active || e.dying) return true;
      const d2 = (e.x - tx) ** 2 + (e.y - ty) ** 2;
      if (d2 > r2) return true;
      // Lead: predict where enemy will be when ball arrives
      const dist = Math.sqrt(d2) || 1;
      const travelTime = dist / projSpeed;
      const b = e.body as Phaser.Physics.Arcade.Body;
      const px = e.x + (b ? b.velocity.x * travelTime : 0);
      const py = e.y + (b ? b.velocity.y * travelTime : 0);
      candidates.push({ px, py });
      return true;
    });
    // Also consider the boss
    if (this.boss && this.boss.active && !this.boss.dying) {
      const d2 = (this.boss.x - tx) ** 2 + (this.boss.y - ty) ** 2;
      if (d2 <= r2) {
        const dist = Math.sqrt(d2) || 1;
        const travelTime = dist / projSpeed;
        const b = this.boss.body as Phaser.Physics.Arcade.Body;
        const px = this.boss.x + (b ? b.velocity.x * travelTime : 0);
        const py = this.boss.y + (b ? b.velocity.y * travelTime : 0);
        candidates.push({ px, py });
      }
    }

    if (candidates.length === 0) return null;

    // Test each candidate position as a potential aim point and pick the one
    // that catches the most enemies in the splash radius
    let bestCount = 0;
    let bestX = candidates[0].px, bestY = candidates[0].py;
    for (const c of candidates) {
      let count = 0;
      for (const o of candidates) {
        if ((c.px - o.px) ** 2 + (c.py - o.py) ** 2 <= s2) count++;
      }
      if (count > bestCount) {
        bestCount = count;
        bestX = c.px;
        bestY = c.py;
      }
    }
    return { x: bestX, y: bestY };
  }

  findNearestEnemy(x: number, y: number, range: number): Enemy | Boss | null {
    let best: Enemy | Boss | null = null;
    let bestD = range * range;
    this.enemies.children.iterate((c: any) => {
      const e = c as Enemy;
      if (!e || !e.active || e.dying) return true;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bestD) { bestD = d; best = e; }
      return true;
    });
    if (this.boss && this.boss.active && !this.boss.dying) {
      const d = (this.boss.x - x) ** 2 + (this.boss.y - y) ** 2;
      if (d < bestD) { bestD = d; best = this.boss; }
    }
    return best;
  }

  // Player targeting: pick the enemy closest to arriving (shortest remaining path).
  // Enemies with direct LOS (no BFS path) use euclidean distance.
  // Still filters to within shooting range.
  findMostThreateningEnemy(x: number, y: number, range: number): Enemy | Boss | null {
    let best: Enemy | Boss | null = null;
    let bestPathDist = Infinity;
    const r2 = range * range;
    this.enemies.children.iterate((c: any) => {
      const e = c as Enemy;
      if (!e || !e.active || e.dying) return true;
      const eucD2 = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (eucD2 > r2) return true; // out of shooting range
      // Path distance: remaining BFS steps, or euclidean if direct LOS
      const pathDist = e.path && e.path.length > 0
        ? (e.path.length - e.pathIdx) * CFG.tile
        : Math.sqrt(eucD2);
      if (pathDist < bestPathDist) { bestPathDist = pathDist; best = e; }
      return true;
    });
    if (this.boss && this.boss.active && !this.boss.dying) {
      const eucD2 = (this.boss.x - x) ** 2 + (this.boss.y - y) ** 2;
      if (eucD2 <= r2) {
        const b = this.boss;
        const pathDist = b.path && b.path.length > 0
          ? (b.path.length - b.pathIdx) * CFG.tile
          : Math.sqrt(eucD2);
        if (pathDist < bestPathDist) { bestPathDist = pathDist; best = b; }
      }
    }
    return best;
  }

  // ---------- ENEMIES ----------
  // Bresenham-style line check across the grid; true if any blocked tile is hit.
  // Also checks diagonal squeeze: if the line steps diagonally and both adjacent
  // cardinal tiles are blocked, the gap is too tight for a physics body.
  lineBlocked(x0: number, y0: number, x1: number, y1: number): boolean {
    const tx0 = Math.floor(x0 / CFG.tile), ty0 = Math.floor(y0 / CFG.tile);
    const tx1 = Math.floor(x1 / CFG.tile), ty1 = Math.floor(y1 / CFG.tile);
    let x = tx0, y = ty0;
    const dx = Math.abs(tx1 - tx0), dy = Math.abs(ty1 - ty0);
    const sx = tx0 < tx1 ? 1 : -1;
    const sy = ty0 < ty1 ? 1 : -1;
    let err = dx - dy;
    let safety = 200;
    while (safety-- > 0) {
      if (x === tx1 && y === ty1) return false;
      const v = gridGet(this.grid, x, y);
      // Water/rock (4) doesn't block line of sight — enemies can see over water
      if (v >= 1 && v !== 4 && !(x === tx0 && y === ty0)) return true;
      const prevX = x, prevY = y;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
      // Diagonal step: walls (1) and trees (3) always block; towers (2) allow squeeze-through
      if (x !== prevX && y !== prevY) {
        const c1 = gridGet(this.grid, prevX, y);
        const c2 = gridGet(this.grid, x, prevY);
        const s1 = c1 === 1 || c1 === 3;
        const s2 = c2 === 1 || c2 === 3;
        if (s1 || s2 || (c1 >= 1 && c2 >= 1)) return true;
      }
    }
    return false;
  }

  /** True when an enemy's center sits inside the visible world rect with a
   *  small inset — enemies don't get to snipe the player while off-screen. */
  private enemyOnScreen(e: Enemy): boolean {
    const wv = this.cameras.main.worldView;
    const inset = 20;
    return e.x > wv.x + inset && e.x < wv.right - inset
        && e.y > wv.y + inset && e.y < wv.bottom - inset;
  }

  updateEnemies(time: number, _delta: number) {
    // Performance cull radius — enemies further than this from the player
    // skip AI/animation work this frame. Squared so we don't sqrt per enemy.
    // Chosen well outside any camera viewport so culled enemies are never
    // visible. The boss is updated separately and is exempt from this cull.
    const FAR_AI_CULL_SQ = 1100 * 1100;
    // Stragglers that drift very far (player ran off, pathfinding stalled)
    // get teleported back to a fresh spawn ring so they don't strand the
    // wave forever. Threshold sits comfortably past the AI cull.
    const TELEPORT_DIST_SQ = 1500 * 1500;
    const respawnR = this.spawnDist * CFG.tile;

    this.enemies.children.iterate((c: any) => {
      const e = c as Enemy;
      if (!e || !e.active || e.dying) return true;

      // Always target the player — enemies never attack structures
      const tx = this.player.x, ty = this.player.y;
      e.targetRef = this.player;
      const prefix = e.dirPrefix();
      const dist2 = (tx - e.x) ** 2 + (ty - e.y) ** 2;

      // Stranded straggler — yank them to just outside the screen on the
      // line from the player so the next frame's AI picks them up normally.
      if (dist2 > TELEPORT_DIST_SQ) {
        const dx = e.x - tx, dy = e.y - ty;
        const inv = 1 / Math.sqrt(dx * dx + dy * dy);
        e.setPosition(tx + dx * inv * respawnR, ty + dy * inv * respawnR);
        if (e.body && (e.body as any).enable) e.setVelocity(0, 0);
        // Drop any stale path — let the enemy re-plan from its new spot.
        e.path = [];
        e.pathIdx = 0;
        return true;
      }

      // Far-AI cull: stop the enemy and skip pathfinding/lineBlocked/etc.
      // It still exists in the world; once the player gets close it resumes
      // normal behaviour next frame.
      if (dist2 > FAR_AI_CULL_SQ) {
        if (e.body && (e.body as any).enable) e.setVelocity(0, 0);
        return true;
      }

      // Birds randomly poop while flying — only when visible to the player.
      if ((e.kind === 'crow' || e.kind === 'bat') && Math.random() < 0.0006 && this.enemyOnScreen(e)) {
        this.spawnBirdPoop(e.x, e.y);
      }

      // Mosquito ranged attack — stops at range and fires darts
      // Needs line of sight (no walls/towers blocking). If blocked, rushes to get a clear shot.
      // If very close, melee attacks instead.
      if (e.kind === 'mosquito') {
        const mqRange = CFG.river.mosquitoRange;
        const meleeRange = 30;
        const dist = Math.sqrt(dist2);
        e.setFlipX(tx - e.x < 0);

        // Close enough to melee
        if (dist < meleeRange) {
          e.setVelocity(0, 0);
          if (e.anims.currentAnim?.key !== `${prefix}-atk`) e.play(`${prefix}-atk`);
          if (time > e.attackCd) {
            e.attackCd = time + 700;
            this.player.hurt(e.dmg, this);
            this.pushHud();
            if (this.player.hp <= 0) this.lose();
          }
          return true;
        }

        const hasLOS = this.hasLineOfSight(e.x, e.y, tx, ty);

        if (dist < mqRange && hasLOS) {
          // In range with clear line of sight — orbit and shoot
          const perpX = -(ty - e.y), perpY = tx - e.x;
          const pLen = Math.hypot(perpX, perpY) || 1;
          e.setVelocity((perpX / pLen) * e.speed * 0.3, (perpY / pLen) * e.speed * 0.3);
          if (e.anims.currentAnim?.key !== `${prefix}-atk`) e.play(`${prefix}-atk`);
          if (time > e.attackCd && this.enemyOnScreen(e)) {
            e.attackCd = time + CFG.river.mosquitoFireRate;
            this.spawnMosquitoDart(e.x, e.y, tx, ty);
          }
          return true;
        }

        // No line of sight or too far — rush toward player at full speed
        const dx = tx - e.x, dy = ty - e.y;
        const d = dist || 1;
        const rushSpeed = hasLOS ? e.speed : e.speed * 1.5;
        e.setVelocity((dx / d) * rushSpeed, (dy / d) * rushSpeed);
        if (e.anims.currentAnim?.key !== `${prefix}-move`) e.play(`${prefix}-move`);
        return true;
      }

      // Blighted Toad — keeps hopping toward the player (pathfinding around
      // trees/walls so it doesn't get stuck) AND lobs arcing toxic globs on
      // cooldown whenever the player is inside range. Touch damage is still
      // handled by the melee block lower down.
      if (e.kind === 'toad') {
        const toadRange = CFG.infected.toadRange;
        const dist = Math.sqrt(dist2);
        e.setFlipX(tx - e.x < 0);

        const td = e as any;
        if (td._toadHopNext === undefined) {
          td._toadHopNext = time + CFG.infected.toadHopInterval;
          td._toadHopping = false;
          td._toadHopEnd = 0;
        }

        // Ranged glob attack — fires whenever in range and cooldown is up,
        // independent of whether the toad is mid-hop. Skip during the hop's
        // attack-anim window so we don't override etd-hop with etd-atk.
        if (dist < toadRange && dist > 40 && time > e.attackCd && !td._toadHopping && this.enemyOnScreen(e)) {
          e.attackCd = time + CFG.infected.toadFireRate;
          e.play('etd-atk');
          this.time.delayedCall(200 / this.timeMult, () => {
            if (e.active && !e.dying) this.spawnToadGlob(e.x, e.y, tx, ty);
          });
        }

        // Mid-hop — keep velocity until the hop window ends.
        if (td._toadHopping) {
          if (time > td._toadHopEnd) {
            td._toadHopping = false;
            e.setVelocity(0, 0);
            if (e.anims.currentAnim?.key !== 'etd-idle') e.play('etd-idle');
            td._toadHopNext = time + CFG.infected.toadHopInterval;
          }
          return true;
        }

        // Waiting for next hop.
        if (time > td._toadHopNext) {
          // Pick hop direction: straight at the player when LOS is clear,
          // otherwise toward the next BFS waypoint so trees don't trap us.
          let hopX = tx, hopY = ty;
          if (this.lineBlocked(e.x, e.y, tx, ty)) {
            const stale = time > e.lastPath + 400 || (e as any)._pv !== this.gridVersion || !e.path || e.path.length === 0;
            if (stale && this.pathsThisFrame < 3) {
              this.pathsThisFrame++;
              e.lastPath = time;
              (e as any)._pv = this.gridVersion;
              const start = this.worldToTile(e.x, e.y);
              const goal = this.worldToTile(tx, ty);
              const saved = gridGet(this.grid, goal.x, goal.y);
              if (saved >= 1) gridSet(this.grid, goal.x, goal.y, 0);
              e.path = findPath(this.grid, start.x, start.y, goal.x, goal.y);
              if (saved >= 1) gridSet(this.grid, goal.x, goal.y, saved);
            }
            if (e.path && e.path.length > 0) {
              const t = CFG.tile;
              // Drop waypoints we've already reached so we keep advancing.
              while (e.path.length > 0) {
                const wp = e.path[0];
                const wx = wp.x * t + t / 2, wy = wp.y * t + t / 2;
                if (Math.hypot(wx - e.x, wy - e.y) < 14) e.path.shift();
                else { hopX = wx; hopY = wy; break; }
              }
            }
          } else {
            e.path = [];
          }
          const dxh = hopX - e.x, dyh = hopY - e.y;
          const dh = Math.hypot(dxh, dyh) || 1;
          td._toadHopping = true;
          td._toadHopEnd = time + CFG.infected.toadHopDuration;
          e.setVelocity((dxh / dh) * e.speed, (dyh / dh) * e.speed);
          e.play('etd-hop');
        } else {
          e.setVelocity(0, 0);
          if (e.anims.currentAnim?.key !== 'etd-idle') e.play('etd-idle');
        }
        return true;
      }

      // Castle Warlock — ranged magic caster, stops at range and shoots purple bolts
      if (e.kind === 'warlock') {
        const wlRange = CFG.castle.warlockRange;
        const dist = Math.sqrt(dist2);
        e.setFlipX(tx - e.x < 0);

        if (dist < 30) {
          // Too close — melee
          e.setVelocity(0, 0);
          if (e.anims.currentAnim?.key !== `${prefix}-atk`) e.play(`${prefix}-atk`);
          if (time > e.attackCd) {
            e.attackCd = time + 800;
            this.player.hurt(e.dmg, this);
            this.pushHud();
            if (this.player.hp <= 0) this.lose();
          }
          return true;
        }

        if (dist < wlRange && this.hasLineOfSight(e.x, e.y, tx, ty)) {
          // In range — stop and cast
          e.setVelocity(0, 0);
          if (e.anims.currentAnim?.key !== `${prefix}-atk`) e.play(`${prefix}-atk`);
          if (time > e.attackCd && this.enemyOnScreen(e)) {
            e.attackCd = time + CFG.castle.warlockFireRate;
            this.spawnWarlockBolt(e.x, e.y, tx, ty);
          }
          return true;
        }

        // Walk toward player
        const dx = tx - e.x, dy = ty - e.y;
        const d = dist || 1;
        e.setVelocity((dx / d) * e.speed, (dy / d) * e.speed);
        if (e.anims.currentAnim?.key !== `${prefix}-move`) e.play(`${prefix}-move`);
        return true;
      }

      // Melee attack when close to player
      if (dist2 < 30 * 30) {
        e.setVelocity(0, 0);
        // Face the player while attacking
        if (e.rotates) {
          e.rotateToward(tx - e.x, ty - e.y);
        } else if (e.kind === 'bear') {
          const dirChanged = e.updateFacing(tx - e.x);
          const atkAnim = `${e.dirPrefix()}-atk`;
          if (dirChanged || e.anims.currentAnim?.key !== atkAnim) e.play(atkAnim);
        } else {
          e.setFlipX(tx - e.x < 0);
        }
        if (e.anims.currentAnim?.key !== `${prefix}-atk`) e.play(`${prefix}-atk`);
        if (time > e.attackCd) {
          e.attackCd = time + 800;
          this.player.hurt(e.dmg, this);
          this.pushHud();
          if (this.player.hp <= 0) this.lose();
        }
        return true;
      }

      // Flying enemies always do direct chase — no pathfinding needed
      // Grounded enemies check line-of-sight first
      const clear = e.flying || !this.lineBlocked(e.x, e.y, tx, ty);
      if (clear) {
        const dx = tx - e.x, dy = ty - e.y;
        const d = Math.hypot(dx, dy) || 1;
        e.setVelocity((dx / d) * e.speed, (dy / d) * e.speed);
        if (e.rotates) {
          e.rotateToward(dx, dy);
        } else if (e.kind === 'bear') {
          const dirChanged = e.updateFacing(dx);
          const moveAnim = `${e.dirPrefix()}-move`;
          if (dirChanged || e.anims.currentAnim?.key !== moveAnim) e.play(moveAnim);
        } else {
          e.setFlipX(dx < 0);
        }
        if (e.anims.currentAnim?.key !== `${prefix}-move`) e.play(`${prefix}-move`);
        e.path = [];
        return true;
      }

      // Blocked — BFS pathfind around walls/towers toward the player
      // Budget: max 3 BFS operations per frame to prevent lag with many enemies
      if (time > e.lastPath + 400 || (e as any)._pv !== this.gridVersion || !e.path || e.path.length === 0) {
        if (this.pathsThisFrame < 3) {
        this.pathsThisFrame++;
        e.lastPath = time;
        (e as any)._pv = this.gridVersion;
        const start = this.worldToTile(e.x, e.y);
        const goal = this.worldToTile(tx, ty);
        const saved = gridGet(this.grid, goal.x, goal.y);
        if (saved >= 1) gridSet(this.grid, goal.x, goal.y, 0);
        e.path = findPath(this.grid, start.x, start.y, goal.x, goal.y);
        if (saved >= 1) gridSet(this.grid, goal.x, goal.y, saved);

        // If direct path failed (player may be in an unreachable pocket),
        // search expanding rings for the nearest reachable tile near the player
        if (e.path.length === 0) {
          for (let r = 1; r <= 6; r++) {
            let bestPath: { x: number; y: number }[] = [];
            for (let dy = -r; dy <= r; dy++) {
              for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                const nx = goal.x + dx, ny = goal.y + dy;
                if (gridGet(this.grid, nx, ny) >= 1) continue;
                const p = findPath(this.grid, start.x, start.y, nx, ny);
                if (p.length > 0 && (bestPath.length === 0 || p.length < bestPath.length)) {
                  bestPath = p;
                }
              }
            }
            if (bestPath.length > 0) { e.path = bestPath; break; }
          }
        }

        e.pathIdx = 0;
        } // end pathsThisFrame budget
      }

      let moveX = 0, moveY = 0;
      if (e.path && e.path.length > 0) {
        if (e.pathIdx >= e.path.length) e.pathIdx = e.path.length - 1;
        let lookahead = e.pathIdx;
        for (let i = e.path.length - 1; i > e.pathIdx; i--) {
          const node = e.path[i];
          const nx = node.x * CFG.tile + CFG.tile / 2;
          const ny = node.y * CFG.tile + CFG.tile / 2;
          if (!this.lineBlocked(e.x, e.y, nx, ny)) { lookahead = i; break; }
        }
        e.pathIdx = lookahead;
        const node = e.path[e.pathIdx];
        const nx = node.x * CFG.tile + CFG.tile / 2;
        const ny = node.y * CFG.tile + CFG.tile / 2;
        const dx = nx - e.x, dy = ny - e.y;
        const d = Math.hypot(dx, dy);
        if (d < 4 && e.pathIdx < e.path.length - 1) e.pathIdx++;
        if (d > 0.01) { moveX = dx / d; moveY = dy / d; }
      } else {
        // No reachable tile found — stop instead of walking into walls
        moveX = 0; moveY = 0;
      }

      // Wall avoidance: push away from nearby blocked tiles to prevent corner sticking
      const etx = Math.floor(e.x / CFG.tile), ety = Math.floor(e.y / CFG.tile);
      let avoidX = 0, avoidY = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const gx = etx + ox, gy = ety + oy;
          if (gridGet(this.grid, gx, gy) < 1) continue;
          const wallCX = gx * CFG.tile + CFG.tile / 2;
          const wallCY = gy * CFG.tile + CFG.tile / 2;
          const rdx = e.x - wallCX, rdy = e.y - wallCY;
          const rd = Math.hypot(rdx, rdy) || 1;
          const strength = Math.max(0, 1 - rd / (CFG.tile * 1.2));
          avoidX += (rdx / rd) * strength;
          avoidY += (rdy / rd) * strength;
        }
      }
      const avoidMag = Math.hypot(avoidX, avoidY);
      if (avoidMag > 0) {
        const avoidWeight = 0.4;
        moveX = moveX * (1 - avoidWeight) + (avoidX / avoidMag) * avoidWeight;
        moveY = moveY * (1 - avoidWeight) + (avoidY / avoidMag) * avoidWeight;
        const ml = Math.hypot(moveX, moveY) || 1;
        moveX /= ml; moveY /= ml;
      }
      e.setVelocity(moveX * e.speed, moveY * e.speed);
      if (e.rotates) {
        e.rotateToward(moveX, moveY);
      } else if (e.kind === 'bear') {
        if (moveX !== 0) {
          const dirChanged = e.updateFacing(moveX);
          const moveAnim = `${e.dirPrefix()}-move`;
          if (dirChanged || e.anims.currentAnim?.key !== moveAnim) e.play(moveAnim);
        }
      } else {
        e.setFlipX(moveX < 0);
      }
      if (e.anims.currentAnim?.key !== `${prefix}-move`) e.play(`${prefix}-move`);
      return true;
    });
  }

  // ---------- BOSS ----------

  updateBoss(time: number) {
    const b = this.boss;
    if (!b || !b.active || b.dying) return;
    b.drawHpBar();

    // resolve state timers
    const ap = b.animPrefix;
    if (b.state === 'slam_wind' && time >= b.stateEnd) {
      this.bossSlamImpact(b);
      b.state = 'chase';
      b.nextSlam = time + 4200;
      b.play(`${ap}-idle`);
    } else if (b.state === 'charge_wind' && time >= b.stateEnd) {
      // Charge always aims at the player, ignoring towers.
      const dx = this.player.x - b.x, dy = this.player.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      b.chargeDirX = dx / d; b.chargeDirY = dy / d;
      b.state = 'charging';
      b.stateEnd = time + 1000;
      b.setVelocity(b.chargeDirX * 320, b.chargeDirY * 320);
      b.play(`${ap}-move`);
      // initial launch puff behind her (covers the "against a wall" case)
      this.spawnChargeSmoke(b, 3);
      b.lastSmoke = time;
    } else if (b.state === 'charging' && time >= b.stateEnd) {
      b.setVelocity(0, 0);
      this.bossChargeImpact(b);
      b.state = 'chase';
      b.nextCharge = time + 9500;
      b.nextBirth = Math.max(b.nextBirth, time + 3000); // delay spawns after charge
      b.play(`${ap}-idle`);
    }

    // Smoke trail while charging (throttled). Even if the boss isn't moving
    // (wall-locked), the initial puff already fired above.
    if (b.state === 'charging' && time > b.lastSmoke + 60) {
      b.lastSmoke = time;
      this.spawnChargeSmoke(b, 1);
    }

    // Mid-charge: bulldoze through anything in her path
    if (b.state === 'charging') {
      // Crush player if she runs over them
      if (b.contactCd < time &&
          Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y) < 40) {
        const chargeDmg = Math.floor(CFG.player.hp * 0.55); // ~55% max HP
        this.player.hurt(chargeDmg, this);
        this.pushHud();
        b.contactCd = time + 600; // don't double-tap within the same charge
        if (this.player.hp <= 0) this.lose();
      }
      // Stop charge on tower/wall collision — apply AoE impact
      let chargeHit = false;
      for (const t of this.towers) {
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) < 50) { chargeHit = true; break; }
      }
      if (!chargeHit) {
        for (const w of this.walls) {
          if (Phaser.Math.Distance.Between(b.x, b.y, w.x, w.y) < 40) { chargeHit = true; break; }
        }
      }
      if (chargeHit) {
        b.setVelocity(0, 0);
        this.bossChargeImpact(b);
        b.state = 'chase';
        b.nextCharge = time + 9500;
        b.nextBirth = Math.max(b.nextBirth, time + 3000); // delay spawns after charge
        b.play(`${ap}-idle`);
      }
      // Bulldoze trees during charge (boss plows through without stopping)
      const bt = CFG.tile;
      const bgx = Math.floor(b.x / bt);
      const bgy = Math.floor(b.y / bt);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (gridGet(this.grid, bgx + dx, bgy + dy) === 3) {
            this.destroyTreeTile(bgx + dx, bgy + dy);
          }
        }
      }
    }

    if (b.state !== 'chase') return;

    const px = this.player.x, py = this.player.y;
    const distToPlayer = Math.hypot(px - b.x, py - b.y);

    // ability triggers (in priority order)
    const isCastleBoss = b.bossKind === 'queen' || b.bossKind === 'dragon';

    // Birthing happens passively while chasing — not during charge or slam (skip for castle bosses)
    if (!isCastleBoss && time >= b.nextBirth && b.state === 'chase') {
      this.bossBirthSpawn(b);
      b.nextBirth = time + 3800;
    }
    const cam = this.cameras.main;
    const onScreen = b.x >= cam.worldView.x && b.x <= cam.worldView.right
                  && b.y >= cam.worldView.y && b.y <= cam.worldView.bottom;

    // --- Phantom Queen abilities ---
    if (b.bossKind === 'queen') {
      // Teleport closer to player periodically
      if (time >= this.nextQueenTeleport && distToPlayer > 120) {
        const ang = Math.atan2(py - b.y, px - b.x);
        const teleportDist = Math.min(CFG.castle.queenTeleportRange, distToPlayer - 60);
        const nx = b.x + Math.cos(ang) * teleportDist;
        const ny = b.y + Math.sin(ang) * teleportDist;
        // Teleport VFX: fade out, move, fade in
        b.setAlpha(0.2);
        b.setPosition(nx, ny);
        this.tweens.add({ targets: b, alpha: 1, duration: 300, ease: 'Cubic.Out' });
        // Purple particle burst at origin and destination
        for (const pos of [{ x: b.x - Math.cos(ang) * teleportDist, y: b.y - Math.sin(ang) * teleportDist }, { x: nx, y: ny }]) {
          for (let i = 0; i < 8; i++) {
            const pa = (i / 8) * Math.PI * 2;
            const p = this.add.circle(pos.x, pos.y, 3, 0x9040e0, 0.8).setDepth(15);
            this.tweens.add({ targets: p, x: pos.x + Math.cos(pa) * 30, y: pos.y + Math.sin(pa) * 30, alpha: 0, duration: 400, onComplete: () => p.destroy() });
          }
        }
        this.nextQueenTeleport = time + CFG.castle.queenTeleportCooldown;
      }
      // Fire burst of 3 orbs toward player
      if (time >= this.nextQueenOrb && onScreen) {
        const burstCount = CFG.castle.queenOrbBurstCount;
        const spread = 0.3; // radians spread between orbs
        const baseAngle = Math.atan2(py - b.y, px - b.x);
        for (let i = 0; i < burstCount; i++) {
          const a = baseAngle + (i - (burstCount - 1) / 2) * spread;
          const orbTx = b.x + Math.cos(a) * 300;
          const orbTy = b.y + Math.sin(a) * 300;
          this.spawnQueenOrb(b.x, b.y, orbTx, orbTy);
        }
        this.nextQueenOrb = time + CFG.castle.queenOrbFireRate;
      }
      // Slow structure-damaging aura — telegraphs at the queen's current
      // spot, then strikes after the windup. Position is locked at cast
      // time so teleporting away mid-windup doesn't move the impact.
      if (time >= this.nextQueenAura && onScreen) {
        this.queenAuraStrike(b.x, b.y);
        this.nextQueenAura = time + CFG.castle.queenAuraCooldown;
      }
    }

    // --- Castle Dragon abilities ---
    if (b.bossKind === 'dragon') {
      // Fireball aimed at player
      if (time >= this.nextDragonFireball && onScreen) {
        this.spawnDragonFireball(b.x, b.y, px, py);
        this.nextDragonFireball = time + CFG.castle.dragonFireballRate;
      }
      // Dragon spawns skeleton minions periodically
      if (time >= b.nextBirth) {
        const spawnCount = 3;
        for (let i = 0; i < spawnCount; i++) {
          const sa = (i / spawnCount) * Math.PI * 2;
          const se = new Enemy(this, b.x + Math.cos(sa) * 40, b.y + Math.sin(sa) * 40, 'skeleton');
          this.applyEnemyDifficulty(se);
          se.noCoinDrop = true;
          this.enemies.add(se);
        }
        b.nextBirth = time + 8000;
      }
    }

    // Non-castle bosses: charge and boulder throw
    if (!isCastleBoss && time >= b.nextCharge && distToPlayer > 40 && onScreen) {
      b.state = 'charge_wind';
      b.stateEnd = time + 1200;
      b.setVelocity(0, 0);
      b.play(`${ap}-chargewind`);
      return;
    }
    // Boulder throw — targets nearest tower or wall in range (not meadow or castle boss)
    if (!isCastleBoss && this.biome !== 'grasslands' && time >= b.nextBoulder && onScreen) {
      const boulderRange = 280;
      let bestDist = boulderRange;
      let target: { x: number; y: number } | null = null;
      for (const t of this.towers) {
        const d = Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y);
        if (d < bestDist) { bestDist = d; target = { x: t.x, y: t.y }; }
      }
      for (const w of this.walls) {
        const d = Phaser.Math.Distance.Between(b.x, b.y, w.x, w.y);
        if (d < bestDist) { bestDist = d; target = { x: w.x, y: w.y }; }
      }
      if (target) {
        this.bossThrowBoulder(b, target.x, target.y);
        b.nextBoulder = time + 3500;
      } else {
        b.nextBoulder = time + 1000; // retry soon if no targets
      }
    }
    if (distToPlayer < 62 && time >= b.nextSlam) {
      b.state = 'slam_wind';
      b.stateEnd = time + 600;
      b.setVelocity(0, 0);
      b.play(`${ap}-atk`);
      return;
    }

    // Pathfind toward the player (same logic as regular enemies)
    // River biome: boss flies — skip pathfinding entirely
    let moveX = 0, moveY = 0;
    const clear = this.biome === 'river' || !this.lineBlocked(b.x, b.y, px, py);
    if (clear) {
      const dx = px - b.x, dy = py - b.y;
      const d = Math.hypot(dx, dy) || 1;
      moveX = dx / d; moveY = dy / d;
      b.path = [];
    } else {
      // BFS pathfinding around walls/towers
      if (time > b.lastPath + 400 || b._pv !== this.gridVersion || !b.path || b.path.length === 0) {
        b.lastPath = time;
        b._pv = this.gridVersion;
        const start = this.worldToTile(b.x, b.y);
        const goal = this.worldToTile(px, py);
        const saved = gridGet(this.grid, goal.x, goal.y);
        if (saved >= 1) gridSet(this.grid, goal.x, goal.y, 0);
        b.path = findPath(this.grid, start.x, start.y, goal.x, goal.y);
        if (saved >= 1) gridSet(this.grid, goal.x, goal.y, saved);

        // If direct path failed, search nearby reachable tiles
        if (b.path.length === 0) {
          for (let r = 1; r <= 6; r++) {
            let bestPath: { x: number; y: number }[] = [];
            for (let dy = -r; dy <= r; dy++) {
              for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                const nx = goal.x + dx, ny = goal.y + dy;
                if (gridGet(this.grid, nx, ny) >= 1) continue;
                const p = findPath(this.grid, start.x, start.y, nx, ny);
                if (p.length > 0 && (bestPath.length === 0 || p.length < bestPath.length)) {
                  bestPath = p;
                }
              }
            }
            if (bestPath.length > 0) { b.path = bestPath; break; }
          }
        }

        b.pathIdx = 0;
      }

      if (b.path && b.path.length > 0) {
        if (b.pathIdx >= b.path.length) b.pathIdx = b.path.length - 1;
        let lookahead = b.pathIdx;
        for (let i = b.path.length - 1; i > b.pathIdx; i--) {
          const node = b.path[i];
          const nx = node.x * CFG.tile + CFG.tile / 2;
          const ny = node.y * CFG.tile + CFG.tile / 2;
          if (!this.lineBlocked(b.x, b.y, nx, ny)) { lookahead = i; break; }
        }
        b.pathIdx = lookahead;
        const node = b.path[b.pathIdx];
        const nx = node.x * CFG.tile + CFG.tile / 2;
        const ny = node.y * CFG.tile + CFG.tile / 2;
        const dx = nx - b.x, dy = ny - b.y;
        const d = Math.hypot(dx, dy);
        if (d < 4 && b.pathIdx < b.path.length - 1) b.pathIdx++;
        if (d > 0.01) { moveX = dx / d; moveY = dy / d; }
      } else {
        moveX = 0; moveY = 0;
      }
    }

    // Wall avoidance steering
    const btx = Math.floor(b.x / CFG.tile), bty = Math.floor(b.y / CFG.tile);
    let avoidX = 0, avoidY = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        const gx = btx + ox, gy = bty + oy;
        if (gridGet(this.grid, gx, gy) < 1) continue;
        const wallCX = gx * CFG.tile + CFG.tile / 2;
        const wallCY = gy * CFG.tile + CFG.tile / 2;
        const rdx = b.x - wallCX, rdy = b.y - wallCY;
        const rd = Math.hypot(rdx, rdy) || 1;
        const strength = Math.max(0, 1 - rd / (CFG.tile * 1.2));
        avoidX += (rdx / rd) * strength;
        avoidY += (rdy / rd) * strength;
      }
    }
    const avoidMag = Math.hypot(avoidX, avoidY);
    if (avoidMag > 0) {
      const avoidWeight = 0.35;
      moveX = moveX * (1 - avoidWeight) + (avoidX / avoidMag) * avoidWeight;
      moveY = moveY * (1 - avoidWeight) + (avoidY / avoidMag) * avoidWeight;
      const ml = Math.hypot(moveX, moveY) || 1;
      moveX /= ml; moveY /= ml;
    }
    b.setVelocity(moveX * b.speed, moveY * b.speed);
    b.setFlipX(moveX < 0);
    const moveAnim = `${b.animPrefix}-move`;
    if (b.anims.currentAnim?.key !== moveAnim) b.play(moveAnim);

    // passive contact damage (touching the player)
    if (
      Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y) < 36 &&
      time > b.contactCd
    ) {
      b.contactCd = time + 700;
      this.player.hurt(b.dmg, this);
      this.pushHud();
      if (this.player.hp <= 0) this.lose();
    }
  }

  /** Phantom Queen's slow structure-damaging aura. Telegraphs an expanding
   *  purple ring at the cast position; on completion deals queenAuraDmg to
   *  every wall and tower inside queenAuraRadius. Player is unaffected
   *  (touch damage from her body still applies separately). */
  queenAuraStrike(cx: number, cy: number) {
    const r = CFG.castle.queenAuraRadius;
    const dmg = CFG.castle.queenAuraDmg;
    const windup = CFG.castle.queenAuraWindup;

    // Expanding telegraph ring — purple, grows from a dot to full radius
    const ring = this.add.circle(cx, cy, r, 0x9040e0, 0)
      .setStrokeStyle(3, 0x9040e0, 0.9)
      .setDepth(13).setScale(0.1);
    const fill = this.add.circle(cx, cy, r, 0x9040e0, 0.18)
      .setDepth(12).setScale(0.1);
    this.tweens.add({
      targets: [ring, fill],
      scale: 1,
      duration: windup,
      ease: 'Cubic.In',
    });

    this.time.delayedCall(windup, () => {
      ring.destroy();
      fill.destroy();
      // Strike: damage every structure inside the locked radius.
      for (const t of [...this.towers]) {
        if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) < r + 16) {
          t.hurt(dmg);
          if (t.hp <= 0) this.destroyTower(t);
        }
      }
      for (const w of [...this.walls]) {
        if (Phaser.Math.Distance.Between(cx, cy, w.x, w.y) < r + 8) {
          w.hurt(dmg);
          if (w.hp <= 0) this.destroyWall(w);
        }
      }
      // Burst VFX
      const burst = this.add.circle(cx, cy, r, 0x9040e0, 0.45).setDepth(14);
      this.tweens.add({ targets: burst, scale: 1.25, alpha: 0, duration: 350, ease: 'Cubic.Out', onComplete: () => burst.destroy() });
      const shock = this.add.circle(cx, cy, r, 0x000000, 0)
        .setStrokeStyle(3, 0xc080ff, 0.9).setDepth(15);
      this.tweens.add({ targets: shock, scale: 1.3, alpha: { from: 1, to: 0 }, duration: 400, onComplete: () => shock.destroy() });
    });
  }

  bossSlamImpact(b: Boss) {
    const r = 56;
    if (Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y) < r) {
      this.player.hurt(30, this);
      this.pushHud();
      if (this.player.hp <= 0) this.lose();
    }
    for (const t of [...this.towers]) {
      if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) < r + 16) {
        t.hurt(35);
        if (t.hp <= 0) this.destroyTower(t);
      }
    }
    for (const w of [...this.walls]) {
      if (Phaser.Math.Distance.Between(b.x, b.y, w.x, w.y) < r + 8) {
        w.hurt(40);
        if (w.hp <= 0) this.destroyWall(w);
      }
    }

    // Ground pound VFX — visible red/orange shockwave
    const slamCore = this.add.circle(b.x, b.y, r, 0xff4020, 0.5)
      .setDepth(14).setScale(0.15);
    this.tweens.add({
      targets: slamCore,
      scale: 1,
      alpha: { from: 0.55, to: 0 },
      duration: 300,
      ease: 'Cubic.Out',
      onComplete: () => slamCore.destroy()
    });

    const slamRing = this.add.circle(b.x, b.y, r, 0x000000, 0)
      .setStrokeStyle(3, 0xff5030, 0.9)
      .setDepth(15).setScale(0.15);
    this.tweens.add({
      targets: slamRing,
      scale: 1.08,
      alpha: { from: 1, to: 0 },
      duration: 380,
      ease: 'Sine.Out',
      onComplete: () => slamRing.destroy()
    });

    // Debris chunks flying outward
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.15, 0.15);
      const dist = r * Phaser.Math.FloatBetween(0.6, 1.1);
      const col = [0xd94a2a, 0xff8a40, 0x8a4a2a, 0xffc060][i % 4];
      const sz = Phaser.Math.Between(2, 4);
      const chunk = this.add.rectangle(b.x, b.y, sz, sz, col, 1).setDepth(16);
      this.tweens.add({
        targets: chunk,
        x: b.x + Math.cos(a) * dist,
        y: b.y + Math.sin(a) * dist,
        alpha: { from: 1, to: 0 },
        angle: Phaser.Math.Between(-180, 180),
        duration: Phaser.Math.Between(300, 500),
        ease: 'Cubic.Out',
        onComplete: () => chunk.destroy()
      });
    }

    // Ground scorch
    const slamScorch = this.add.circle(b.x, b.y, r * 0.6, 0x1a0808, 0.45)
      .setDepth(2);
    this.tweens.add({
      targets: slamScorch,
      alpha: { from: 0.45, to: 0 },
      duration: 1000,
      ease: 'Sine.In',
      onComplete: () => slamScorch.destroy()
    });

    this.cameras.main.shake(200, 0.01);
  }

  spawnChargeSmoke(b: Boss, puffs: number) {
    // position behind the boss (opposite the charge direction)
    const backDist = 26;
    const baseX = b.x - b.chargeDirX * backDist;
    const baseY = b.y - b.chargeDirY * backDist + 4; // slight downward bias
    for (let i = 0; i < puffs; i++) {
      const jx = Phaser.Math.Between(-6, 6);
      const jy = Phaser.Math.Between(-4, 4);
      const r = Phaser.Math.Between(8, 12);
      const shade = this.biome === 'infected'
        ? [0xd060a0, 0xe080c0, 0xc04890][i % 3]
        : [0x9a9aa8, 0xb8b8c4, 0x7e7e8a][i % 3];
      const puff = this.add.circle(baseX + jx, baseY + jy, r, shade, 0.7)
        .setDepth(8)
        .setStrokeStyle(1, this.biome === 'infected' ? 0x8a2060 : 0x5a5a66, 0.5);
      // lazy drift opposite to charge + upward
      const driftX = -b.chargeDirX * 14 + Phaser.Math.Between(-6, 6);
      const driftY = -b.chargeDirY * 14 + Phaser.Math.Between(-14, -6);
      this.tweens.add({
        targets: puff,
        x: puff.x + driftX,
        y: puff.y + driftY,
        scale: { from: 0.7, to: 1.6 },
        alpha: { from: 0.75, to: 0 },
        duration: 520,
        ease: 'Sine.Out',
        onComplete: () => puff.destroy()
      });
    }

    // Infected biome: leave lingering toxic gas clouds
    if (this.biome === 'infected') {
      this.spawnGasCloud(baseX, baseY);
    }
  }

  spawnGasCloud(x: number, y: number) {
    const now = this.vTime ?? this.time.now;
    // Don't stack clouds too close together
    for (const gc of this.gasClouds) {
      if (Phaser.Math.Distance.Between(x, y, gc.x, gc.y) < 20) return;
    }
    // Create 3-4 overlapping circles for a blobby cloud look
    const sprites: Phaser.GameObjects.Arc[] = [];
    const count = Phaser.Math.Between(3, 4);
    for (let i = 0; i < count; i++) {
      const jx = Phaser.Math.Between(-10, 10);
      const jy = Phaser.Math.Between(-8, 8);
      const r = Phaser.Math.Between(12, 18);
      const shade = [0xd060a0, 0xe878b8, 0xc04888, 0xd06898][i % 4];
      const c = this.add.circle(x + jx, y + jy, r, shade, 0.35).setDepth(7);
      sprites.push(c);
      // Constant slow wobble
      this.tweens.add({
        targets: c,
        x: c.x + Phaser.Math.Between(-6, 6),
        y: c.y + Phaser.Math.Between(-6, 6),
        scale: { from: 0.9, to: 1.15 },
        alpha: { from: 0.35, to: 0.2 },
        duration: Phaser.Math.Between(1500, 2500),
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1
      });
    }
    this.gasClouds.push({ x, y, sprites, expireAt: Infinity, dmgCd: 0 });
  }

  updateGasClouds(time: number) {
    for (let i = this.gasClouds.length - 1; i >= 0; i--) {
      const gc = this.gasClouds[i];
      if (time >= gc.expireAt) {
        // Fade out and destroy
        for (const s of gc.sprites) {
          this.tweens.add({
            targets: s, alpha: 0, duration: 500,
            onComplete: () => s.destroy()
          });
        }
        this.gasClouds.splice(i, 1);
        continue;
      }
      // Damage player if overlapping
      if (time > gc.dmgCd) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, gc.x, gc.y);
        if (dist < 36) {
          const dmg = 3;
          this.player.hurt(dmg, this);
          this.pushHud();
          gc.dmgCd = time + 500; // tick damage every 500ms
          if (this.player.hp <= 0) this.lose();
        }
      }
    }
  }

  // ---------- BIRD POOP (river biome hazard) ----------
  spawnBirdPoop(x: number, y: number) {
    // Don't stack poops too close
    for (const bp of this.birdPoops) {
      if (Phaser.Math.Distance.Between(x, y, bp.sprite.x, bp.sprite.y) < 24) return;
    }
    // Cap total poops on screen
    if (this.birdPoops.length >= 30) return;
    const spr = this.add.image(x, y + 12, 'bird_poop').setScale(0.5).setDepth(2).setAlpha(0);
    // Falling animation: start small and transparent above, land and splat
    this.tweens.add({
      targets: spr,
      alpha: 0.85,
      scaleX: 0.6,
      scaleY: 0.45,
      duration: 300,
      ease: 'Bounce.Out'
    });
    this.birdPoops.push({
      sprite: spr,
      expireAt: this.vTime + 12000,
      dmgCd: 0
    });
  }

  updateBirdPoops(time: number) {
    for (let i = this.birdPoops.length - 1; i >= 0; i--) {
      const bp = this.birdPoops[i];
      if (time >= bp.expireAt) {
        // Fade out and destroy
        this.tweens.add({
          targets: bp.sprite, alpha: 0, duration: 800,
          onComplete: () => bp.sprite.destroy()
        });
        this.birdPoops.splice(i, 1);
        continue;
      }
      // Start fading when close to expiry
      if (bp.expireAt - time < 2000 && bp.sprite.alpha > 0.3) {
        bp.sprite.setAlpha(0.3 + 0.55 * ((bp.expireAt - time) / 2000));
      }
      // Damage player if they step in it
      if (time > bp.dmgCd) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, bp.sprite.x, bp.sprite.y);
        if (dist < 16) {
          this.player.hurt(4, this);
          this.pushHud();
          bp.dmgCd = time + 800;
          if (this.player.hp <= 0) this.lose();
        }
      }
    }
  }

  bossChargeImpact(b: Boss) {
    const r = 80;
    if (Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y) < r) {
      const chargeDmg = Math.floor(CFG.player.hp * 0.55);
      this.player.hurt(chargeDmg, this);
      this.pushHud();
      if (this.player.hp <= 0) this.lose();
    }
    // Towers caught in the impact zone are instantly destroyed
    for (const t of [...this.towers]) {
      if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) < r) {
        this.destroyTower(t);
      }
    }
    for (const w of [...this.walls]) {
      if (Phaser.Math.Distance.Between(b.x, b.y, w.x, w.y) < r) {
        w.hurt(80);
        if (w.hp <= 0) this.destroyWall(w);
      }
    }
    const burst = this.add.sprite(b.x, b.y, 'fx_death_0').setDepth(15).setScale(1.5);
    burst.play('fx-death');
    burst.once('animationcomplete', () => burst.destroy());

    // Red shockwave showing AoE reach
    const core = this.add.circle(b.x, b.y, r, 0xff2020, 0.45)
      .setDepth(14).setScale(0.15);
    this.tweens.add({
      targets: core,
      scale: 1,
      alpha: { from: 0.5, to: 0 },
      duration: 320,
      ease: 'Cubic.Out',
      onComplete: () => core.destroy()
    });

    // Outer ring edge
    const ring = this.add.circle(b.x, b.y, r, 0x000000, 0)
      .setStrokeStyle(4, 0xff4040, 1)
      .setDepth(15).setScale(0.15);
    this.tweens.add({
      targets: ring,
      scale: 1.05,
      alpha: { from: 1, to: 0 },
      duration: 400,
      ease: 'Sine.Out',
      onComplete: () => ring.destroy()
    });

    // Second fainter wave trailing behind
    const wave2 = this.add.circle(b.x, b.y, r, 0x000000, 0)
      .setStrokeStyle(2, 0xff6a3a, 0.7)
      .setDepth(14).setScale(0.1);
    this.tweens.add({
      targets: wave2,
      scale: 1.15,
      alpha: { from: 0.7, to: 0 },
      duration: 520,
      delay: 60,
      ease: 'Sine.Out',
      onComplete: () => wave2.destroy()
    });

    // Ground scorch
    const scorch = this.add.circle(b.x, b.y, r * 0.8, 0x1a0808, 0.5)
      .setDepth(2);
    this.tweens.add({
      targets: scorch,
      alpha: { from: 0.5, to: 0 },
      duration: 1400,
      ease: 'Sine.In',
      onComplete: () => scorch.destroy()
    });

    this.cameras.main.shake(360, 0.016);
  }

  bossBirthSpawn(b: Boss) {
    // emit 3 enemies from the boss's back with an upward spread
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.5;
      const dist = 18;
      const ex = b.x + Math.cos(a) * dist;
      const ey = b.y + Math.sin(a) * dist - 6;
      const kind: EnemyKind = this.biome === 'forest'
        ? (Math.random() < 0.4 ? 'spider' : 'wolf')
        : this.biome === 'infected'
        ? (Math.random() < 0.4 ? 'infected_heavy' : 'infected_basic')
        : this.biome === 'river'
        ? (Math.random() < 0.4 ? 'bat' : 'crow')
        : (Math.random() < 0.4 ? 'deer' : 'snake');
      const e = new Enemy(this, ex, ey, kind);
      e.noCoinDrop = true;
      this.applyEnemyDifficulty(e);
      this.enemies.add(e);
      const body = e.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(Math.cos(a) * 120, Math.sin(a) * 120 - 40);
      // birth pop fx
      const pop = this.add.sprite(ex, ey, 'fx_pop_0').setDepth(15).setScale(0.5);
      pop.play('fx-pop');
      pop.once('animationcomplete', () => pop.destroy());
    }
  }

  bossThrowBoulder(b: Boss, tx: number, ty: number) {
    const speed = 180;
    const dist = Math.hypot(tx - b.x, ty - b.y) || 1;
    const angle = Math.atan2(ty - b.y, tx - b.x);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const sprite = this.add.sprite(b.x, b.y, 'boulder_0').setDepth(14).setScale(0.6);
    sprite.play('boulder-spin');
    const shadowSprite = this.add.sprite(b.x, b.y, 'boulder_shadow').setDepth(5).setScale(0.3).setAlpha(0.35);

    this.boulders.push({
      sprite, shadow: shadowSprite,
      sx: b.x, sy: b.y, tx, ty,
      totalDist: dist, speed, dmg: 40, splashRadius: 48,
      born: this.vTime
    });

    // Brief atk anim
    b.play(`${b.animPrefix}-atk`);
    this.time.delayedCall(300, () => {
      if (b.active && !b.dying && b.state === 'chase')
        b.play(`${b.animPrefix}-move`);
    });
  }

  updateBoulders(time: number) {
    for (let i = this.boulders.length - 1; i >= 0; i--) {
      const bl = this.boulders[i];
      if (!bl.sprite.active) { this.boulders.splice(i, 1); continue; }

      // Move boulder toward target
      const elapsed = time - bl.born;
      const travelTime = bl.totalDist / bl.speed;
      const t = Math.min(elapsed / (travelTime * 1000), 1);

      const cx = bl.sx + (bl.tx - bl.sx) * t;
      const cy = bl.sy + (bl.ty - bl.sy) * t;
      const arcHeight = Math.sin(t * Math.PI) * 30;

      bl.sprite.setPosition(cx, cy - arcHeight);
      bl.shadow.setPosition(cx, cy);
      bl.shadow.setScale(0.2 + Math.sin(t * Math.PI) * 0.3);
      bl.shadow.setAlpha(0.4 - Math.sin(t * Math.PI) * 0.2);

      // Check arrival
      if (t >= 1) {
        this.boulderImpact(bl.tx, bl.ty, bl.splashRadius, bl.dmg);
        bl.sprite.destroy();
        bl.shadow.destroy();
        this.boulders.splice(i, 1);
      }
      // Timeout safety
      else if (elapsed > 5000) {
        bl.sprite.destroy();
        bl.shadow.destroy();
        this.boulders.splice(i, 1);
      }
    }
  }

  boulderImpact(x: number, y: number, radius: number, dmg: number) {
    // Damage towers in radius
    for (const t of [...this.towers]) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) < radius + 16) {
        t.hp -= dmg;
        if (t.hp <= 0) this.destroyTower(t);
      }
    }
    // Damage walls in radius
    for (const w of [...this.walls]) {
      if (Phaser.Math.Distance.Between(x, y, w.x, w.y) < radius + 8) {
        w.hp -= dmg;
        if (w.hp <= 0) this.destroyWall(w);
      }
    }
    // Damage player if close
    if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < radius) {
      this.player.hurt(15, this);
      this.pushHud();
      if (this.player.hp <= 0) this.lose();
    }

    // VFX — sprite-based boulder impact
    const fx = this.add.sprite(x, y, 'fx_boulder_0').setDepth(500).setScale(1.5);
    fx.play('fx-boulder');
    fx.once('animationcomplete', () => fx.destroy());

    // Scorch mark
    const scorch = this.add.circle(x, y, radius * 0.4, 0x3a3028, 0.3).setDepth(1);
    this.tweens.add({
      targets: scorch, alpha: 0, duration: 3000, onComplete: () => scorch.destroy()
    });

    this.cameras.main.shake(180, 0.008);
  }

  destroyTower(t: Tower) {
    this.cancelSellTimer(t);
    if (this.selectedTower === t) this.deselectTower();
    // Off-screen indicator cleanup happens in UIScene.updateIndicators()
    // (it owns those sprites now).
    const idx = this.towers.indexOf(t);
    if (idx >= 0) this.towers.splice(idx, 1);
    for (let j = 0; j < t.size; j++)
      for (let i = 0; i < t.size; i++)
        gridSet(this.grid, t.tileX + i, t.tileY + j, 0);
    this.gridVersion++; this._wallCheckCache.clear(); this.rebuildGapBlockers();
    const burst = this.add.sprite(t.x, t.y, 'fx_death_0').setDepth(15).setScale(0.5);
    burst.play('fx-death');
    burst.once('animationcomplete', () => burst.destroy());
    SFX.play('structDestroy');
    t.destroyTower();
  }
  destroyWall(w: Wall) {
    this.cancelSellTimer(w);
    const idx = this.walls.indexOf(w);
    if (idx >= 0) this.walls.splice(idx, 1);
    const tx = w.tileX, ty = w.tileY;
    gridSet(this.grid, tx, ty, 0);
    this.syncWallTile(tx, ty, false);
    this.gridVersion++; this._wallCheckCache.clear(); this.rebuildGapBlockers();
    SFX.play('structDestroy');
    w.destroy();
    this.updateWallNeighbors(tx, ty);
  }

  /** Recalculate neighbor masks for wall at (tx,ty) and its 4 cardinal neighbors */
  updateWallNeighbors(tx: number, ty: number) {
    const dirs: [number, number, number][] = [
      [0, -1, 1],  // N
      [1, 0, 2],   // E
      [0, 1, 4],   // S
      [-1, 0, 8],  // W
    ];
    // Update the wall at (tx,ty) and each neighbor
    for (const [dx, dy] of [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const wx = tx + dx, wy = ty + dy;
      const wall = this.walls.find(w => w.tileX === wx && w.tileY === wy);
      if (!wall) continue;
      let mask = 0;
      for (const [ndx, ndy, bit] of dirs) {
        if (this.walls.some(w => w.tileX === wx + ndx && w.tileY === wy + ndy)) {
          mask |= bit;
        }
      }
      wall.neighborMask = mask;
      wall.updateTexture();
    }
  }

  liveEnemyCount(): number {
    let n = 0;
    this.enemies.children.iterate((c: any) => {
      const e = c as Enemy;
      if (e && e.active && !e.dying) n++;
      return true;
    });
    return n;
  }

  spawnBoss() {
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    const spawnR = this.spawnDist * CFG.tile;
    const px = this.player.x, py = this.player.y;
    // spawn at a random corner at spawnDist from the player
    const corners = [
      { x: px - spawnR, y: py - spawnR },
      { x: px + spawnR, y: py - spawnR },
      { x: px - spawnR, y: py + spawnR },
      { x: px + spawnR, y: py + spawnR }
    ];
    const pick = corners[Math.floor(Math.random() * corners.length)];
    this.boss = new Boss(this, pick.x, pick.y, this.biome);
    // Per-biome boss tuning — meadow is the intro boss, keep it approachable
    if (this.biome === 'grasslands') {
      this.boss.hp = 800; this.boss.maxHp = 800;
      this.boss.dmg = 15; this.boss.speed = 24;
    }
    this.pushHud();
    this.physics.add.overlap(this.projectiles, this.boss, (a: any, b: any) => {
      const pr = (a instanceof Projectile ? a : b) as Projectile;
      const bs = (a instanceof Boss ? a : b) as Boss;
      this.projectileHitsBoss(pr, bs);
    });
    // Colliders: boss cannot phase through walls/towers. If the collision
    // happens while charging, slam the charge impact right where she stopped.
    const onStructureHit = () => {
      if (this.boss && this.boss.state === 'charging') {
        this.boss.stateEnd = 0; // updateBoss will fire bossChargeImpact next frame
      }
    };
    this.physics.add.collider(this.boss, this.wallGroup, onStructureHit, () => this.biome !== 'river');
    this.physics.add.collider(this.boss, this.towerGroup, onStructureHit, () => this.biome !== 'river');
    this.game.events.emit('boss-spawn', { hp: this.boss.hp, maxHp: this.boss.maxHp, biome: this.biome });
    // Persist boss state so a viewport-driven UIScene restart can recreate
    // the boss bar from registry data (boss-spawn is one-shot).
    this.game.registry.set('bossActive', true);
    this.game.registry.set('bossHp', this.boss.hp);
    this.game.registry.set('bossMaxHp', this.boss.maxHp);
    this.game.registry.set('bossBiome', this.biome);
    SFX.play('bossSpawn');
    const bossTitle = this.biome === 'forest' ? 'THE WENDIGO'
                    : this.biome === 'infected' ? 'THE BLIGHTED ONE'
                    : this.biome === 'river' ? 'THE FOG PHANTOM'
                    : 'THE ANCIENT RAM';
    this.countdownMsg = `${bossTitle} APPROACHES`;
    this.countdownColor = '#ff5050';
    this.pushHud();
    this.time.delayedCall(3000, () => {
      this.countdownMsg = '';
      this.pushHud();
    });
    this.cameras.main.shake(300, 0.005);
  }

  spawnCastleBoss(kind: 'queen' | 'dragon') {
    this.bossSpawned = true;
    const spawnR = this.spawnDist * CFG.tile;
    const px = this.player.x, py = this.player.y;
    const corners = [
      { x: px - spawnR, y: py - spawnR },
      { x: px + spawnR, y: py - spawnR },
      { x: px - spawnR, y: py + spawnR },
      { x: px + spawnR, y: py + spawnR }
    ];
    const pick = corners[Math.floor(Math.random() * corners.length)];
    const b = new Boss(this, pick.x, pick.y, 'castle', kind);

    if (kind === 'queen') {
      b.hp = CFG.castle.queenHp; b.maxHp = CFG.castle.queenHp;
      b.dmg = CFG.castle.queenDmg; b.speed = CFG.castle.queenSpeed;
      this.midBoss = b;
      this.castlePhase = 1;
      this.nextQueenOrb = this.vTime + CFG.castle.queenOrbFireRate;
      this.nextQueenTeleport = this.vTime + CFG.castle.queenTeleportCooldown;
      this.nextQueenAura = this.vTime + CFG.castle.queenAuraCooldown;
    } else {
      b.hp = CFG.castle.dragonHp; b.maxHp = CFG.castle.dragonHp;
      b.dmg = CFG.castle.dragonDmg; b.speed = CFG.castle.dragonSpeed;
      this.castlePhase = 3;
      this.nextDragonFireball = this.vTime + CFG.castle.dragonFireballRate;
    }

    this.boss = b;
    this.pushHud();
    this.physics.add.overlap(this.projectiles, b, (a: any, bb: any) => {
      const pr = (a instanceof Projectile ? a : bb) as Projectile;
      const bs = (a instanceof Boss ? a : bb) as Boss;
      this.projectileHitsBoss(pr, bs);
    });
    // Castle bosses collide with structures
    const onStructureHit = () => {
      if (this.boss && this.boss.state === 'charging') {
        this.boss.stateEnd = 0;
      }
    };
    this.physics.add.collider(b, this.wallGroup, onStructureHit);
    this.physics.add.collider(b, this.towerGroup, onStructureHit);

    const bossTitle = kind === 'queen' ? 'THE PHANTOM QUEEN' : 'THE CASTLE DRAGON';
    this.game.events.emit('boss-spawn', { hp: b.hp, maxHp: b.maxHp, biome: 'castle', bossKind: kind });
    SFX.play('bossSpawn');
    this.countdownMsg = `${bossTitle} APPROACHES`;
    this.countdownColor = '#ff5050';
    this.pushHud();
    this.time.delayedCall(3000, () => { this.countdownMsg = ''; this.pushHud(); });
    this.cameras.main.shake(300, 0.005);
  }

  enemyHitsPlayer(e: Enemy) {
    if (!e.active || e.dying) return;
    // mosquitoes handle their own melee in the update loop
    if (this.vTime > e.attackCd) {
      e.attackCd = this.vTime + 700;
      this.player.hurt(e.dmg, this);
      this.pushHud();
      if (this.player.hp <= 0) this.lose();
    }
  }

  enemyHitsWall(_e: Enemy, _w: Wall) {
    // Enemies no longer attack structures — collider just blocks movement
  }

  enemyHitsTower(_e: Enemy, _t: Tower) {
    // Enemies no longer attack structures — collider just blocks movement
  }

  // ---------- ENEMY DARTS (mosquito ranged attack) ----------
  spawnMosquitoDart(x: number, y: number, tx: number, ty: number) {
    const dart = this.physics.add.sprite(x, y, 'mdart_0').setScale(0.7).setDepth(9);
    dart.play('mdart-spin');
    dart.setSize(12, 12).setOffset(2, 2);
    this.enemyDarts.add(dart);
    const angle = Math.atan2(ty - y, tx - x);
    const spd = CFG.river.mosquitoDartSpeed;
    dart.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
    dart.setRotation(angle);
    (dart as any)._born = this.vTime;
    (dart as any)._dmg = CFG.river.mosquitoDartDmg;
  }

  enemyDartHitsPlayer(dart: Phaser.Physics.Arcade.Sprite) {
    if (!dart.active) return;
    const dmg = (dart as any)._dmg ?? CFG.river.mosquitoDartDmg;
    this.player.hurt(dmg, this);
    this.pushHud();
    if (this.player.hp <= 0) this.lose();
    dart.destroy();
  }

  updateEnemyDarts() {
    this.enemyDarts.children.iterate((c: any) => {
      if (!c || !c.active) return true;
      if (this.vTime - c._born > CFG.river.mosquitoDartLifetime) { c.destroy(); return true; }
      return true;
    });
  }

  // ---------- TOAD GLOBS (arcing ranged attack) ----------

  /** Check if a world position is adjacent to a wall, tower, tree, or water tile */
  isAdjacentToObstacle(wx: number, wy: number): boolean {
    const t = CFG.tile;
    const gx = Math.floor(wx / t), gy = Math.floor(wy / t);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const v = gridGet(this.grid, gx + dx, gy + dy);
        if (v === 1 || v === 2 || v === 3 || v === 4) return true; // wall, tower, tree, water
      }
    }
    return false;
  }

  spawnToadGlob(x: number, y: number, tx: number, ty: number) {
    const glob = this.physics.add.sprite(x, y, 'tglob_0').setScale(0.8).setDepth(12);
    glob.play('tglob-spin');
    glob.setSize(10, 10).setOffset(3, 3);
    this.toadGlobs.add(glob);

    const dx = tx - x, dy = ty - y;
    const dist = Math.hypot(dx, dy) || 1;
    const spd = CFG.infected.toadGlobSpeed;

    const g = glob as any;
    g._born = this.vTime;
    g._startX = x;
    g._startY = y;
    g._targetX = tx;
    g._targetY = ty;
    g._totalDist = dist;
    g._dmg = CFG.infected.toadGlobDmg;
    g._splash = CFG.infected.toadGlobSplash;
    g._arcHeight = CFG.infected.toadGlobArcHeight;
    g._flat = false;
    g._landed = false;

    glob.setVelocity((dx / dist) * spd, (dy / dist) * spd);
  }

  /** Glob reaches its target (or hits a wall). Stop, splash, damage, destroy. */
  landToadGlob(glob: Phaser.Physics.Arcade.Sprite) {
    if (!glob.active) return;
    const g = glob as any;
    if (g._landed) return;
    g._landed = true;

    // Stop moving
    glob.setVelocity(0, 0);
    glob.setScale(0.8);
    glob.setOrigin(0.5, 0.5);
    (glob.body as Phaser.Physics.Arcade.Body).enable = false;

    const dmg = g._dmg ?? CFG.infected.toadGlobDmg;
    const splash = g._splash ?? CFG.infected.toadGlobSplash;

    // Damage player if within splash radius
    const pdx = this.player.x - glob.x, pdy = this.player.y - glob.y;
    if (pdx * pdx + pdy * pdy < splash * splash) {
      this.player.hurt(dmg, this);
      this.pushHud();
      if (this.player.hp <= 0) this.lose();
    }

    // Splat visual + destroy. Circle stays at exactly the damage radius for
    // its full fade so the kill zone reads honestly — no scale tween.
    const splat = this.add.circle(glob.x, glob.y, splash, 0x40e060, 0.5).setDepth(5);
    this.tweens.add({ targets: splat, alpha: 0, duration: 500, onComplete: () => splat.destroy() });
    // Brief green flash on the glob then destroy
    glob.setTintFill(0x40e060);
    this.tweens.add({ targets: glob, alpha: 0, scaleX: 1.2, scaleY: 0.3, duration: 200, onComplete: () => glob.destroy() });
  }

  toadGlobHitsPlayer(glob: Phaser.Physics.Arcade.Sprite) {
    // Player overlap is only used as a fallback — main landing is in updateToadGlobs
    if (!glob.active || (glob as any)._landed) return;
    this.landToadGlob(glob);
  }

  updateToadGlobs() {
    this.toadGlobs.children.iterate((c: any) => {
      if (!c || !c.active || c._landed) return true;
      const elapsed = this.vTime - c._born;
      if (elapsed > CFG.infected.toadGlobLifetime) { this.landToadGlob(c); return true; }

      // Check if glob has reached (or passed) its target
      const dx = c.x - c._startX, dy = c.y - c._startY;
      const traveled = Math.hypot(dx, dy);
      if (traveled >= c._totalDist) {
        // Arrived at target — land it
        this.landToadGlob(c);
        return true;
      }

      // Arc effect: offset visual based on progress
      const progress = traveled / c._totalDist;
      if (c._arcHeight > 0) {
        const arc = -4 * c._arcHeight * progress * (progress - 1);
        const scaleMod = 1 + (arc / c._arcHeight) * 0.4;
        c.setScale(0.8 * scaleMod);
        c.setOrigin(0.5, 0.5 + arc / 16);
      }

      return true;
    });
  }

  // ---------- CASTLE PROJECTILES ----------

  spawnWarlockBolt(sx: number, sy: number, tx: number, ty: number) {
    const bolt = this.physics.add.sprite(sx, sy, 'wbolt_0');
    bolt.setScale(0.5).setDepth(10);
    bolt.play('wbolt-spin');
    this.warlockBolts.add(bolt);
    const dx = tx - sx, dy = ty - sy;
    const d = Math.hypot(dx, dy) || 1;
    const spd = CFG.castle.warlockBoltSpeed;
    bolt.setVelocity((dx / d) * spd, (dy / d) * spd);
    (bolt as any)._born = this.vTime;
    (bolt as any)._dmg = CFG.castle.warlockBoltDmg;
  }

  spawnQueenOrb(sx: number, sy: number, tx: number, ty: number) {
    const orb = this.physics.add.sprite(sx, sy, 'qorb_0');
    orb.setScale(0.5).setDepth(10);
    orb.play('qorb-spin');
    this.queenOrbs.add(orb);
    const dx = tx - sx, dy = ty - sy;
    const d = Math.hypot(dx, dy) || 1;
    const spd = CFG.castle.queenOrbSpeed;
    orb.setVelocity((dx / d) * spd, (dy / d) * spd);
    (orb as any)._born = this.vTime;
    (orb as any)._dmg = CFG.castle.queenOrbDmg;
  }

  spawnDragonFireball(sx: number, sy: number, tx: number, ty: number) {
    const fb = this.physics.add.sprite(sx, sy, 'dfball_0');
    fb.setScale(0.6).setDepth(10);
    fb.play('dfball-spin');
    this.dragonFireballs.add(fb);
    const dx = tx - sx, dy = ty - sy;
    const d = Math.hypot(dx, dy) || 1;
    const spd = CFG.castle.dragonFireballSpeed;
    fb.setVelocity((dx / d) * spd, (dy / d) * spd);
    (fb as any)._born = this.vTime;
    (fb as any)._dmg = CFG.castle.dragonFireballDmg;
    (fb as any)._splash = CFG.castle.dragonFireballSplash;
    (fb as any)._tx = tx;
    (fb as any)._ty = ty;
    (fb as any)._totalDist = d;
    (fb as any)._startX = sx;
    (fb as any)._startY = sy;
  }

  castleBoltHitsPlayer(bolt: Phaser.Physics.Arcade.Sprite) {
    if (!bolt.active) return;
    const dmg = (bolt as any)._dmg ?? 6;
    this.player.hurt(dmg, this);
    this.pushHud();
    if (this.player.hp <= 0) this.lose();
    bolt.destroy();
  }

  dragonFireballHitsPlayer(fb: Phaser.Physics.Arcade.Sprite) {
    if (!fb.active) return;
    const dmg = (fb as any)._dmg ?? 15;
    // Direct hit to player
    this.player.hurt(dmg, this);
    this.pushHud();
    if (this.player.hp <= 0) this.lose();
    // Tag as direct hit so explode doesn't double-damage the player
    (fb as any)._directHit = true;
    // Explode with AoE
    this.dragonFireballExplode(fb);
  }

  /** Explode a dragon fireball at its current position — AoE damage + animation */
  dragonFireballExplode(fb: Phaser.Physics.Arcade.Sprite) {
    if (!fb.active) return;
    const x = fb.x, y = fb.y;
    const dmg = (fb as any)._dmg ?? 15;
    const splash = (fb as any)._splash ?? 48;
    fb.destroy();

    // Explosion animation
    const expl = this.add.sprite(x, y, 'dfexpl_0').setScale(1.2).setDepth(12);
    expl.play('dfexpl');
    expl.once('animationcomplete', () => expl.destroy());

    // AoE damage to player if in range (and not already hit by direct contact)
    if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < splash) {
      if (!(fb as any)._directHit) {
        this.player.hurt(dmg, this);
        this.pushHud();
        if (this.player.hp <= 0) this.lose();
      }
    }

    // Damage nearby towers and walls — fireballs hit structures 5x harder
    // than they hit the player, so the dragon can credibly demolish a base.
    const structDmg = Math.floor(dmg * 2.5);
    for (const t of this.towers) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) < splash) {
        t.hurt(structDmg);
        if (t.hp <= 0) this.destroyTower(t);
      }
    }
    for (const w of this.walls) {
      if (Phaser.Math.Distance.Between(x, y, w.x, w.y) < splash) {
        w.hurt(structDmg);
        if (w.hp <= 0) this.destroyWall(w);
      }
    }
  }

  updateCastleProjectiles() {
    // Warlock bolts
    this.warlockBolts.children.iterate((c: any) => {
      if (!c || !c.active) return true;
      if (this.vTime - c._born > CFG.castle.warlockBoltLifetime) { c.destroy(); return true; }
      return true;
    });
    // Queen orbs
    this.queenOrbs.children.iterate((c: any) => {
      if (!c || !c.active) return true;
      if (this.vTime - c._born > CFG.castle.queenOrbLifetime) { c.destroy(); return true; }
      return true;
    });
    // Dragon fireballs — explode on reaching target or timeout
    const fbToExplode: Phaser.Physics.Arcade.Sprite[] = [];
    this.dragonFireballs.children.iterate((c: any) => {
      if (!c || !c.active) return true;
      if (this.vTime - c._born > CFG.castle.dragonFireballLifetime) {
        fbToExplode.push(c);
        return true;
      }
      return true;
    });
    for (const fb of fbToExplode) {
      // AoE damage to player at explosion site
      const splash = (fb as any)._splash ?? 48;
      const dmg = (fb as any)._dmg ?? 15;
      if (Phaser.Math.Distance.Between(fb.x, fb.y, this.player.x, this.player.y) < splash) {
        this.player.hurt(dmg, this);
        this.pushHud();
        if (this.player.hp <= 0) this.lose();
        // Tag as already damaged so dragonFireballExplode skips player damage
        (fb as any)._directHit = true;
      }
      this.dragonFireballExplode(fb);
    }
  }

  // ---------- PROJECTILES ----------
  spawnProjectile(x: number, y: number, tx: number, ty: number, speed: number, dmg: number, splashRadius = 0, scale = 0.5, tint = 0, homingTarget: Phaser.GameObjects.Sprite | null = null) {
    const pr = new Projectile(this, x, y);
    this.projectiles.add(pr);
    pr.fire(tx, ty, speed, dmg, splashRadius, scale, tint, homingTarget);
  }

  updateProjectiles(time: number) {
    this.projectiles.children.iterate((c: any) => {
      const p = c as Projectile;
      if (!p || !p.active) return true;
      if (time - p.born > p.lifetime) { p.destroy(); return true; }

      // Homing arrows: steer toward target each frame
      if (p.homingTarget && !p.groundTarget) {
        if (p.homingTarget.active && !(p.homingTarget as any).dying) {
          const dx = p.homingTarget.x - p.x;
          const dy = p.homingTarget.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          const angle = Math.atan2(dy, dx);
          p.setVelocity((dx / d) * p.speed, (dy / d) * p.speed);
          p.setRotation(angle);
        } else {
          // Target dead — stop homing, fly straight with current velocity
          p.homingTarget = null;
        }
      }

      if (p.groundTarget) {
        // Undo previous arc offset so physics position is correct
        p.y += p.arcOffset;

        // Check arrival at ground target
        const d = Math.hypot(p.groundX - p.x, p.groundY - p.y);
        if (d < 14) {
          p.arcOffset = 0;
          this.cannonExplode(p.groundX, p.groundY, p.splashRadius, p.damage);
          p.destroy();
          return true;
        }

        // Arc: parabolic height based on flight progress
        const traveled = Math.hypot(p.x - p.startX, p.y - p.startY);
        const t = Math.min(traveled / p.totalDist, 1);
        const arcHeight = Math.sin(t * Math.PI) * 22;
        p.arcOffset = arcHeight;

        // Shadow follows on the ground
        if (p.shadow) {
          p.shadow.setPosition(p.x, p.y);
          const shadowScale = 0.2 + Math.sin(t * Math.PI) * 0.25;
          p.shadow.setScale(shadowScale);
          p.shadow.setAlpha(0.4 - Math.sin(t * Math.PI) * 0.2);
        }

        // Visually shift the ball upward (arc)
        p.y -= arcHeight;
      }
      return true;
    });
  }

  projectileHitsBoss(pr: Projectile, b: Boss) {
    if (!pr.active || !b.active || b.dying) return;
    // Cannonballs ignore direct hits — they explode on reaching their ground target
    if (pr.groundTarget) return;
    b.hurt(pr.damage);
    const spark = this.add.sprite(pr.x, pr.y, 'fx_hit_0').setDepth(15).setScale(0.5);
    spark.play('fx-hit');
    spark.once('animationcomplete', () => spark.destroy());
    pr.destroy();
    this.game.events.emit('boss-hp', { hp: b.hp, maxHp: b.maxHp });
    this.game.registry.set('bossHp', b.hp);
    if (b.dying) {
      this.game.registry.set('bossActive', false);
      this.dropBossLoot(b);
    }
  }

  dropBossLoot(b: Boss) {
    const drops = 12;
    for (let i = 0; i < drops; i++) {
      const a = (i / drops) * Math.PI * 2;
      const d = Phaser.Math.Between(6, 22);
      const coin = new Coin(this, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 'gold');
      this.coins.add(coin);
    }
  }

  projectileHitsEnemy(pr: Projectile, e: Enemy) {
    if (!pr.active || !e.active || e.dying) return;
    // Cannonballs ignore direct hits — they explode on reaching their ground target
    if (pr.groundTarget) return;

    this.applyDamageToEnemy(e, pr.damage);
    const spark = this.add.sprite(pr.x, pr.y, 'fx_hit_0').setDepth(15).setScale(0.5);
    spark.play('fx-hit');
    spark.once('animationcomplete', () => spark.destroy());
    pr.destroy();
  }

  // Damage a single enemy and handle its death drops/counts.
  applyDamageToEnemy(e: Enemy, dmg: number) {
    if (!e || !e.active || e.dying) return;
    SFX.play('hit');
    e.hurt(dmg);
    if (e.hp <= 0) {
      if (!e.noCoinDrop) {
        const tier =
          e.kind === 'heavy' || e.kind === 'deer' || e.kind === 'bear' || e.kind === 'infected_heavy' ? 'silver' :
                                                     'bronze';
        const coin = new Coin(this, e.x + Phaser.Math.Between(-4, 4), e.y + Phaser.Math.Between(-4, 4), tier);
        this.coins.add(coin);
      }
      const burst = this.add.sprite(e.x, e.y, 'fx_death_0').setDepth(15).setScale(0.5);
      burst.play('fx-death');
      burst.once('animationcomplete', () => burst.destroy());

      this.player.kills++;
      this.waveKills++;
      this.pushHud();
      if (this.game.registry.get('tutorialActive')) this.game.events.emit('tutorial-kill');
    }
  }

  cannonExplode(x: number, y: number, radius: number, dmg: number) {
    SFX.play('boom');
    // ---------- VISUALS ----------
    // 1) Bright white core flash (fast)
    const core = this.add.circle(x, y, radius * 0.55, 0xfff5c0, 0.95)
      .setDepth(16)
      .setScale(0.3);
    this.tweens.add({
      targets: core,
      scale: 1,
      alpha: { from: 1, to: 0 },
      duration: 160,
      ease: 'Sine.Out',
      onComplete: () => core.destroy()
    });

    // 2) Orange fireball layer
    const fire = this.add.circle(x, y, radius * 0.85, 0xff8a20, 0.85)
      .setDepth(15)
      .setScale(0.25);
    this.tweens.add({
      targets: fire,
      scale: 1,
      alpha: { from: 0.9, to: 0 },
      duration: 260,
      ease: 'Cubic.Out',
      onComplete: () => fire.destroy()
    });

    // 3) Dark red outer shell for depth
    const shell = this.add.circle(x, y, radius, 0xc93010, 0.55)
      .setDepth(14)
      .setScale(0.2);
    this.tweens.add({
      targets: shell,
      scale: 1.05,
      alpha: { from: 0.7, to: 0 },
      duration: 340,
      ease: 'Cubic.Out',
      onComplete: () => shell.destroy()
    });

    // 4) Expanding shockwave ring outline
    const ring = this.add.circle(x, y, radius, 0x000000, 0)
      .setStrokeStyle(3, 0xffd070, 0.95)
      .setDepth(17)
      .setScale(0.2);
    this.tweens.add({
      targets: ring,
      scale: 1.15,
      alpha: { from: 1, to: 0 },
      duration: 360,
      ease: 'Sine.Out',
      onComplete: () => ring.destroy()
    });

    // 5) Fiery shrapnel sparks shooting outward
    const sparkCount = 14;
    for (let i = 0; i < sparkCount; i++) {
      const a = (i / sparkCount) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const dist = radius * Phaser.Math.FloatBetween(0.7, 1.1);
      const sparkColor = [0xffe070, 0xff9030, 0xffffff][i % 3];
      const s = this.add.circle(x, y, Phaser.Math.Between(2, 3), sparkColor, 1).setDepth(18);
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist,
        alpha: { from: 1, to: 0 },
        scale: { from: 1, to: 0.3 },
        duration: Phaser.Math.Between(260, 420),
        ease: 'Cubic.Out',
        onComplete: () => s.destroy()
      });
    }

    // 6) Smoke puffs that linger after the fire fades
    const smokeCount = 7;
    for (let i = 0; i < smokeCount; i++) {
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const offD = Phaser.Math.FloatBetween(0, radius * 0.6);
      const px = x + Math.cos(a) * offD;
      const py = y + Math.sin(a) * offD;
      const shade = [0x6a6a74, 0x858590, 0x4a4a54][i % 3];
      const puff = this.add.circle(px, py, Phaser.Math.Between(8, 13), shade, 0.65)
        .setStrokeStyle(1, 0x2a2a32, 0.4)
        .setDepth(13)
        .setScale(0.4);
      const driftX = Phaser.Math.Between(-10, 10);
      const driftY = Phaser.Math.Between(-20, -8); // smoke rises
      // small delay so smoke emerges as the fire dies down
      this.tweens.add({
        targets: puff,
        scale: { from: 0.4, to: 1.4 },
        alpha: { from: 0.7, to: 0 },
        x: px + driftX,
        y: py + driftY,
        duration: Phaser.Math.Between(600, 900),
        delay: Phaser.Math.Between(40, 140),
        ease: 'Sine.Out',
        onComplete: () => puff.destroy()
      });
    }

    // 7) Permanent dirt crater on the ground
    this.spawnCrater(x, y, radius);

    this.cameras.main.shake(80, 0.003);

    // Damage all enemies in radius
    const r2 = radius * radius;
    const hitList: Enemy[] = [];
    this.enemies.children.iterate((c: any) => {
      const en = c as Enemy;
      if (!en || !en.active || en.dying) return true;
      const dx = en.x - x, dy = en.y - y;
      if (dx * dx + dy * dy <= r2) hitList.push(en);
      return true;
    });
    for (const en of hitList) this.applyDamageToEnemy(en, dmg);

    // Also chip the boss if in range
    if (this.boss && this.boss.active && !this.boss.dying) {
      const dx = this.boss.x - x, dy = this.boss.y - y;
      if (dx * dx + dy * dy <= r2) {
        this.boss.hurt(Math.floor(dmg * 0.6));
        this.game.events.emit('boss-hp', { hp: this.boss.hp, maxHp: this.boss.maxHp });
        this.game.registry.set('bossHp', this.boss.hp);
        if (this.boss.dying) {
          this.game.registry.set('bossActive', false);
          this.dropBossLoot(this.boss);
        }
      }
    }
  }

  // ---------- COINS ----------
  spawnCrater(x: number, y: number, _radius: number) {
    const g = this.add.graphics().setDepth(0);
    const cr = 10;
    // Ash streaks radiating outward — thicker near crater, tapering to a point
    const streakColors = [0x1a1008, 0x241810, 0x2e2014];
    const streaks = Phaser.Math.Between(5, 8);
    for (let i = 0; i < streaks; i++) {
      const a = (i / streaks) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.35, 0.35);
      const len = Phaser.Math.FloatBetween(6, 12);
      const steps = 5;
      const color = streakColors[i % 3];
      const alpha = Phaser.Math.FloatBetween(0.45, 0.65);
      g.fillStyle(color, alpha);
      for (let s = 0; s < steps; s++) {
        const t = s / (steps - 1); // 0 at crater edge, 1 at tip
        const d = cr * 0.7 + len * t;
        const sx = x + Math.cos(a) * d;
        const sy = y + Math.sin(a) * d;
        const r = 2.2 * (1 - t * 0.85); // thick at start, tiny point at end
        g.fillCircle(sx, sy, Math.max(r, 0.5));
      }
    }
    // Brown crater bowl
    g.fillStyle(0x3e2e1a, 0.6);
    g.fillEllipse(x, y, cr * 2, cr * 1.5);
    // Darker center
    g.fillStyle(0x2a1e10, 0.5);
    g.fillEllipse(x + Phaser.Math.FloatBetween(-1, 1), y + Phaser.Math.FloatBetween(-1, 1), cr * 1.1, cr * 0.8);
    // Light dirt highlight on top rim
    g.fillStyle(0x9a7a50, 0.25);
    g.fillEllipse(x, y - cr * 0.3, cr * 1.3, cr * 0.35);
    // Fade out over 15 seconds then destroy
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 15000,
      ease: 'Sine.In',
      onComplete: () => g.destroy()
    });
  }

  updateCoins(delta: number) {
    const dt = delta / 1000;
    this.coins.children.iterate((c: any) => {
      const coin = c as Coin;
      if (!coin || !coin.active) return true;
      const dx = this.player.x - coin.x;
      const dy = this.player.y - coin.y;
      // Squared-distance early reject: avoids sqrt for the common case of
      // coins far outside magnet range.
      const sqDist = dx * dx + dy * dy;
      const magnetR = CFG.coin.magnetRange;
      if (sqDist > magnetR * magnetR) return true;
      const d = Math.sqrt(sqDist);
      if (d < 18) {
        // collect
        this.player.money += coin.value;
        this.pushHud();
        SFX.play('coin');
        // Tutorial event: only emit when the tutorial is active. Otherwise
        // every coin pickup paid for an event dispatch with no listeners.
        if (this.game.registry.get('tutorialActive')) {
          this.game.events.emit('tutorial-coin-collected');
        }
        this.playCoinFxPop(coin.x, coin.y);
        coin.destroy();
        return true;
      }
      const speed = CFG.coin.magnetSpeed * (1 - d / magnetR + 0.2);
      coin.x += (dx / d) * speed * dt;
      coin.y += (dy / d) * speed * dt;
      return true;
    });
  }

  // ---------- SPAWNING ----------
  updateSpawning(time: number, delta: number) {
    // initial build phase — show countdown, don't spawn anything yet
    if (time < this.waveStartAt) {
      if (this.waveStartAt === Infinity) {
        this.syncCountdown('');
        return;
      }
      const secs = Math.ceil((this.waveStartAt - time) / 1000);
      this.syncCountdown(`BUILD PHASE — ${secs}s`, '#7cc4ff');
      return;
    }

    const waveSize = this.levelWaveSize;
    // Castle has 4 waves (0-3) with mid-boss after wave 1, final boss after wave 3
    const totalWaves = this.biome === 'castle' ? 4 : CFG.spawn.waveCount;
    const lastWaveIdx = totalWaves - 1;
    // Castle: wave 1 triggers queen, wave 3 triggers dragon
    const isBossWave = this.biome === 'castle'
      ? (this.castlePhase === 0 && this.wave === 1) || (this.castlePhase === 2 && this.wave === 3)
      : this.wave >= lastWaveIdx;

    // Castle mid-boss phase: waiting for queen to die before resuming waves
    // Must come before the bossSpawned early-return so phase advancement can happen
    if (this.biome === 'castle' && this.castlePhase === 1) {
      if (this.midBossDefeated) {
        // Queen is dead — advance to phase 2 (waves 3-4)
        this.castlePhase = 2;
        this.wave = 2;
        this.waveSpawned = 0;
        this.waveKills = 0;
        this.bossSpawned = false;
        this.boss = null;
        this.bossCountdownUntil = 0;
        this.waveBreakUntil = time + CFG.spawn.waveBreak;
      }
      return;
    }

    // Boss already out — nothing to show/spawn here
    if (this.bossSpawned) {
      this.syncCountdown('');
      return;
    }

    // Between-wave build break (wave bar shows countdown via hudState).
    // UIScene reads waveBreakUntil/vTime to render "WAVE N IN Ns", so we
    // must push when the displayed second flips — but no more often.
    if (time < this.waveBreakUntil) {
      const secs = Math.ceil((this.waveBreakUntil - time) / 1000);
      let needsPush = false;
      if (this.countdownMsg) { this.countdownMsg = ''; needsPush = true; }
      if (this._lastWaveBreakUntil !== this.waveBreakUntil || this._lastWaveBreakSecond !== secs) {
        this._lastWaveBreakUntil = this.waveBreakUntil;
        this._lastWaveBreakSecond = secs;
        needsPush = true;
      }
      if (needsPush) this.pushHud();
      return;
    }

    // Boss lead-in: on the boss wave once every enemy has been spawned.
    if (isBossWave && this.waveSpawned >= waveSize) {
      const live = this.liveEnemyCount();
      const left = Math.max(live, waveSize - this.waveKills);
      if (left > 0) {
        this.syncCountdown(`KILL THE STRAGGLERS — ${left} LEFT`, '#ff9a4a');
      } else {
        if (this.bossCountdownUntil === 0) {
          this.bossCountdownUntil = time + CFG.boss.prepTime;
        }
        if (time >= this.bossCountdownUntil) {
          if (this.biome === 'castle' && this.castlePhase === 0) {
            this.spawnCastleBoss('queen');
          } else if (this.biome === 'castle' && this.castlePhase === 2) {
            this.spawnCastleBoss('dragon');
          } else {
            this.spawnBoss();
          }
          return;
        }
        const secs = Math.ceil((this.bossCountdownUntil - time) / 1000);
        const bossName = this.biome === 'forest' ? 'WENDIGO'
                       : this.biome === 'infected' ? 'BLIGHTED ONE'
                       : this.biome === 'river' ? 'FOG PHANTOM'
                       : this.biome === 'castle' && this.castlePhase === 0 ? 'PHANTOM QUEEN'
                       : this.biome === 'castle' && this.castlePhase === 2 ? 'CASTLE DRAGON'
                       : 'ANCIENT RAM';
        this.syncCountdown(`${bossName} SPAWNING IN ${secs}`, '#ff5050');
      }
      return;
    }

    // Non-boss wave finished → start build break, advance wave counter.
    if (!isBossWave && this.waveSpawned >= waveSize && this.waveKills >= waveSize) {
      this.wave++;
      this.waveSpawned = 0;
      this.waveKills = 0;
      this.waveBreakUntil = time + CFG.spawn.waveBreak;
      return;
    }

    // Active wave — clear countdown text, wave bar shows progress
    this.syncCountdown('');

    // Ramp difficulty, spawn until this wave's quota is met.
    this.spawnTimer += delta;
    this.rampTimer += delta;
    if (this.rampTimer > CFG.spawn.rampEvery) {
      this.rampTimer = 0;
      this.spawnInterval = Math.max(this.levelMinInterval, this.spawnInterval * this.levelRampFactor);
      this.heavyChance = Math.min(CFG.spawn.heavyChanceMax, this.heavyChance + CFG.spawn.heavyChanceStep);
    }
    if (this.spawnTimer > this.spawnInterval && this.waveSpawned < waveSize) {
      this.spawnTimer = 0;
      this.spawnEnemy();
      this.waveSpawned++;
    }

    // Runner/wolf pack bursts, independent of the normal spawn cadence.
    if (this.wave >= CFG.spawn.runnerPackStartWave && this.waveSpawned < waveSize) {
      const cdMin = this.biome === 'forest' ? CFG.forest.wolfPackCooldownMin
                  : this.biome === 'infected' ? CFG.infected.runnerPackCooldownMin
                  : this.biome === 'river' ? CFG.river.dragonflyPackCooldownMin
                  : this.biome === 'castle' ? CFG.castle.impPackCooldownMin
                  : CFG.spawn.runnerPackCooldownMin;
      const cdMax = this.biome === 'forest' ? CFG.forest.wolfPackCooldownMax
                  : this.biome === 'infected' ? CFG.infected.runnerPackCooldownMax
                  : this.biome === 'river' ? CFG.river.dragonflyPackCooldownMax
                  : this.biome === 'castle' ? CFG.castle.impPackCooldownMax
                  : CFG.spawn.runnerPackCooldownMax;
      if (this.nextRunnerPack === 0) {
        this.nextRunnerPack = time + Phaser.Math.Between(cdMin, cdMax);
      } else if (time >= this.nextRunnerPack) {
        this.spawnRunnerPack();
        this.nextRunnerPack = time + Phaser.Math.Between(cdMin, cdMax);
      }
    }
  }

  spawnRunnerPack() {
    const spawnR = this.spawnDist * CFG.tile;
    const waveSize = this.levelWaveSize;
    const side = Phaser.Math.Between(0, 3);
    const px = this.player.x, py = this.player.y;
    let cx = 0, cy = 0;
    if (side === 0) { cx = px + Phaser.Math.Between(-spawnR, spawnR); cy = py - spawnR; }
    if (side === 1) { cx = px + Phaser.Math.Between(-spawnR, spawnR); cy = py + spawnR; }
    if (side === 2) { cx = px - spawnR; cy = py + Phaser.Math.Between(-spawnR, spawnR); }
    if (side === 3) { cx = px + spawnR; cy = py + Phaser.Math.Between(-spawnR, spawnR); }
    const isForest = this.biome === 'forest';
    const isInfected = this.biome === 'infected';
    const isRiver = this.biome === 'river';
    const isCastle = this.biome === 'castle';
    const base = isForest ? CFG.forest.wolfPackSize
               : isInfected ? CFG.infected.runnerPackSize
               : isRiver ? CFG.river.dragonflyPackSize
               : isCastle ? CFG.castle.impPackSize
               : CFG.spawn.runnerPackSize;
    const n = isForest ? base + Phaser.Math.Between(0, 5) : base;
    // Castle alternates between bat packs, rat packs, and imp packs
    let packKind: EnemyKind;
    if (isCastle) {
      const r = Math.random();
      packKind = r < 0.33 ? 'castle_bat' : r < 0.66 ? 'castle_rat' : 'shadow_imp';
    } else {
      packKind = isForest ? 'wolf' : isInfected ? 'infected_runner' : isRiver ? 'dragonfly' : 'rat';
    }
    // Stagger spawns with small delays to create a snake-line formation
    const delay = 150; // ms between each mob in the pack
    const toSpawn = Math.min(n, waveSize - this.waveSpawned);
    for (let i = 0; i < toSpawn; i++) {
      this.waveSpawned++;
      if (i === 0) {
        // First mob spawns immediately
        const e = new Enemy(this, cx, cy, packKind);
        this.applyEnemyDifficulty(e);
        this.enemies.add(e);
      } else {
        // Subsequent mobs spawn with increasing delay, slightly offset along the spawn edge
        this.time.delayedCall(delay * i, () => {
          if (this.gameOver) return;
          const e = new Enemy(this, cx + Phaser.Math.Between(-8, 8), cy + Phaser.Math.Between(-8, 8), packKind);
          this.applyEnemyDifficulty(e);
          this.enemies.add(e);
        });
      }
    }
  }

  spawnEnemy() {
    const spawnR = this.spawnDist * CFG.tile;
    const px = this.player.x, py = this.player.y;
    const vx = (this.player.body as Phaser.Physics.Arcade.Body).velocity.x;
    const vy = (this.player.body as Phaser.Physics.Arcade.Body).velocity.y;

    // Spawn on a random angle around the player, biased toward movement direction
    // so enemies appear ahead when running
    let angle = Math.random() * Math.PI * 2;
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > 20) {
      const moveAngle = Math.atan2(vy, vx);
      // 60% chance to spawn in the forward hemisphere
      if (Math.random() < 0.6) {
        angle = moveAngle + (Math.random() - 0.5) * Math.PI; // ±90° of move dir
      }
    }

    const x = px + Math.cos(angle) * spawnR;
    const y = py + Math.sin(angle) * spawnR;
    let kind: EnemyKind;
    if (this.biome === 'forest') {
      kind = Math.random() < this.heavyChance ? 'bear' : 'spider';
    } else if (this.biome === 'infected') {
      const r = Math.random();
      if (r < CFG.infected.toadChance) kind = 'toad';
      else if (r < CFG.infected.toadChance + this.heavyChance) kind = 'infected_heavy';
      else kind = 'infected_basic';
    } else if (this.biome === 'river') {
      const r = Math.random();
      if (r < this.heavyChance) kind = 'bat';
      else if (r < 0.4) kind = 'mosquito';
      else kind = 'crow';
    } else if (this.biome === 'castle') {
      const r = Math.random();
      if (r < this.heavyChance) kind = 'golem';
      else if (r < this.heavyChance + 0.15) kind = 'warlock';
      else if (r < this.heavyChance + 0.35) kind = 'shadow_imp';
      else kind = 'skeleton';
    } else {
      kind = Math.random() < this.heavyChance ? 'deer' : 'snake';
    }

    // Forest spiders spawn in small clusters
    if (this.biome === 'forest' && kind === 'spider') {
      const n = Math.min(Phaser.Math.Between(CFG.forest.spiderClusterMin, CFG.forest.spiderClusterMax), this.levelClusterMax);
      const spread = CFG.forest.spiderClusterSpread;
      const waveSize = this.levelWaveSize;
      const toSpawn = Math.min(n, waveSize - this.waveSpawned);
      for (let i = 0; i < toSpawn; i++) {
        const sx = x + Phaser.Math.Between(-spread, spread);
        const sy = y + Phaser.Math.Between(-spread, spread);
        const se = new Enemy(this, sx, sy, 'spider');
        this.applyEnemyDifficulty(se);
        this.enemies.add(se);
        if (i > 0) this.waveSpawned++;
      }
      return;
    }

    // Infected enemies spawn in tight groups (toads spawn solo)
    if (this.biome === 'infected' && kind !== 'toad') {
      const n = Math.min(Phaser.Math.Between(CFG.infected.clusterMin, CFG.infected.clusterMax), this.levelClusterMax);
      const spread = CFG.infected.clusterSpread;
      const waveSize = this.levelWaveSize;
      const toSpawn = Math.min(n, waveSize - this.waveSpawned);
      for (let i = 0; i < toSpawn; i++) {
        const sx = x + Phaser.Math.Between(-spread, spread);
        const sy = y + Phaser.Math.Between(-spread, spread);
        const se = new Enemy(this, sx, sy, kind);
        this.applyEnemyDifficulty(se);
        this.enemies.add(se);
        if (i > 0) this.waveSpawned++;
      }
      return;
    }

    // Castle enemies spawn in small clusters (warlocks spawn solo)
    if (this.biome === 'castle' && kind !== 'warlock') {
      const n = Math.min(Phaser.Math.Between(CFG.castle.clusterMin, CFG.castle.clusterMax), this.levelClusterMax);
      const spread = CFG.castle.clusterSpread;
      const waveSize = this.levelWaveSize;
      const toSpawn = Math.min(n, waveSize - this.waveSpawned);
      for (let i = 0; i < toSpawn; i++) {
        const sx = x + Phaser.Math.Between(-spread, spread);
        const sy = y + Phaser.Math.Between(-spread, spread);
        const se = new Enemy(this, sx, sy, kind);
        this.applyEnemyDifficulty(se);
        this.enemies.add(se);
        if (i > 0) this.waveSpawned++;
      }
      return;
    }

    // River enemies spawn in loose groups
    if (this.biome === 'river') {
      const n = Math.min(Phaser.Math.Between(CFG.river.clusterMin, CFG.river.clusterMax), this.levelClusterMax);
      const spread = CFG.river.clusterSpread;
      const waveSize = this.levelWaveSize;
      const toSpawn = Math.min(n, waveSize - this.waveSpawned);
      for (let i = 0; i < toSpawn; i++) {
        const sx = x + Phaser.Math.Between(-spread, spread);
        const sy = y + Phaser.Math.Between(-spread, spread);
        const se = new Enemy(this, sx, sy, kind);
        this.applyEnemyDifficulty(se);
        this.enemies.add(se);
        if (i > 0) this.waveSpawned++;
      }
      return;
    }

    const e = new Enemy(this, x, y, kind);
    this.applyEnemyDifficulty(e);
    this.enemies.add(e);
  }

  applyEnemyDifficulty(e: Enemy) {
    if (this.enemyHpMult !== 1) {
      e.hp = Math.ceil(e.hp * this.enemyHpMult);
      e.maxHp = e.hp;
    }
    if (this.enemySpeedMult !== 1) {
      e.speed = Math.ceil(e.speed * this.enemySpeedMult);
    }
  }

  // ---------- END ----------
  winDelayUntil = 0;
  winCollectedAt = 0;

  checkEndConditions() {
    // Level is won by defeating the boss, not by a kill count.
    if (this.bossSpawned && (!this.boss || this.boss.dying || !this.boss.active)) {
      // Castle mid-boss (queen) death: don't win — trigger next phase
      if (this.biome === 'castle' && this.castlePhase < 3) {
        if (!this.midBossDefeated && this.castlePhase === 1) {
          this.midBossDefeated = true;
          this.game.events.emit('boss-died');
          // Kill remaining enemies
          for (const e of this.enemies.getChildren() as Enemy[]) {
            if (!e.dying && e.active) e.hurt(9999);
          }
        }
        // Don't enter win flow until the dragon (phase 3) is dead
        return;
      }
      // Start a collection window so the player can grab coins
      if (this.winDelayUntil === 0) {
        // Hide the boss HP bar the instant the final boss dies — otherwise
        // it sits at 0% behind the loot/victory countdown.
        this.game.events.emit('boss-died');
        this.winDelayUntil = this.vTime + 12000;
        this.countdownColor = '#7cf29a';
        // Kill all remaining enemies when the boss dies — staggered so dozens
        // of die animations don't all start on the same frame and spike GPU
        // / animation work.
        const survivors = (this.enemies.getChildren() as Enemy[])
          .filter((e) => e && e.active && !e.dying);
        for (let i = 0; i < survivors.length; i++) {
          const e = survivors[i];
          this.time.delayedCall(i * 25, () => {
            if (e.active && !e.dying) e.hurt(9999);
          });
        }
      }
      const remaining = Math.max(0, Math.ceil((this.winDelayUntil - this.vTime) / 1000));
      this.syncCountdown(`VICTORY! Collect your loot! ${remaining}s`, '#7cf29a');
      if (this.vTime >= this.winDelayUntil) {
        this.win();
      } else if (this.coins.countActive() === 0 && this.winCollectedAt === 0) {
        // All loot collected — start a short pause before the victory screen
        this.winCollectedAt = this.vTime;
      } else if (this.winCollectedAt > 0 && this.vTime >= this.winCollectedAt + 2000) {
        this.win();
      }
    }
  }

  dying = false;

  lose() {
    if (this.gameOver || this.dying) return;
    this.dying = true;

    // Stop the player and freeze the world
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.physics.pause();

    // Kill any existing tweens on the player (e.g. hurt flash) to avoid conflicts
    this.tweens.killTweensOf(this.player);

    this.cameras.main.shake(300, 0.012);

    const deathX = this.player.x;
    const deathY = this.player.y;

    // Instantly hide the player sprite and bow
    this.player.setVisible(false);
    this.player.bow.setVisible(false);

    // White flash at death point
    const flash = this.add.circle(deathX, deathY, 30, 0xffffff, 0.95).setDepth(19);
    this.tweens.add({
      targets: flash,
      scale: 2.5,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.Out',
      onComplete: () => flash.destroy()
    });

    // Pixel explosion — chunky coloured squares flying outward
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const d = Phaser.Math.Between(28, 60);
      const col = [0xff4040, 0xff8060, 0x4a90e2, 0xf2c79a, 0xffffff, 0xffcc40][i % 6];
      const sz = Phaser.Math.Between(3, 6);
      const p = this.add.rectangle(deathX, deathY, sz, sz, col, 1).setDepth(20);
      this.tweens.add({
        targets: p,
        x: deathX + Math.cos(a) * d,
        y: deathY + Math.sin(a) * d - Phaser.Math.Between(5, 20),
        alpha: { from: 1, to: 0 },
        angle: Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(500, 800),
        ease: 'Cubic.Out',
        onComplete: () => p.destroy()
      });
    }

    // Camera zoom on death spot
    this.cameras.main.zoomTo(1.3 * this.sf, 800);

    // Gravestone pops up from the ground after particles settle
    setTimeout(() => {
      if (!this.scene.isActive()) return;

      // Simple cross (lowercase 't' shape)
      const grave = this.add.container(deathX, deathY + 4).setDepth(10);
      const vertical = this.add.rectangle(0, 0, 4, 18, 0x6a6a78)
        .setStrokeStyle(1, 0x3e4654);
      const horizontal = this.add.rectangle(0, -5, 12, 4, 0x6a6a78)
        .setStrokeStyle(1, 0x3e4654);
      // Small dirt mound
      const dirt = this.add.ellipse(0, 10, 18, 6, 0x3e2310);
      grave.add([dirt, vertical, horizontal]);

      // Pop up from below
      grave.setScale(0.3);
      grave.y += 14;
      this.tweens.add({
        targets: grave,
        y: deathY + 4,
        scale: 1,
        duration: 400,
        ease: 'Back.Out'
      });
    }, 900);

    // Fade BGM during the death animation so the defeat screen lands in silence
    SFX.fadeOutBgm(2500);

    // Show defeat screen after the full animation (real-time)
    setTimeout(() => {
      if (!this.scene.isActive()) return;
      this.gameOver = true;
      this.physics.pause();
      SFX.play('gameOver');
      const payload = {
        win: false, name: 'Ranger',
        kills: this.player.kills, money: this.player.money
      };
      // Persist so a UIScene restart (e.g. mid-rotation) can recover the
      // panel even if the live event fired while UI had no listener.
      this.game.registry.set('gameEndState', payload);
      this.game.events.emit('game-end', payload);
    }, 3500);
  }
  win() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.physics.pause();
    SFX.fadeOutBgm(1500);
    SFX.play('victory');
    const payload = { win: true, name: 'Ranger', kills: this.player.kills, money: this.player.money };
    this.game.registry.set('gameEndState', payload);
    this.game.events.emit('game-end', payload);
  }

  shutdown() {
    SFX.stopBgm();
    if (this._onUiBuild) this.game.events.off('ui-build', this._onUiBuild);
    if (this._onUiSell) this.game.events.off('ui-sell', this._onUiSell);
    if (this._onUiSpeed) this.game.events.off('ui-speed', this._onUiSpeed);
    this._onUiBuild = undefined;
    this._onUiSell = undefined;
    this._onUiSpeed = undefined;
  }
}
