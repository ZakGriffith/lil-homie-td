// Procedural pixel art drawn at logical resolution then Scale2x'd to 2× physical.
// Logical sizes: gameplay sprites 32→64px, towers/boss 64→128px.
// All sprites use setScale(0.5) to maintain the same world-space dimensions.
// Every frame is registered as its own texture and animations reference them
// in order via registerAnimations().

import Phaser from 'phaser';

type Put = (x: number, y: number, c: string | null) => void;

// ------------------------------------------------------------------
//  Palette
// ------------------------------------------------------------------
const P = {
  outline: '#0b0f1a',
  shadow:  '#141a2e',

  skin:    '#f2c79a',
  skinD:   '#b07c4e',
  skinL:   '#ffe1bf',

  blue:    '#4a90e2',
  blueD:   '#1e3c7a',
  blueM:   '#2f68b8',
  blueL:   '#a8d1ff',

  red:     '#d9412b',
  redD:    '#6e1a0e',
  redM:    '#a32a18',
  redL:    '#ff7a5c',

  heavy:   '#7a1d14',
  heavyD:  '#2a0704',
  heavyM:  '#5a1208',
  heavyL:  '#b8342a',

  wood:    '#8b5a2b',
  woodD:   '#3e2310',
  woodM:   '#6b4220',
  woodL:   '#c08850',

  stone:   '#8892a0',
  stoneD:  '#3e4654',
  stoneM:  '#5a6270',
  stoneL:  '#b6bfcc',

  gold:    '#ffd84a',
  goldD:   '#7a4e08',
  goldM:   '#c08820',
  goldL:   '#fff0a0',

  bronze:  '#c47a3e',
  bronzeD: '#4a2408',
  bronzeM: '#8b4513',
  bronzeL: '#e8a572',

  silver:  '#c8d0d8',
  silverD: '#4a525a',
  silverM: '#7a8090',
  silverL: '#eef2f6',

  steel:   '#c0c8d4',
  steelD:  '#5a6270',

  arrow:   '#d8b878',
  arrowD:  '#4a3210',

  white:   '#ffffff',
  spark:   '#ffe070',
  sparkL:  '#fffbd0',

  grass:   '#2e4a2a',
  grassD:  '#1a2e18',
  grassM:  '#243d22',
  grassL:  '#3e5f38',

  // boss belly
  belly:   '#d89080',
  bellyD:  '#7a3a2a',
  bellyM:  '#a8604a',

  // archer tower extras
  tunic:   '#2a7a3a',
  tunicD:  '#1a4a24',
  tunicL:  '#3a9a4a',
  hood:    '#3a5a2a',
  hoodD:   '#1a3a18',
  stoneHL: '#d0d8e4',
  banner:  '#c04040',
  bannerL: '#e06060'
};

// ------------------------------------------------------------------
//  Draw helpers
// ------------------------------------------------------------------

// Resolution scale — every sprite is drawn at logical res then Scale2x'd to 2× physical
const S = 2;

// Scale2x pixel-art upscaler: preserves hard edges while smoothing staircase diagonals
function pxIdx(w: number, x: number, y: number) { return (y * w + x) * 4; }
function pxEq(d: Uint8ClampedArray, w: number, x1: number, y1: number, x2: number, y2: number): boolean {
  const i = pxIdx(w, x1, y1), j = pxIdx(w, x2, y2);
  return d[i] === d[j] && d[i + 1] === d[j + 1] && d[i + 2] === d[j + 2] && d[i + 3] === d[j + 3];
}
function pxCopy(s: Uint8ClampedArray, sw: number, sx: number, sy: number,
                d: Uint8ClampedArray, dw: number, dx: number, dy: number) {
  const si = pxIdx(sw, sx, sy), di = pxIdx(dw, dx, dy);
  d[di] = s[si]; d[di + 1] = s[si + 1]; d[di + 2] = s[si + 2]; d[di + 3] = s[si + 3];
}
function scale2x(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number) {
  const dw = w * 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ay = Math.max(0, y - 1);          // up
      const bx = Math.min(w - 1, x + 1);      // right
      const cx = Math.max(0, x - 1);           // left
      const dy2 = Math.min(h - 1, y + 1);     // down

      const ca = pxEq(src, w, cx, y, x, ay);
      const ab = pxEq(src, w, x, ay, bx, y);
      const cd = pxEq(src, w, cx, y, x, dy2);
      const bd = pxEq(src, w, bx, y, x, dy2);

      const ox = x * 2, oy = y * 2;

      if (ca && !cd && !ab) pxCopy(src, w, x, ay, dst, dw, ox, oy);
      else pxCopy(src, w, x, y, dst, dw, ox, oy);

      if (ab && !ca && !bd) pxCopy(src, w, bx, y, dst, dw, ox + 1, oy);
      else pxCopy(src, w, x, y, dst, dw, ox + 1, oy);

      if (cd && !bd && !ca) pxCopy(src, w, cx, y, dst, dw, ox, oy + 1);
      else pxCopy(src, w, x, y, dst, dw, ox, oy + 1);

      if (bd && !ab && !cd) pxCopy(src, w, bx, y, dst, dw, ox + 1, oy + 1);
      else pxCopy(src, w, x, y, dst, dw, ox + 1, oy + 1);
    }
  }
}

function makeCanvas(size: number, draw: (put: Put) => void): HTMLCanvasElement {
  // Draw at logical resolution
  const logCanvas = document.createElement('canvas');
  logCanvas.width = size; logCanvas.height = size;
  const logCtx = logCanvas.getContext('2d')!;
  logCtx.imageSmoothingEnabled = false;
  const put: Put = (x, y, col) => {
    if (col == null) return;
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    logCtx.fillStyle = col;
    logCtx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  };
  draw(put);

  // Scale2x upscale to 2× physical resolution
  const physSize = size * S;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = physSize; outCanvas.height = physSize;
  const outCtx = outCanvas.getContext('2d')!;
  outCtx.imageSmoothingEnabled = false;

  const srcData = logCtx.getImageData(0, 0, size, size);
  const dstData = outCtx.createImageData(physSize, physSize);
  scale2x(srcData.data, dstData.data, size, size);
  outCtx.putImageData(dstData, 0, 0);

  return outCanvas;
}

function rect(put: Put, x: number, y: number, w: number, h: number, c: string | null) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c);
}
function disc(put: Put, cx: number, cy: number, r: number, c: string | null) {
  const r2 = r * r + r * 0.4;
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r2) put(cx + x, cy + y, c);
}
function ring(put: Put, cx: number, cy: number, r: number, c: string | null) {
  const outer = r * r + r * 0.4;
  const inner = (r - 1) * (r - 1) + (r - 1) * 0.4;
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const d = x * x + y * y;
      if (d <= outer && d > inner) put(cx + x, cy + y, c);
    }
}
function line(put: Put, x0: number, y0: number, x1: number, y1: number, c: string) {
  let x = x0, y = y0;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (let i = 0; i < 200; i++) {
    put(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}
function ellipse(put: Put, cx: number, cy: number, rx: number, ry: number, c: string | null) {
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++)
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) put(cx + x, cy + y, c);
}
function flashOverlay(put: Put, size: number, within: (x: number, y: number) => boolean) {
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (within(x, y)) put(x, y, P.white);
}

// ==================================================================
//  PLAYER (32x32) — top-down blue-clad hero, 16px wide body
// ==================================================================
type PFrame = 'idle0'|'idle1'|'move0'|'move1'|'move2'|'move3'|'shoot0'|'shoot1'|'hit';

