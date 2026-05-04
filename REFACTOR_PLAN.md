# Ranger Danger Refactor Plan

A working document, not a manifesto. Each phase is independently shippable. Do them in order, validate after every step, don't skip the validation gates.

## Goals

Cut down on bugs introduced by changes. Phases are ordered by **bug-prevention payoff**, not file size.

Hard rules across all phases:

- One phase per branch. Don't bundle.
- Within a phase, **don't change behavior in the same commit as a structural move.** Move first (mechanical), then change (semantic). Two diffs that can each be reviewed in isolation.
- Validation gate after every step: `npx tsc --noEmit` must pass, the dev build must boot, and the level you most recently changed must play through one wave end-to-end. If you can't validate, don't proceed.
- No reformatting / renaming for "consistency" mixed into a structural commit.
- No new abstractions for hypothetical future use. Extract on the second use, not the first.

---

## Phase 1 — GameScene split into `systems/` modules

**Goal:** Get `GameScene.ts` from 5,128 lines / 482 methods down to ~1,000 lines that only own scene lifecycle (`init`, `preload`, `create`, `update`, `shutdown`) and the canonical mutable state. Everything else moves to focused systems.

**Strategy:** Each system is a class that takes `(scene: GameScene)` in its constructor and exposes a small surface (`update(time, delta)`, plus a few intent methods). Systems read/write GameScene state directly during the move — we are **not** decoupling, we are **organizing**. Decoupling comes later in Phase 3.

### New files

```
src/systems/
  SpawnSystem.ts        spawnEnemy, spawnRunnerPack, spawnBoss, spawnCastleBoss,
                        spawnInfiniteBoss, applyEnemyDifficulty, updateSpawning,
                        liveEnemyCount, recomputeSpawnDist
  BuildSystem.ts        toggleBuild, setBuild, canPlaceTower, handleClick (build path),
                        redrawGridOverlay
  SellSystem.ts         sellAt, startSellTimer, cancelSellTimer, executeSell,
                        updateSellTimers, destroyTower, destroyWall, updateWallNeighbors
  TowerPanelSystem.ts   selectTower, deselectTower, drawSelectionRing, pointInPanel,
                        buildTowerPanel, doUpgradeSelected, doSellSelected
  CombatSystem.ts       updateTowers, findBestCannonTarget, findNearestEnemy,
                        findMostThreateningEnemy, spawnProjectile, updateProjectiles,
                        projectileHitsEnemy, projectileHitsBoss, applyDamageToEnemy,
                        cannonExplode, spawnCrater, dropBossLoot
  EnemySystem.ts        updateEnemies, enemyHitsPlayer/Wall/Tower,
                        spawnMosquitoDart, enemyDartHitsPlayer, updateEnemyDarts,
                        spawnToadGlob, landToadGlob, toadGlobHitsPlayer, updateToadGlobs
  BossSystem.ts         updateBoss, _updateOneBoss, queenAuraStrike, bossSlamImpact,
                        bossChargeImpact, bossThrowBoulder, bossBirthSpawn,
                        updateBoulders, boulderImpact, spawnChargeSmoke,
                        spawnGasCloud, updateGasClouds, spawnBirdPoop, updateBirdPoops,
                        spawnWarlockBolt, spawnQueenOrb, spawnDragonFireball,
                        castleBoltHitsPlayer, dragonFireballHitsPlayer,
                        dragonFireballExplode, updateCastleProjectiles
  CoinSystem.ts         updateCoins, fx-pop pool (_coinFxPool, playCoinFxPop)
  ChunkSystem.ts        generateChunksAround, processChunkQueue,
                        placeRiverInChunk, placeTreesInChunk, placeSpikesInChunk,
                        destroyTreeTile, updateRiverSquiggles
  PathingSystem.ts      hasLineOfSight, lineBlocked, countReachableDirections,
                        syncWallTile, rebuildGapBlockers, isAdjacentToObstacle,
                        worldToTile
  DepthSortSystem.ts    applyTowerDepth, updateDepthSort
  HudSystem.ts          hudState, pushHud, syncCountdown, floatText,
                        the wave-break-tick dedupe fields
  EndSystem.ts          checkEndConditions, win, lose (the dying = false field
                        moves with it), startNextInfiniteCycle
```

### Step-by-step

For each system in this order — these are ordered by independence, lowest blast radius first:

