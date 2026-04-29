# Mobile Support Plan

Reference doc for making Ranger Danger mobile-friendly. Each phase is independently shippable.

## Current scaling mechanism

- **Logical world/camera view**: fixed 960×640 (3:2) — set by `CFG.width/height`, rendered via `Phaser.Scale.FIT`.
- **`sf` scale factor** (`LevelSelectScene.ts:30-46`): computed as `min(parentW*DPR/960, parentH*DPR/640)`. Then `setGameSize(960*sf, 640*sf)` + `camera.setZoom(sf)` is applied. Net effect: the canvas renders at device-native pixels for crispness, but the camera always shows exactly 960×640 *world* units.
- **World coords are sf-independent**: `CFG.player.speed`, ranges, hitboxes, tile size (`CFG.tile = 32`), projectile physics — all in world units and untouched by `sf`.
- **UI scales *with* sf**: `UIScene.ts:36-40` (`p()`, `fs()` helpers) multiplies every text size, padding, hit region, and bar width by `sf`. So UI text grows proportionally with the device's native pixel budget, not with logical CSS pixels.

## The mobile problem

On an iPhone portrait (393×852 logical / DPR 3):
- `sf = min(1179/960, 2556/640) = 1.23`
- Canvas renders at 1180×787 physical, `FIT`ted into 393px wide → **262px tall game window with ~590px of black bars**.

Landscape-only helps but still wastes space, and the UI-text-scales-with-DPR rule produces *tiny* UI on mobile because `sf` is small when the aspect doesn't match.

## What won't break

- **Gameplay math** — player speed, hitboxes, AI, projectile physics, tower ranges, tile grid all in world units. Changing how much world the camera shows does *not* change any of these.
- **Sprite assets** — drawn once at 32×32 logical via `scale2x`. Resolution-independent.

## What will break (things to watch)

- **`CFG.spawnDist = 18` tiles** assumes ~30×20 tile view. If mobile portrait shows ~13×22 tiles, enemies spawn inside the vertical view unless spawnDist becomes viewport-aware.
- **Chunk generation radius** (`chunkSize = 16`, generated in a ring around the player) — tuned for the fixed view. Mostly OK because it keys on player tile, but edge-of-view pop-in gets more visible with a larger view.
- **UIScene** (`create()` runs once) reads `this.scale.width/height` — if we switch to `RESIZE` mode, layout needs re-running on orientation/window change.
- **Build ghost preview** and **tower range circles** rely on `pointer.worldX/worldY` which Phaser handles correctly under any zoom, so those are fine.

## Direction (decided)

**Show a different amount of world per aspect ratio.** Desktop keeps the current look exactly — same 960×640 camera view, same UI sizing. Mobile resizes the viewport to fill the device screen and shows whatever world area matches that aspect ratio (less horizontal world in portrait, a shorter/wider slice in narrow landscape, etc.).

Guiding rules:

- **Desktop behavior must be unchanged.** Anyone playing on desktop after these changes should see the exact same framing, UI placement, and text sizing as before.
- **Mobile fills the device viewport.** No letterboxing. Canvas = 100vw × 100vh. Camera zoom is chosen so the world stays at a playable scale while the visible region's aspect matches the device.
- **Seeing less world on mobile is acceptable.** Mobile players will have a smaller view of the battlefield — that's the tradeoff we've accepted in exchange for filling the screen.

Start with Phase 1 alone — it's self-contained, verifiable on desktop by resizing the window (desktop should look identical at any window size ≥ the old 960×640 equivalent), and unblocks everything else.

---

## Phase 1 — Viewport foundation ✅

Decouple three things previously conflated into `sf`:

1. **`renderScale`** = DPR-aware canvas resolution for crispness.
2. **`cameraZoom`** = screen px per world px, chosen per device so we show a sensible amount of world.
3. **`uiScale`** = multiplier for UI sizes/text, chosen per device for readability.

Landed (commit-ready):

