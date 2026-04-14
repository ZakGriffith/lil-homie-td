# Bugs

## Open

(none currently)

---

## Fixed

### 1. ~~Enemy pathfinding exploitable near tower/wall corners~~
- **Description:** Player can wedge between an arrow tower and a wall, causing enemies to lose their path. Enemies walk into the adjacent wall thinking they can't reach the player, allowing the player to shoot them freely with no risk.
- **Root cause:** When the player's tile was inside a blocked cluster (tower/wall), BFS returned an empty path. The fallback was a dumb direct-chase that walked enemies into walls.
- **Fix:** When BFS can't reach the player's tile, search expanding rings (up to 6 tiles out) for the nearest reachable walkable tile and path there instead. Changed the "no path at all" fallback from direct chase to stopping in place. Applied to both regular enemies and boss.
