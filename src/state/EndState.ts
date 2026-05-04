/**
 * End-of-level state. Replaces four scattered flags:
 *   - `gameOver` (was on GameScene) — true after the win/lose modal
 *     triggers; suppresses further game-loop work.
 *   - `dying` (was on EndSystem) — true during the death animation, before
 *     `gameOver` flips. Lets update() run for the death anim while
 *     skipping player input.
 *   - `winDelayUntil` (was on EndSystem) — vTime when the victory modal
 *     should appear. Players get a window to collect the boss-drop coins
 *     before the screen pops.
 *   - `winCollectedAt` (was on EndSystem) — vTime when the player finished
 *     collecting the last coin. Triggers a 2-second pause before the
 *     modal so the screen doesn't pop the instant the last coin lands.
 */
export class EndState {
  gameOver = false;
  dying = false;

  /** vTime when the victory modal should auto-appear (0 = unset). */
  winDelayUntil = 0;

  /** vTime when the last coin was collected (0 = still collecting). */
  winCollectedAt = 0;

  // ---------- transitions ----------

  /** Start the death animation. Idempotent — guards against re-entry. */
  enterDying(): boolean {
    if (this.gameOver || this.dying) return false;
    this.dying = true;
    return true;
  }

  /** Defeat or victory modal triggered. Idempotent. */
  enterGameOver(): boolean {
    if (this.gameOver) return false;
    this.gameOver = true;
    return true;
  }

  /** Open the post-boss-death loot collection window (sets the auto-pop
   *  timer). No-op if already open. */
  startLootWindow(now: number, ms: number): boolean {
    if (this.winDelayUntil !== 0) return false;
    this.winDelayUntil = now + ms;
    return true;
  }

  /** Mark the moment the player finished collecting all coins. Returns
   *  true on the first call (so the caller can act on the transition). */
  recordCoinCollectComplete(now: number): boolean {
    if (this.winCollectedAt !== 0) return false;
    this.winCollectedAt = now;
    return true;
  }

  reset() {
    this.gameOver = false;
    this.dying = false;
    this.winDelayUntil = 0;
    this.winCollectedAt = 0;
  }
}