1. **CoinSystem** (~50 lines moving) — simplest, recently touched, gold-standard reference for the pattern.
2. **PathingSystem** — pure helpers, no state of its own beyond the cache.
3. **DepthSortSystem** — pure helpers.
4. **ChunkSystem** — large but self-contained.
5. **HudSystem** — touches many places but all reads.
6. **TowerPanelSystem** — recently touched (mobile scaling). Self-contained.
7. **BuildSystem** — touches input, grid, ghost.
8. **SellSystem** — pairs with BuildSystem.
9. **CombatSystem** — large. Cleanly separable.
10. **EnemySystem** + **BossSystem** — do these together, they share projectile patterns.
11. **SpawnSystem** — depends on EnemySystem/BossSystem existing.
12. **EndSystem** — depends on most of the above.

For each system:

- a. Create `src/systems/XxxSystem.ts` with a class that has a constructor `(scene: GameScene)` storing `this.scene`.
- b. Move method bodies in. Replace `this.foo` with `this.scene.foo` for any state that hasn't moved yet.
- c. In `GameScene`, instantiate the system in `create()` and add a forwarding stub: `updateCoins(delta) { this.coins.update(delta); }`. Forwarding stubs let the rest of GameScene keep calling the old names while you migrate one-system-per-commit.
- d. Run `npx tsc --noEmit` → boot → smoke-test the affected feature.
- e. **Separate commit:** delete the forwarding stub once nothing else in GameScene calls it. Update any external callers.

### Validation gates

After **every** system migration:

1. `npx tsc --noEmit`
2. `npm run dev` boots without errors
3. Play the level most likely to exercise that system:
   - Coin → meadow, kill a wave, watch coin burst
   - Build/Sell → meadow, place + sell a tower and a wall
   - Pathing → meadow, place wall that should not cut off
   - Combat → forest, watch arrow + cannon towers fire
   - Enemy/Boss → forest then river — verify ranged enemies + boss attacks
   - Spawn → infinite mode for one cycle
   - End → win + lose paths

### Risk: low to medium

The mechanical move is safe. The risk is in step (e) when stubs are deleted — make sure no callers remain. `grep -n "this\.<methodName>"` in GameScene before each deletion.

### Out of scope for Phase 1

- Don't change any signatures.
- Don't pull state out of GameScene yet — systems read/write `this.scene.<field>` for now.
- Don't introduce events between systems (use direct calls). Events come in Phase 2/3.

---

## Phase 2 — Typed registry + event-bus wrappers

**Goal:** Replace `game.registry.set('foo', x)` and `game.events.emit('bar', payload)` string-key calls with typed APIs. Eliminates a class of typo bugs and makes the cross-scene contract reviewable.

### Catalog of current keys (from `grep`)

**Registry keys (16):**

```
viewport:    sf, cameraZoom, uiScale, isMobile
ui boot:     uiBootingForResize, uiSpeedIdx
joystick:    joystickX, joystickY, joystickBounds
boss:        bossActive, bossBiome, bossHp, bossMaxHp
tutorial:    tutorialActive, tutorialStep
end:         gameEndState
```

**Events (~22):**

```
HUD/render:    hud, viewport-changed, build-error, build-mode
flow:          game-ready, game-end, boss-spawn, boss-hp, boss-died
ui commands:   ui-build, ui-sell, ui-speed
tutorial:      tutorial-level-clicked, tutorial-diff-clicked, tutorial-kill,
               tutorial-tower-placed, tutorial-wall-placed, tutorial-coin-collected,
               tutorial-tower-selected, tutorial-tower-upgraded,
               tutorial-tower-deselected, tutorial-finished
```

### New files

```
src/core/registry.ts   Typed registry wrapper
src/core/events.ts     Typed event bus wrapper
```

### Shape

```ts
// src/core/registry.ts
export interface RegistrySchema {
  sf: number;
  cameraZoom: number;
  uiScale: number;
  isMobile: boolean;
  uiBootingForResize: boolean;
  uiSpeedIdx: number;
  joystickX: number;
  joystickY: number;
  joystickBounds: { x: number; y: number; w: number; h: number } | undefined;
  bossActive: boolean;
  bossBiome: Biome | undefined;
  bossHp: number;
  bossMaxHp: number;
  tutorialActive: boolean;
  tutorialStep: TutorialStep | null;
  gameEndState: GameEndState | undefined;
}

export class TypedRegistry {
  constructor(private game: Phaser.Game) {}
  get<K extends keyof RegistrySchema>(key: K): RegistrySchema[K] {
    return this.game.registry.get(key as string);
  }
  set<K extends keyof RegistrySchema>(key: K, value: RegistrySchema[K]): void {
    this.game.registry.set(key as string, value);
  }
}

// src/core/events.ts
export interface EventMap {
  'hud': HudState;
  'viewport-changed': ViewportInfo;
  'build-error': string;
  'build-mode': { active: boolean; kind: BuildKind; towerKind?: TowerKind };
  'game-ready': void;
  'game-end': GameEndState;
  'boss-spawn': BossSpawnPayload;
  'boss-hp': BossHpPayload;
  'boss-died': void;
  // ... etc
}

export class TypedEvents {
  constructor(private bus: Phaser.Events.EventEmitter) {}
  emit<K extends keyof EventMap>(name: K, payload: EventMap[K]): void { ... }
  on<K extends keyof EventMap>(name: K, handler: (p: EventMap[K]) => void, ctx?: any): void { ... }
  off<K extends keyof EventMap>(name: K, handler?: (p: EventMap[K]) => void, ctx?: any): void { ... }
}
```

