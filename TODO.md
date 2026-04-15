# TODO

## 1. ~~Redo Tower Graphics (Isometric Perspective)~~ ✅
- ~~Redraw tower base and top sprites at a 3/4 angle to match the rest of the game~~
- ~~Base should visually fill its 2x2 grid footprint~~
- ~~Maintain the tier tinting system~~
- ~~Arrow tower: archer + rotatable bow system~~
- ~~Circular collision body for corner passthrough~~
- ~~Y-based depth sorting for 3D occlusion~~
- ~~WC2-style autotiling walls with 16 neighbor variants~~

## ~~2. Level Select Screen~~ ✅
- ~~Map-based select with connected world map, dotted paths between level nodes~~
- ~~4 difficulties per level: Easy, Medium, Hard, 1-HP~~
- ~~Medal-based progression (Bronze/Silver/Gold/Diamond), localStorage persistence~~
- ~~12 levels across 4 biomes: Grasslands, Desert, Tundra, Volcanic~~
- ~~Difficulty panel overlay on node click, locked nodes show medal requirements~~
- ~~Level 1 (Meadow) and Level 2 (Forest) fully playable with unique enemies, terrain, and bosses~~

## 3. Improve Ground/Terrain Variety
- Each biome needs varied terrain tiles that are all walkable but visually distinct
- World-space multi-octave noise for smooth gradient transitions between shades
- Per-chunk canvas rendering (one 512px image per chunk)
- Terrain is purely cosmetic — no gameplay effect on walkability (walls/towers still use the grid)

### Biome Checklist
- [x] **Grasslands** — 4 green shade gradient, scattered flowers/rocks/tufts
- [ ] **Forest** — mossy ground, leaf litter, exposed roots, muddy patches
- [ ] **Swamp** — murky water puddles, reeds, soggy earth tones
- [ ] **Desert** — sand dunes, cracked earth, rock outcroppings, occasional scrub brush
- [ ] **Mountains** — rocky ground, gravel patches, snow-dusted stone, cliff edges
- [ ] **Volcanic** — charred rock, lava cracks (glowing), ash-covered ground
- [ ] **Frozen Peaks** — snow, ice patches, frozen puddles, wind-swept stone
- [ ] **Dark Fortress** — dark stone tiles, cracks, glowing runes

## 4. Unlock Progression System
- Towers and content unlock through character experience earned by beating levels
- Leftover money at end of a level converts to experience (ties into loot collection window)

### Tower Unlock Order
1. **Arrow Tower** — available from the start (Level 1 acts as a tutorial with only arrows)
2. **Cannon Tower** — unlocked after beating Level 1
3. **TBD Tower 3** — unlocked after beating Level 2
4. **TBD Tower 4** — unlocked after further progression
- Each new tower unlock should feel like a meaningful power spike

### Enemy / Tower Synergy
- As each tower type unlocks, new enemy types weak to that tower are introduced in subsequent levels
  - e.g. Cannon unlocks → next level introduces clustered swarm enemies vulnerable to AoE
  - e.g. Tower 3 unlocks → next level introduces enemies with a weakness matching that tower's specialty
- Encourages players to use newly unlocked towers rather than spamming one type
- Earlier enemy types still appear but in different mixes to keep variety

### Experience & Persistence
- Track total XP earned across all levels (localStorage)
- Show XP progress bar on level select screen
- Unlock thresholds clearly visible so players know what they're working toward
- Replay earlier levels to farm XP if needed (but diminishing returns to prevent grinding)

## 5. Tower Specialization (Branching Upgrades)
- Current system: 3 linear upgrade tiers (Level 0 → 1 → 2)
- New system: Levels 0 and 1 remain the same, but upgrading past Level 1 presents a **choice** between two specializations
- Each specialization takes the tower in a distinct direction with unique attributes
- Once chosen, the specialization is permanent for that tower (no respec)
- Visual change to reflect the chosen path (tint, top sprite, or particle effect)

### Arrow Tower Specializations (after Level 1)
- **Marksman** — longer range, higher single-target damage, slower fire rate, piercing shots that hit multiple enemies in a line
- **Rapid Fire** — shorter range, lower per-shot damage, much faster fire rate, slight spread to shots

### Cannon Tower Specializations (after Level 1)
- **Mortar** — massive splash radius, slower fire rate, leaves lingering fire zone that damages enemies over time
- **Shrapnel** — tighter splash radius, but fragments fly outward on impact dealing secondary damage to a wider area

### Future Tower Specializations
- Design specializations for each new tower type as they are added
- Each branch should feel meaningfully different in playstyle, not just stat tweaks
- Encourage mixing specializations across towers for varied strategies

### UI
- When a Level 1 tower is upgraded, show a choice panel with both specialization options
- Display name, icon, and brief description of each path
- Highlight stat changes compared to the base Level 1 tower

## 6. Leaderboard
- Show a leaderboard on the victory/defeat screen or accessible from the main menu
- Score = f(completion time, remaining money) — faster clears with more money = higher score
- Store top scores in localStorage per level per difficulty
- Display: rank, player name, score, time, money
- Highlight the player's current run if it made the board

