// All projectile / loot art: arrow, cannonball, boulder + shadows, and the
// 6-frame coin spin (3 tiers).

import { Put, P, rect, disc, ring } from './canvas';

// ==================================================================
//  ARROW (32x32)
// ==================================================================
export function drawArrow(frame: 0|1) {
  return (put: Put) => {
    const cy = 16;
    // shaft — shortened so total length is ~18 logical px (back at x=2, tip at x=19)
    rect(put, 4, cy - 1, 10, 1, P.arrowD);
    rect(put, 4, cy, 10, 1, P.arrow);
    rect(put, 4, cy + 1, 10, 1, P.arrowD);

    // head (diamond) — shifted left by 8
    put(14, cy, P.steel);
    put(15, cy - 1, P.steel); put(15, cy, P.steel); put(15, cy + 1, P.steel);
    put(16, cy - 2, P.steel); put(16, cy - 1, P.white); put(16, cy, P.steel); put(16, cy + 1, P.white); put(16, cy + 2, P.steel);
    put(17, cy - 1, P.steel); put(17, cy, P.steel); put(17, cy + 1, P.steel);
    put(18, cy, P.steelD);
    // head outline
    put(15, cy - 2, P.outline); put(15, cy + 2, P.outline);
    put(17, cy - 2, P.outline); put(17, cy + 2, P.outline);
    put(19, cy, P.outline);

    // fletching — unchanged; back at x=2 preserves existing nocked-arrow offsets
    put(3, cy - 2, P.white); put(4, cy - 2, P.white); put(5, cy - 2, P.white);
    put(3, cy + 2, P.white); put(4, cy + 2, P.white); put(5, cy + 2, P.white);
    put(2, cy - 1, P.red); put(2, cy, P.redD); put(2, cy + 1, P.red);
    put(6, cy - 2, P.redD); put(6, cy + 2, P.redD);

    if (frame === 1) {
      put(19, cy - 1, P.sparkL);
      put(20, cy, P.sparkL);
      put(19, cy + 1, P.sparkL);
    }
  };
}

// ==================================================================
//  CANNONBALL (32x32) — dark iron sphere with specular highlight
// ==================================================================
export function drawCannonball(frame: 0|1) {
  return (put: Put) => {
    const cx = 16, cy = 16, r = 5;
    // Main sphere body — dark iron
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const dist = Math.sqrt(dx * dx + dy * dy) / r;
        let color: string;
        if (dist < 0.4) color = '#4a4a54';       // lighter center
        else if (dist < 0.7) color = '#333340';   // mid
        else color = '#1e1e28';                    // dark edge
        put(cx + dx, cy + dy, color);
      }
    }
    // Outline ring
    for (let dy = -(r + 1); dy <= r + 1; dy++) {
      for (let dx = -(r + 1); dx <= r + 1; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > (r + 1) * (r + 1) || d2 <= r * r) continue;
        // Only draw outline where there isn't already a sphere pixel
        const innerD = Math.sqrt(dx * dx + dy * dy);
        if (innerD > r && innerD <= r + 1.2) put(cx + dx, cy + dy, P.outline);
      }
    }
    // Specular highlight — upper-left
    const hx = cx - 2, hy = cy - 2;
    put(hx, hy, '#8888a0');
    put(hx + 1, hy, '#6a6a7a');
    put(hx, hy + 1, '#6a6a7a');
    if (frame === 0) {
      put(hx - 1, hy - 1, '#aaaabc');  // bright specular dot
    } else {
      put(hx + 1, hy - 1, '#aaaabc');  // shifted slightly for subtle spin
    }
    // Bottom rivet/seam detail
    put(cx - 1, cy + 3, '#141420');
    put(cx, cy + 3, '#141420');
    put(cx + 1, cy + 3, '#141420');
  };
}