function drawPlayer(frame: PFrame) {
  return (put: Put) => {
    const cx = 16;
    const bob = frame === 'idle1' ? 1 : 0;

    // ----- shadow ellipse under feet
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -6; dx <= 6; dx++)
        if ((dx * dx) / 36 + (dy * dy) / 1.5 <= 1) put(cx + dx, 28 + dy, P.shadow);

    // ----- legs
    let lLeftY = 0, lRightY = 0;
    if (frame === 'move0') { lLeftY = -1; lRightY = 1; }
    if (frame === 'move2') { lLeftY = 1; lRightY = -1; }
    if (frame === 'move1' || frame === 'move3') { /* center */ }
    // left leg
    rect(put, cx - 4, 22 + lLeftY, 3, 5, P.blueD);
    rect(put, cx - 4, 27 + lLeftY, 3, 1, P.outline); // boot
    // right leg
    rect(put, cx + 1, 22 + lRightY, 3, 5, P.blueD);
    rect(put, cx + 1, 27 + lRightY, 3, 1, P.outline);

    // ----- torso (tunic) -----
    const torsoY = 13 + bob;
    rect(put, cx - 6, torsoY, 12, 9, P.blue);
    // highlight band along top + left shoulder
    rect(put, cx - 6, torsoY, 12, 1, P.blueL);
    rect(put, cx - 6, torsoY + 1, 1, 8, P.blueM);
    rect(put, cx + 5, torsoY + 1, 1, 8, P.blueD);
    rect(put, cx - 5, torsoY + 8, 10, 1, P.blueD);
    // belt
    rect(put, cx - 6, torsoY + 6, 12, 1, P.woodD);
    put(cx, torsoY + 6, P.goldL); // buckle
    // chest strap
    rect(put, cx - 2, torsoY + 1, 4, 1, P.blueL);

    // ----- shoulder stubs (arms are on the bow sprite) -----
    const armY = torsoY + 2;
    // left shoulder nub
    rect(put, cx - 7, armY, 2, 3, P.blue);
    put(cx - 7, armY, P.blueL);
    // right shoulder nub
    rect(put, cx + 5, armY, 2, 3, P.blue);
    put(cx + 6, armY, P.blueL);

    // ----- head -----
    const headCx = cx, headCy = 9 + bob;
    disc(put, headCx, headCy, 4, P.skin);
    // hair cap
    for (let y = -4; y <= -1; y++)
      for (let x = -4; x <= 4; x++)
        if (x * x + y * y <= 16) put(headCx + x, headCy + y, P.woodD);
    // hair highlight
    put(headCx - 2, headCy - 3, P.wood);
    put(headCx - 1, headCy - 4, P.wood);
    // eyes
    put(headCx - 2, headCy, P.outline);
    put(headCx + 1, headCy, P.outline);
    // mouth
    put(headCx, headCy + 2, P.skinD);
    // chin shadow
    put(headCx - 1, headCy + 3, P.skinD);
    put(headCx + 1, headCy + 3, P.skinD);
    // neck
    rect(put, cx - 1, headCy + 4, 3, 1, P.skinD);

    // ----- hit flash overlay (white-out) -----
    if (frame === 'hit') {
      for (let y = 5; y < 30; y++) {
        for (let x = 4; x < 28; x++) {
          // can't easily re-test silhouette; do a simple body-area flash
          if (y >= headCy - 4 && y <= 29 && x >= cx - 8 && x <= cx + 8) put(x, y, P.white);
        }
      }
    }
  };
}

// ==================================================================
//  BOW (32x32) — separate rotatable weapon sprite
//  Drawn pointing right. Origin set to (0.25, 0.5) = grip area at ~(8, 16).
// ==================================================================
function drawBow(shooting: boolean) {
  return (put: Put) => {
    const gx = 8, gy = 16; // grip / pivot point

    // ===== BACK ARM (string hand) =====
    // Extends from body (left) to the string pull point
    const stringPullX = shooting ? gx - 4 : gx;
    // upper arm from shoulder area
    rect(put, gx - 6, gy - 1, 2, 3, P.blue);
    put(gx - 6, gy - 1, P.blueL);
    // forearm reaching to string
    const backArmLen = Math.abs(stringPullX - (gx - 4));
    for (let x = gx - 4; x >= stringPullX; x--) {
      rect(put, x, gy - 1, 1, 3, P.blueM);
    }
    // string hand
    rect(put, stringPullX - 1, gy - 1, 2, 3, P.skin);
    put(stringPullX - 1, gy + 1, P.skinD);

    // ===== FRONT ARM (bow hand) =====
    // Extends from body (left) out to the grip
    // upper arm
    rect(put, gx - 6, gy - 2, 2, 3, P.blue);
    put(gx - 6, gy - 2, P.blueL);
    // forearm
    rect(put, gx - 4, gy - 2, 4, 3, P.blueM);
    rect(put, gx - 4, gy - 2, 4, 1, P.blueL);
    // grip hand
    rect(put, gx, gy - 2, 3, 4, P.skin);
    put(gx, gy - 2, P.skinL);
    put(gx + 2, gy + 1, P.skinD);

    // ===== BOW (wooden arc) =====
    for (let y = -10; y <= 10; y++) {
      const curve = Math.round(y * y * 0.04);
      const bx = gx + 4 - curve;
      put(bx + 1, gy + y, P.woodD);
      put(bx, gy + y, P.wood);
      put(bx - 1, gy + y, P.woodL);
    }
    // Limb tips (steel caps)
    rect(put, gx + 3, gy - 10, 2, 2, P.steel);
    rect(put, gx + 3, gy + 9, 2, 2, P.steel);

    // ===== BOWSTRING =====
    for (let y = -9; y <= 9; y++) {
      const pull = shooting ? Math.round((1 - (y * y) / 81) * 4) : 0;
      put(gx + 1 - pull, gy + y, P.stoneL);
    }

    // ===== ARROW =====
    const arrowStartX = shooting ? gx - 4 : gx + 1;
    for (let x = arrowStartX; x <= gx + 14; x++) {
      put(x, gy, P.arrowD);
    }
    // arrowhead
    put(gx + 15, gy, P.steel);
    put(gx + 16, gy - 1, P.steel);
    put(gx + 16, gy, P.steel);
    put(gx + 16, gy + 1, P.steel);
    // fletching
    put(arrowStartX, gy - 1, P.white);
    put(arrowStartX, gy + 1, P.white);
    put(arrowStartX - 1, gy - 1, P.white);
    put(arrowStartX - 1, gy + 1, P.white);

    // Muzzle flash when shooting
    if (shooting) {
      put(gx + 17, gy, P.sparkL);
      put(gx + 18, gy - 1, P.spark);
      put(gx + 18, gy + 1, P.spark);
    }
  };
}

// ==================================================================
//  ENEMY BASIC (32x32) — small fast red goblin
// ==================================================================
type EFrame = 'move0'|'move1'|'move2'|'move3'|'atk0'|'atk1'|'hit'|'die0'|'die1'|'die2'|'die3';

