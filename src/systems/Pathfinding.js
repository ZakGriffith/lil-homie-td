export function createSparseGrid() {
    return new Map();
}
export function gridKey(x, y) {
    return `${x},${y}`;
}
export function gridGet(g, x, y) {
    return g.get(gridKey(x, y)) ?? 0;
}
export function gridSet(g, x, y, v) {
    if (v === 0)
        g.delete(gridKey(x, y));
    else
        g.set(gridKey(x, y), v);
}
// BFS from (sx,sy) to (tx,ty) on a sparse grid.
// Bounds the search to a region around start and goal to keep it fast.
export function findPath(g, sx, sy, tx, ty) {
    // Bound the search area: rectangle covering start+goal with generous padding
    const pad = 20;
    const minX = Math.min(sx, tx) - pad, maxX = Math.max(sx, tx) + pad;
    const minY = Math.min(sy, ty) - pad, maxY = Math.max(sy, ty) + pad;
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const total = width * height;
    const prev = new Int32Array(total).fill(-1);
    const visited = new Uint8Array(total);
    const idx = (x, y) => (y - minY) * width + (x - minX);
    const inRange = (x, y) => x >= minX && x <= maxX && y >= minY && y <= maxY;
    if (!inRange(sx, sy))
        return [];
    const queue = [];
    let qHead = 0;
    const start = idx(sx, sy);
    queue.push(start);
    visited[start] = 1;
    let foundTarget = false;
    const cardinals = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const diagonals = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    while (qHead < queue.length) {
        const cur = queue[qHead++];
        const cx = (cur % width) + minX;
        const cy = Math.floor(cur / width) + minY;
        if (cx === tx && cy === ty) {
            foundTarget = true;
            break;
        }
        // Cardinals
        for (const [dx, dy] of cardinals) {
            const nx = cx + dx, ny = cy + dy;
            if (!inRange(nx, ny))
                continue;
            const ni = idx(nx, ny);
            if (visited[ni])
                continue;
            const nv = gridGet(g, nx, ny);
            if (nv >= 1 && nv !== 5)
                continue; // 5 = bridge, walkable
            visited[ni] = 1;
            prev[ni] = cur;
            queue.push(ni);
        }
        // Diagonals — walls (1), trees (3), water (4) block; towers (2) and bridges (5) allow squeeze-through
        for (const [dx, dy] of diagonals) {
            const nx = cx + dx, ny = cy + dy;
            if (!inRange(nx, ny))
                continue;
            const ni = idx(nx, ny);
            if (visited[ni])
                continue;
            const dv = gridGet(g, nx, ny);
            if (dv >= 1 && dv !== 5)
                continue;
            const c1 = gridGet(g, cx + dx, cy);
            const c2 = gridGet(g, cx, cy + dy);
            // Both blocked = no gap; wall (1), tree (3), water (4) = full-tile, no squeeze
            const solid1 = c1 === 1 || c1 === 3 || c1 === 4;
            const solid2 = c2 === 1 || c2 === 3 || c2 === 4;
            if (solid1 || solid2 || (c1 >= 1 && c2 >= 1))
                continue;
            visited[ni] = 1;
            prev[ni] = cur;
            queue.push(ni);
        }
    }
    if (!foundTarget)
        return [];
    const goalIdx = idx(tx, ty);
    const path = [];
    let c = goalIdx;
    while (c !== -1 && c !== start) {
        path.push({ x: (c % width) + minX, y: Math.floor(c / width) + minY });
        c = prev[c];
    }
    path.reverse();
    return path;
}
// Check that enemies can reach the player from spawn distance in enough directions.
// Requires at least minReachable of 4 cardinal spawn directions to have a valid path.
export function canReachFromSpawnDirections(g, px, py, spawnDist, minReachable = 2) {
    // Test 4 cardinal spawn points at spawnDist tiles from the player
    const testPoints = [
        { x: px, y: py - spawnDist }, // top
        { x: px, y: py + spawnDist }, // bottom
        { x: px - spawnDist, y: py }, // left
        { x: px + spawnDist, y: py }, // right
    ];
    let reachable = 0;
    for (const tp of testPoints) {
        // Find nearest walkable tile to the spawn point
        let found = false;
        for (let r = 0; r <= 3 && !found; r++) {
            for (let dy = -r; dy <= r && !found; dy++) {
                for (let dx = -r; dx <= r && !found; dx++) {
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r)
                        continue;
                    const sx = tp.x + dx, sy = tp.y + dy;
                    const sv = gridGet(g, sx, sy);
                    if (sv === 0 || sv === 5) {
                        const path = findPath(g, sx, sy, px, py);
                        if (path.length > 0)
                            found = true;
                    }
                }
            }
        }
        if (found)
            reachable++;
    }
    return reachable >= minReachable;
}