// BOULDER (32x32) — mossy rock thrown by forest boss
export function drawBoulder(frame: 0|1) {
  return (put: Put) => {
    const cx = 16, cy = 16, r = 7;
    // Craggy rock body
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const dist = Math.sqrt(dx * dx + dy * dy) / r;
        let color: string;
        if (dist < 0.3) color = '#8a8078';
        else if (dist < 0.6) color = '#6a6058';
        else color = '#4a4038';
        // Rotate detail slightly per frame
        const rx = frame === 0 ? dx : dx + 1;
        if ((rx + dy) % 5 === 0) color = '#5a5048';
        put(cx + dx, cy + dy, color);
      }
    }
    // Outline
    for (let dy = -(r+1); dy <= r+1; dy++)
      for (let dx = -(r+1); dx <= r+1; dx++) {
        const d2 = dx*dx + dy*dy;
        if (d2 > (r+1)*(r+1) || d2 <= r*r) continue;
        put(cx + dx, cy + dy, P.outline);
      }
    // Highlight upper-left
    put(cx-3, cy-3, '#aaa098'); put(cx-2, cy-4, '#b0a898');
    put(cx-4, cy-2, '#9a9088');
    if (frame === 0) put(cx-3, cy-4, '#c0b8a8');
    else put(cx-2, cy-3, '#c0b8a8');
    // Moss patches
    put(cx+2, cy-3, P.leafM); put(cx+3, cy-2, P.leaf);
    put(cx-1, cy+3, P.leafM); put(cx+1, cy+4, P.leafD);
    // Cracks
    put(cx+1, cy, '#3a3028'); put(cx+1, cy+1, '#3a3028');
    put(cx-2, cy+1, '#3a3028');
  };
}

export function drawBoulderShadow() {
  return (put: Put) => {
    const cx = 16, cy = 16;
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -5; dx <= 5; dx++) {
        const nx = dx / 5, ny = dy / 3;
        if (nx * nx + ny * ny <= 1) put(cx + dx, cy + dy, P.outline);
      }
  };
}

// Cannonball shadow (32x32) — simple dark ellipse
export function drawCannonballShadow() {
  return (put: Put) => {
    const cx = 16, cy = 16;
    // Ellipse: wider than tall
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const nx = dx / 4, ny = dy / 2;
        if (nx * nx + ny * ny <= 1) {
          put(cx + dx, cy + dy, P.outline);
        }
      }
    }
  };
}

// ==================================================================
//  COIN (32x32) — 6 spin frames
// ==================================================================
export type CoinTier = 'bronze' | 'silver' | 'gold';
export function drawCoin(frame: 0|1|2|3|4|5, tier: CoinTier = 'gold') {
  const pal = tier === 'bronze'
    ? { base: P.bronze, d: P.bronzeD, m: P.bronzeM, l: P.bronzeL }
    : tier === 'silver'
    ? { base: P.silver, d: P.silverD, m: P.silverM, l: P.silverL }
    : { base: P.gold, d: P.goldD, m: P.goldM, l: P.goldL };
  return (put: Put) => {
    const cx = 16, cy = 16;
    // shadow
    for (let dx = -5; dx <= 5; dx++)
      for (let dy = -1; dy <= 1; dy++)
        if ((dx * dx) / 25 + (dy * dy) / 1.5 <= 1) put(cx + dx, 24 + dy, P.shadow);

    // width profile: face → edge → face
    const widths = [7, 6, 3, 1, 3, 6];
    const w = widths[frame];
    const h = 7;
    // disc body
    for (let y = -h; y <= h; y++) {
      for (let x = -w; x <= w; x++) {
        if ((x * x) / (w * w + 0.1) + (y * y) / (h * h) <= 1) {
          put(cx + x, cy + y, pal.base);
        }
      }
    }
    // outline
    for (let y = -h; y <= h; y++) {
      for (let x = -w - 1; x <= w + 1; x++) {
        if ((x * x) / ((w + 1) * (w + 1) + 0.1) + (y * y) / ((h + 0.6) * (h + 0.6)) <= 1 &&
            !((x * x) / (w * w + 0.1) + (y * y) / (h * h) <= 1)) {
          put(cx + x, cy + y, pal.d);
        }
      }
    }
    // highlight arc (upper left)
    if (w >= 3) {
      for (let y = -h + 1; y <= -2; y++) {
        for (let x = -w + 1; x <= 0; x++) {
          if ((x * x) / ((w - 1) * (w - 1) + 0.1) + (y * y) / ((h - 1) * (h - 1)) <= 1) {
            put(cx + x, cy + y, pal.l);
          }
        }
      }
    }
    // shadow arc (lower right)
    if (w >= 3) {
      for (let y = 2; y <= h - 1; y++) {
        for (let x = 1; x <= w - 1; x++) {
          if ((x * x) / ((w - 1) * (w - 1) + 0.1) + (y * y) / ((h - 1) * (h - 1)) <= 1) {
            put(cx + x, cy + y, pal.m);
          }
        }
      }
    }
    // star emblem when facing (w >= 5)
    if (w >= 5) {
      put(cx, cy - 2, pal.d);
      put(cx - 1, cy, pal.d); put(cx, cy, pal.d); put(cx + 1, cy, pal.d);
      put(cx - 2, cy + 1, pal.d); put(cx + 2, cy + 1, pal.d);
      put(cx, cy + 2, pal.d);
    }
  };
}