function drawEnemyBasic(f: EFrame) {
  return (put: Put) => {
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 8 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 18, r, P.red);
      disc(put, 16, 18, Math.max(0, r - 1), P.redL);
      // splat debris
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + step * 0.4;
        const d = step * 3 + 3;
        const px = Math.round(16 + Math.cos(a) * d);
        const py = Math.round(18 + Math.sin(a) * d);
        put(px, py, P.redD);
        put(px + 1, py, P.red);
      }
      return;
    }
    const flash = f === 'hit';
    const body = flash ? P.white : P.red;
    const bodyD = flash ? P.white : P.redD;
    const bodyM = flash ? P.white : P.redM;
    const bodyL = flash ? P.white : P.redL;

    // ----- shadow -----
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -6; dx <= 6; dx++)
        if ((dx * dx) / 36 + (dy * dy) / 1.5 <= 1) put(16 + dx, 28 + dy, P.shadow);

    // ----- feet (tiny claws) -----
    let footY = 0;
    if (f === 'move1') footY = -1;
    if (f === 'move3') footY = 1;
    rect(put, 11, 25 + footY, 3, 2, bodyD);
    rect(put, 18, 25 - footY, 3, 2, bodyD);
    put(10, 26 + footY, P.outline);
    put(21, 26 - footY, P.outline);
    put(13, 27 + footY, P.outline);
    put(18, 27 - footY, P.outline);

    // ----- body (round with spines) -----
    disc(put, 16, 17, 8, bodyD);
    disc(put, 16, 17, 7, body);
    disc(put, 16, 16, 5, bodyL);
    // back spines
    put(10, 12, P.outline); put(11, 11, bodyD);
    put(13, 10, P.outline); put(14, 9, bodyD);
    put(18, 9, P.outline); put(19, 10, bodyD);
    put(21, 11, P.outline); put(22, 12, bodyD);

    // ----- face area -----
    // eyes
    put(12, 16, P.white); put(13, 16, P.white);
    put(19, 16, P.white); put(20, 16, P.white);
    put(12, 16, P.outline); put(20, 16, P.outline);
    // brow
    rect(put, 11, 15, 3, 1, bodyM);
    rect(put, 18, 15, 3, 1, bodyM);
    // fangs / mouth
    if (f === 'atk0') {
      rect(put, 13, 19, 6, 2, P.outline);
      put(14, 20, P.white); put(17, 20, P.white);
    } else if (f === 'atk1') {
      rect(put, 13, 18, 6, 4, P.outline);
      put(14, 19, P.white); put(17, 19, P.white);
      put(15, 21, P.white); put(16, 21, P.white);
    } else {
      rect(put, 14, 19, 4, 1, P.outline);
      put(14, 20, P.white); put(17, 20, P.white);
    }

    // little arms/claws
    put(7, 18, bodyD); put(8, 19, bodyD); put(8, 18, body);
    put(25, 18, bodyD); put(24, 19, bodyD); put(24, 18, body);
  };
}

// ==================================================================
//  ENEMY HEAVY (32x32) — bigger dark-red armored brute
// ==================================================================
function drawEnemyHeavy(f: EFrame) {
  return (put: Put) => {
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 10 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 18, r, P.heavy);
      disc(put, 16, 18, Math.max(0, r - 1), P.heavyL);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + step * 0.3;
        const d = step * 3 + 4;
        put(Math.round(16 + Math.cos(a) * d), Math.round(18 + Math.sin(a) * d), P.heavyD);
      }
      return;
    }
    const flash = f === 'hit';
    const body = flash ? P.white : P.heavy;
    const bodyD = flash ? P.white : P.heavyD;
    const bodyM = flash ? P.white : P.heavyM;
    const bodyL = flash ? P.white : P.heavyL;

    // shadow
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -8; dx <= 8; dx++)
        if ((dx * dx) / 64 + (dy * dy) / 1.5 <= 1) put(16 + dx, 29 + dy, P.shadow);

    // feet (heavy stompers)
    let footY = 0;
    if (f === 'move1') footY = -1;
    if (f === 'move3') footY = 1;
    rect(put, 9, 26 + footY, 5, 3, bodyD);
    rect(put, 18, 26 - footY, 5, 3, bodyD);
    rect(put, 9, 28 + footY, 5, 1, P.outline);
    rect(put, 18, 28 - footY, 5, 1, P.outline);

    // main body
    disc(put, 16, 17, 10, bodyD);
    disc(put, 16, 17, 9, body);
    disc(put, 16, 16, 7, bodyL);
    // armor plates
    rect(put, 10, 18, 12, 1, bodyD);
    rect(put, 10, 21, 12, 1, bodyD);
    rect(put, 14, 13, 4, 1, bodyD);
    // rivets
    put(11, 18, P.steel); put(15, 18, P.steel); put(20, 18, P.steel);
    put(11, 21, P.steel); put(15, 21, P.steel); put(20, 21, P.steel);

    // horns
    put(9, 8, P.outline); put(10, 9, bodyD); put(11, 10, body);
    put(23, 8, P.outline); put(22, 9, bodyD); put(21, 10, body);

    // glowing eyes
    put(11, 14, P.redL); put(12, 14, P.white);
    put(20, 14, P.white); put(21, 14, P.redL);
    put(11, 15, P.redD); put(21, 15, P.redD);

    // tusks / mouth
    if (f === 'atk0' || f === 'atk1') {
      rect(put, 12, 18, 9, 3, P.outline);
      put(12, 20, P.white); put(14, 20, P.white); put(17, 20, P.white); put(19, 20, P.white);
      if (f === 'atk1') put(16, 21, P.red);
    } else {
      rect(put, 13, 19, 7, 1, P.outline);
      put(13, 20, P.white);
      put(19, 20, P.white);
    }

    // big shoulders
    rect(put, 5, 15, 3, 3, bodyD);
    rect(put, 24, 15, 3, 3, bodyD);
    put(6, 15, bodyM);
    put(25, 15, bodyM);
  };
}

// ==================================================================
//  TOWER (64x64) — 2x2 tile crossbow turret
// ==================================================================
function drawTowerBase(put: Put) {
  // 3/4 top-down Kingdom Rush style tower base — fills 64×64 canvas
  // Camera ~35° from above: large top surface + front face below
  // Intentionally bleeds past top edge for taller presence
  const cx = 32;
  const faceTop = 22; // where top surface ends, front face begins (shifted up)
  const faceBot = 62; // bottom of visible front
  const faceHW = 26;  // half-width of front

  // Ground shadow
  for (let dy = -5; dy <= 5; dy++)
    for (let dx = -30; dx <= 30; dx++)
      if ((dx * dx) / 900 + (dy * dy) / 25 <= 1) put(cx + dx, 60 + dy, P.shadow);

  // --- Front face (stone wall visible below the top surface) ---
  for (let y = faceTop; y < faceBot; y++) {
    const yPct = (y - faceTop) / (faceBot - faceTop);
    const hw = Math.round(faceHW + yPct * 2);
    for (let x = -hw; x <= hw; x++) {
      const t = (x + hw) / (hw * 2);
      let col: string;
      if (t < 0.07)      col = P.outline;
      else if (t < 0.2)  col = P.stoneD;
      else if (t < 0.5)  col = P.stoneM;
      else if (t < 0.78) col = P.stone;
      else if (t < 0.93) col = P.stoneL;
      else                col = P.outline;
      put(cx + x, y, col);
    }
  }
  // Bottom edge
  for (let x = -29; x <= 29; x++) put(cx + x, faceBot, P.outline);

  // Stone block seams on front
  for (let row = 0; row < 5; row++) {
    const by = faceTop + 2 + row * 6;
    if (by >= faceBot - 1) break;
    for (let x = -faceHW + 1; x < faceHW; x++) put(cx + x, by, P.stoneD);
    const off = row % 2 === 0 ? 0 : 6;
    for (let vx = -faceHW + 3 + off; vx < faceHW; vx += 11) {
      for (let dy = 0; dy < 6 && by + dy < faceBot; dy++) put(cx + vx, by + dy, P.stoneD);
    }
  }

  // Arrow slit on front
  rect(put, cx - 1, faceTop + 8, 3, 10, P.outline);
  put(cx - 2, faceTop + 13, P.outline);
  put(cx + 2, faceTop + 13, P.outline);

  // Door at base
  rect(put, cx - 4, faceBot - 10, 8, 10, P.outline);
  rect(put, cx - 3, faceBot - 9, 6, 8, '#1a1a2a');
  put(cx - 3, faceBot - 10, P.stoneM); put(cx + 2, faceBot - 10, P.stoneM);
  // Door arch
  put(cx - 2, faceBot - 11, P.stoneM); put(cx + 1, faceBot - 11, P.stoneM);

  // --- TOP SURFACE (large elliptical stone platform seen from above) ---
  ellipse(put, cx, faceTop - 1, 28, 14, P.outline);
  ellipse(put, cx, faceTop - 1, 27, 13, P.stoneD);
  ellipse(put, cx, faceTop - 2, 25, 12, P.stoneM);
  ellipse(put, cx, faceTop - 3, 21, 10, P.stone);
  // Light highlight on upper-left
  ellipse(put, cx - 4, faceTop - 7, 12, 6, P.stoneL);
  ellipse(put, cx - 6, faceTop - 9, 6, 3, P.stoneHL);

  // --- Crenellations around rim ---
  const crenCount = 10;
  for (let i = 0; i < crenCount; i++) {
    const angle = (i / crenCount) * Math.PI * 2 - Math.PI * 0.1;
    const mx = Math.round(cx + Math.cos(angle) * 26);
    const my = Math.round(faceTop - 1 + Math.sin(angle) * 12);
    // Each merlon is a small block
    rect(put, mx - 2, my - 3, 4, 4, P.outline);
    if (angle > Math.PI * 0.3 && angle < Math.PI * 1.3) {
      rect(put, mx - 1, my - 2, 3, 3, P.stoneD);
      put(mx, my - 3, P.stoneM);
    } else {
      rect(put, mx - 1, my - 2, 3, 2, P.stoneM);
      put(mx, my - 3, P.stoneL);
    }
  }

  // Inner floor (darker standing area)
  ellipse(put, cx, faceTop - 2, 18, 8, P.stoneD);
  ellipse(put, cx, faceTop - 3, 15, 6, '#4a4e58');
}

