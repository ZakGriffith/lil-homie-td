/**
 * Registry of unlock definitions gated by player level. This is the
 * source of truth for what each level grants — UI lock messages, the
 * post-level-up "Unlocked!" callout, and the gating logic in towers
 * all read from here.
 *
 * Add new entries as content lands. Tier-3 towers are the v1 sinks.
 */

export type UnlockId =
  | 'tower_arrow_tier3'
  | 'tower_cannon_tier2'
  | 'tower_cannon_tier3';

export interface UnlockDef {
  id: UnlockId;
  requiredLevel: number;
  label: string;
  description: string;
}

export const UNLOCKS: readonly UnlockDef[] = [
  {
    id: 'tower_arrow_tier3',
    requiredLevel: 5,
    label: 'Arrow Tower — Tier 3',
    description: 'Unlocks the final upgrade tier on arrow towers.',
  },
  {
    id: 'tower_cannon_tier2',
    requiredLevel: 7,
    label: 'Cannon Tower — Tier 2',
    description: 'Unlocks the second upgrade tier on cannon towers.',
  },
  {
    id: 'tower_cannon_tier3',
    requiredLevel: 10,
    label: 'Cannon Tower — Tier 3',
    description: 'Unlocks the final upgrade tier on cannon towers.',
  },
];

/** Unlocks granted exactly when the player reaches `level`. */
export function unlocksAtLevel(level: number): UnlockDef[] {
  return UNLOCKS.filter((u) => u.requiredLevel === level);
}
