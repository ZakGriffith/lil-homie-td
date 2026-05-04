import type { TowerKind } from '../entities/Tower';

export type BuildKind = 'none' | 'tower' | 'wall';

/**
 * Build-mode state. `kind` and `towerKind` describe what (if anything) the
 * player is currently placing; `paused` is true while the world should be
 * frozen because EITHER a build menu is open OR a tower-upgrade panel is
 * open. The two pause sources are tracked together because they share one
 * pause/resume cycle on physics + tweens + anims.
 */
export class BuildState {
  kind: BuildKind = 'none';
  /** Last-selected tower kind. Persists when `kind === 'none'` so the
   *  hotbar can re-highlight the right slot when build mode reopens. */
  towerKind: TowerKind = 'arrow';
  /** True while world simulation is paused for a build/upgrade UI. */
  paused = false;

  /** True when the player is actively placing something. */
  isActive(): boolean { return this.kind !== 'none'; }

  /** Set the active build mode. Pass `'none'` to exit build mode. */
  setKind(k: BuildKind, towerKind?: TowerKind): void {
    this.kind = k;
    if (k === 'tower' && towerKind) this.towerKind = towerKind;
  }

  reset(): void {
    this.kind = 'none';
    this.towerKind = 'arrow';
    this.paused = false;
  }
}
