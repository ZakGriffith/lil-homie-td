// Hit / death / coin-pop / boulder-impact effect frames.

import { Put, P, disc, ring } from './canvas';

// ==================================================================
//  EFFECTS (32x32)
// ==================================================================
// Boulder impact (32x32) — rock shatter + dust cloud, 5 frames
export function drawBoulderImpact(frame: 0|1|2|3|4) {
  return (put: Put) => {
    const cx = 16, cy = 16;
    // Frame 0: initial hit flash + rock fragments close together
    // Frame 1-2: dust cloud expanding + fragments flying out
    // Frame 3-4: dust dissipating, fragments scattered

    // Dust cloud (expanding brown/tan disc)
    const dustR = [4, 8, 11, 12, 10][frame];
    const dustAlpha = [1, 1, 0.8, 0.5, 0.2][frame];
    if (dustAlpha > 0.2) {
      // Outer dust ring
      for (let dy = -dustR; dy <= dustR; dy++)
        for (let dx = -dustR; dx <= dustR; dx++) {
          if (dx*dx + dy*dy > dustR*dustR) continue;
          const dist = Math.sqrt(dx*dx + dy*dy) / dustR;
          if (dist > 0.6 && dustAlpha > 0.3)
            put(cx+dx, cy+dy, '#8a7a60');
          else if (dist > 0.3)
            put(cx+dx, cy+dy, '#a09078');
        }
    }

    // Core flash (bright on early frames)
    if (frame < 2) {
      const coreR = frame === 0 ? 4 : 2;
      disc(put, cx, cy, coreR, frame === 0 ? '#fffbd0' : '#e0d0a0');
    }

    // Rock fragments flying outward
    const fragDist = [3, 6, 9, 12, 14][frame];
    const numFrags = 8;
    const rockCols = ['#7a7068', '#6a6058', '#8a8078', '#5a5048', '#4a4038'];
    for (let i = 0; i < numFrags; i++) {
      const a = (i / numFrags) * Math.PI * 2 + 0.3;
      const fd = fragDist + (i % 3) - 1;
      const fx = Math.round(cx + Math.cos(a) * fd);
      const fy = Math.round(cy + Math.sin(a) * fd);
      if (frame < 4) {
        // Rock chunk (2x2 on early frames, 1x1 later)
        const col = rockCols[i % rockCols.length];
        put(fx, fy, col);
        if (frame < 3) {
          put(fx+1, fy, col);
          put(fx, fy+1, col);
        }
        // Moss on some fragments
        if (i % 3 === 0 && frame < 3) put(fx+1, fy+1, P.leafM);
      }
    }

    // Ground crack lines (appear frame 1+, persist)
    if (frame >= 1 && frame <= 3) {
      const crackLen = [0, 5, 8, 6, 0][frame];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        for (let d = 2; d < crackLen; d++) {
          const px = Math.round(cx + Math.cos(a) * d);
          const py = Math.round(cy + Math.sin(a) * d);
          put(px, py, '#3a3028');
        }
      }
    }

    // Small pebbles bouncing (frames 2-4)
    if (frame >= 2) {
      const pebbleDist = [0, 0, 6, 10, 13][frame];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 1.2;
        const px = Math.round(cx + Math.cos(a) * pebbleDist);
        const py = Math.round(cy + Math.sin(a) * pebbleDist - (frame < 4 ? 2 : 0));
        if (frame < 4) put(px, py, '#6a6058');
      }
    }
  };
}

export function drawHitSpark(frame: 0|1|2) {
  return (put: Put) => {
    const cx = 16, cy = 16;
    const r = 3 + frame * 2;
    disc(put, cx, cy, Math.max(1, 3 - frame), frame === 0 ? P.white : P.sparkL);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + frame * 0.25;
      const d = r;
      const x = Math.round(cx + Math.cos(a) * d);
      const y = Math.round(cy + Math.sin(a) * d);
      put(x, y, P.sparkL);
      put(Math.round(cx + Math.cos(a) * (d - 1)), Math.round(cy + Math.sin(a) * (d - 1)), P.spark);
      put(Math.round(cx + Math.cos(a) * (d + 1)), Math.round(cy + Math.sin(a) * (d + 1)), P.white);
    }
  };
}
export function drawDeathBurst(frame: 0|1|2|3|4) {
  return (put: Put) => {
    const cx = 16, cy = 16;
    const r = 3 + frame * 2;
    if (frame < 3) disc(put, cx, cy, r, P.sparkL);
    disc(put, cx, cy, Math.max(0, r - 2), frame < 2 ? P.white : P.spark);
    // shrapnel ring
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + frame * 0.2;
      const d = r + 3;
      const px = Math.round(cx + Math.cos(a) * d);
      const py = Math.round(cy + Math.sin(a) * d);
      put(px, py, P.red);
      put(px + 1, py, P.redD);
    }
  };
}
export function drawCoinPop(frame: 0|1|2) {
  return (put: Put) => {
    const cx = 16, cy = 16;
    const r = 3 + frame * 2;
    ring(put, cx, cy, r, P.goldL);
    ring(put, cx, cy, r - 1, P.gold);
    if (frame === 0) disc(put, cx, cy, 2, P.white);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + frame * 0.3;
      const d = r + 1;
      put(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), P.goldL);
    }
  };
}