- [x] New `src/viewport.ts` centralizes the decision. Exports `computeViewport()` returning `{ isMobile, isPortrait, renderW, renderH, cameraZoom, uiScale }` and a `viewportWorldSize(vp)` helper.
- [x] `LevelSelectScene` now calls `computeViewport()` instead of the inline DPR math. It publishes `sf`, `cameraZoom`, `uiScale`, and `isMobile` to `game.registry`. Desktop still gets the exact legacy values (`sf = uiScale = cameraZoom`).
- [x] `GameScene` reads `cameraZoom` from the registry for `cameras.main.setZoom` (falls back to `sf` if absent).
- [x] Viewport-aware `spawnDist` — new `GameScene.spawnDist` field. Desktop resolves to `CFG.spawnDist` (unchanged). Mobile grows it to `max(CFG.spawnDist, ceil(view_corner / tile) + 2)` so enemies still spawn off-screen when the mobile view is taller than 3:2. All 7 internal `CFG.spawnDist` reads in `GameScene` now go through the field.
- [x] CSS hardening in `index.html`: `overflow: hidden`, `overscroll-behavior: none`, and `touch-action: none` on `#game` — prevents pull-to-refresh, rubber-band scrolling, and browser gesture handling on the canvas.

Decisions made during implementation:

- Scale mode stays `Phaser.Scale.FIT`. Switching to `RESIZE` was unnecessary once we let `LevelSelectScene` set `gameSize = viewport × DPR` directly on mobile — that aspect matches the parent element, so FIT produces no letterboxing there while keeping legacy FIT letterboxing on desktop windows that aren't 3:2.
- `uiScale` on mobile = `dpr * 1.5`. Desktop keeps `uiScale = sf` (legacy). `UIScene` still reads the `sf` registry key; because `sf === uiScale` on both code paths now, no UIScene changes were needed in Phase 1.

Deliberately deferred (handled in later phases):

- Orientation/window resize handling (needs UI re-layout → Phase 2).
- Tap targets, joystick, build flow on mobile → Phase 3.
- Safe-area insets, fullscreen-on-play, PWA manifest → Phase 4.
- Level select screen layout on mobile may look rough — acceptable for Phase 1 since the game itself renders correctly.

### Phase 1 follow-up (uiScale fix)

First mobile build had `uiScale = dpr * 1.5` (≈4.5 on DPR-3 phones). The hotbar's design-space width (`5 * 48 + 4 * 10 = 280`) blew up to `1260` physical pixels on iPhone portrait (canvas 1170 wide) — every UI element overflowed and the in-game HUD overlapped the coin badge. Level select nodes at `level.x * uiScale` flew off-screen.

Fixed by switching mobile `uiScale` to the same min-ratio formula desktop uses:

```
uiScale = min(renderW / CFG.width, renderH / CFG.height)
```

This guarantees `960 * uiScale ≤ canvas_width` and `640 * uiScale ≤ canvas_height`, so the existing 960×640 design layout fits without overflow. Trade-off: UI is *visible* but small; tap targets are below Apple's 44pt minimum on phone-sized screens. **Phase 2 needs to land before mobile is genuinely usable.**

## Phase 2 — UI re-layout ✅

Landed:

- [x] **Mobile uiScale uses a smaller "design space"** so the resulting `uiScale` is large enough for tap-friendly UI without overflowing. `viewport.ts` defines `MOBILE_PORTRAIT_UI_DESIGN_W = 400 / DESIGN_H = 800` (and 800×400 for landscape). `uiScale = min(renderW / designW, renderH / designH)` — yields ≈2.93 on iPhone 14 portrait, so a base-48 hotbar slot renders ≈47 CSS px, above Apple's 44pt minimum.
- [x] **Wave bar and boss bar clamped to design width** via new `dw()` / `dh()` helpers in `UIScene` (returns `scale.width / sf` etc). Bars now `min(420, dw() - 40)` wide so they don't run off narrow portrait canvases.
- [x] **`updateHud` reads the live wave-bar width** instead of a hardcoded `p(416)` so the inner fill matches the clamped background.
- [x] **LevelSelectScene gets its own scale** based on the legacy 960×640 formula. The level node positions go out to `x≈870` (designed against a 960-wide canvas), so it can't share the mobile UI's 400-wide design space without nodes flying off the right edge. This is a per-scene override; in-game UI keeps the mobile-tuned `uiScale`.

Deliberately deferred (still TODO if needed):

- Safe-area insets via `env(safe-area-inset-*)`. The joystick uses a `p(60)` margin that clears the iOS home indicator in practice, but a proper inset-aware approach is cleaner.

