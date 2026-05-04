import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { getEvents } from '../core/events';

/**
 * HUD-side helpers: per-frame coalesced HUD emit, countdown-text dedupe,
 * floating-text spawn, and the wave-break tick-second cache. The actual
 * payload assembly (`hudState`) stays on GameScene since UIScene reads it
 * directly via `gameScene.hudState()`.
 */
export class HudSystem {
  /**
   * Set true while a hud emit is pending for the current frame. Many callers
   * (each kill, each coin pickup, each tower place) trigger pushHud in
   * bursts; UIScene.updateHud is heavy enough that running it 20+ times per
   * frame on mobile drops the framerate noticeably. Coalesce all calls in a
   * single frame into one emit at POST_UPDATE so updateHud runs at most once
   * per frame regardless of how many pickups happen.
   */
  private flushScheduled = false;

  /**
   * The wave-break "WAVE N IN Ns" label is rendered in UIScene from
   * s.waveBreakUntil and s.vTime, so we have to push HUD updates while the
   * break is ticking. Track the last-emitted integer second so we push
   * ~5–6 times per break instead of ~300 (5s × 60fps).
   */
  lastWaveBreakUntil = 0;
  lastWaveBreakSecond = -1;

  constructor(private scene: GameScene) {}

  pushHud() {
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    const scene = this.scene;
    scene.events.once(Phaser.Scenes.Events.POST_UPDATE, () => {
      this.flushScheduled = false;
      getEvents(scene.game.events).emit('hud', scene.hudState());
    });
  }

  /**
   * Per-frame countdown branches were calling pushHud 60×/sec even when the
   * displayed text/color had not changed. UIScene.updateHud is heavy
   * (HP redraw, progress-circle restyles, wave-bar fill), so the redundant
   * emits caused mobile chop. syncCountdown only emits on a real change.
   */
  syncCountdown(msg: string, color?: string) {
    const scene = this.scene;
    const nextColor = color ?? scene.countdownColor;
    if (scene.countdownMsg === msg && scene.countdownColor === nextColor) return;
    scene.countdownMsg = msg;
    scene.countdownColor = nextColor;
    this.pushHud();
  }

  floatText(x: number, y: number, msg: string, color: string) {
    const scene = this.scene;
    const txt = scene.add.text(x, y, msg, {
      fontFamily: 'monospace', fontSize: '12px', color,
      stroke: '#0b0f1a', strokeThickness: 3
    }).setOrigin(0.5).setDepth(950).setResolution(scene.sf);
    scene.tweens.add({
      targets: txt,
      y: y - 18,
      alpha: { from: 1, to: 0 },
      duration: 700,
      ease: 'Sine.Out',
      onComplete: () => txt.destroy()
    });
  }
}