// Static ballista stand — drawn as its own sprite, does NOT rotate
function drawBallistaStand(put: Put) {
  const cx = 32, cy = 32;

  // Center post
  rect(put, cx - 2, cy - 2, 4, 12, P.outline);
  rect(put, cx - 1, cy - 1, 2, 10, P.woodD);
  put(cx - 1, cy - 1, P.woodM); put(cx, cy - 1, P.wood);
  put(cx - 1, cy, P.woodD); put(cx, cy, P.woodM);

  // Tripod legs
  line(put, cx - 1, cy + 6, cx - 7, cy + 10, P.outline);
  line(put, cx - 1, cy + 7, cx - 6, cy + 10, P.woodD);
  rect(put, cx - 8, cy + 10, 3, 2, P.outline);
  rect(put, cx - 7, cy + 10, 2, 1, P.woodM);
  line(put, cx + 1, cy + 6, cx + 7, cy + 10, P.outline);
  line(put, cx + 1, cy + 7, cx + 6, cy + 10, P.woodD);
  rect(put, cx + 6, cy + 10, 3, 2, P.outline);
  rect(put, cx + 6, cy + 10, 2, 1, P.woodM);
  line(put, cx, cy + 7, cx, cy + 11, P.outline);
  put(cx - 1, cy + 11, P.outline); put(cx + 1, cy + 11, P.outline);
  put(cx, cy + 10, P.woodM);

  // Pivot bracket (metal)
  rect(put, cx - 3, cy - 4, 6, 4, P.outline);
  rect(put, cx - 2, cy - 3, 4, 2, P.silverD);
  put(cx - 1, cy - 3, P.silverM); put(cx, cy - 3, P.silver);
  put(cx + 1, cy - 3, P.silverM);
}

// ------------------------------------------------------------------
// Tower archer — green-robed archer standing on tower, same style as player
// Static body sprite (32x32), bow is separate and rotatable
// ------------------------------------------------------------------
function drawTowerArcher(put: Put) {
  const cx = 16;

  // Shadow
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -5; dx <= 5; dx++)
      if ((dx * dx) / 25 + (dy * dy) / 1.5 <= 1) put(cx + dx, 27 + dy, P.shadow);

  // Legs
  rect(put, cx - 3, 22, 3, 4, P.tunicD);
  rect(put, cx - 3, 26, 3, 1, P.outline);
  rect(put, cx + 1, 22, 3, 4, P.tunicD);
  rect(put, cx + 1, 26, 3, 1, P.outline);

  // Torso (green tunic)
  const ty = 13;
  rect(put, cx - 5, ty, 11, 9, P.tunic);
  rect(put, cx - 5, ty, 11, 1, P.tunicL);
  rect(put, cx - 5, ty + 1, 1, 8, P.tunicL);
  rect(put, cx + 5, ty + 1, 1, 8, P.tunicD);
  rect(put, cx - 4, ty + 8, 9, 1, P.tunicD);
  // Belt
  rect(put, cx - 5, ty + 6, 11, 1, P.woodD);
  put(cx, ty + 6, P.goldL);

  // Shoulder stubs
  rect(put, cx - 6, ty + 2, 2, 3, P.tunic);
  put(cx - 6, ty + 2, P.tunicL);
  rect(put, cx + 5, ty + 2, 2, 3, P.tunic);

  // Head with hood
  const hx = cx, hy = 9;
  disc(put, hx, hy, 4, P.skin);
  // Hood
  for (let y = -4; y <= -1; y++)
    for (let x = -4; x <= 4; x++)
      if (x * x + y * y <= 16) put(hx + x, hy + y, P.hood);
  // Hood point
  put(hx, hy - 5, P.hoodD); put(hx - 1, hy - 5, P.hoodD);
  put(hx, hy - 6, P.outline);
  // Hood highlight
  put(hx - 2, hy - 3, P.tunic); put(hx - 1, hy - 4, P.tunic);
  // Face
  rect(put, hx - 2, hy, 5, 2, P.skin);
  put(hx - 2, hy, P.skinL); put(hx - 1, hy, P.skinL);
  put(hx + 1, hy, P.skinD); put(hx + 2, hy, P.skinD);
  // Eyes
  put(hx - 1, hy + 1, P.outline); put(hx + 1, hy + 1, P.outline);
  // Neck
  rect(put, cx - 1, hy + 4, 3, 1, P.skinD);

  // Quiver on back
  rect(put, cx - 4, ty + 1, 2, 6, P.woodD);
  put(cx - 4, ty + 1, P.woodM); put(cx - 3, ty + 1, P.woodM);
  // Arrow tips poking out
  put(cx - 4, ty, P.steel); put(cx - 3, ty, P.steel);
  put(cx - 4, ty - 1, P.steelD);
}

// Tower archer bow — same as player bow but green arms
function drawTowerBow(shooting: boolean) {
  return (put: Put) => {
    const gx = 8, gy = 16;

    // Back arm (string hand)
    const stringPullX = shooting ? gx - 4 : gx;
    rect(put, gx - 6, gy - 1, 2, 3, P.tunic);
    put(gx - 6, gy - 1, P.tunicL);
    for (let x = gx - 4; x >= stringPullX; x--) {
      rect(put, x, gy - 1, 1, 3, P.tunicD);
    }
    rect(put, stringPullX - 1, gy - 1, 2, 3, P.skin);
    put(stringPullX - 1, gy + 1, P.skinD);

    // Front arm (bow hand)
    rect(put, gx - 6, gy - 2, 2, 3, P.tunic);
    put(gx - 6, gy - 2, P.tunicL);
    rect(put, gx - 4, gy - 2, 4, 3, P.tunicD);
    rect(put, gx - 4, gy - 2, 4, 1, P.tunicL);
    rect(put, gx, gy - 2, 3, 4, P.skin);
    put(gx, gy - 2, P.skinL);
    put(gx + 2, gy + 1, P.skinD);

    // Bow (wooden arc)
    for (let y = -10; y <= 10; y++) {
      const curve = Math.round(y * y * 0.04);
      const bx = gx + 4 - curve;
      put(bx + 1, gy + y, P.woodD);
      put(bx, gy + y, P.wood);
      put(bx - 1, gy + y, P.woodL);
    }
    rect(put, gx + 3, gy - 10, 2, 2, P.steel);
    rect(put, gx + 3, gy + 9, 2, 2, P.steel);

    // Bowstring
    for (let y = -9; y <= 9; y++) {
      const pull = shooting ? Math.round((1 - (y * y) / 81) * 4) : 0;
      put(gx + 1 - pull, gy + y, P.stoneL);
    }

    // Arrow
    const arrowStartX = shooting ? gx - 4 : gx + 1;
    for (let x = arrowStartX; x <= gx + 14; x++) {
      put(x, gy, P.arrowD);
    }
    put(gx + 15, gy, P.steel);
    put(gx + 16, gy - 1, P.steel);
    put(gx + 16, gy, P.steel);
    put(gx + 16, gy + 1, P.steel);
    put(arrowStartX, gy - 1, P.white);
    put(arrowStartX, gy + 1, P.white);
    put(arrowStartX - 1, gy - 1, P.white);
    put(arrowStartX - 1, gy + 1, P.white);

    if (shooting) {
      put(gx + 17, gy, P.sparkL);
      put(gx + 18, gy - 1, P.spark);
      put(gx + 18, gy + 1, P.spark);
    }
  };
}

