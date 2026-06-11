import { UNLOCKS, unlocksAtLevel, type UnlockDef, type UnlockId } from './unlocks';

/**
 * Meta-progression state: persists across runs and levels via
 * localStorage. Single source of truth is `totalXp` — current level
 * and unlocks are derived from it so the state can't drift.
 *
 * XP curve: each level N→N+1 costs `100 + N*50`. Soft cap at level 20
 * (no further unlocks past that point), but levels continue to climb
 * indefinitely.
 */

const STORAGE_KEY = 'td_player_progress';
const STORAGE_VERSION = 1;

const XP_PER_LEVEL_BASE = 100;
const XP_PER_LEVEL_STEP = 50;

/** Soft cap — unlocks stop here, but levelling continues. */
export const SOFT_CAP_LEVEL = 20;

interface PersistedShape {
  v: number;
  totalXp: number;
}

/** Total XP needed to *reach* the start of `level` (i.e. cumulative). */
function xpToReachLevel(level: number): number {
  // Sum_{i=0..level-1} (BASE + i*STEP)
  if (level <= 0) return 0;
  return level * XP_PER_LEVEL_BASE + XP_PER_LEVEL_STEP * (level * (level - 1)) / 2;
}

/** Derive level from a totalXp value. Walks up — fast enough for any
 *  practical XP value, and avoids floating-point in the quadratic. */
function levelFromXp(totalXp: number): number {
  let lvl = 0;
  let need = 0;
  while (lvl < 100_000) {
    const next = need + (XP_PER_LEVEL_BASE + lvl * XP_PER_LEVEL_STEP);
    if (totalXp < next) return lvl;
    need = next;
    lvl++;
  }
  return lvl;
}

export interface AddXpResult {
  /** True if `totalXp` crossed at least one level boundary. */
  leveled: boolean;
  /** Pre-add level. */
  oldLevel: number;
  /** Post-add level. */
  newLevel: number;
  /** Unlocks first crossed by this XP gain. Empty when not levelled or
   *  when no unlock is gated at any crossed level. */
  unlocked: UnlockDef[];
}

export class PlayerProgressState {
  totalXp: number;

  constructor(totalXp = 0) {
    this.totalXp = Math.max(0, Math.floor(totalXp));
  }

  // ---------- derived ----------

  get level(): number {
    return levelFromXp(this.totalXp);
  }

  /** XP earned past the start of the current level. */
  get xpInCurrentLevel(): number {
    return this.totalXp - xpToReachLevel(this.level);
  }

  /** XP cost of the next level (current → current+1). */
  get xpToNextLevel(): number {
    return XP_PER_LEVEL_BASE + this.level * XP_PER_LEVEL_STEP;
  }

  // ---------- unlocks ----------

  isUnlocked(id: UnlockId): boolean {
    const def = UNLOCKS.find((u) => u.id === id);
    if (!def) return false;
    return this.level >= def.requiredLevel;
  }

  /** All defs currently unlocked at the player's level. */
  unlockedDefs(): UnlockDef[] {
    const lvl = this.level;
    return UNLOCKS.filter((u) => u.requiredLevel <= lvl);
  }

  // ---------- mutation ----------

  addXp(amount: number): AddXpResult {
    const xp = Math.max(0, Math.floor(amount));
    const oldLevel = this.level;
    this.totalXp += xp;
    const newLevel = this.level;
    const unlocked: UnlockDef[] = [];
    for (let l = oldLevel + 1; l <= newLevel; l++) unlocked.push(...unlocksAtLevel(l));
    this.save();
    return { leveled: newLevel > oldLevel, oldLevel, newLevel, unlocked };
  }

  /** Dev convenience: jump to the start of a given level. */
  setLevel(level: number): void {
    this.totalXp = xpToReachLevel(Math.max(0, Math.floor(level)));
    this.save();
  }

  /** Dev convenience: wipe back to zero. */
  wipe(): void {
    this.totalXp = 0;
    this.save();
  }

  // ---------- persistence ----------

  save(): void {
    try {
      const payload: PersistedShape = { v: STORAGE_VERSION, totalXp: this.totalXp };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // private mode / quota exceeded — drop silently
    }
  }

  static load(): PlayerProgressState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new PlayerProgressState(0);
      const parsed = JSON.parse(raw) as Partial<PersistedShape>;
      const xp = typeof parsed?.totalXp === 'number' ? parsed.totalXp : 0;
      return new PlayerProgressState(xp);
    } catch {
      return new PlayerProgressState(0);
    }
  }
}