### Step-by-step

1. Create `src/core/registry.ts` with `RegistrySchema` and `TypedRegistry`. Export a singleton accessor: `getRegistry(game) => TypedRegistry`. Don't migrate callers yet.
2. Create `src/core/events.ts` with `EventMap` and `TypedEvents`. Same: export accessor, no migration.
3. Migrate **one feature area at a time** — easier to spot regressions:
   - viewport keys (`sf`, `cameraZoom`, `uiScale`, `isMobile`) — used by every scene.
   - boss keys (`bossActive`, `bossBiome`, `bossHp`, `bossMaxHp`) — used by UIScene boss bar.
   - tutorial keys + tutorial events — pairs naturally with Phase 4.
   - joystick keys.
   - ui boot / speed keys.
   - end-state key.
4. For each area:
   - Replace `game.registry.get('sf')` → `getRegistry(game).get('sf')` site-by-site.
   - When all sites are migrated, **delete the string from any `// hardcoded` comments** so future you doesn't reintroduce the string version.
5. Same for events. Do `hud`, then `build-*`, then `boss-*`, then `tutorial-*`, then everything else.

### Validation gates

After each feature-area migration:

1. `npx tsc --noEmit` — TypeScript will catch wrong types/payloads, that's the whole point.
2. Boot, smoke-test the area you migrated.

### Risk: low

Mechanical and TypeScript-checked. The only failure mode is missing a call site (still using the string version) — `grep` for the old string after migration to confirm zero hits.

### Out of scope

- Don't refactor what data goes into the registry/events — only how it's accessed.
- Don't try to remove the registry as a cross-scene channel; that's a bigger architectural change.

---

## Phase 3 — State machines for wave / boss / build

**Goal:** Eliminate the implicit-state bug class. Right now ~156 references in `GameScene.ts` touch interlocking flags (`waveStartAt`, `wave`, `waveSpawned`, `waveKills`, `waveBreakUntil`, `bossSpawned`, `bossCountdownUntil`, `castlePhase`, `midBoss`, `midBossDefeated`, `buildKind`, `buildPaused`, `gameOver`, `dying`, `winDelayUntil`, `winCollectedAt`). One bad combination = stuck UI / double-spawn / softlock.

### New files

```
src/state/WaveState.ts    Replaces: waveStartAt, wave, waveSpawned, waveKills,
                          waveBreakUntil, bossCountdownUntil
src/state/BossState.ts    Replaces: boss, bossSpawned, midBoss, midBossDefeated,
                          castlePhase, infiniteBossesCleared, infiniteResetUntil
src/state/BuildState.ts   Replaces: buildKind, buildTowerKind, buildPaused,
                          _lastBuildErr
src/state/EndState.ts     Replaces: gameOver, dying, winDelayUntil, winCollectedAt
```

### Shape (WaveState as exemplar)

```ts
export type WavePhase =
  | { kind: 'pre-game' }
  | { kind: 'build-break'; until: number; nextWave: number }
  | { kind: 'spawning'; wave: number; spawned: number; killed: number; size: number }
  | { kind: 'stragglers'; wave: number; remaining: number }
  | { kind: 'boss-prep'; until: number }
  | { kind: 'boss-active' }
  | { kind: 'won' };

export class WaveState {
  private phase: WavePhase = { kind: 'pre-game' };
  // every transition is an explicit method:
  enterBuildBreak(now: number, breakMs: number, nextWave: number) { ... }
  enterSpawning(wave: number, size: number) { ... }
  recordSpawn() { ... }
  recordKill() { ... }
  enterStragglers() { ... }
  enterBossPrep(now: number, prepMs: number) { ... }
  enterBossActive() { ... }
  enterWon() { ... }
  current(): Readonly<WavePhase> { return this.phase; }
}
```