// Legacy wrapper
function drawTowerTop(shoot = false) {
  return drawTowerBow(shoot);
}

// ==================================================================
//  CANNON TURRET TOP (64x64) — fat dark cannon, pivot (32,32), aims right
// ==================================================================
function drawCannonTop(shoot = false) {
  return (put: Put) => {
    const cx = 32, cy = 32;

    // shadow under the whole assembly
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -12; dx <= 18; dx++)
        if ((dx * dx) / 324 + (dy * dy) / 20 <= 1) put(cx + dx, cy + 7 + dy, P.shadow);

    // ----- trunnion mount / carriage (wide dark block under the barrel)
    rect(put, cx - 9, cy + 2, 18, 6, P.outline);
    rect(put, cx - 8, cy + 2, 16, 5, P.stoneD);
    rect(put, cx - 8, cy + 2, 16, 1, P.stoneM);
    // iron bands on the carriage
    rect(put, cx - 4, cy + 2, 1, 5, P.outline);
    rect(put, cx + 3,  cy + 2, 1, 5, P.outline);
    // rivets
    put(cx - 6, cy + 4, P.steel);
    put(cx + 1, cy + 4, P.steel);
    put(cx + 6, cy + 4, P.steel);

    // ----- barrel (thick dark cylinder running along x)
    // outline first
    rect(put, cx - 6, cy - 6, 28, 11, P.outline);
    // main body dark iron
    rect(put, cx - 5, cy - 5, 26, 9, P.stoneD);
    // lower shade
    rect(put, cx - 5, cy + 2, 26, 2, '#20242e');
    // top highlight stripe (cylindrical lighting)
    rect(put, cx - 4, cy - 5, 24, 1, P.stoneM);
    rect(put, cx - 3, cy - 4, 22, 1, P.stone);
    // subtle mid gleam
    rect(put, cx + 2, cy - 4, 8, 1, P.stoneL);

    // ----- breech ring (back of the barrel)
    rect(put, cx - 7, cy - 6, 2, 11, P.outline);
    rect(put, cx - 6, cy - 5, 1, 9, P.stoneM);
    // breech cap bulge
    put(cx - 8, cy - 2, P.outline);
    put(cx - 8, cy - 1, P.outline);
    put(cx - 8, cy,     P.outline);
    put(cx - 8, cy + 1, P.outline);

    // ----- reinforcing bands along the barrel
    for (const bx of [cx - 1, cx + 5, cx + 11]) {
      rect(put, bx, cy - 6, 1, 11, P.outline);
      rect(put, bx + 1, cy - 5, 1, 9, P.stoneM);
    }

    // ----- muzzle ring at the front
    rect(put, cx + 19, cy - 7, 3, 13, P.outline);
    rect(put, cx + 20, cy - 6, 2, 11, P.stoneM);
    rect(put, cx + 20, cy - 6, 2, 1,  P.stoneL);
    // barrel bore (dark hole)
    rect(put, cx + 21, cy - 3, 1, 7, P.outline);
    put(cx + 22, cy - 2, P.outline);
    put(cx + 22, cy - 1, P.outline);
    put(cx + 22, cy,     P.outline);
    put(cx + 22, cy + 1, P.outline);
    put(cx + 22, cy + 2, P.outline);

    // ----- center mounting pin (pivot)
    disc(put, cx, cy, 3, P.outline);
    disc(put, cx, cy, 2, P.steelD);
    put(cx, cy, P.steel);

    // ----- muzzle flash + smoke when firing
    if (shoot) {
      // bright flash
      disc(put, cx + 26, cy, 4, P.sparkL);
      disc(put, cx + 26, cy, 3, P.white);
      disc(put, cx + 26, cy, 2, P.spark);
      // flash rays
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = 6;
        put(Math.round(cx + 26 + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), P.spark);
      }
      // recoil puff back along barrel
      put(cx + 30, cy - 1, P.stoneL);
      put(cx + 31, cy,     P.stoneL);
      put(cx + 30, cy + 1, P.stoneL);
    }
  };
}

// ==================================================================
//  WALL (32x32) — stacked brick
// ==================================================================
function drawWall(damaged: boolean) {
  return (put: Put) => {
    // base fill
    rect(put, 1, 1, 30, 30, P.stoneD);
    // upper face
    rect(put, 1, 1, 30, 28, P.stone);
    // rim
    rect(put, 1, 1, 30, 2, P.stoneL);
    rect(put, 1, 1, 2, 28, P.stoneL);
    rect(put, 29, 1, 2, 28, P.stoneD);
    rect(put, 1, 27, 30, 2, P.stoneD);
    // bottom rim
    rect(put, 1, 29, 30, 2, P.outline);

    // brick rows (offset like running bond)
    const mortar = P.stoneD;
    // row 1
    line(put, 1, 8, 30, 8, mortar);
    line(put, 12, 1, 12, 8, mortar);
    line(put, 22, 1, 22, 8, mortar);
    // row 2
    line(put, 1, 15, 30, 15, mortar);
    line(put, 8, 8, 8, 15, mortar);
    line(put, 18, 8, 18, 15, mortar);
    line(put, 26, 8, 26, 15, mortar);
    // row 3
    line(put, 1, 22, 30, 22, mortar);
    line(put, 12, 15, 12, 22, mortar);
    line(put, 22, 15, 22, 22, mortar);
    // row 4
    line(put, 8, 22, 8, 29, mortar);
    line(put, 18, 22, 18, 29, mortar);
    line(put, 26, 22, 26, 29, mortar);

    // random pebble highlights
    put(5, 4, P.stoneL); put(15, 4, P.stoneL); put(25, 4, P.stoneL);
    put(5, 11, P.stoneL); put(14, 11, P.stoneL);
    put(10, 18, P.stoneL); put(24, 18, P.stoneL);
    put(4, 25, P.stoneL); put(15, 25, P.stoneL);

    // moss
    put(2, 17, P.grassL); put(3, 18, P.grassD); put(2, 18, P.grass);
    put(29, 4, P.grassL); put(28, 5, P.grass);

    if (damaged) {
      // cracks
      line(put, 10, 6, 14, 18, P.outline);
      line(put, 14, 18, 11, 26, P.outline);
      line(put, 20, 8, 24, 20, P.outline);
      // chunk missing
      disc(put, 20, 16, 3, P.outline);
      put(20, 16, P.stoneD);
    }
  };
}