## 7. Hero Selection
- Replace the name-input screen with a hero select screen
- Multiple hero characters, each with a unique skin/sprite and a small passive bonus
- Players click to select a hero before entering a level

### Hero Roster (examples)
- **Archer** — default hero, balanced stats (current character)
- **Ranger** — +5% attack speed
- **Knight** — +10% max HP, slightly slower move speed
- **Scout** — +10% movement speed
- **Mage** — +8% tower damage aura (towers in range deal more)
- **Engineer** — -10% tower build cost
- **Berserker** — +10% damage, -5% max HP
- More heroes unlockable through progression (medals, XP, etc.)

### Design Notes
- Each hero has a distinct sprite/color palette so they're visually identifiable
- Passive bonuses should be small but meaningful — not game-breaking
- Hero select screen shows: hero portrait, name, passive description, stats
- Selected hero is highlighted; click "Confirm" or proceed to level select
- Could tie into unlock progression (some heroes locked behind medal counts)

## 8. Overall Upgrades (Medal Shop)
- Accessible from the level select map screen via an "UPGRADES" button
- Spend medals earned from completing levels on permanent global upgrades
- Upgrades apply to ALL heroes, ALL towers, and ALL maps

### Upgrade Categories
- **Player Stats** — max HP, attack damage, attack speed, movement speed, coin magnet range
- **Tower Stats** — tower damage %, tower fire rate %, tower range %, tower HP %
- **Economy** — starting gold bonus, coin drop value %, build cost reduction %
- **Defense** — wall HP %, damage reduction %

### Design Notes
- Each upgrade has multiple tiers (e.g. 5 levels), each tier costs progressively more medals
- Show current level, next level bonus, and medal cost clearly
- Upgrades are permanent and persist across all sessions (localStorage)
- Balance so upgrades provide meaningful progression without trivializing content
- Medals are earned from completing difficulties (4 per level), so replaying on harder difficulties fuels upgrades
- UI: grid or list of upgrade cards, each showing an icon, name, current tier, and cost to upgrade

## 9. Character Abilities (Purchasable Upgrades)
- Spend XP or in-game currency to permanently upgrade the player character
- Upgrades persist across levels (part of the progression system)

### Stat Upgrades
- **Attack Speed** — reduce bow fire rate cooldown
- **Attack Range** — increase targeting/shooting distance
- **Attack Damage** — increase arrow damage per hit
- **Movement Speed** — move faster around the map
- **Coin Magnet Range** — collect coins from further away
- **Coin Magnet Speed** — coins fly toward player faster
- **Max HP** — increase player health pool
- **HP Regen** — slowly regenerate health over time
- **Armor** — reduce incoming damage by a flat amount or percentage

### Design Notes
- Each stat should have multiple tiers (e.g. 5 levels each, progressively more expensive)
- Accessible from the level select screen or during the pre-wave build phase
- Show clear before/after values so the player knows what they're buying
- Balance so upgrades feel impactful but no single stat becomes a must-buy
- Could tie into the XP system from TODO #4 — XP is the currency for these upgrades

## 10. Cloud Progress Save (Cache-Proof Persistence)
- Currently medals are saved in localStorage — clearing browser cache wipes all progress
- Add a lightweight backend so progress survives cache clears and can be restored via URL

### How It Works
1. First visit: generate a UUID, store in localStorage, append to URL as hash (e.g. `yourgame.com/#a3f8b2c1`)
2. On medal earn: save to localStorage (primary, fast) AND PUT to backend (durable backup)
3. On page load: check URL for ID → fetch progress from backend, merge with localStorage (take best of both)
4. Cache cleared? URL still has the ID → backend restores everything

### Backend
- 2 endpoints: `GET /progress/:id` and `PUT /progress/:id`
- Data is a small JSON blob: `{ medals: { "1": { easy: true, ... } } }`
- No auth — the UUID is the key
- ~30 lines of server code

### Hosting Options (free tier)
- Cloudflare Workers + KV
- Vercel serverless + Upstash Redis
- Supabase (free Postgres + REST API)
- Firebase Realtime DB

## 11. Damage Types & Enemy Resistances
- Define attack/damage types: Arrow (physical/piercing), Magic, Cannon (AoE/explosive), etc.
- Each tower deals a specific damage type
- Enemies have resistances (or weaknesses) to certain damage types
  - e.g. armored enemies resist Arrow but are weak to Cannon AoE
  - e.g. magic-immune enemies shrug off Magic towers but take full Arrow damage
- Resistance = % damage reduction (e.g. 50% Arrow resistance = takes half damage from arrows)
- Weakness = % damage bonus (e.g. -25% resistance = takes 1.25x damage)
- Encourages diverse tower builds rather than spamming one type
- UI: show resistance icons on enemy info or as subtle tint/shield indicators
- Ties into Tower Specialization (TODO #5) — specialization branches could shift damage types
