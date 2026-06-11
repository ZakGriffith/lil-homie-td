import type { GameScene } from '../scenes/GameScene';
import { getRegistry } from '../core/registry';
import { getEvents, type XpBreakdown } from '../core/events';
import type { AddXpResult } from './PlayerProgressState';

/**
 * XP award formulas. Single source of truth for "how much XP does X
 * grant" — EndSystem reads from here for run-end awards, SpawnSystem
 * for endless per-wave awards, and tests/dev tools can call directly.
 *
 * Each number is intentionally tunable from one spot; balance changes
 * shouldn't require chasing call sites.
 */

// Campaign-clear base reward.
const BASE_FIRST_CLEAR = 400;
const BASE_REPLAY = 100;

// Performance bonus caps.
const BONUS_NO_TOWERS_LOST = 100;
const BONUS_COINS_COLLECTED_CAP = 150;
const BONUS_COINS_REMAINING_CAP = 150;
const BONUS_LESS_HITS_CAP = 150;

// Scaling: how many coins map to the full cap.
const COINS_COLLECTED_FULL = 500;
const COINS_REMAINING_FULL = 300;

// Per-hit decay against the less-hits cap.
const LESS_HITS_DECAY_PER_HIT = 10;

// Direct coin → XP conversion at run end.
const COIN_TO_XP_RATIO = 0.5;
const COIN_CONVERSION_CAP = 200;

// Endless mode soft-cap rates.
const ENDLESS_FULL_RATE = 30;
const ENDLESS_DIMINISHED_RATE = 8;
const ENDLESS_SOFT_CAP_WAVES = 20;

function emptyBreakdown(): XpBreakdown {
  return {
    base: 0,
    noTowersLost: 0,
    coinsCollected: 0,
    coinsRemaining: 0,
    lessHits: 0,
    coinConversion: 0,
    endlessWaves: 0,
    total: 0,
  };
}

function performanceBonuses(scene: GameScene, includeNoTowersLost: boolean): {
  noTowersLost: number;
  coinsCollected: number;
  coinsRemaining: number;
  lessHits: number;
  coinConversion: number;
} {
  const stats = scene.runStats;
  // "No towers lost" only counts when the player actually built towers;
  // otherwise an idle run trivially earns it.
  const noTowersLost = includeNoTowersLost && stats.towersBuilt > 0 && stats.towersLost === 0
    ? BONUS_NO_TOWERS_LOST
    : 0;
  const coinsCollected = Math.min(
    BONUS_COINS_COLLECTED_CAP,
    Math.floor((stats.coinsCollected / COINS_COLLECTED_FULL) * BONUS_COINS_COLLECTED_CAP),
  );
  const money = scene.player?.money ?? 0;
  const coinsRemaining = Math.min(
    BONUS_COINS_REMAINING_CAP,
    Math.floor((money / COINS_REMAINING_FULL) * BONUS_COINS_REMAINING_CAP),
  );
  const lessHits = Math.max(0, BONUS_LESS_HITS_CAP - stats.playerHits * LESS_HITS_DECAY_PER_HIT);
  const coinConversion = Math.min(
    COIN_CONVERSION_CAP,
    Math.floor(money * COIN_TO_XP_RATIO),
  );
  return { noTowersLost, coinsCollected, coinsRemaining, lessHits, coinConversion };
}

/** Campaign-mode win XP. Includes the base clear reward (full first
 *  time, smaller on replay) plus all performance bonuses + coin
 *  conversion. */
export function computeWinXp(scene: GameScene, isFirstClear: boolean): XpBreakdown {
  const base = isFirstClear ? BASE_FIRST_CLEAR : BASE_REPLAY;
  const perf = performanceBonuses(scene, true);
  const total = base + perf.noTowersLost + perf.coinsCollected
              + perf.coinsRemaining + perf.lessHits + perf.coinConversion;
  return {
    base,
    noTowersLost: perf.noTowersLost,
    coinsCollected: perf.coinsCollected,
    coinsRemaining: perf.coinsRemaining,
    lessHits: perf.lessHits,
    coinConversion: perf.coinConversion,
    endlessWaves: 0,
    total,
  };
}

/** Endless-mode run-end XP (player died). No base reward, but
 *  performance bonuses and final coin conversion still apply. */
export function computeEndlessRunEndXp(scene: GameScene): XpBreakdown {
  const perf = performanceBonuses(scene, true);
  const total = perf.noTowersLost + perf.coinsCollected
              + perf.coinsRemaining + perf.lessHits + perf.coinConversion;
  return {
    base: 0,
    noTowersLost: perf.noTowersLost,
    coinsCollected: perf.coinsCollected,
    coinsRemaining: perf.coinsRemaining,
    lessHits: perf.lessHits,
    coinConversion: perf.coinConversion,
    endlessWaves: 0,
    total,
  };
}

/** Per-wave XP for endless mode. `waveJustCleared` is the 0-indexed
 *  wave the player just finished (so wave 0 = display "WAVE 1"). */
export function endlessWaveXp(waveJustCleared: number): XpBreakdown {
  const xp = waveJustCleared < ENDLESS_SOFT_CAP_WAVES ? ENDLESS_FULL_RATE : ENDLESS_DIMINISHED_RATE;
  const b = emptyBreakdown();
  b.endlessWaves = xp;
  b.total = xp;
  return b;
}

/**
 * Award an XP breakdown: mutate progress state, emit `xp-gained`, and
 * (if a level boundary was crossed) emit `level-up`. Returns the
 * level-up result so callers that need to stash it in a payload can.
 */
export function awardXp(scene: GameScene, breakdown: XpBreakdown): AddXpResult {
  const progress = getRegistry(scene.game).get('playerProgress');
  const result = progress.addXp(breakdown.total);
  getEvents(scene.game.events).emit('xp-gained', breakdown);
  if (result.leveled) {
    getEvents(scene.game.events).emit('level-up', {
      oldLevel: result.oldLevel,
      newLevel: result.newLevel,
      unlocked: result.unlocked,
    });
  }
  return result;
}