// ==================================================================
//  ARROW (32x32)
// ==================================================================
function drawArrow(frame: 0|1) {
  return (put: Put) => {
    const cy = 16;
    // shaft
    rect(put, 4, cy - 1, 18, 1, P.arrowD);
    rect(put, 4, cy, 18, 1, P.arrow);
    rect(put, 4, cy + 1, 18, 1, P.arrowD);

    // head (diamond)
    put(22, cy, P.steel);
    put(23, cy - 1, P.steel); put(23, cy, P.steel); put(23, cy + 1, P.steel);
    put(24, cy - 2, P.steel); put(24, cy - 1, P.white); put(24, cy, P.steel); put(24, cy + 1, P.white); put(24, cy + 2, P.steel);
    put(25, cy - 1, P.steel); put(25, cy, P.steel); put(25, cy + 1, P.steel);
    put(26, cy, P.steelD);
    // head outline
    put(23, cy - 2, P.outline); put(23, cy + 2, P.outline);
    put(25, cy - 2, P.outline); put(25, cy + 2, P.outline);
    put(27, cy, P.outline);

    // fletching
    put(3, cy - 2, P.white); put(4, cy - 2, P.white); put(5, cy - 2, P.white);
    put(3, cy + 2, P.white); put(4, cy + 2, P.white); put(5, cy + 2, P.white);
    put(2, cy - 1, P.red); put(2, cy, P.redD); put(2, cy + 1, P.red);
    put(6, cy - 2, P.redD); put(6, cy + 2, P.redD);

    if (frame === 1) {
      put(27, cy - 1, P.sparkL);
      put(28, cy, P.sparkL);
      put(27, cy + 1, P.sparkL);
    }
  };
}