The point: **every state change is one named method call, in one file.** No more `this.bossSpawned = true; this.waveBreakUntil = 0;` scattered across update loops.

### Step-by-step

1. Build **WaveState first** — it's the most central and most bug-prone (every recent BUILD PHASE / STRAGGLERS / WAVE N IN Ns countdown bug touches it). Keep all the existing flag fields on GameScene during the migration. Add `this.waveState = new WaveState()`. In every place that mutates a wave flag, **also** call the corresponding WaveState method. Run for one commit cycle so both representations are in sync.
2. Then flip readers (`updateSpawning`, `hudState`, UI countdowns) to read from `WaveState.current()`.
3. Once all readers are migrated, delete the legacy fields. **Separate commit.**
4. Repeat for **BuildState** (smallest, do it second to gain confidence).
5. Then **BossState**.
6. Then **EndState**.

### Validation gates

After WaveState migration:
- Play meadow through win. Watch for: BUILD PHASE label, wave-break countdown, STRAGGLERS message, ANCIENT RAM SPAWNING IN N, wave bar fills correctly, victory triggers.
- Play castle: mid-boss + final-boss transitions.
- Play infinite: boss cycles continue.

After BuildState:
- Place tower, place wall, sell tower, sell wall, exit build with ESC and right-click and tap.
- Tutorial flow still advances on `game_press_1` / `game_press_4`.

After BossState:
- Each biome's boss spawn sequence.
- Castle's two-boss phase transition.

After EndState:
- Win path, lose path, return-to-map, then start a new run (ensure all flags reset).

### Risk: medium

Highest-risk phase. Mitigation: dual-representation step (1) keeps existing logic working while the new state machine is wired up — if the new state ever disagrees with the old flag, you find out before committing.

### Out of scope

- Don't introduce a global "game state" mega-machine. Four small machines, each with a clear scope.
- Don't make these emit events instead of being read — direct reads are fine, the constraint we're enforcing is that **transitions** go through methods.

---

## Phase 4 — TutorialScene step registry

**Goal:** Make per-step edits a one-file change. The big switch in `showStep()` plus the per-step counters on the class is exactly where we keep making per-platform fixes (right-float prompts, skip-button positioning, "Click → Tap"). Each step should own its own concerns.

### New files

```
src/tutorial/
  Step.ts                 Step interface
  steps/lsClickMeadow.ts
  steps/lsClickEasy.ts
  steps/lsClickStart.ts
  steps/gameMove.ts
  steps/gameHud.ts
  steps/gameStandStill.ts
  steps/gameKill.ts
  steps/gamePress1.ts
  steps/gamePlaceTower.ts
  steps/gameWatchTower.ts
  steps/gamePress4.ts
  steps/gamePlaceWalls.ts
  steps/gameExitBuild.ts
  steps/gameLootCoins.ts
  steps/gameCollect60.ts
  steps/gameClickTower.ts
  steps/gameUpgradeTower.ts
  steps/gameDeselectTower.ts
  steps/gameDone.ts
  registry.ts             Maps step name → Step module
```

### Shape

```ts
// src/tutorial/Step.ts
export interface StepContext {
  scene: TutorialScene;
  W: number;
  H: number;
  isMobile: boolean;
  p: (v: number) => number;
  fs: (v: number) => string;
  lsP: (v: number) => number;
  // ... helpers like drawDimWithCutout, drawArrow, showPrompt, pauseGame
}

export interface Step {
  name: TutorialStepName;
  enter?(ctx: StepContext): void;       // one-shot setup (pauseGame, etc.)
  render(ctx: StepContext): void;        // showPrompt + overlay drawing
  // event handlers — only the ones a step cares about
  onKill?(ctx: StepContext): TutorialStepName | null;
  onTowerPlaced?(ctx: StepContext): TutorialStepName | null;
  onCoinCollected?(ctx: StepContext): TutorialStepName | null;
  // ... per event type
  update?(ctx: StepContext, time: number, delta: number): TutorialStepName | null;
  exit?(ctx: StepContext): void;
}
```

Returning a step name from a handler triggers an `advanceTo(name)`. Returning `null` means "stay on this step." Step-local counters (e.g. `wallsPlaced`, `tutorialKills`) live as fields on the Step object — no more per-counter fields on TutorialScene.

### Step-by-step