### Phase 2 follow-up — orientation/resize handling ✅

Landed:

- [x] **`installViewportResizeListener` in `viewport.ts`** — debounced (120ms) listener on `window.resize`, `orientationchange`, and `visualViewport.resize` (iOS Safari address-bar collapse). Returns a cleanup fn.
- [x] **`main.ts` wires the listener once at game creation**: recomputes `computeViewport()`, updates registry (`sf`, `cameraZoom`, `uiScale`, `isMobile`), calls `game.scale.setGameSize(...)` so the canvas matches the new physical viewport, then emits a global `'viewport-changed'` event.
- [x] **GameScene listener**: pulls new `cameraZoom` from registry, calls `cameras.main.setZoom(...)`, recomputes `spawnDist` (now extracted to `recomputeSpawnDist()` helper), and resets `lastChunkCx/Cy = -9999` so the chunk generator regenerates around the new view radius. World state (player, towers, enemies, money) is preserved.
- [x] **UIScene listener**: clears the joystick vector and calls `this.scene.restart()`. UIScene's existing `shutdown()` removes its game-event listeners so they don't accumulate. `init()` restores `speedIdx` from a registry key (`uiSpeedIdx`) and the speed-cycle label is built from that index — game speed survives the restart.
- [x] **LevelSelectScene listener**: uses `this.scene.restart()` since it has no preserved state.

Edge cases / known caveats:

- ~~Rotating *while a boss is alive* loses the boss HP bar~~ **Fixed.** GameScene now persists `bossActive`, `bossHp`, `bossMaxHp`, `bossBiome` to the registry on spawn and updates `bossHp` on every damage event (clearing `bossActive` when the boss starts dying). UIScene's `create()` checks `bossActive` and rebuilds the bar from the persisted values if a boss is in progress.
- An open end-game panel disappears across a resize (the `game-end` event is one-shot too). The player would need to tap "Return to Map" via a fresh menu invocation. Niche enough to defer.

## Phase 3 — Touch input ✅

Landed:

- [x] **Touch detection** via `isMobileDevice()` in `viewport.ts` (`matchMedia('(pointer: coarse)')` with a small-viewport fallback). Result is published to the registry as `isMobile`.
- [x] **Virtual joystick** (`src/ui/VirtualJoystick.ts`) — outer ring + tracking inner stick. Created in `UIScene.create()` only when `isMobile`. Anchored to the lower-left with a `p(60)` bottom margin to clear the iOS home indicator. Outer radius `p(60)`, inner radius `p(28)`, hit zone padded by `p(20)` for thumb forgiveness.
- [x] **Joystick → `updatePlayer`**: UIScene publishes the normalized `(x, y)` vector to `game.registry` every frame on its `UPDATE` event. `GameScene.updatePlayer` reads it, applies a 0.1-magnitude deadband, and adds the vector to the keyboard delta. The combined velocity is clamped to unit length so an analog joystick gives proper variable speed while keyboard still maxes out.
- [x] **Joystick / tap conflict resolved**: UIScene publishes `joystickBounds` (screen-space rect) to the registry. `GameScene.handleClick` returns early when the tap lands inside that rect, and the build-ghost preview skips repositioning when the active pointer is in the joystick zone (so dragging the stick during build mode doesn't snap the ghost onto your thumb).
- [x] **Bigger hotbar slots on mobile** — falls out automatically from the new mobile `uiScale` (no per-slot logic needed).

Deliberately deferred:

- Tap-to-place UX refinement — the existing `pointerdown` → place flow already works on touch (Phaser treats taps as pointer events). A two-step "tap to preview, tap again to confirm" flow could be nicer but isn't strictly needed.
- Multi-touch: the joystick uses a single pointer at a time; combining "stick on left thumb + tap to place on right" works because Phaser tracks multiple pointers and `activePointer` is the most recent one.

## Phase 4 — Page / PWA polish

- [ ] Prevent pull-to-refresh, pinch zoom, and long-press context menu on the canvas.
- [ ] Fullscreen on Play tap for mobile (request fullscreen when Play is tapped).
- [ ] `manifest.json` + apple-touch-icon for homescreen install (optional).
- [ ] Orientation lock hint if portrait/landscape design diverges.
