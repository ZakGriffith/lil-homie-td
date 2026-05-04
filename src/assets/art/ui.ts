// UI-overlay art: the autotile wall and the off-screen tower indicators.

import { Put, P, rect, disc, line } from './canvas';

// ==================================================================
//  WALL (32x32) — stacked brick
// ==================================================================
// WC2-style dark fortress wall with autotiling
// Neighbor bitmask: N=1, E=2, S=4, W=8
// Wall nearly fills the tile; connected sides go edge-to-edge seamlessly
export function drawWall(mask: number, damaged: boolean) {
  return (put: Put) => {
    const S = 32;
    const pad = 1;      // tiny inset on open ends (just outline room)
    const fd = 5;       // front face depth (3/4 view)

    // Colors — dark fortress palette
    const O  = '#12141e';   // outline
    const TL = '#808ca4';   // top highlight
    const T  = '#636e82';   // top surface
    const TM = '#565f72';   // top mid
    const TD = '#484f5e';   // top shadow/edge
    const F  = '#3a4050';   // front face
    const FM = '#2e3444';   // front mid
    const FD = '#222834';   // front face dark

    const hasN = !!(mask & 1);
    const hasE = !!(mask & 2);
    const hasS = !!(mask & 4);
    const hasW = !!(mask & 8);

    // Wall extents — nearly full tile, edge-to-edge on connected sides
    // When connecting south, top surface extends to tile edge (no front face)
    const l = hasW ? 0 : pad;
    const r = hasE ? S - 1 : S - 1 - pad;
    const t = hasN ? 0 : pad;
    const bTop = hasS ? S - 1 : S - 1 - pad - fd;      // bottom of top surface
    const bBot = hasS ? S - 1 : S - 1 - pad;            // bottom of front face

    // --- FRONT FACE (south-facing depth visible in 3/4 view) ---
    for (let y = bTop + 1; y <= bBot; y++) {
      for (let x = l; x <= r; x++) {
        const atL = x === l && !hasW;
        const atR = x === r && !hasE;
        const py = (y - bTop - 1) / Math.max(1, bBot - bTop - 1);
        let c: string;
        if (atL || atR) c = O;
        else if (x <= l + 1 && !hasW) c = FD;
        else if (x >= r - 1 && !hasE) c = FD;
        else if (py > 0.7) c = FD;
        else if (py < 0.2) c = F;
        else c = FM;
        put(x, y, c);
      }
    }
    // Bottom outline (only on open south side)
    if (!hasS) for (let x = l; x <= r; x++) put(x, bBot, O);

    // --- TOP SURFACE ---
    for (let y = t; y <= bTop; y++) {
      for (let x = l; x <= r; x++) {
        const atL = x === l && !hasW;
        const atR = x === r && !hasE;
        const atT = y === t && !hasN;
        const w = r - l;
        const h = bTop - t;
        const px = w > 0 ? (x - l) / w : 0.5;
        const py = h > 0 ? (y - t) / h : 0.5;
        let c: string;
        // Outlines only on open edges
        if (atL || atR || atT) c = O;
        // Lighting: top-left bright, bottom-right dark
        else if (py < 0.12 && !hasN) c = TL;
        else if (py < 0.25) c = TL;
        else if (px < 0.08 && !hasW) c = TL;
        else if (py > 0.85) c = TD;
        else if (px > 0.92 && !hasE) c = TD;
        else if (py < 0.5) c = T;
        else c = TM;
        put(x, y, c);
      }
    }

    // 1px outline on open edges (reinforce)
    if (!hasN) for (let x = l; x <= r; x++) put(x, t, O);
    if (!hasW) for (let y = t; y <= bBot; y++) put(l, y, O);
    if (!hasE) for (let y = t; y <= bBot; y++) put(r, y, O);

    // Inner border highlight/shadow (1px inside outline on open sides)
    if (!hasN) for (let x = l + 2; x <= r - 2; x++) put(x, t + 1, TL);
    if (!hasW) for (let y = t + 2; y <= bTop - 1; y++) put(l + 1, y, TL);
    if (!hasE) for (let y = t + 2; y <= bTop - 1; y++) put(r - 1, y, TD);

    // Brick seams on top surface (running bond pattern)
    const seamC = '#4e5668';
    const rowH = 8;
    for (let row = 0; row < 4; row++) {
      const sy = t + 3 + row * rowH;
      if (sy > bTop - 2) break;
      // Horizontal seam
      for (let x = l + 2; x <= r - 2; x++) put(x, sy, seamC);
      // Vertical seams (offset per row)
      const off = row % 2 === 0 ? 0 : 5;
      for (let vx = l + 4 + off; vx <= r - 2; vx += 10) {
        for (let dy = 1; dy < rowH && sy + dy <= bTop - 1; dy++) put(vx, sy + dy, seamC);
      }
    }

    // Brick seams on front face
    const fSeamC = '#283040';
    const fMidY = Math.round((bTop + 1 + bBot) / 2);
    if (bBot - bTop > 3) {
      for (let x = l + 2; x <= r - 2; x++) put(x, fMidY, fSeamC);
      for (let vx = l + 6; vx <= r - 2; vx += 10) {
        for (let y = bTop + 2; y < fMidY; y++) put(vx, y, fSeamC);
      }
      for (let vx = l + 11; vx <= r - 2; vx += 10) {
        for (let y = fMidY + 1; y < bBot - 1; y++) put(vx, y, fSeamC);
      }
    }

    if (damaged) {
      const cx = Math.round((l + r) / 2);
      const cy = Math.round((t + bTop) / 2);
      line(put, cx - 4, cy - 4, cx + 2, cy + 4, O);
      line(put, cx + 3, cy - 3, cx - 1, cy + 5, O);
      disc(put, cx + 2, cy + 1, 2, O);
      put(cx + 2, cy + 1, FD);
    }
  };
}