1. Define `Step` and `StepContext`. Don't migrate yet.
2. Move helpers (`drawDimWithCutout`, `drawArrow`, `showPrompt`, `showClickPrompt`, `pauseGame`, `resumeGame`) onto `StepContext`. They stay in TutorialScene; ctx is just a view.
3. Migrate **`gameDone`** first — simplest, recently touched, validates the pattern.
4. Migrate game_* steps in order they fire: `game_move`, `game_hud`, `game_stand_still`, `game_kill`, `game_press_1`, `game_place_tower`, `game_watch_tower`, `game_press_4`, `game_place_walls`, `game_exit_build`, `game_loot_coins`, `game_collect_60`, `game_click_tower`, `game_upgrade_tower`, `game_deselect_tower`. Validate after each.
5. Migrate `ls_*` steps last (they touch LevelSelect coords, more risky).
6. Once every step is migrated, replace the giant `switch` in `showStep()` with `registry.get(this.step).render(ctx)`. Replace each `onXxx` event handler with a dispatch to the active step's handler. Delete the legacy switch/handlers.

### Validation gates

After each step migration: run a tutorial from start to that step + one step beyond it. (Yes, it's tedious. The bug surface here is small per step — that's the point.)

After full migration:
- Full tutorial run on desktop.
- Full tutorial run on mobile portrait.
- Full tutorial run on mobile landscape.
- Skip-tutorial mid-flow.

### Risk: medium

The tutorial is hard to test (long flow) but the mechanical risk per step is small.

### Out of scope

- Don't try to make steps reusable across tutorials — single tutorial.
- Don't change tutorial *content* during the migration. Wording fixes go in a follow-up.

---

## Phase 5 — `generateArt.ts` split

**Goal:** Cosmetic / search-noise reduction. Bug rate in this file is near zero, so this is last.

### New files

```
src/assets/art/
  canvas.ts        Canvas helpers: pxIdx, pxEq, pxCopy, scale2x, makeCanvas,
                   mirrorX, rect, disc, ring, line, ellipse, flashOverlay.
                   Plus the const P palette and S const.
  player.ts        drawPlayer, drawBow.
  enemies.ts       drawEnemyBasic, drawEnemyHeavy, drawEnemySnake, drawEnemyRat,
                   drawEnemyDeer, drawEnemyInfectedBasic, drawEnemyInfectedHeavy,
                   drawEnemyToad, drawToadGlob, drawEnemyWolf, drawEnemySpider,
                   drawEnemyCrow, drawEnemyBat, drawEnemyDragonfly, drawEnemyMosquito,
                   drawMosquitoDart, drawBirdPoop.
  bear.ts          drawBearDir, extractBearFrames, PB.
  bosses.ts        drawFogPhantomBody, drawFogPhantomDie, drawFogPhantom,
                   queen + dragon + ancient ram + boss boulder, etc.
  towers.ts        drawTowerBase + tower top frames + cannon variants.
  projectiles.ts   arrow / cannon ball / mage bolt / coin tiers.
  fx.ts            fx_pop, fx_hit, fx_death, fx_boulder, crater frames.
  terrain.ts       trees, spikes, river, infected biome bits.
  ui.ts            wall, hotbar icons.
```

`src/assets/generateArt.ts` becomes a thin orchestrator that imports from the above and runs `generateAllArt(scene)` + `registerAnimations(scene)`.

### Step-by-step

1. Extract `canvas.ts` first (the helpers). Update generateArt.ts to import them. Validate.
2. Extract `player.ts`. Validate.
3. One module per commit, in any order. Mechanical and low-risk.

### Validation gates

After each extraction:
- Boot the game, watch for "missing texture" warnings in the console.
- Run one level — eyeball that everything still renders.

### Risk: low

The only failure mode is forgetting to update an import. TypeScript catches almost everything.

### Out of scope

- Don't redesign the art-generation API.
- Don't rename `drawXxx` functions for consistency mid-extraction.

---

## Decision log

When you make any judgement call mid-refactor (e.g. "I left this method on GameScene because three systems use it"), record it here. Future-you will need it.

```
[date] [phase] decision — reason
```

---

## Estimates

| Phase | Effort | Risk | Bug-prevention payoff |
|---|---|---|---|
| 1. Systems split | 2-3 days | low–med | high |
| 2. Typed registry/events | 1 day | low | medium |
| 3. State machines | 2-3 days | medium | very high |
| 4. Tutorial step registry | 1.5-2 days | medium | high (for future tutorial work) |
| 5. generateArt split | 1 day | low | low (cosmetic) |

Phase 3 is the highest-leverage. Phase 1 unblocks Phase 3 (state machines are easier to write when the touch points are inside small files). Don't skip ahead.