// ==================================================================
//  CANNONBALL (32x32) — dark iron sphere with specular highlight
// ==================================================================
function drawCannonball(frame: 0|1) {
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

// Cannonball shadow (32x32) — simple dark ellipse
function drawCannonballShadow() {
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
type CoinTier = 'bronze' | 'silver' | 'gold';
function drawCoin(frame: 0|1|2|3|4|5, tier: CoinTier = 'gold') {
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

// ==================================================================
//  EFFECTS (32x32)
// ==================================================================
function drawHitSpark(frame: 0|1|2) {
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
function drawDeathBurst(frame: 0|1|2|3|4) {
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
function drawCoinPop(frame: 0|1|2) {
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

// ==================================================================
//  GROUND TILE (32x32) — noise speckle
// ==================================================================
function drawGround(seed: number) {
  return (put: Put) => {
    let s = seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    rect(put, 0, 0, 32, 32, P.grass);
    // subtle horizontal banding
    for (let y = 0; y < 32; y += 4) {
      for (let x = 0; x < 32; x++) {
        if ((x + y) % 7 === 0) put(x, y, P.grassM);
      }
    }
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(rnd() * 32);
      const y = Math.floor(rnd() * 32);
      put(x, y, rnd() > 0.5 ? P.grassL : P.grassD);
    }
    // small plant tufts
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(rnd() * 28) + 2;
      const y = Math.floor(rnd() * 28) + 2;
      put(x, y, P.grassL);
      put(x + 1, y, P.grassL);
      put(x, y + 1, P.grassD);
    }
  };
}

function drawFoundation(put: Put) {
  // Organic dirt patch for 2x2 tower footprint (64x64, rendered at 0.5 scale = 32x32 = 2 tiles)
  // Stays within bounds but with rounded/noisy corners
  const S = 64;

  // Seeded RNG for deterministic noise
  let seed = 42;
  const rng = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

  // Dirt palette
  const dirts = ['#6b4e32', '#7a5a3a', '#5e4228', '#8b6841', '#6f5030', '#544020', '#7e6238'];

  // Corner rounding radius in pixels
  const cornerR = 8;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // Distance from nearest corner (only matters in corner regions)
      let skip = false;
      // Check each corner
      for (const [cx, cy] of [[cornerR, cornerR], [S - 1 - cornerR, cornerR], [cornerR, S - 1 - cornerR], [S - 1 - cornerR, S - 1 - cornerR]]) {
        const inCornerX = (cx <= cornerR && x < cornerR) || (cx >= S - 1 - cornerR && x > S - 1 - cornerR);
        const inCornerY = (cy <= cornerR && y < cornerR) || (cy >= S - 1 - cornerR && y > S - 1 - cornerR);
        if (inCornerX && inCornerY) {
          const dx = x - cx, dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // Wobbly corner edge
          const angle = Math.atan2(dy, dx);
          const wobble = Math.sin(angle * 6) * 2 + Math.cos(angle * 4) * 1.5;
          if (dist > cornerR + wobble) {
            skip = true;
            break;
          }
          // Fade at corner edges
          if (dist > cornerR + wobble - 4) {
            const fade = (cornerR + wobble - dist) / 4;
            if (rng() > fade * 0.7) { skip = true; break; }
          }
        }
      }
      if (skip) continue;

      // Fade along straight edges too (1-2px scatter)
      const edgeDist = Math.min(x, y, S - 1 - x, S - 1 - y);
      if (edgeDist < 3) {
        const fade = edgeDist / 3;
        if (rng() > fade * 0.8) continue;
      }

      // Pick dirt color with noise
      const ci = Math.floor(rng() * dirts.length);
      put(x, y, dirts[ci]);
    }
  }

  // Scatter some darker speckles for texture
  for (let i = 0; i < 80; i++) {
    const x = 2 + Math.floor(rng() * (S - 4));
    const y = 2 + Math.floor(rng() * (S - 4));
    const dark = ['#3d2a16', '#4a3420', '#33210f'];
    put(x, y, dark[Math.floor(rng() * dark.length)]);
  }
  // A few lighter pebble highlights
  for (let i = 0; i < 20; i++) {
    const x = 3 + Math.floor(rng() * (S - 6));
    const y = 3 + Math.floor(rng() * (S - 6));
    put(x, y, '#a08060');
  }
}

// ==================================================================
//  BOSS — The Brood Mother (64x64, 2x2 tile footprint)
// ==================================================================
interface BossOpts {
  bob?: number;
  flash?: boolean;
  chargeGlow?: boolean;
  pockets?: number; // 0..4 for birth animation stages, undefined = no pockets
  rearUp?: boolean; // slam windup pose
  legStep?: number; // -1 | 0 | 1
}

function drawBossBody(put: Put, opts: BossOpts) {
  const cx = 32;
  const baseCy = 34 + (opts.bob ?? 0) + (opts.rearUp ? -2 : 0);

  const col = {
    out: opts.flash ? P.white : P.outline,
    d:   opts.flash ? P.white : P.heavyD,
    m:   opts.flash ? P.white : P.heavyM,
    b:   opts.flash ? P.white : P.heavy,
    l:   opts.flash ? P.white : P.heavyL
  };

  // drop shadow
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -26; dx <= 26; dx++)
      if ((dx * dx) / 676 + (dy * dy) / 5 <= 1) put(cx + dx, 59 + dy, P.shadow);

  // stubby legs (4)
  const legStep = opts.legStep ?? 0;
  rect(put, cx - 22, baseCy + 12 + legStep, 4, 6, col.d);
  rect(put, cx - 14, baseCy + 17 - legStep, 4, 5, col.d);
  rect(put, cx + 10, baseCy + 17 - legStep, 4, 5, col.d);
  rect(put, cx + 18, baseCy + 12 + legStep, 4, 6, col.d);
  // feet
  put(cx - 22, baseCy + 17 + legStep, P.outline);
  put(cx - 14, baseCy + 21 - legStep, P.outline);
  put(cx + 13, baseCy + 21 - legStep, P.outline);
  put(cx + 21, baseCy + 17 + legStep, P.outline);

  // main bulbous body
  disc(put, cx, baseCy, 24, col.out);
  disc(put, cx, baseCy, 23, col.d);
  disc(put, cx, baseCy, 22, col.b);

  // upper back (darker, textured)
  for (let y = -22; y <= -3; y++)
    for (let x = -22; x <= 22; x++)
      if (x * x + y * y <= 484) put(cx + x, baseCy + y, col.d);
  for (let y = -20; y <= -5; y++)
    for (let x = -20; x <= 20; x++)
      if (x * x + y * y <= 400) put(cx + x, baseCy + y, col.b);
  // highlight arc upper-left
  for (let y = -20; y <= -10; y++)
    for (let x = -18; x <= -2; x++)
      if (x * x + y * y <= 324) put(cx + x, baseCy + y, col.m);
  for (let y = -18; y <= -14; y++)
    for (let x = -10; x <= -4; x++)
      if (x * x + y * y <= 256) put(cx + x, baseCy + y, col.l);

  // pale swollen underbelly (lower half)
  for (let y = 4; y <= 22; y++)
    for (let x = -20; x <= 20; x++)
      if (x * x + y * y <= 476) put(cx + x, baseCy + y, P.belly);
  for (let y = 10; y <= 22; y++)
    for (let x = -17; x <= 17; x++)
      if (x * x + y * y <= 400) put(cx + x, baseCy + y, P.bellyM);
  // segmentation lines
  for (let x = -17; x <= 17; x++) {
    if (Math.abs(x) < 16) put(cx + x, baseCy + 8, P.bellyD);
    if (Math.abs(x) < 14) put(cx + x, baseCy + 14, P.bellyD);
    if (Math.abs(x) < 10) put(cx + x, baseCy + 19, P.bellyD);
  }

  // back spines (row along top of upper body)
  const spinePositions: Array<[number, number]> = [
    [-16, -16], [-10, -19], [-4, -21], [2, -21], [8, -20], [14, -17]
  ];
  for (const [sx, sy] of spinePositions) {
    put(cx + sx, baseCy + sy + 1, col.d);
    put(cx + sx, baseCy + sy, col.out);
    put(cx + sx, baseCy + sy - 1, col.out);
  }

  // eye cluster (5 glowing eyes, center-top)
  const eyes: Array<[number, number]> = [
    [-12, -4], [-6, -8], [0, -10], [6, -8], [12, -4]
  ];
  for (const [ex, ey] of eyes) {
    const glow = opts.chargeGlow ? P.sparkL : P.redL;
    put(cx + ex - 1, baseCy + ey, P.outline);
    put(cx + ex,     baseCy + ey, glow);
    put(cx + ex + 1, baseCy + ey, opts.chargeGlow ? P.spark : P.white);
    put(cx + ex,     baseCy + ey + 1, P.redD);
  }

  // mouth (hidden behind under-bulge, slit)
  rect(put, cx - 5, baseCy + 1, 10, 1, P.outline);
  put(cx - 6, baseCy + 1, P.redD);
  put(cx + 5, baseCy + 1, P.redD);

  // ----- birth pockets on back -----
  if (opts.pockets !== undefined) {
    const stage = opts.pockets;
    const pockets: Array<[number, number]> = [
      [-10, -13], [-2, -15], [6, -14]
    ];
    for (const [px, py] of pockets) {
      const ox = cx + px, oy = baseCy + py;
      if (stage === 0) {
        // smooth bumps forming
        disc(put, ox, oy, 3, col.l);
        disc(put, ox, oy, 2, col.b);
      } else if (stage === 1) {
        // dark pockets split open
        disc(put, ox, oy, 3, col.d);
        disc(put, ox, oy, 2, P.outline);
        put(ox, oy, P.redD);
      } else if (stage === 2) {
        // little heads visible inside
        disc(put, ox, oy, 3, col.d);
        disc(put, ox, oy, 2, P.red);
        put(ox - 1, oy, P.white);
        put(ox + 1, oy, P.white);
        put(ox, oy + 1, P.outline);
      } else if (stage === 3) {
        // heads pushing out, bulging higher
        disc(put, ox, oy - 1, 4, col.d);
        disc(put, ox, oy - 1, 3, P.red);
        disc(put, ox, oy - 2, 2, P.redL);
        put(ox - 1, oy - 1, P.white);
        put(ox + 1, oy - 1, P.white);
        put(ox, oy, P.outline);
      } else if (stage === 4) {
        // empty crater just after pop
        disc(put, ox, oy, 3, P.outline);
        disc(put, ox, oy, 2, col.d);
      }
    }
  }
}

type BossFrame =
  | 'idle0' | 'idle1'
  | 'move0' | 'move1' | 'move2' | 'move3'
  | 'atk0' | 'atk1'
  | 'chargeWind'
  | 'hit'
  | 'birth0' | 'birth1' | 'birth2' | 'birth3' | 'birth4'
  | 'die0' | 'die1' | 'die2' | 'die3' | 'die4';

function drawBoss(frame: BossFrame) {
  return (put: Put) => {
    switch (frame) {
      case 'idle0':      return drawBossBody(put, { bob: 0 });
      case 'idle1':      return drawBossBody(put, { bob: 1 });
      case 'move0':      return drawBossBody(put, { bob: 0, legStep: 1 });
      case 'move1':      return drawBossBody(put, { bob: 1, legStep: 0 });
      case 'move2':      return drawBossBody(put, { bob: 0, legStep: -1 });
      case 'move3':      return drawBossBody(put, { bob: 1, legStep: 0 });
      case 'atk0':       return drawBossBody(put, { rearUp: true, bob: -1 });
      case 'atk1':       return drawBossBody(put, { bob: 2 });
      case 'chargeWind': return drawBossBody(put, { chargeGlow: true, bob: 0 });
      case 'hit':        return drawBossBody(put, { flash: true });
      case 'birth0':     return drawBossBody(put, { pockets: 0 });
      case 'birth1':     return drawBossBody(put, { pockets: 1 });
      case 'birth2':     return drawBossBody(put, { pockets: 2 });
      case 'birth3':     return drawBossBody(put, { pockets: 3 });
      case 'birth4':     return drawBossBody(put, { pockets: 4 });
      case 'die0':       return drawBossDie(put, 0);
      case 'die1':       return drawBossDie(put, 1);
      case 'die2':       return drawBossDie(put, 2);
      case 'die3':       return drawBossDie(put, 3);
      case 'die4':       return drawBossDie(put, 4);
    }
  };
}

function drawBossDie(put: Put, step: number) {
  const cx = 32, cy = 36;
  const r = Math.max(0, 24 - step * 5);
  if (r > 0) {
    disc(put, cx, cy, r, P.heavyD);
    disc(put, cx, cy, Math.max(0, r - 1), P.heavy);
    disc(put, cx, cy, Math.max(0, r - 3), P.heavyL);
  }
  // shrapnel + belly chunks flying out
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + step * 0.3;
    const d = step * 6 + 6;
    const x = Math.round(cx + Math.cos(a) * d);
    const y = Math.round(cy + Math.sin(a) * d);
    put(x, y, P.heavyD);
    put(x + 1, y, P.red);
    if (i % 3 === 0) put(x, y + 1, P.belly);
  }
  // central flash
  if (step < 2) disc(put, cx, cy, 6, P.sparkL);
}
function add(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

export function generateAllArt(scene: Phaser.Scene) {
  // Player
  const pFrames: { k: string; f: PFrame }[] = [
    { k: 'p_idle_0',  f: 'idle0' },
    { k: 'p_idle_1',  f: 'idle1' },
    { k: 'p_move_0',  f: 'move0' },
    { k: 'p_move_1',  f: 'move1' },
    { k: 'p_move_2',  f: 'move2' },
    { k: 'p_move_3',  f: 'move3' },
    { k: 'p_shoot_0', f: 'shoot0' },
    { k: 'p_shoot_1', f: 'shoot1' }
  ];
  for (const { k, f } of pFrames) add(scene, k, makeCanvas(32, drawPlayer(f)));
  add(scene, 'p_hit_0', makeCanvas(32, drawPlayer('hit')));

  // Bow (separate rotatable sprite, 32x32, origin will be at ~left-center)
  // Drawn pointing right, pivot near the grip (left side)
  add(scene, 'bow_0', makeCanvas(32, drawBow(false)));
  add(scene, 'bow_1', makeCanvas(32, drawBow(true)));

  // Enemies
  const eFrames: EFrame[] = ['move0','move1','move2','move3','atk0','atk1','hit','die0','die1','die2','die3'];
  for (const f of eFrames) add(scene, `eb_${f}`, makeCanvas(32, drawEnemyBasic(f)));
  for (const f of eFrames) add(scene, `eh_${f}`, makeCanvas(32, drawEnemyHeavy(f)));

  // Tower — PNG base + procedural ballista top
  if (scene.textures.exists('t_base_png')) {
    const copyTex = (src: string, dst: string) => {
      if (scene.textures.exists(dst)) scene.textures.remove(dst);
      const srcTex = scene.textures.get(src);
      const srcImg = srcTex.getSourceImage() as HTMLImageElement;
      const c = document.createElement('canvas');
      c.width = srcImg.width; c.height = srcImg.height;
      c.getContext('2d')!.drawImage(srcImg, 0, 0);
      scene.textures.addCanvas(dst, c);
    };
    copyTex('t_base_png', 't_base');
  } else {
    add(scene, 't_base',  makeCanvas(64, drawTowerBase));
  }
  // Arrow tower: static archer body + rotatable bow (same system as player)
  add(scene, 't_archer', makeCanvas(32, drawTowerArcher));
  add(scene, 't_top_0', makeCanvas(32, drawTowerBow(false)));
  add(scene, 't_top_1', makeCanvas(32, drawTowerBow(true)));
  add(scene, 'c_top_0', makeCanvas(64, drawCannonTop(false)));
  add(scene, 'c_top_1', makeCanvas(64, drawCannonTop(true)));

  // Wall
  add(scene, 'wall',     makeCanvas(32, drawWall(false)));
  add(scene, 'wall_dmg', makeCanvas(32, drawWall(true)));

  // Arrow
  add(scene, 'arrow_0', makeCanvas(32, drawArrow(0)));
  add(scene, 'arrow_1', makeCanvas(32, drawArrow(1)));

  // Cannonball
  add(scene, 'cball_0', makeCanvas(32, drawCannonball(0)));
  add(scene, 'cball_1', makeCanvas(32, drawCannonball(1)));
  add(scene, 'cball_shadow', makeCanvas(32, drawCannonballShadow()));

  // Coin (bronze / silver / gold tiers)
  for (let i = 0; i < 6; i++) add(scene, `coin_${i}`, makeCanvas(32, drawCoin(i as any, 'gold')));
  for (const tier of ['bronze','silver','gold'] as const) {
    for (let i = 0; i < 6; i++) add(scene, `coin_${tier}_${i}`, makeCanvas(32, drawCoin(i as any, tier)));
  }

  // Effects
  for (let i = 0; i < 3; i++) add(scene, `fx_hit_${i}`,   makeCanvas(32, drawHitSpark(i as any)));
  for (let i = 0; i < 5; i++) add(scene, `fx_death_${i}`, makeCanvas(32, drawDeathBurst(i as any)));
  for (let i = 0; i < 3; i++) add(scene, `fx_pop_${i}`,   makeCanvas(32, drawCoinPop(i as any)));

  // Ground tile variations
  for (let i = 0; i < 4; i++) add(scene, `ground_${i}`, makeCanvas(32, drawGround(i * 77 + 13)));
  add(scene, 'foundation', makeCanvas(64, drawFoundation));

  // Boss (64x64 native — 2x2 tile footprint)
  const bossFrames: BossFrame[] = [
    'idle0','idle1',
    'move0','move1','move2','move3',
    'atk0','atk1',
    'chargeWind','hit',
    'birth0','birth1','birth2','birth3','birth4',
    'die0','die1','die2','die3','die4'
  ];
  for (const f of bossFrames) add(scene, `boss_${f}`, makeCanvas(64, drawBoss(f)));
}

function framesFromKeys(keys: string[]): Phaser.Types.Animations.AnimationFrame[] {
  return keys.map(k => ({ key: k }));
}

export function registerAnimations(scene: Phaser.Scene) {
  const a = scene.anims;
  const mk = (key: string, keys: string[], frameRate: number, repeat: number) => {
    if (a.exists(key)) a.remove(key);
    a.create({ key, frames: framesFromKeys(keys), frameRate, repeat });
  };

  mk('player-idle',  ['p_idle_0', 'p_idle_1'], 3, -1);
  mk('player-move',  ['p_move_0','p_move_1','p_move_2','p_move_3'], 10, -1);
  mk('player-shoot', ['p_shoot_0','p_shoot_1'], 14, 0);
  mk('player-hit',   ['p_hit_0'], 8, 0);
  mk('bow-idle',  ['bow_0'], 1, 0);
  mk('bow-shoot', ['bow_1', 'bow_0'], 10, 0);

  mk('eb-move', ['eb_move0','eb_move1','eb_move2','eb_move3'], 8, -1);
  mk('eb-atk',  ['eb_atk0','eb_atk1'], 8, -1);
  mk('eb-hit',  ['eb_hit'], 10, 0);
  mk('eb-die',  ['eb_die0','eb_die1','eb_die2','eb_die3'], 10, 0);

  mk('eh-move', ['eh_move0','eh_move1','eh_move2','eh_move3'], 6, -1);
  mk('eh-atk',  ['eh_atk0','eh_atk1'], 6, -1);
  mk('eh-hit',  ['eh_hit'], 8, 0);
  mk('eh-die',  ['eh_die0','eh_die1','eh_die2','eh_die3'], 8, 0);

  mk('tower-top-idle',  ['t_top_0'], 1, 0);
  mk('tower-top-shoot', ['t_top_1','t_top_0'], 14, 0);
  mk('cannon-top-idle',  ['c_top_0'], 1, 0);
  mk('cannon-top-shoot', ['c_top_1','c_top_0'], 10, 0);

  mk('arrow-spin', ['arrow_0','arrow_1'], 20, -1);
  mk('cball-spin', ['cball_0','cball_1'], 8, -1);

  mk('coin-spin',  ['coin_0','coin_1','coin_2','coin_3','coin_4','coin_5'], 10, -1);
  for (const tier of ['bronze','silver','gold'] as const) {
    mk(`coin-${tier}-spin`,
      [`coin_${tier}_0`,`coin_${tier}_1`,`coin_${tier}_2`,`coin_${tier}_3`,`coin_${tier}_4`,`coin_${tier}_5`],
      10, -1);
  }

  mk('fx-hit',    ['fx_hit_0','fx_hit_1','fx_hit_2'], 22, 0);
  mk('fx-death',  ['fx_death_0','fx_death_1','fx_death_2','fx_death_3','fx_death_4'], 18, 0);
  mk('fx-pop',    ['fx_pop_0','fx_pop_1','fx_pop_2'], 20, 0);

  // Boss
  mk('boss-idle',       ['boss_idle0','boss_idle1'], 2, -1);
  mk('boss-move',       ['boss_move0','boss_move1','boss_move2','boss_move3'], 5, -1);
  mk('boss-atk',        ['boss_atk0','boss_atk1'], 4, 0);
  mk('boss-chargewind', ['boss_chargeWind','boss_idle0'], 6, -1);
  mk('boss-hit',        ['boss_hit'], 10, 0);
  mk('boss-birth',      ['boss_birth0','boss_birth1','boss_birth2','boss_birth3','boss_birth4'], 4, 0);
  mk('boss-die',        ['boss_die0','boss_die1','boss_die2','boss_die3','boss_die4'], 6, 0);
}
