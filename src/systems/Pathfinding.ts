import { CFG } from '../config';

// Sparse grid: only stores blocked tiles. Missing keys = walkable (0).
export type SparseGrid = Map<string, number>;

export function createSparseGrid(): SparseGrid {
  return new Map();
}

export function gridKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function gridGet(g: SparseGrid, x: number, y: number): number {
  return g.get(gridKey(x, y)) ?? 0;
}

export function gridSet(g: SparseGrid, x: number, y: number, v: number) {
  if (v === 0) g.delete(gridKey(x, y));
  else g.set(gridKey(x, y), v);
}

// BFS from (sx,sy) to (tx,ty) on a sparse grid.
// Bounds the search to a region around start and goal to keep it fast.
export function findPath(
  g: SparseGrid,
  sx: number, sy: number,
  tx: number, ty: number
): { x: number; y: number }[] {
  // Bound the search area: rectangle covering start+goal with generous padding
  const pad = 20;
  const minX = Math.min(sx, tx) - pad, maxX = Math.max(sx, tx) + pad;
  const minY = Math.min(sy, ty) - pad, maxY = Math.max(sy, ty) + pad;

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const total = width * height;
  const prev = new Int32Array(total).fill(-1);
  const visited = new Uint8Array(total);
  const idx = (x: number, y: number) => (y - minY) * width + (x - minX);
  const inRange = (x: number, y: number) => x >= minX && x <= maxX && y >= minY && y <= maxY;

  if (!inRange(sx, sy)) return [];
  const queue: number[] = [];
  const start = idx(sx, sy);
  queue.push(start);
  visited[start] = 1;

  let foundTarget = false;
  const cardinals: [number, number][] = [[1,0],[-1,0],[0,1],[0,-1]];
  const diagonals: [number, number][] = [[1,1],[-1,1],[1,-1],[-1,-1]];

  while (queue.length) {
    const cur = queue.shift()!;
    const cx = (cur % width) + minX;
    const cy = Math.floor(cur / width) + minY;
    if (cx === tx && cy === ty) { foundTarget = true; break; }
    // Cardinals
    for (const [dx, dy] of cardinals) {
      const nx = cx + dx, ny = cy + dy;
      if (!inRange(nx, ny)) continue;
      const ni = idx(nx, ny);
      if (visited[ni]) continue;
      if (gridGet(g, nx, ny) === 1) continue;
      visited[ni] = 1;
      prev[ni] = cur;
      queue.push(ni);
    }
    // Diagonals — only if both adjacent cardinal tiles are walkable
    for (const [dx, dy] of diagonals) {
      const nx = cx + dx, ny = cy + dy;
      if (!inRange(nx, ny)) continue;
      const ni = idx(nx, ny);
      if (visited[ni]) continue;
      if (gridGet(g, nx, ny) === 1) continue;
      if (gridGet(g, cx + dx, cy) === 1 || gridGet(g, cx, cy + dy) === 1) continue;
      visited[ni] = 1;
      prev[ni] = cur;
      queue.push(ni);
    }
  }

  if (!foundTarget) return [];
  const goalIdx = idx(tx, ty);
  const path: { x: number; y: number }[] = [];
  let c = goalIdx;
  while (c !== -1 && c !== start) {
    path.push({ x: (c % width) + minX, y: Math.floor(c / width) + minY });
    c = prev[c];
  }
  path.reverse();
  return path;
}

// Check that enemies can reach the player from spawn distance in all 4 directions.
// Instead of fixed world edges, checks from points at spawn distance around the player.
export function canReachFromSpawnDirections(
  g: SparseGrid, px: number, py: number, spawnDist: number
): boolean {
  // Test 4 cardinal spawn points at spawnDist tiles from the player
  const testPoints = [
    { x: px, y: py - spawnDist },  // top
    { x: px, y: py + spawnDist },  // bottom
    { x: px - spawnDist, y: py },  // left
    { x: px + spawnDist, y: py },  // right
  ];

  for (const tp of testPoints) {
    // Find nearest walkable tile to the spawn point
    let found = false;
    for (let r = 0; r <= 3 && !found; r++) {
      for (let dy = -r; dy <= r && !found; dy++) {
        for (let dx = -r; dx <= r && !found; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const sx = tp.x + dx, sy = tp.y + dy;
          if (gridGet(g, sx, sy) === 0) {
            const path = findPath(g, sx, sy, px, py);
            if (path.length > 0) found = true;
          }
        }
      }
    }
    if (!found) return false;
  }
  return true;
}
