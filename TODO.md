# TODO

---

## Bugs

- [ ] **No way to exit build mode without ESC** — pressing 1/2/3 enters build mode but the only way out is ESC, which isn't obvious. Need a visible cancel button or click-to-deselect, and a hint in the UI.
- [ ] **No feedback when placement is blocked** — placing a tower or wall on an invalid tile silently fails. Show an error message (e.g. "Can't build here", "Not enough gold", "Would block enemy paths").
- [ ] **Wall placement false positives near dense trees** — walls sometimes show red on valid tiles when forests already block some spawn directions. Partially fixed with caching + relaxed reachability check, but edge cases may remain.

---

## UX / Polish

- [ ] **Build mode cancel UX** — add a right-click or re-press hotkey to cancel build mode. Show "ESC to cancel" hint near the ghost cursor.
- [ ] **Flying enemy tutorial tooltip** — first time a river flying enemy spawns, show a brief message that they can't be blocked by walls/towers.
- [ ] **Flying enemy visual indicator** — small shadow underneath and/or slight hover bob to distinguish from ground enemies.
- [ ] **Mosquito dart hit feedback** — brief green flash on the player when hit by a venom dart.
- [ ] **Untracked file cleanup** — preview HTML files and loose PNGs in repo root should be gitignored or removed.

---

## New Content

### Biomes & Levels
- [ ] **Desert biome** (Levels 5-6) — new enemy types, terrain, and boss
- [ ] **Tundra biome** (Levels 7-8) — new enemy types, terrain, and boss
- [ ] **Volcanic biome** (Levels 9-10) — new enemy types, terrain, and boss
- [ ] **Terrain variety per biome** — varied walkable ground tiles (cosmetic only)
  - [x] Grasslands — green gradient, flowers/rocks/tufts
  - [ ] Forest — mossy ground, leaf litter, muddy patches
  - [ ] Desert — sand dunes, cracked earth, rock outcroppings
  - [ ] Tundra — snow, ice patches, frozen puddles
  - [ ] Volcanic — charred rock, lava cracks (glowing), ash

### Towers
- [ ] **Mage/Wizard Tower** — new tower type (UI slot exists with lock overlay)
- [ ] **4th tower type** — TBD, unlocked through later progression

### Bridges
- [ ] **River bridges** — re-add for player traversal across rivers (enemies don't need them since they fly)

---

## Major Features

### Progression & Economy
- [ ] **Unlock Progression System** — towers and content unlock through XP earned by beating levels; leftover money converts to XP
- [ ] **Medal Shop (Global Upgrades)** — spend medals on permanent upgrades (player stats, tower stats, economy, defense). Accessible from level select map.
- [ ] **Character Abilities** — spend XP to permanently upgrade player stats (attack speed, range, damage, move speed, HP, magnet range, armor, HP regen). Could merge with Medal Shop or be a separate XP-based system.

### Tower Specialization (Branching Upgrades)
- [ ] At Level 2 upgrade, present a choice between two specializations (permanent, no respec)
- [ ] **Arrow: Marksman** — long range, piercing, slower | **Arrow: Rapid Fire** — short range, fast, spread
- [ ] **Cannon: Mortar** — huge splash, fire zone DOT | **Cannon: Shrapnel** — tight splash, secondary fragments
- [ ] UI: choice panel with name, icon, description, stat comparison

### Combat Depth
- [ ] **Damage Types & Enemy Resistances** — Arrow/Magic/Cannon damage types; enemies have % resistance or weakness to each. Encourages diverse tower builds.

### Heroes
- [ ] **Hero Selection Screen** — replace name input with hero select. Multiple characters with unique sprites and small passive bonuses (e.g. Archer, Knight, Scout, Mage, Engineer, Berserker). Unlockable through medals/XP.

### Competitive
- [ ] **Leaderboard** — score = f(time, remaining money). localStorage per level per difficulty. Show on victory/defeat screen.
- [ ] **Achievements System** — unlockable achievements with popup notifications, dedicated screen, progress tracking. Examples: Pacifist, Untouchable, Speedrunner, Full Clear, Boss Rush.

### Infrastructure
- [ ] **Cloud Progress Save** — lightweight backend (UUID-based, no auth) so progress survives cache clears. Options: Cloudflare Workers+KV, Vercel+Upstash, Supabase, Firebase.
- [ ] **Mobile Support** — virtual joystick, larger tap targets, compact HUD, responsive scaling.

### Multiplayer
- [ ] **Multiplayer** — when this starts, remove the 1x/2x/4x speed toggle.

---

## Art & Audio

- [ ] **Player & Enemy Sprite Redo** — complete visual overhaul of all character sprites (idle, move, shoot, hit, die) with consistent art style and directional animations.
- [ ] **Background music per biome** — currently one track for all levels; each biome should have its own BGM.
- [ ] **Replace remaining jsfxr fallbacks** — swap synth sounds with real audio files as they become available.

---

## Tutorial

- [ ] **Tutorial Level** — guided walkthrough that pauses and highlights:
  1. Auto-shooting (stand still for full speed)
  2. Building an arrow tower
  3. Upgrading a tower
  4. Placing walls to funnel enemies

---

## Completed

- [x] Tower graphics redo (isometric perspective, WC2 autotiling walls)
- [x] Level select screen (Kingdom Rush-style map, 4 difficulties, medals)
- [x] Grasslands biome — basic/heavy/runner enemies, Brood Mother boss
- [x] Forest biome — wolf/spider/bear enemies, Forest Guardian boss
- [x] Infected biome — infected enemies, Blighted One boss
- [x] River biome — flying enemies (crow/bat/dragonfly/mosquito), Fog Phantom boss
- [x] Landing page with OG unfurl image
- [x] Background music (looping during gameplay)
- [x] Sound effects (arrow, cannon, coin, upgrade, click, hit, boom, etc.)
- [x] Native resolution UI scaling
- [x] Hotbar redesign with labels, costs, and mage tower lock overlay
- [x] Wall placement optimization (BFS caching, O(1) queue)
- [x] Mosquito darts stop on wall/tower hit
- [x] River mob cluster spawning
- [x] Camera shake tuning
- [x] Per-sound volume control