// ==================================================================
//  OFF-SCREEN TOWER INDICATORS (32x32 logical → 64 physical)
// ==================================================================
export function drawIndicatorArrow() {
  return (put: Put) => {
    const cx = 16, cy = 16;
    // Dark circle background
    disc(put, cx, cy, 13, P.outline);
    disc(put, cx, cy, 12, P.blueD);
    disc(put, cx, cy, 11, P.blueM);
    // Arrow icon in center
    // shaft
    rect(put, cx - 5, cy - 1, 10, 2, P.arrow);
    rect(put, cx - 5, cy, 10, 1, P.arrowD);
    // arrowhead
    put(cx + 5, cy - 3, P.stone); put(cx + 6, cy - 2, P.stone);
    put(cx + 7, cy - 1, P.stoneL); put(cx + 7, cy, P.stoneL);
    put(cx + 6, cy + 1, P.stone); put(cx + 5, cy + 2, P.stone);
    // fletching
    put(cx - 5, cy - 2, P.white); put(cx - 6, cy - 3, P.white);
    put(cx - 5, cy + 1, P.white); put(cx - 6, cy + 2, P.white);
  };
}

export function drawIndicatorCannon() {
  return (put: Put) => {
    const cx = 16, cy = 16;
    // Dark circle background
    disc(put, cx, cy, 13, P.outline);
    disc(put, cx, cy, 12, '#2a1a0e');
    disc(put, cx, cy, 11, '#3e2a18');
    // Cannonball icon
    disc(put, cx, cy, 5, P.outline);
    disc(put, cx, cy, 4, P.stoneD);
    disc(put, cx, cy, 3, P.stoneM);
    // highlight
    put(cx - 1, cy - 2, P.stone);
    put(cx, cy - 2, P.stoneL);
    put(cx - 2, cy - 1, P.stone);
  };
}

export function drawIndicatorBoss() {
  return (put: Put) => {
    const cx = 16, cy = 16;
    // Red circle background
    disc(put, cx, cy, 13, P.outline);
    disc(put, cx, cy, 12, '#4a0a0a');
    disc(put, cx, cy, 11, '#6a1a1a');
    // Skull icon: cranium
    disc(put, cx, cy - 1, 5, '#e8d8c8');
    disc(put, cx, cy - 2, 4, '#f0e4d4');
    // Eye sockets
    put(cx - 2, cy - 2, P.outline); put(cx - 2, cy - 1, P.outline);
    put(cx + 2, cy - 2, P.outline); put(cx + 2, cy - 1, P.outline);
    // Red eye glow
    put(cx - 2, cy - 2, '#ff3333'); put(cx + 2, cy - 2, '#ff3333');
    // Nose
    put(cx, cy, P.outline);
    // Jaw
    rect(put, cx - 3, cy + 2, 7, 2, '#d8c8b8');
    // Teeth
    put(cx - 2, cy + 2, P.outline); put(cx, cy + 2, P.outline); put(cx + 2, cy + 2, P.outline);
    put(cx - 2, cy + 3, P.outline); put(cx, cy + 3, P.outline); put(cx + 2, cy + 3, P.outline);
  };
}

export function drawIndicatorPointer() {
  return (put: Put) => {
    // 16x16 — small triangle/chevron pointing right
    // Will be rotated at runtime to point toward the tower
    const cx = 8, cy = 8;
    // Triangle pointing right
    for (let row = 0; row < 7; row++) {
      const w = 7 - row;
      for (let col = 0; col < w; col++) {
        const px = cx + col;
        const py = cy - 3 + row;
        if (row === 0 || row === 6 || col >= w - 1) {
          put(px, py, P.outline);
        } else {
          put(px, py, P.white);
        }
      }
    }
  };
}
