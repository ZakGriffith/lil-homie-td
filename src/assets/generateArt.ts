// Procedural pixel art drawn at logical resolution then Scale2x'd to 2× physical.
// Logical sizes: gameplay sprites 32→64px, towers/boss 64→128px.
// All sprites use setScale(0.5) to maintain the same world-space dimensions.
// Every frame is registered as its own texture and animations reference them
// in order via registerAnimations().

import Phaser from 'phaser';

type Put = (x: number, y: number, c: string | null) => void;
type PutRGB = (x: number, y: number, r: number, g: number, b: number) => void;

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

  // infected enemy colors
  infect:  '#9040d0',   // main purple body
  infectD: '#4a1870',   // dark purple
  infectM: '#6a28a0',   // mid purple
  infectL: '#c070ff',   // light purple highlight

  infectH:  '#d08020',  // infected heavy — orange
  infectHD: '#6a3808',  // dark orange
  infectHM: '#a06018',  // mid orange
  infectHL: '#ffb040',  // light orange

  infectR:  '#e0d020',  // infected runner — yellow
  infectRD: '#6a6008',  // dark yellow
  infectRL: '#fff060',  // light yellow

  // boss belly
  belly:   '#d89080',
  bellyD:  '#7a3a2a',
  bellyM:  '#a8604a',

  // snake colors
  snake:   '#4a7a30',
  snakeD:  '#3a5a20',
  snakeM:  '#5a8a40',
  snakeL:  '#6a9a48',
  snakeBelly: '#c8cc88',
  snakePat: '#2a4a18',

  // rat colors
  rat:     '#7a6a5a',
  ratD:    '#5a4a3a',
  ratL:    '#8a7a6a',
  ratTail: '#a08070',

  // deer colors
  deer:    '#8a6a48',
  deerD:   '#6a4a30',
  deerM:   '#7a5a38',
  deerL:   '#a88a60',
  deerBelly: '#c8b898',
  antler:  '#d4c8a0',
  antlerD: '#a89870',

  // archer tower extras
  tunic:   '#2a7a3a',
  tunicD:  '#1a4a24',
  tunicL:  '#3a9a4a',
  hood:    '#3a5a2a',
  hoodD:   '#1a3a18',
  stoneHL: '#d0d8e4',
  banner:  '#c04040',
  bannerL: '#e06060',

  // Forest enemies
  wolf:    '#8a8a8a',
  wolfD:   '#4a4a4a',
  wolfM:   '#6a6a6a',
  wolfL:   '#b0b0b0',

  bear:    '#5a3a1a',
  bearD:   '#2a1a0a',
  bearM:   '#4a2a10',
  bearL:   '#8a6a3a',

  spider:  '#2a2a2a',
  spiderD: '#0a0a0a',
  spiderM: '#1a1a1a',
  spiderL: '#4a4a4a',
  spiderEye: '#ff2020',

  // Forest boss (Wendigo) + shared bark/leaf for boulders etc.
  bark:    '#4a3420',
  barkD:   '#2a1808',
  barkM:   '#3a2814',
  barkL:   '#6a5030',
  leaf:    '#1a3a12',
  leafD:   '#0e2408',
  leafM:   '#28521e',
  leafL:   '#38682c',
  leafB:   '#4a7e3a',
  entEye:  '#60ff60',
  entEyeD: '#208020',

  // Wendigo bone/spectral colors
  wBone:   '#c8c0a8',
  wBoneD:  '#8a8068',
  wBoneL:  '#e8e0d0',
  wGhost:  '#1a3a20',   // solid equivalent of translucent green mist
  wGhostD: '#0e2410',   // darker mist
  wGhostL: '#2a5a30',   // lighter mist edge
  wGhostB: '#3a7a40',   // bright mist highlight

  // Ancient Ram boss
  ram:     '#8a8078',
  ramD:    '#5a5048',
  ramM:    '#706860',
  ramL:    '#aaa098',
  ramBelly:'#c0b8a8',
  wool:    '#c8c0b0',
  woolD:   '#908878',
  woolL:   '#e0d8cc',
  horn:    '#d8d0b8',
  hornD:   '#a8a088',
  hornM:   '#c0b8a0',
  hornL:   '#ece8d8',

  // Fog Phantom (river boss)
  fog:     '#324060',
  fogD:    '#1a2840',
  fogM:    '#283450',
  fogL:    '#506888',
  fogGlow: '#64c8ff',
  fogGlowD:'#3090c0',
  fogCore: '#405878',
  fogWisp: '#283a58'
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

/** Wrap a put so all x-coordinates are mirrored around the center (31-x for 32px sprites). */
function mirrorX(put: Put): Put {
  return (x, y, c) => put(31 - x, y, c);
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
//  SNAKE (32x32) — slithering viper, meadow basic enemy
// ==================================================================
function drawEnemySnake(f: EFrame) {
  return (rawPut: Put) => {
    const put = f.startsWith('die') ? rawPut : mirrorX(rawPut);
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 6 - step * 1.5;
      if (r <= 0) return;
      disc(put, 16, 22, Math.max(0, Math.round(r)), P.snake);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + step * 0.5;
        const d = step * 3 + 2;
        put(Math.round(16 + Math.cos(a) * d), Math.round(22 + Math.sin(a) * d), P.snakeD);
      }
      return;
    }
    const flash = f === 'hit';
    const body = flash ? P.white : P.snake;
    const bodyD = flash ? P.white : P.snakeD;
    const bodyL = flash ? P.white : P.snakeL;
    const belly = flash ? P.white : P.snakeBelly;
    const pat = flash ? P.white : P.snakePat;

    const phase = f === 'move0' ? 0 : f === 'move1' ? 1 : f === 'move2' ? 2 : f === 'move3' ? 3 :
                  f === 'atk0' ? 0 : f === 'atk1' ? 1 : 0;
    const cy = 22;

    // Body segments — sinusoidal wave
    const segs = [
      { x: 8,  y: cy + [0, -1, 0, 1][phase] },
      { x: 11, y: cy + [-1, 0, 1, 0][phase] },
      { x: 14, y: cy + [0, 1, 0, -1][phase] },
      { x: 17, y: cy + [1, 0, -1, 0][phase] },
      { x: 20, y: cy + [0, -1, 0, 1][phase] },
      { x: 23, y: cy + [-1, 0, 1, 0][phase] },
    ];

    // Tail
    put(24, segs[5].y, bodyD);
    put(25, segs[5].y - 1, bodyD);

    // Body segments back to front
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i];
      const thick = i <= 1 ? 2 : i >= 4 ? 2 : 3;
      const ty = s.y - Math.floor(thick / 2);
      rect(put, s.x, ty, 4, thick, body);
      // Belly
      rect(put, s.x, ty + thick - 1, 4, 1, belly);
      // Diamond pattern
      if (i % 2 === 0) rect(put, s.x + 1, ty, 2, 1, pat);
    }

    // Head
    const headY = segs[0].y;
    rect(put, 5, headY - 2, 5, 4, bodyL);
    rect(put, 4, headY - 1, 2, 3, bodyL);
    rect(put, 6, headY - 2, 3, 1, body);

    // Eyes
    put(5, headY - 1, '#ffcc00');
    put(6, headY - 1, '#ffcc00');
    put(5, headY - 1, P.outline);

    // Tongue (flickers on certain frames)
    if (phase < 2) {
      put(3, headY, '#dd3333');
      put(2, headY, '#dd3333');
      if (phase === 0) {
        put(1, headY - 1, '#dd3333');
        put(1, headY + 1, '#dd3333');
      }
    }

    // Attack — open mouth
    if (f === 'atk0' || f === 'atk1') {
      rect(put, 3, headY, 3, 2, P.outline);
      put(3, headY + 1, P.white); // fang
      put(5, headY + 1, P.white);
    }
  };
}

// ==================================================================
//  RAT SWARM (32x32) — cluster of 3 rats, meadow runner pack
// ==================================================================
function drawEnemyRat(f: EFrame) {
  return (rawPut: Put) => {
    const put = f.startsWith('die') ? rawPut : mirrorX(rawPut);
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 7 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 20, Math.max(0, r), P.rat);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + step * 0.5;
        const d = step * 3 + 2;
        put(Math.round(16 + Math.cos(a) * d), Math.round(20 + Math.sin(a) * d), P.ratD);
      }
      return;
    }
    const flash = f === 'hit';
    const bodyA = flash ? P.white : P.rat;
    const bodyB = flash ? P.white : P.ratD;
    const bodyC = flash ? P.white : P.ratL;
    const tail = flash ? P.white : P.ratTail;

    const phase = f === 'move0' ? 0 : f === 'move1' ? 1 : f === 'move2' ? 2 : f === 'move3' ? 3 :
                  f === 'atk0' ? 0 : f === 'atk1' ? 2 : 0;

    const rats = [
      { x: 10, y: 19 + [0, 1, 0, -1][phase], c: bodyA },
      { x: 16, y: 17 + [0, -1, 0, 1][(phase + 1) % 4], c: bodyB },
      { x: 14, y: 22 + [0, 1, 0, -1][(phase + 2) % 4], c: bodyC },
    ];

    // Tails first (behind)
    for (let i = 0; i < rats.length; i++) {
      const r = rats[i];
      const tw = [0, 1, 0, -1][(phase + i) % 4];
      put(r.x + 6, r.y + 1 + tw, tail);
      put(r.x + 7, r.y + tw, tail);
      put(r.x + 8, r.y + tw, tail);
      put(r.x + 9, r.y - 1 + tw, tail);
    }

    // Rat bodies
    for (let i = 0; i < rats.length; i++) {
      const r = rats[i];
      const legOff = [0, 1, 0, 1][(phase + i) % 4];
      // Body
      rect(put, r.x, r.y, 7, 4, r.c);
      rect(put, r.x + 1, r.y - 1, 5, 1, r.c);
      // Legs
      put(r.x, r.y + 4 - legOff, bodyB);
      put(r.x + 1, r.y + 4 - legOff, bodyB);
      put(r.x + 5, r.y + 4 + legOff, bodyB);
      put(r.x + 6, r.y + 4 + legOff, bodyB);
      // Head
      rect(put, r.x - 2, r.y, 3, 3, r.c);
      // Ear
      put(r.x - 1, r.y - 1, '#e8a0a0');
      // Eye
      put(r.x - 2, r.y + 1, '#ff2222');
      // Nose
      put(r.x - 3, r.y + 1, '#e8a0a0');
    }
  };
}

// ==================================================================
//  DEER (32x32) — corrupted stag, meadow heavy enemy
// ==================================================================
function drawEnemyDeer(f: EFrame) {
  return (rawPut: Put) => {
    const put = f.startsWith('die') ? rawPut : mirrorX(rawPut);
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 10 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 18, Math.max(0, r), P.deer);
      disc(put, 16, 18, Math.max(0, r - 2), P.deerL);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + step * 0.4;
        const d = step * 3 + 3;
        put(Math.round(16 + Math.cos(a) * d), Math.round(18 + Math.sin(a) * d), P.deerD);
        put(Math.round(16 + Math.cos(a) * d) + 1, Math.round(18 + Math.sin(a) * d), P.antler);
      }
      return;
    }
    const flash = f === 'hit';
    const body = flash ? P.white : P.deer;
    const bodyD = flash ? P.white : P.deerD;
    const bodyL = flash ? P.white : P.deerL;
    const belly = flash ? P.white : P.deerBelly;
    const horn = flash ? P.white : P.antler;
    const hornD = flash ? P.white : P.antlerD;

    // Shadow (drawn first so body renders on top)
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -7; dx <= 7; dx++)
        if ((dx * dx) / 49 + (dy * dy) / 1.5 <= 1) put(16 + dx, 28 + dy, P.shadow);

    const phase = f === 'move0' ? 0 : f === 'move1' ? 1 : f === 'move2' ? 2 : f === 'move3' ? 3 :
                  f === 'atk0' ? 0 : f === 'atk1' ? 2 : 0;
    const bob = [0, -1, 0, -1][phase];
    const cy = 14 + bob;

    // Legs (4 thin legs)
    const legY = cy + 8;
    if (phase === 0) {
      rect(put, 11, legY, 2, 7, bodyD); rect(put, 15, legY, 2, 7, bodyD);
      rect(put, 19, legY, 2, 7, bodyD); rect(put, 22, legY, 2, 7, bodyD);
    } else if (phase === 1) {
      rect(put, 10, legY, 2, 8, bodyD); rect(put, 15, legY, 2, 6, bodyD);
      rect(put, 18, legY, 2, 8, bodyD); rect(put, 23, legY, 2, 6, bodyD);
    } else {
      rect(put, 12, legY, 2, 6, bodyD); rect(put, 15, legY, 2, 8, bodyD);
      rect(put, 20, legY, 2, 6, bodyD); rect(put, 22, legY, 2, 8, bodyD);
    }
    // Hooves
    const hoofOff = phase === 1 ? 1 : phase === 2 ? -1 : 0;
    rect(put, 11 + (phase === 1 ? -1 : phase === 2 ? 1 : 0), legY + 7 + hoofOff, 2, 1, P.outline);
    rect(put, 15, legY + 7 - hoofOff, 2, 1, P.outline);
    rect(put, 19 + (phase === 1 ? -1 : phase === 2 ? 1 : 0), legY + 7 + hoofOff, 2, 1, P.outline);
    rect(put, 22, legY + 7 - hoofOff, 2, 1, P.outline);

    // Body
    rect(put, 10, cy + 2, 16, 7, body);
    rect(put, 11, cy + 1, 14, 1, body);
    // Belly
    rect(put, 13, cy + 7, 8, 2, belly);
    // Back (darker stripe)
    rect(put, 12, cy + 1, 10, 2, bodyD);
    // White spots
    put(14, cy + 3, bodyL); put(17, cy + 4, bodyL);
    put(20, cy + 3, bodyL); put(12, cy + 5, bodyL);
    put(22, cy + 5, bodyL);

    // Neck
    rect(put, 8, cy, 4, 5, body);
    // Head
    rect(put, 6, cy - 1, 5, 4, body);
    rect(put, 5, cy, 2, 3, body);
    // Snout
    rect(put, 4, cy + 1, 3, 2, bodyL);
    // Nose
    put(4, cy + 1, P.outline); put(5, cy + 1, P.outline);
    // Eye — red (corrupted)
    put(7, cy, '#ff3030'); put(8, cy, '#ff3030');
    put(7, cy, '#aa0000');
    // Ear
    rect(put, 8, cy - 3, 2, 2, bodyD);

    // Antlers
    // Left antler
    rect(put, 7, cy - 5, 1, 3, horn);
    rect(put, 6, cy - 7, 1, 2, horn);
    put(5, cy - 8, horn); put(5, cy - 9, hornD);
    rect(put, 8, cy - 6, 1, 2, horn);
    put(9, cy - 7, hornD);
    // Right antler
    rect(put, 10, cy - 5, 1, 3, horn);
    rect(put, 11, cy - 7, 1, 2, horn);
    put(12, cy - 8, horn); put(12, cy - 9, hornD);
    rect(put, 9, cy - 6, 1, 2, horn);

    // Tail
    const tailWag = [0, 1, 0, -1][phase];
    put(26, cy + 2 + tailWag, bodyL);
    put(26, cy + 3 + tailWag, bodyL);
    put(27, cy + 1 + tailWag, bodyL);

    // Attack — antlers thrust forward
    if (f === 'atk0' || f === 'atk1') {
      put(4, cy - 2, horn); put(3, cy - 3, horn);
      put(4, cy - 4, horn); put(3, cy - 5, hornD);
    }
  };
}

// ==================================================================
//  INFECTED BASIC (32x32) — purple infected variant of basic enemy
// ==================================================================
function drawEnemyInfectedBasic(f: EFrame) {
  return (put: Put) => {
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 8 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 18, r, P.infect);
      disc(put, 16, 18, Math.max(0, r - 1), P.infectL);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + step * 0.4;
        const d = step * 3 + 3;
        const px = Math.round(16 + Math.cos(a) * d);
        const py = Math.round(18 + Math.sin(a) * d);
        put(px, py, P.infectD);
        put(px + 1, py, P.infect);
      }
      return;
    }
    const flash = f === 'hit';
    const body = flash ? P.white : P.infect;
    const bodyD = flash ? P.white : P.infectD;
    const bodyM = flash ? P.white : P.infectM;
    const bodyL = flash ? P.white : P.infectL;

    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -6; dx <= 6; dx++)
        if ((dx * dx) / 36 + (dy * dy) / 1.5 <= 1) put(16 + dx, 28 + dy, P.shadow);

    let footY = 0;
    if (f === 'move1') footY = -1;
    if (f === 'move3') footY = 1;
    rect(put, 11, 25 + footY, 3, 2, bodyD);
    rect(put, 18, 25 - footY, 3, 2, bodyD);
    put(10, 26 + footY, P.outline);
    put(21, 26 - footY, P.outline);
    put(13, 27 + footY, P.outline);
    put(18, 27 - footY, P.outline);

    disc(put, 16, 17, 8, bodyD);
    disc(put, 16, 17, 7, body);
    disc(put, 16, 16, 5, bodyL);
    // pustules instead of spines
    put(10, 12, '#40e060'); put(11, 11, bodyD);
    put(13, 10, '#40e060'); put(14, 9, bodyD);
    put(18, 9, '#40e060'); put(19, 10, bodyD);
    put(21, 11, '#40e060'); put(22, 12, bodyD);

    // glowing yellow-green eyes
    put(12, 16, '#e0ff40'); put(13, 16, '#e0ff40');
    put(19, 16, '#e0ff40'); put(20, 16, '#e0ff40');
    put(12, 16, P.outline); put(20, 16, P.outline);
    rect(put, 11, 15, 3, 1, bodyM);
    rect(put, 18, 15, 3, 1, bodyM);

    if (f === 'atk0') {
      rect(put, 13, 19, 6, 2, P.outline);
      put(14, 20, '#40e060'); put(17, 20, '#40e060');
    } else if (f === 'atk1') {
      rect(put, 13, 18, 6, 4, P.outline);
      put(14, 19, '#40e060'); put(17, 19, '#40e060');
      put(15, 21, '#40e060'); put(16, 21, '#40e060');
    } else {
      rect(put, 14, 19, 4, 1, P.outline);
      put(14, 20, '#40e060'); put(17, 20, '#40e060');
    }

    put(7, 18, bodyD); put(8, 19, bodyD); put(8, 18, body);
    put(25, 18, bodyD); put(24, 19, bodyD); put(24, 18, body);
  };
}

// ==================================================================
//  INFECTED HEAVY (32x32) — orange infected armored brute
// ==================================================================
function drawEnemyInfectedHeavy(f: EFrame) {
  return (put: Put) => {
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 10 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 18, r, P.infectH);
      disc(put, 16, 18, Math.max(0, r - 1), P.infectHL);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + step * 0.3;
        const d = step * 3 + 4;
        put(Math.round(16 + Math.cos(a) * d), Math.round(18 + Math.sin(a) * d), P.infectHD);
      }
      return;
    }
    const flash = f === 'hit';
    const body = flash ? P.white : P.infectH;
    const bodyD = flash ? P.white : P.infectHD;
    const bodyM = flash ? P.white : P.infectHM;
    const bodyL = flash ? P.white : P.infectHL;

    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -8; dx <= 8; dx++)
        if ((dx * dx) / 64 + (dy * dy) / 1.5 <= 1) put(16 + dx, 29 + dy, P.shadow);

    let footY = 0;
    if (f === 'move1') footY = -1;
    if (f === 'move3') footY = 1;
    rect(put, 9, 26 + footY, 5, 3, bodyD);
    rect(put, 18, 26 - footY, 5, 3, bodyD);
    rect(put, 9, 28 + footY, 5, 1, P.outline);
    rect(put, 18, 28 - footY, 5, 1, P.outline);

    disc(put, 16, 17, 10, bodyD);
    disc(put, 16, 17, 9, body);
    disc(put, 16, 16, 7, bodyL);
    // infected plates with green ooze
    rect(put, 10, 18, 12, 1, bodyD);
    rect(put, 10, 21, 12, 1, bodyD);
    rect(put, 14, 13, 4, 1, bodyD);
    put(11, 18, '#40e060'); put(15, 18, '#40e060'); put(20, 18, '#40e060');
    put(11, 21, '#40e060'); put(15, 21, '#40e060'); put(20, 21, '#40e060');

    // horns with green tips
    put(9, 8, '#40e060'); put(10, 9, bodyD); put(11, 10, body);
    put(23, 8, '#40e060'); put(22, 9, bodyD); put(21, 10, body);

    // glowing yellow-green eyes
    put(11, 14, '#e0ff40'); put(12, 14, '#e0ff40');
    put(20, 14, '#e0ff40'); put(21, 14, '#e0ff40');
    put(11, 15, bodyD); put(21, 15, bodyD);

    if (f === 'atk0' || f === 'atk1') {
      rect(put, 12, 18, 9, 3, P.outline);
      put(12, 20, '#40e060'); put(14, 20, '#40e060'); put(17, 20, '#40e060'); put(19, 20, '#40e060');
      if (f === 'atk1') put(16, 21, P.infect);
    } else {
      rect(put, 13, 19, 7, 1, P.outline);
      put(13, 20, '#40e060');
      put(19, 20, '#40e060');
    }

    rect(put, 5, 15, 3, 3, bodyD);
    rect(put, 24, 15, 3, 3, bodyD);
    put(6, 15, bodyM);
    put(25, 15, bodyM);
  };
}

// ==================================================================
//  BLIGHTED TOAD (32x32) — infected ranged toad, lobs toxic globs
// ==================================================================
type ToadFrame = 'idle' | 'hop0' | 'hop1' | 'hop2' | 'hop3' | 'atk0' | 'atk1' | 'hit' | 'die0' | 'die1' | 'die2' | 'die3';

function drawEnemyToad(f: ToadFrame) {
  return (put: Put) => {
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 9 - step * 2;
      if (r <= 0) return;
      ellipse(put, 16, 20, r + 2, r, P.infect);
      ellipse(put, 16, 20, Math.max(0, r + 1), Math.max(0, r - 1), P.infectL);
      // toxic splatter particles
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + step * 0.5;
        const d = step * 3 + 2;
        put(Math.round(16 + Math.cos(a) * d), Math.round(20 + Math.sin(a) * d), '#40e060');
      }
      return;
    }

    const flash = f === 'hit';
    const body = flash ? P.white : P.infect;
    const bodyD = flash ? P.white : P.infectD;
    const bodyM = flash ? P.white : P.infectM;
    const bodyL = flash ? P.white : P.infectL;
    const green = flash ? P.white : '#40e060';
    const greenD = flash ? P.white : '#208030';

    // Hop offsets: how high off the ground the toad is
    let hopY = 0;
    let squashX = 0; // widen body on landing
    let squashY = 0; // flatten body on landing
    if (f === 'hop0') { hopY = -2; squashY = 1; } // crouching to launch
    if (f === 'hop1') { hopY = -8; }                // peak of hop
    if (f === 'hop2') { hopY = -5; }                // coming down
    if (f === 'hop3') { hopY = 0; squashX = 2; squashY = -1; } // landing squash

    const isAtk = f === 'atk0' || f === 'atk1';

    // Shadow (smaller when airborne)
    const shadowR = hopY < -3 ? 4 : 6;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -shadowR; dx <= shadowR; dx++)
        if ((dx * dx) / (shadowR * shadowR) + (dy * dy) / 2 <= 1)
          put(16 + dx, 28 + dy, P.shadow);

    const cy = 20 + hopY; // body center y

    // Back legs (wide, frog-like)
    if (f === 'hop0') {
      // Crouched — legs compressed
      rect(put, 7, cy + 5, 4, 3, bodyD);
      rect(put, 21, cy + 5, 4, 3, bodyD);
      put(6, cy + 7, greenD); put(25, cy + 7, greenD); // webbed toes
    } else if (f === 'hop1' || f === 'hop2') {
      // Airborne — legs extended behind
      rect(put, 6, cy + 6, 5, 2, bodyD);
      rect(put, 21, cy + 6, 5, 2, bodyD);
      put(5, cy + 7, greenD); put(6, cy + 8, greenD);
      put(26, cy + 7, greenD); put(25, cy + 8, greenD);
    } else {
      // Idle / landed — legs tucked
      rect(put, 7, cy + 4, 4, 4, bodyD);
      rect(put, 21, cy + 4, 4, 4, bodyD);
      put(7, cy + 8, greenD); put(8, cy + 8, greenD);
      put(23, cy + 8, greenD); put(24, cy + 8, greenD);
    }

    // Front legs
    rect(put, 10, cy + 5, 3, 3, bodyD);
    rect(put, 19, cy + 5, 3, 3, bodyD);
    put(10, cy + 7, greenD); put(21, cy + 7, greenD);

    // Body (wide and squat toad)
    const bw = 9 + squashX;
    const bh = 6 + squashY;
    ellipse(put, 16, cy, bw, bh, bodyD);
    ellipse(put, 16, cy - 1, bw - 1, bh - 1, body);
    ellipse(put, 16, cy - 2, bw - 2, Math.max(1, bh - 2), bodyL);

    // Warts / pustules on back
    put(11, cy - 2, green); put(12, cy - 3, greenD);
    put(20, cy - 1, green); put(21, cy - 2, greenD);
    put(15, cy - 4, green); put(18, cy - 3, green);
    put(13, cy + 1, green);

    // Eyes (bulging on top of head, toad-like)
    disc(put, 12, cy - 4, 3, bodyD);
    disc(put, 20, cy - 4, 3, bodyD);
    disc(put, 12, cy - 4, 2, bodyM);
    disc(put, 20, cy - 4, 2, bodyM);
    // Eye glow
    put(12, cy - 5, '#e0ff40'); put(13, cy - 5, '#e0ff40');
    put(20, cy - 5, '#e0ff40'); put(21, cy - 5, '#e0ff40');
    put(12, cy - 4, P.outline); put(20, cy - 4, P.outline);

    // Mouth
    if (isAtk) {
      // Open mouth — spitting
      rect(put, 13, cy + 2, 6, 3, P.outline);
      rect(put, 14, cy + 3, 4, 1, green);
      // Glob leaving mouth
      if (f === 'atk1') {
        disc(put, 16, cy - 6, 2, green);
        put(16, cy - 7, '#80ff90');
      }
    } else {
      // Closed mouth — wide line
      rect(put, 12, cy + 2, 8, 1, P.outline);
    }

    // Throat pouch (slightly lighter)
    rect(put, 13, cy + 1, 6, 1, bodyL);
  };
}

// ==================================================================
//  TOAD GLOB PROJECTILE (16x16) — arcing toxic glob
// ==================================================================
function drawToadGlob(f: 'glob0' | 'glob1') {
  return (put: Put) => {
    const c1 = f === 'glob0' ? '#40e060' : '#60ff80';
    const c2 = f === 'glob0' ? '#208030' : '#40a050';
    // Glob body
    disc(put, 8, 8, 4, c2);
    disc(put, 8, 7, 3, c1);
    // Glow center
    put(8, 7, '#a0ff80');
    put(7, 7, c1); put(9, 7, c1);
    // Dripping trail
    put(8, 12, c2); put(7, 13, c2);
    put(9, 11, c2);
    // Speckles
    put(6, 6, '#80ff90');
    put(10, 8, '#80ff90');
  };
}

// ==================================================================
//  ENEMY WOLF (32x32) — fast grey pack hunter
// ==================================================================
function drawEnemyWolf(f: EFrame) {
  return (put: Put) => {
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 7 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 18, r, P.wolf);
      disc(put, 16, 18, Math.max(0, r - 1), P.wolfL);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + step * 0.5;
        const d = step * 3 + 3;
        put(Math.round(16 + Math.cos(a) * d), Math.round(18 + Math.sin(a) * d), P.wolfD);
      }
      return;
    }
    const flash = f === 'hit';
    const body = flash ? P.white : P.wolf;
    const bodyD = flash ? P.white : P.wolfD;
    const bodyM = flash ? P.white : P.wolfM;
    const bodyL = flash ? P.white : P.wolfL;

    // shadow
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -6; dx <= 6; dx++)
        if ((dx * dx) / 36 + (dy * dy) / 1.5 <= 1) put(16 + dx, 28 + dy, P.shadow);

    // tail (bushy, curves up)
    let tailY = 0;
    if (f === 'move1' || f === 'move3') tailY = 1;
    put(6, 14 + tailY, bodyD); put(5, 13 + tailY, bodyM); put(4, 12 + tailY, body);
    put(4, 11 + tailY, bodyL); put(5, 11 + tailY, body);

    // hind legs
    let footY = 0;
    if (f === 'move1') footY = -1;
    if (f === 'move3') footY = 1;
    rect(put, 9, 24 + footY, 3, 3, bodyD);
    rect(put, 19, 24 - footY, 3, 3, bodyD);
    put(9, 26 + footY, P.outline);
    put(11, 26 + footY, P.outline);
    put(19, 26 - footY, P.outline);
    put(21, 26 - footY, P.outline);

    // body (elongated oval)
    for (let dy = -5; dy <= 5; dy++)
      for (let dx = -8; dx <= 8; dx++)
        if ((dx * dx) / 64 + (dy * dy) / 25 <= 1)
          put(16 + dx, 18 + dy, bodyD);
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -7; dx <= 7; dx++)
        if ((dx * dx) / 49 + (dy * dy) / 16 <= 1)
          put(16 + dx, 18 + dy, body);
    // belly highlight
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -5; dx <= 5; dx++)
        if ((dx * dx) / 25 + (dy * dy) / 4 <= 1)
          put(16 + dx, 17 + dy, bodyL);

    // head (snout pointing right)
    disc(put, 22, 15, 4, bodyD);
    disc(put, 22, 15, 3, body);
    disc(put, 22, 14, 2, bodyL);
    // snout
    rect(put, 25, 15, 4, 2, bodyM);
    rect(put, 26, 15, 3, 2, bodyL);

    // ears (pointed)
    put(20, 10, bodyD); put(21, 10, body); put(21, 9, bodyL);
    put(24, 10, bodyD); put(23, 10, body); put(23, 9, bodyL);

    // eyes
    put(21, 14, P.outline); put(24, 14, P.outline);
    put(21, 13, bodyL); put(24, 13, bodyL);

    // mouth / fangs
    if (f === 'atk0' || f === 'atk1') {
      rect(put, 26, 17, 3, 2, P.outline);
      put(27, 17, P.white); put(28, 17, P.white);
      if (f === 'atk1') put(27, 18, P.red);
    } else {
      put(27, 17, P.outline); put(28, 17, P.outline);
    }
  };
}

// ==================================================================
//  ENEMY BEAR (32x32) — Classic Brown Bear (realistic grizzly)
// ==================================================================
type BearFrame =
  | 'move0' | 'move1' | 'move2' | 'move3' | 'move4' | 'move5' | 'move6' | 'move7'
  | 'atk0' | 'atk1' | 'atk2' | 'atk3' | 'atk4'
  | 'hit'
  | 'die0' | 'die1' | 'die2' | 'die3';

const bearFrames: BearFrame[] = [
  'move0','move1','move2','move3','move4','move5','move6','move7',
  'atk0','atk1','atk2','atk3','atk4',
  'hit',
  'die0','die1','die2','die3'
];

const PB = {
  fur:    '#6a4a28',
  furD:   '#3e2810',
  furM:   '#5a3a1c',
  furL:   '#8a6a3e',
  belly:  '#7a5a34',
  nose:   '#1a0e06',
  eye:    '#1a1008',
  eyeM:   '#332210',
};

// Draw bear facing a given direction — realistic grizzly
function drawBearDir(f: BearFrame, dir: 'r' | 'l') {
  return (put: Put) => {
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 10 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 18, r, PB.fur);
      disc(put, 16, 18, Math.max(0, r - 1), PB.furM);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + step * 0.3;
        const dd = step * 3 + 4;
        put(Math.round(16 + Math.cos(a) * dd), Math.round(18 + Math.sin(a) * dd), PB.furD);
      }
      return;
    }

    const flash = f === 'hit';
    const o   = flash ? P.white : P.outline;
    const fur = flash ? P.white : PB.fur;
    const furD= flash ? P.white : PB.furD;
    const furM= flash ? P.white : PB.furM;
    const furL= flash ? P.white : PB.furL;
    const belly= flash ? P.white : PB.belly;

    const d = dir === 'l' ? -1 : 1;
    const cx = 16;

    // Walk params
    const isMove = f.startsWith('move');
    const moveIdx = isMove ? parseInt(f.slice(4)) : 0;
    const phase = isMove ? (moveIdx / 8) * Math.PI * 2 : 0;
    const bob = isMove ? Math.round(Math.sin(phase * 2)) : 0;
    const fl = isMove ? Math.round(Math.sin(phase) * 2) : 0;
    const bl = isMove ? Math.round(Math.sin(phase + Math.PI) * 2) : 0;

    // Attack params: 0=windup, 1=lunge, 2=bite, 3=hold, 4=recover
    const isAtk = f.startsWith('atk');
    const atkStage = isAtk ? parseInt(f.slice(3)) : -1;
    const headX = isAtk ? [0, 2, 3, 2, 0][atkStage] : 0;
    const jawOpen = atkStage >= 1 && atkStage <= 3;
    const bigBite = atkStage === 2;

    const by = 17 + bob;

    // Shadow
    for (let sx = -10; sx <= 10; sx++)
      for (let sy = -1; sy <= 1; sy++)
        if ((sx * sx) / 100 + (sy * sy) <= 1) put(cx + sx, 29 + sy, P.shadow);

    // Far legs (darker, behind body)
    rect(put, cx + d * (-7), by + 4 + bl, 4, 6, furD);
    rect(put, cx + d * 5 + headX * d, by + 4 + fl, 4, 6, furD);

    // Body — large oval
    for (let yy = -7; yy <= 7; yy++)
      for (let xx = -11; xx <= 11; xx++)
        if ((xx * xx) / 121 + (yy * yy) / 49 <= 1) put(cx + xx, by + yy, o);
    for (let yy = -6; yy <= 6; yy++)
      for (let xx = -10; xx <= 10; xx++)
        if ((xx * xx) / 100 + (yy * yy) / 36 <= 1) put(cx + xx, by + yy, furD);
    for (let yy = -5; yy <= 5; yy++)
      for (let xx = -9; xx <= 9; xx++)
        if ((xx * xx) / 81 + (yy * yy) / 25 <= 1) put(cx + xx, by + yy, fur);

    // Shoulder hump
    disc(put, cx + d * 2, by - 4, 4, furD);
    disc(put, cx + d * 2, by - 4, 3, fur);
    disc(put, cx + d * 1, by - 5, 2, furM);
    // Belly
    for (let yy = 0; yy <= 3; yy++)
      for (let xx = -6; xx <= 6; xx++)
        if ((xx * xx) / 36 + (yy * yy) / 9 <= 1) put(cx - d + xx, by + 2 + yy, belly);

    // Near legs (lighter, in front)
    rect(put, cx + d * (-5), by + 4 + bl, 4, 6, o);
    rect(put, cx + d * (-4), by + 5 + bl, 2, 4, fur);
    put(cx + d * (-4), by + 5 + bl, furM);
    put(cx + d * (-3), by + 5 + bl, furM);
    // Paw
    put(cx + d * (-5), by + 9 + bl, furD);
    rect(put, cx + d * 7 + headX * d, by + 4 + fl, 4, 6, o);
    rect(put, cx + d * 8 + headX * d, by + 5 + fl, 2, 4, fur);
    put(cx + d * 8 + headX * d, by + 5 + fl, furM);
    put(cx + d * 9 + headX * d, by + 5 + fl, furM);
    put(cx + d * 7 + headX * d, by + 9 + fl, furD);

    // Head
    const hx = cx + d * 9 + headX * d, hy = by - 3;
    disc(put, hx, hy, 5, o);
    disc(put, hx, hy, 4, furD);
    disc(put, hx, hy, 3, fur);
    disc(put, hx + d, hy - 1, 2, furM);
    // Ears
    disc(put, hx - d * 2, hy - 4, 2, o);
    put(hx - d * 2, hy - 4, furD);
    put(hx - d * 2, hy - 3, fur);
    disc(put, hx + d, hy - 5, 2, o);
    put(hx + d, hy - 5, furD);
    // Snout
    rect(put, hx + d * 3, hy - 1, d > 0 ? 3 : -3, 3, o);
    rect(put, hx + d * 3, hy, d > 0 ? 2 : -2, 2, furL);
    put(hx + d * 5, hy, flash ? P.white : PB.nose);
    // Eye
    put(hx + d, hy - 2, flash ? P.white : PB.eye);
    put(hx + d, hy - 1, flash ? P.white : PB.eyeM);

    // Mouth
    if (jawOpen) {
      const jawH = bigBite ? 3 : 2;
      rect(put, hx + d * 2, hy + 2, d > 0 ? 4 : -4, jawH, o);
      rect(put, hx + d * 3, hy + 2, d > 0 ? 2 : -2, jawH - 1, flash ? P.white : '#3a0808');
      put(hx + d * 3, hy + 2, P.white);
      put(hx + d * 5, hy + 2, P.white);
      if (bigBite) {
        put(hx + d * 3, hy + 4, P.white);
        put(hx + d * 5, hy + 4, P.white);
      }
    } else {
      rect(put, hx + d * 2, hy + 2, d > 0 ? 4 : -4, 1, o);
      if (atkStage === 0) {
        put(hx + d * 3, hy + 3, P.white);
        put(hx + d * 5, hy + 3, P.white);
      }
    }

    // Tail stub
    put(cx - d * 10, by - 1, furD);
    put(cx - d * 11, by - 2, furD);
  };
}

// Generate all bear frames procedurally (right + left facing)
function extractBearFrames(scene: Phaser.Scene) {
  for (const f of bearFrames) {
    add(scene, `ear_${f}`, makeCanvas(32, drawBearDir(f, 'r')));
    add(scene, `eal_${f}`, makeCanvas(32, drawBearDir(f, 'l')));
  }
}

// ==================================================================
//  ENEMY SPIDER (32x32) — dark arachnid with red eyes
// ==================================================================
function drawEnemySpider(f: EFrame) {
  return (put: Put) => {
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 6 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 18, r, P.spider);
      disc(put, 16, 18, Math.max(0, r - 1), P.spiderL);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + step * 0.4;
        const d = step * 3 + 3;
        put(Math.round(16 + Math.cos(a) * d), Math.round(18 + Math.sin(a) * d), P.spiderD);
      }
      return;
    }
    const flash = f === 'hit';
    const body = flash ? P.white : P.spider;
    const bodyD = flash ? P.white : P.spiderD;
    const bodyM = flash ? P.white : P.spiderM;
    const bodyL = flash ? P.white : P.spiderL;
    const eye = flash ? P.white : P.spiderEye;

    // shadow
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -7; dx <= 7; dx++)
        if ((dx * dx) / 49 + (dy * dy) / 1.5 <= 1) put(16 + dx, 28 + dy, P.shadow);

    // legs — 4 per side, animated
    const legStep = (f === 'move1' || f === 'move3') ? 1 : 0;
    const legAngles = [-0.8, -0.3, 0.2, 0.7]; // spread angles
    for (let i = 0; i < 4; i++) {
      const a = legAngles[i];
      const flip = (i + legStep) % 2 === 0 ? 1 : -1;
      // Left leg
      const lx1 = 16 - 5, ly1 = 18 + Math.round(a * 6);
      const lx2 = lx1 - 6, ly2 = ly1 + flip * 3;
      put(lx1, ly1, bodyD); put(lx1 - 1, ly1, bodyM);
      put(lx2, ly2, bodyD); put(lx2 + 1, ly2, bodyM);
      put(lx2 - 1, ly2 + 1, P.outline); // foot
      // Right leg
      const rx1 = 16 + 5, ry1 = 18 + Math.round(a * 6);
      const rx2 = rx1 + 6, ry2 = ry1 + flip * 3;
      put(rx1, ry1, bodyD); put(rx1 + 1, ry1, bodyM);
      put(rx2, ry2, bodyD); put(rx2 - 1, ry2, bodyM);
      put(rx2 + 1, ry2 + 1, P.outline); // foot
    }

    // abdomen (rear body)
    disc(put, 16, 21, 6, bodyD);
    disc(put, 16, 21, 5, body);
    disc(put, 16, 20, 3, bodyL);
    // markings on abdomen
    put(15, 23, bodyM); put(17, 23, bodyM);
    put(16, 24, bodyM);

    // head (front)
    disc(put, 16, 14, 4, bodyD);
    disc(put, 16, 14, 3, body);
    disc(put, 16, 13, 2, bodyL);

    // eyes (4 red dots)
    put(14, 12, eye); put(18, 12, eye);
    put(13, 14, eye); put(19, 14, eye);

    // fangs
    if (f === 'atk0' || f === 'atk1') {
      put(14, 17, P.outline); put(15, 18, P.outline);
      put(18, 17, P.outline); put(17, 18, P.outline);
      if (f === 'atk1') { put(15, 19, P.red); put(17, 19, P.red); }
    } else {
      put(14, 17, P.outline); put(18, 17, P.outline);
    }
  };
}

// ==================================================================
//  ENEMY CROW (32x32) — dark flying bird, basic river enemy
// ==================================================================
function drawEnemyCrow(f: EFrame) {
  return (put: Put) => {
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 6 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 18, r, '#232330');
      disc(put, 16, 18, Math.max(0, r - 1), '#383850');
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + step * 0.5;
        const d = step * 3 + 2;
        put(Math.round(16 + Math.cos(a) * d), Math.round(18 + Math.sin(a) * d), '#1a1a28');
      }
      return;
    }
    const flash = f === 'hit';
    const body = flash ? P.white : '#232330';
    const bodyD = flash ? P.white : '#141420';
    const bodyL = flash ? P.white : '#383850';

    const phase = f === 'move0' ? 0 : f === 'move1' ? 1 : f === 'move2' ? 2 : f === 'move3' ? 3 :
                  f === 'atk0' ? 0 : f === 'atk1' ? 1 : 0;
    const bob = [0, -1, -2, -1][phase];
    const wingY = [0, -2, -3, -1][phase];

    // Shadow
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -5; dx <= 5; dx++)
        if ((dx * dx) / 25 + (dy * dy) / 1.5 <= 1) put(16 + dx, 28 + dy, P.shadow);

    // Wings behind body — thick, connected
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const wy = Math.round(wingY * Math.sin(t * Math.PI));
      const th = Math.max(0, Math.round(2 - t * 1.5));
      for (let d = 0; d <= th; d++) {
        put(12 - i, 15 + bob + wy + d, bodyD);
        put(20 + i, 15 + bob + wy + d, bodyD);
      }
      put(12 - i, 15 + bob + wy, bodyL);
      put(20 + i, 15 + bob + wy, bodyL);
    }

    // Body
    disc(put, 16, 16 + bob, 5, bodyD);
    disc(put, 16, 16 + bob, 4, body);
    // Head
    disc(put, 16, 11 + bob, 3, bodyL);
    // Beak
    put(16, 14 + bob, '#c8a028');
    put(16, 15 + bob, '#b49020');
    // Eyes
    put(14, 10 + bob, flash ? P.white : '#ff5050');
    put(18, 10 + bob, flash ? P.white : '#ff5050');
    // Tail
    put(14, 22 + bob, bodyD); put(15, 23 + bob, bodyD);
    put(18, 22 + bob, bodyD); put(17, 23 + bob, bodyD);

    // Attack: beak open
    if (f === 'atk0' || f === 'atk1') {
      put(15, 14 + bob, '#c8a028'); put(17, 14 + bob, '#c8a028');
      if (f === 'atk1') put(16, 16 + bob, '#400808');
    }
  };
}

// ==================================================================
//  ENEMY BAT (32x32) — heavy flyer with large membrane wings
// ==================================================================
function drawEnemyBat(f: EFrame) {
  return (put: Put) => {
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 7 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 18, r, '#3c2832');
      disc(put, 16, 18, Math.max(0, r - 1), '#5a3848');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + step * 0.4;
        const d = step * 3 + 3;
        put(Math.round(16 + Math.cos(a) * d), Math.round(18 + Math.sin(a) * d), '#2a1820');
      }
      return;
    }
    const flash = f === 'hit';
    const body = flash ? P.white : '#3c2832';
    const bodyD = flash ? P.white : '#2a1820';
    const bodyL = flash ? P.white : '#5a3848';
    const membrane = flash ? P.white : '#372030';
    const membraneL = flash ? P.white : '#4a3040';

    const phase = f === 'move0' ? 0 : f === 'move1' ? 1 : f === 'move2' ? 2 : f === 'move3' ? 3 :
                  f === 'atk0' ? 0 : f === 'atk1' ? 1 : 0;
    const bob = [0, -1, 0, 1][phase];
    const wingA = [0, -4, -5, -2][phase];

    // Shadow
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -6; dx <= 6; dx++)
        if ((dx * dx) / 36 + (dy * dy) / 1.5 <= 1) put(16 + dx, 28 + dy, P.shadow);

    // Wing membranes — large, connected to body
    for (let i = 0; i < 11; i++) {
      const t = i / 10;
      const wy = 15 + bob + Math.round(wingA * Math.sin(t * Math.PI));
      const memH = Math.round(4 + Math.sin(t * Math.PI) * 4);
      for (let dy = 0; dy <= memH; dy++) {
        put(13 - i, wy + dy, membrane);
        put(19 + i, wy + dy, membrane);
      }
      // Bone along top
      put(13 - i, wy, membraneL);
      put(19 + i, wy, membraneL);
    }

    // Body
    for (let dy = -5; dy <= 5; dy++)
      for (let dx = -3; dx <= 3; dx++)
        if ((dx * dx) / 9 + (dy * dy) / 25 <= 1) put(16 + dx, 17 + bob + dy, body);
    // Head
    disc(put, 16, 11 + bob, 3, bodyL);
    // Ears
    put(13, 7 + bob, bodyL); put(13, 8 + bob, bodyL); put(14, 8 + bob, body);
    put(19, 7 + bob, bodyL); put(19, 8 + bob, bodyL); put(18, 8 + bob, body);
    // Eyes
    put(14, 11 + bob, flash ? P.white : '#ff3030');
    put(18, 11 + bob, flash ? P.white : '#ff3030');
    // Fangs
    if (f === 'atk0' || f === 'atk1') {
      put(15, 14 + bob, P.white); put(17, 14 + bob, P.white);
      if (f === 'atk1') { put(15, 15 + bob, P.white); put(17, 15 + bob, P.white); }
    } else {
      put(15, 14 + bob, '#e0e0e0'); put(17, 14 + bob, '#e0e0e0');
    }
  };
}

// ==================================================================
//  ENEMY DRAGONFLY (32x32) — fast iridescent insect
// ==================================================================
function drawEnemyDragonfly(f: EFrame) {
  return (put: Put) => {
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 5 - step * 1.5;
      if (r <= 0) return;
      disc(put, 16, 16, Math.max(0, Math.round(r)), '#28a0b4');
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + step * 0.5;
        const d = step * 3 + 2;
        put(Math.round(16 + Math.cos(a) * d), Math.round(16 + Math.sin(a) * d), '#1a708a');
      }
      return;
    }
    const flash = f === 'hit';
    const bodyC = flash ? P.white : '#28a0b4';
    const bodyD = flash ? P.white : '#1a708a';
    const bodyL = flash ? P.white : '#38c0d8';
    const wingC = flash ? P.white : '#80d8e8';
    const wingD = flash ? P.white : '#60b8cc';

    const phase = f === 'move0' ? 0 : f === 'move1' ? 1 : f === 'move2' ? 2 : f === 'move3' ? 3 :
                  f === 'atk0' ? 0 : f === 'atk1' ? 1 : 0;
    const bob = [0, -1, -2, -1][phase];
    const wingA = [0, -2, -3, -1][phase];
    const wingA2 = Math.round(-wingA * 0.5);

    // Shadow
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -5; dx <= 5; dx++)
        if ((dx * dx) / 25 + (dy * dy) / 1.5 <= 1) put(16 + dx, 28 + dy, P.shadow);

    // Upper wings — attached to thorax
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const wy = Math.round(wingA * t);
      const th = Math.max(0, Math.round(1.5 - t));
      for (let d = 0; d <= th; d++) {
        put(14 - i, 11 + bob + wy + d, wingD);
        put(18 + i, 11 + bob + wy + d, wingD);
      }
      put(14 - i, 11 + bob + wy, wingC);
      put(18 + i, 11 + bob + wy, wingC);
    }
    // Lower wings
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const wy = Math.round(wingA2 * t);
      put(14 - i, 14 + bob + wy, wingD);
      put(18 + i, 14 + bob + wy, wingD);
    }

    // Long segmented body (abdomen)
    for (let i = 0; i < 12; i++) {
      const c = i < 4 ? bodyL : i < 8 ? bodyC : bodyD;
      put(16, 10 + i + bob, c);
      if (i < 6) { put(15, 10 + i + bob, bodyD); put(17, 10 + i + bob, bodyD); }
    }
    // Head
    disc(put, 16, 9 + bob, 2, bodyL);
    // Big compound eyes
    put(14, 8 + bob, flash ? P.white : '#c83030');
    put(18, 8 + bob, flash ? P.white : '#c83030');

    // Attack: abdomen curls forward
    if (f === 'atk0' || f === 'atk1') {
      put(16, 22 + bob, bodyD);
      if (f === 'atk1') put(16, 23 + bob, '#ff6060');
    }
  };
}

// ==================================================================
//  ENEMY MOSQUITO (32x32) — ranged attacker, shoots darts
// ==================================================================
function drawEnemyMosquito(f: EFrame) {
  return (put: Put) => {
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 5 - step * 1.5;
      if (r <= 0) return;
      disc(put, 16, 17, Math.max(0, Math.round(r)), '#504638');
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + step * 0.5;
        const d = step * 3 + 2;
        put(Math.round(16 + Math.cos(a) * d), Math.round(17 + Math.sin(a) * d), '#3a3028');
      }
      return;
    }
    const flash = f === 'hit';
    const body = flash ? P.white : '#504638';
    const bodyD = flash ? P.white : '#3a3028';
    const bodyL = flash ? P.white : '#685a48';
    const wingC = flash ? P.white : '#b4c8d8';

    const phase = f === 'move0' ? 0 : f === 'move1' ? 1 : f === 'move2' ? 2 : f === 'move3' ? 3 :
                  f === 'atk0' ? 0 : f === 'atk1' ? 1 : 0;
    const bob = [-1, 0, 1, 0][phase];
    const wingA = [2, -2, 2, -2][phase]; // fast flapping

    // Shadow
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -4; dx <= 4; dx++)
        if ((dx * dx) / 16 + (dy * dy) / 1.5 <= 1) put(16 + dx, 28 + dy, P.shadow);

    // Wings — fast blur, attached to thorax
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const wy = Math.round(wingA * Math.sin(t * Math.PI));
      const th = Math.max(0, Math.round(1 - t * 0.8));
      for (let d = 0; d <= th; d++) {
        put(14 - i, 13 + bob + wy + d, wingC);
        put(18 + i, 13 + bob + wy + d, wingC);
      }
    }

    // Body (thin abdomen)
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -2; dx <= 2; dx++)
        if ((dx * dx) / 4 + (dy * dy) / 16 <= 1) put(16 + dx, 17 + bob + dy, body);
    // Lighter thorax
    disc(put, 16, 14 + bob, 2, bodyL);
    // Head
    disc(put, 16, 11 + bob, 2, bodyL);
    // Proboscis — long needle pointing down/forward
    put(16, 13 + bob, '#a08060');
    put(16, 9 + bob, '#a08060');
    put(16, 8 + bob, '#807050');
    // Eyes
    put(14, 10 + bob, flash ? P.white : '#c80000');
    put(18, 10 + bob, flash ? P.white : '#c80000');
    // Dangly legs
    put(14, 19 + bob, bodyD); put(13, 21 + bob, bodyD);
    put(18, 19 + bob, bodyD); put(19, 21 + bob, bodyD);
    put(15, 20 + bob, bodyD); put(14, 22 + bob, bodyD);
    put(17, 20 + bob, bodyD); put(18, 22 + bob, bodyD);

    // Attack animation: proboscis extends, dart fires
    if (f === 'atk0') {
      put(16, 7 + bob, '#c0a060');
      put(16, 6 + bob, '#c0a060');
    } else if (f === 'atk1') {
      put(16, 7 + bob, '#e0c080');
      put(16, 6 + bob, '#e0c080');
      put(16, 5 + bob, '#60c040'); // venom glow at tip
    }
  };
}

// ==================================================================
//  MOSQUITO DART (16x16) — small slow-moving venom projectile
// ==================================================================
function drawMosquitoDart(f: 'dart0' | 'dart1') {
  return (put: Put) => {
    // Small venom droplet with a tail
    const c1 = f === 'dart0' ? '#60c040' : '#80d060';
    const c2 = f === 'dart0' ? '#408030' : '#50a040';
    const tail = f === 'dart0' ? '#304020' : '#405028';
    // Body of dart — pointed
    put(6, 8, c1); put(7, 8, c1); put(8, 8, c1); put(9, 8, c1);
    put(7, 7, c2); put(8, 7, c1); put(9, 7, c2);
    put(7, 9, c2); put(8, 9, c1); put(9, 9, c2);
    // Tip
    put(10, 8, c1); put(11, 8, c2);
    // Venom glow
    put(8, 8, '#a0ff80');
    // Trail
    put(4, 8, tail); put(5, 8, tail);
    put(3, 7, tail); put(3, 9, tail);
  };
}

// ==================================================================
//  BIRD POOP (16x16) — white splat with dark speckles
// ==================================================================
function drawBirdPoop() {
  return (put: Put) => {
    // White irregular blob
    disc(put, 8, 8, 4, '#e8e8e0');
    disc(put, 8, 8, 3, '#f4f4ec');
    disc(put, 7, 9, 2, '#e0e0d8');
    disc(put, 9, 7, 2, '#f0f0e8');
    // Splat edges — irregular
    put(4, 8, '#deded6'); put(12, 8, '#deded6');
    put(8, 4, '#deded6'); put(8, 12, '#deded6');
    put(5, 6, '#e8e8e0'); put(11, 10, '#e8e8e0');
    put(6, 11, '#e0e0d8'); put(10, 5, '#e0e0d8');
    // Dark speckles
    put(7, 7, '#3a3a30'); put(9, 9, '#2a2a20');
    put(6, 8, '#3a3a30'); put(10, 7, '#2a2a20');
    put(8, 10, '#444438');
    // Slight highlight
    put(7, 6, '#ffffff'); put(8, 7, '#fafaf4');
  };
}

// ==================================================================
//  RIVER BOSS — The Fog Phantom (64x64, flying ghostly mist entity)
// ==================================================================

interface FogOpts {
  bob?: number;
  flash?: boolean;
  chargeGlow?: boolean;
  pockets?: number;   // birth animation — tendrils extend
  rearUp?: boolean;    // atk windup
  phase?: number;      // movement animation phase 0-3
}

function drawFogPhantomBody(put: Put, opts: FogOpts) {
  const cx = 32;
  const bob = opts.bob ?? 0;
  const baseCy = 30 + bob;

  const col = {
    d:   opts.flash ? P.white : P.fogD,
    m:   opts.flash ? P.white : P.fogM,
    b:   opts.flash ? P.white : P.fog,
    l:   opts.flash ? P.white : P.fogL,
    core:opts.flash ? P.white : P.fogCore,
    glow:opts.flash ? P.white : P.fogGlow,
    glowD:opts.flash? P.white : P.fogGlowD,
    wisp:opts.flash ? P.white : P.fogWisp,
  };
  const phase = opts.phase ?? 0;

  // Shadow (faint, ethereal)
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -14; dx <= 14; dx++)
      if ((dx * dx) / 196 + (dy * dy) / 5 <= 1) put(cx + dx, 58 + dy, P.shadow);

  // Misty tendrils — flowing wisps extending outward
  for (let t = 0; t < 8; t++) {
    const angle = (t / 8) * Math.PI * 2 + phase * 0.4;
    const tendrilLen = opts.pockets != null ? 8 + opts.pockets * 2 : 10;
    for (let i = 0; i < tendrilLen; i++) {
      const r = 14 + i * 1.5;
      const x = cx + Math.cos(angle + i * 0.12) * r;
      const y = baseCy + Math.sin(angle + i * 0.12) * r * 0.5;
      const fade = Math.max(0, 1 - i / tendrilLen);
      if (fade > 0.3) put(Math.round(x), Math.round(y), col.wisp);
    }
  }

  // Dripping ectoplasm tendrils hanging below
  for (let t = 0; t < 5; t++) {
    const tx = cx - 10 + t * 5 + Math.round(Math.sin(phase * 0.5 + t) * 2);
    for (let dy = 0; dy < 8 + (phase + t) % 3; dy++) {
      const fade = 1 - dy / 12;
      if (fade > 0.2) put(tx, baseCy + 12 + dy, col.d);
    }
  }

  // Core body — large ethereal mass
  disc(put, cx, baseCy, 14, col.d);
  disc(put, cx, baseCy, 12, col.m);
  disc(put, cx, baseCy, 10, col.b);
  disc(put, cx, baseCy - 1, 7, col.l);
  disc(put, cx, baseCy - 2, 4, col.core);

  // Charge glow — body pulses with energy
  if (opts.chargeGlow) {
    disc(put, cx, baseCy, 16, col.glowD);
    disc(put, cx, baseCy, 13, col.glow);
    disc(put, cx, baseCy, 10, col.b);
    disc(put, cx, baseCy, 7, col.l);
  }

  // Attack windup — body contracts upward then expands
  if (opts.rearUp) {
    disc(put, cx, baseCy - 3, 10, col.glow);
    disc(put, cx, baseCy - 3, 8, col.l);
  }

  // Face — hollow dark eye sockets
  // Left eye socket
  disc(put, cx - 7, baseCy - 4, 4, P.outline);
  disc(put, cx - 7, baseCy - 4, 3, col.d);
  // Right eye socket
  disc(put, cx + 7, baseCy - 4, 4, P.outline);
  disc(put, cx + 7, baseCy - 4, 3, col.d);

  // Glowing pupils
  disc(put, cx - 7, baseCy - 4, 2, col.glow);
  put(cx - 7, baseCy - 4, P.white);
  disc(put, cx + 7, baseCy - 4, 2, col.glow);
  put(cx + 7, baseCy - 4, P.white);

  // Glow halo around eyes
  put(cx - 10, baseCy - 4, col.glowD);
  put(cx - 4, baseCy - 4, col.glowD);
  put(cx + 4, baseCy - 4, col.glowD);
  put(cx + 10, baseCy - 4, col.glowD);

  // Mouth — wavering dark slit
  const mw = 5 + phase % 2;
  for (let i = -mw; i <= mw; i++)
    put(cx + i, baseCy + 4, P.outline);
  for (let i = -mw + 1; i <= mw - 1; i++)
    put(cx + i, baseCy + 5, col.d);

  // Birth animation — tendrils actively spawning minions
  if (opts.pockets != null) {
    const p = opts.pockets;
    // Tendrils reach out farther at each stage
    for (let t = 0; t < 4; t++) {
      const a = (t / 4) * Math.PI * 2 + 0.5;
      const len = 6 + p * 4;
      for (let i = 0; i < len; i++) {
        const r = 16 + i * 1.5;
        put(Math.round(cx + Math.cos(a) * r), Math.round(baseCy + Math.sin(a) * r * 0.5), col.glow);
      }
    }
    // At final stages, glow at tips
    if (p >= 3) {
      for (let t = 0; t < 4; t++) {
        const a = (t / 4) * Math.PI * 2 + 0.5;
        const r = 16 + (6 + p * 4) * 1.5;
        disc(put, Math.round(cx + Math.cos(a) * r), Math.round(baseCy + Math.sin(a) * r * 0.5), 2, col.glow);
      }
    }
  }
}

function drawFogPhantomDie(put: Put, step: number) {
  const cx = 32, cy = 30;
  const r = Math.max(0, 14 - step * 3);
  if (r > 0) {
    disc(put, cx, cy, r, P.fogD);
    disc(put, cx, cy, Math.max(0, r - 2), P.fog);
    disc(put, cx, cy, Math.max(0, r - 4), P.fogL);
  }
  // Wisps dispersing outward
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + step * 0.4;
    const d = step * 7 + 5;
    const x = Math.round(cx + Math.cos(a) * d);
    const y = Math.round(cy + Math.sin(a) * d * 0.6);
    const fade = Math.max(0, 1 - step / 5);
    if (fade > 0) {
      put(x, y, P.fogM);
      put(x + 1, y, P.fogD);
      if (i % 3 === 0) put(x, y - 1, P.fogGlow);
    }
  }
}

function drawFogPhantom(frame: BossFrame) {
  return (put: Put) => {
    switch (frame) {
      case 'idle0':      return drawFogPhantomBody(put, { bob: 0, phase: 0 });
      case 'idle1':      return drawFogPhantomBody(put, { bob: -1, phase: 1 });
      case 'move0':      return drawFogPhantomBody(put, { bob: 0, phase: 0 });
      case 'move1':      return drawFogPhantomBody(put, { bob: -1, phase: 1 });
      case 'move2':      return drawFogPhantomBody(put, { bob: -2, phase: 2 });
      case 'move3':      return drawFogPhantomBody(put, { bob: -1, phase: 3 });
      case 'atk0':       return drawFogPhantomBody(put, { rearUp: true, bob: -3, phase: 0 });
      case 'atk1':       return drawFogPhantomBody(put, { bob: 2, phase: 2 });
      case 'chargeWind': return drawFogPhantomBody(put, { chargeGlow: true, bob: 0, phase: 0 });
      case 'hit':        return drawFogPhantomBody(put, { flash: true, phase: 0 });
      case 'birth0':     return drawFogPhantomBody(put, { pockets: 0, phase: 0 });
      case 'birth1':     return drawFogPhantomBody(put, { pockets: 1, phase: 1 });
      case 'birth2':     return drawFogPhantomBody(put, { pockets: 2, phase: 2 });
      case 'birth3':     return drawFogPhantomBody(put, { pockets: 3, phase: 3 });
      case 'birth4':     return drawFogPhantomBody(put, { pockets: 4, phase: 0 });
      case 'die0':       return drawFogPhantomDie(put, 0);
      case 'die1':       return drawFogPhantomDie(put, 1);
      case 'die2':       return drawFogPhantomDie(put, 2);
      case 'die3':       return drawFogPhantomDie(put, 3);
      case 'die4':       return drawFogPhantomDie(put, 4);
    }
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
// Static cannon mount / carriage — does not rotate
function drawCannonMount() {
  return (put: Put) => {
    const cx = 32, cy = 32;

    // shadow under the mount
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -12; dx <= 12; dx++)
        if ((dx * dx) / 144 + (dy * dy) / 20 <= 1) put(cx + dx, cy + 7 + dy, P.shadow);

    // trunnion mount / carriage (wide dark block)
    rect(put, cx - 9, cy + 2, 18, 6, P.outline);
    rect(put, cx - 8, cy + 2, 16, 5, P.stoneD);
    rect(put, cx - 8, cy + 2, 16, 1, P.stoneM);
    // iron bands
    rect(put, cx - 4, cy + 2, 1, 5, P.outline);
    rect(put, cx + 3,  cy + 2, 1, 5, P.outline);
    // rivets
    put(cx - 6, cy + 4, P.steel);
    put(cx + 1, cy + 4, P.steel);
    put(cx + 6, cy + 4, P.steel);

    // center mounting pin (pivot)
    disc(put, cx, cy, 3, P.outline);
    disc(put, cx, cy, 2, P.steelD);
    put(cx, cy, P.steel);
  };
}

function drawCannonTop(shoot = false) {
  return (put: Put) => {
    const cx = 32, cy = 32;

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
// WC2-style dark fortress wall with autotiling
// Neighbor bitmask: N=1, E=2, S=4, W=8
// Wall nearly fills the tile; connected sides go edge-to-edge seamlessly
function drawWall(mask: number, damaged: boolean) {
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
//  ARROW (32x32)
// ==================================================================
function drawArrow(frame: 0|1) {
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

// BOULDER (32x32) — mossy rock thrown by forest boss
function drawBoulder(frame: 0|1) {
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

function drawBoulderShadow() {
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
// Boulder impact (32x32) — rock shatter + dust cloud, 5 frames
function drawBoulderImpact(frame: 0|1|2|3|4) {
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
// Dirt/earth colors
const E = {
  dirt:  '#6b5030',
  dirtD: '#4a3420',
  dirtM: '#5a4228',
  dirtL: '#8a6840',
  sand:  '#b8a070',
  sandD: '#8a7850',
};

// Multi-octave value noise to avoid banding artifacts
function wnoise(wx: number, wy: number, scale: number): number {
  const hash = (a: number, b: number) => {
    const n = ((a * 12289 + b * 51749 + 71) * 2654435761) >>> 0;
    return (n & 0xffff) / 0xffff;
  };
  const sm = (t: number) => t * t * (3 - 2 * t);
  const oneOctave = (x: number, y: number, s: number) => {
    const sx = Math.floor(x / s), sy = Math.floor(y / s);
    const fx = x / s - sx, fy = y / s - sy;
    const tl = hash(sx, sy), tr = hash(sx + 1, sy);
    const bl = hash(sx, sy + 1), br = hash(sx + 1, sy + 1);
    const u = sm(fx), v = sm(fy);
    return tl * (1 - u) * (1 - v) + tr * u * (1 - v) + bl * (1 - u) * v + br * u * v;
  };
  // 3 octaves with different offsets to break patterns
  return oneOctave(wx, wy, scale) * 0.6
       + oneOctave(wx + 7777, wy + 3333, scale * 0.5) * 0.25
       + oneOctave(wx + 1234, wy + 8765, scale * 0.25) * 0.15;
}

/**
 * Precompute noise at reduced resolution and return a bilinear sampler.
 * step=4 means compute every 4th pixel → 16x fewer wnoise calls.
 */
function precomputeNoise(tileX: number, tileY: number, offsetX: number, offsetY: number, scale: number, step = 4): (px: number, py: number) => number {
  const size = 32;
  const gridW = Math.ceil(size / step) + 2; // +2 for interpolation margin
  const grid = new Float32Array(gridW * gridW);
  const baseWx = tileX * 32 + offsetX;
  const baseWy = tileY * 32 + offsetY;
  for (let gy = 0; gy < gridW; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      grid[gy * gridW + gx] = wnoise(baseWx + gx * step, baseWy + gy * step, scale);
    }
  }
  return (px: number, py: number) => {
    const fx = px / step, fy = py / step;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const ix1 = Math.min(ix + 1, gridW - 1), iy1 = Math.min(iy + 1, gridW - 1);
    const tl = grid[iy * gridW + ix], tr = grid[iy * gridW + ix1];
    const bl = grid[iy1 * gridW + ix], br = grid[iy1 * gridW + ix1];
    return tl * (1 - tx) * (1 - ty) + tr * tx * (1 - ty) + bl * (1 - tx) * ty + br * tx * ty;
  };
}

// ---- River geometry (pixel-level, smooth curves) ----
// River 0: runs north-south (vertical), center X varies with Y
// River 1: runs east-west (horizontal), center Y varies with X
export const RIVER_HALF_W = 40;  // half-width of water in pixels
const ROCK_W = 14;        // rock border width in pixels

// Vertical river: returns center X for a given world-pixel Y
function riverVerticalCenterX(worldPy: number): number {
  return -4 * 32
    + Math.sin(worldPy * 0.0025) * 120
    + Math.sin(worldPy * 0.007 + 2.0) * 40
    + Math.sin(worldPy * 0.018 + 5.0) * 15;
}

// Horizontal river: returns center Y for a given world-pixel X
export function riverHorizontalCenterY(worldPx: number): number {
  return -6 * 32
    + Math.sin(worldPx * 0.003) * 100
    + Math.sin(worldPx * 0.008 + 1.5) * 35
    + Math.sin(worldPx * 0.02 + 4.0) * 12;
}

// For squiggle spawning — riverIdx 0 = vertical, 1 = horizontal
export function riverCenterPx(riverIdx: number, worldPy: number): number {
  if (riverIdx === 0) return riverVerticalCenterX(worldPy);
  // For horizontal river, return the X where the river crosses this Y
  // (not perfectly accurate but good enough for squiggle placement)
  return 0; // squiggles will use a different approach for horizontal
}

/** Pixel-level river classification for a world-pixel coordinate. */
function riverPixelKind(worldPx: number, worldPy: number): 'water' | 'rock' | null {
  // Vertical river: distance from center X
  const vcx = riverVerticalCenterX(worldPy);
  const vdist = Math.abs(worldPx - vcx);
  if (vdist <= RIVER_HALF_W + ROCK_W) {
    if (vdist < RIVER_HALF_W) return 'water';
    return 'rock';
  }
  // Horizontal river: distance from center Y
  const hcy = riverHorizontalCenterY(worldPx);
  const hdist = Math.abs(worldPy - hcy);
  if (hdist <= RIVER_HALF_W + ROCK_W) {
    if (hdist < RIVER_HALF_W) return 'water';
    return 'rock';
  }
  return null;
}

/**
 * Determines the dominant type for a grid tile by sampling its pixels.
 * Returns the grid value: 4 = water/rock (impassable), 5 = bridge (walkable, unbuildable), 0 = grass.
 */
export function getRiverTileGrid(tileX: number, tileY: number): number {
  const basePx = tileX * 32;
  const basePy = tileY * 32;
  let riverCount = 0;
  // Sample a 4x4 grid within the tile for speed
  for (let sy = 4; sy < 32; sy += 8) {
    for (let sx = 4; sx < 32; sx += 8) {
      const k = riverPixelKind(basePx + sx, basePy + sy);
      if (k === 'water' || k === 'rock') riverCount++;
    }
  }
  // Majority rules — need at least 4/16 samples to count
  if (riverCount >= 4) return 4;
  return 0;
}

// Deterministic rock positions along the river edges.
function getRocksNear(basePx: number, basePy: number): { wx: number; wy: number; r: number; shade: number }[] {
  const rocks: { wx: number; wy: number; r: number; shade: number }[] = [];
  const margin = 12;

  // Helper: is a point inside either river's water?
  const inWater = (px: number, py: number) => {
    const vd = Math.abs(px - riverVerticalCenterX(py));
    if (vd < RIVER_HALF_W) return true;
    const hd = Math.abs(py - riverHorizontalCenterY(px));
    if (hd < RIVER_HALF_W) return true;
    return false;
  };

  // Vertical river rocks — scan along Y
  for (let wy = basePy - margin; wy < basePy + 32 + margin; wy += 5) {
    const cx = riverVerticalCenterX(wy);
    const h = ((wy * 73856093 + 19349669) >>> 0) % 2147483647;
    const jx = (h % 11) - 5;
    const jy = ((h >> 8) % 7) - 3;
    const radius = 4 + (h >> 16) % 4;
    const shade = (h >> 20) % 4;
    const lx = Math.round(cx - RIVER_HALF_W - 3 + jx), ly = wy + jy;
    const rx = Math.round(cx + RIVER_HALF_W + 3 - jx), ry = wy + jy;
    if (!inWater(lx, ly)) rocks.push({ wx: lx, wy: ly, r: radius, shade });
    if (!inWater(rx, ry)) rocks.push({ wx: rx, wy: ry, r: radius, shade });
  }

  // Horizontal river rocks — scan along X
  for (let wx = basePx - margin; wx < basePx + 32 + margin; wx += 5) {
    const cy = riverHorizontalCenterY(wx);
    const h = ((wx * 73856093 + 48271 * 19349669) >>> 0) % 2147483647;
    const jy = (h % 11) - 5;
    const jx = ((h >> 8) % 7) - 3;
    const radius = 4 + (h >> 16) % 4;
    const shade = (h >> 20) % 4;
    const tx = wx + jx, ty = Math.round(cy - RIVER_HALF_W - 3 + jy);
    const bx = wx + jx, by = Math.round(cy + RIVER_HALF_W + 3 - jy);
    if (!inWater(tx, ty)) rocks.push({ wx: tx, wy: ty, r: radius, shade });
    if (!inWater(bx, by)) rocks.push({ wx: bx, wy: by, r: radius, shade });
  }

  return rocks;
}

// River ground drawing — pixel-level with natural water and round rock borders
// Uses PutRGB for water pixels to avoid hex string encode/decode overhead.
function drawGroundRiver(tileX: number, tileY: number) {
  return (put: Put, putRGB?: PutRGB) => {
    const basePx = tileX * 32;
    const basePy = tileY * 32;
    let s = ((tileX * 73856093 + tileY * 19349669) >>> 0) % 2147483647;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

    // Precompute grass noise
    const sampleGrass = precomputeNoise(tileX, tileY, 8000, 1000, 400);
    const grassShades = ['#2a4826', '#325230', '#3c5e36', '#486a3e'];

    // Precompute vertical river center X for each row
    const vcx = new Float32Array(32);
    for (let py = 0; py < 32; py++) {
      vcx[py] = riverVerticalCenterX(basePy + py);
    }
    // Precompute horizontal river center Y for each column
    const hcy = new Float32Array(32);
    for (let px = 0; px < 32; px++) {
      hcy[px] = riverHorizontalCenterY(basePx + px);
    }

    // Collect rocks near this tile
    const rocks = getRocksNear(basePx, basePy);

    // Rock color palettes as RGB arrays: [outline, dark, base, highlight]
    const rockRGB = [
      [[0x2a,0x24,0x20],[0x4a,0x44,0x40],[0x6a,0x64,0x60],[0x8a,0x84,0x7a]],
      [[0x2a,0x22,0x18],[0x4a,0x3e,0x38],[0x6a,0x5e,0x54],[0x8a,0x7e,0x70]],
      [[0x28,0x26,0x1e],[0x48,0x44,0x38],[0x68,0x62,0x58],[0x88,0x7e,0x72]],
      [[0x2e,0x2a,0x24],[0x50,0x4a,0x44],[0x70,0x6a,0x62],[0x90,0x88,0x80]],
    ];

    const writeRGB = putRGB ?? ((x: number, y: number, r: number, g: number, b: number) => {
      put(x, y, '#' + r.toString(16).padStart(2,'0') + g.toString(16).padStart(2,'0') + b.toString(16).padStart(2,'0'));
    });

    // First pass: draw base layer (grass, water)
    for (let py = 0; py < 32; py++) {
      const wpyBase = basePy + py;
      const vc = vcx[py];
      for (let px = 0; px < 32; px++) {
        const wpx = basePx + px;
        const hc = hcy[px];

        // Check vertical river
        const vd = Math.abs(wpx - vc);
        // Check horizontal river
        const hd = Math.abs(wpyBase - hc);

        // Determine kind: pick the closer river
        let kind = 0; // 0=none, 1=water, 2=rock
        let depth = 0;
        const vTotal = RIVER_HALF_W + ROCK_W;
        if (vd <= vTotal || hd <= vTotal) {
          // Water if within HALF_W of either river
          const vWater = vd < RIVER_HALF_W;
          const hWater = hd < RIVER_HALF_W;
          if (vWater || hWater) {
            kind = 1;
            // Depth from whichever river is closer (or merge at intersection)
            if (vWater) {
              const t = 1 - vd / RIVER_HALF_W;
              depth = t * t * (3 - 2 * t);
            }
            if (hWater) {
              const t = 1 - hd / RIVER_HALF_W;
              const dd = t * t * (3 - 2 * t);
              if (dd > depth) depth = dd;
            }
          } else {
            kind = 2; // rock border
          }
        }

        if (kind === 1) {
          // Base color: blend from shore blue to deep center blue
          let br = 0x1e + (0x14 - 0x1e) * depth;
          let bg = 0x40 + (0x30 - 0x40) * depth;
          let bb = 0x72 + (0x6a - 0x72) * depth;

          // Layer 1: large slow noise
          const n1 = Math.sin(wpx * 0.02 + wpyBase * 0.015);
          br += n1 * 5; bg += n1 * 4; bb += n1 * 6;

          // Layer 2: flowing current
          const flow = Math.sin(wpx * 0.08 + wpyBase * 0.04) * Math.sin(wpyBase * 0.06 + wpx * 0.01);
          br += flow * 4 * depth; bg += flow * 5 * depth; bb += flow * 3 * depth;

          // Layer 3: fine ripple texture
          const ripple = Math.sin(wpx * 0.18 + wpyBase * 0.06) * Math.cos(wpyBase * 0.12 - wpx * 0.04);
          br += ripple * 4; bg += ripple * 3; bb += ripple * 5;

          writeRGB(px, py,
            br < 0 ? 0 : br > 255 ? 255 : (br + 0.5) | 0,
            bg < 0 ? 0 : bg > 255 ? 255 : (bg + 0.5) | 0,
            bb < 0 ? 0 : bb > 255 ? 255 : (bb + 0.5) | 0);
        } else if (kind === 2) {
          const gn = sampleGrass(px, py);
          const gi = Math.min(3, Math.floor(gn * 4));
          put(px, py, grassShades[gi]);
        } else {
          const gn = sampleGrass(px, py);
          const gi = Math.min(3, Math.floor(gn * 4));
          put(px, py, grassShades[gi]);
        }
      }
    }

    // Second pass: stamp round rocks on top
    for (const rock of rocks) {
      const pal = rockRGB[rock.shade];
      const rx = rock.wx - basePx;
      const ry = rock.wy - basePy;
      const rr = rock.r;
      const rr2 = rr * rr;
      const rr1 = (rr + 1) * (rr + 1);
      for (let dy = -rr - 1; dy <= rr + 1; dy++) {
        for (let dx = -rr - 1; dx <= rr + 1; dx++) {
          const lx = rx + dx, ly = ry + dy;
          if (lx < 0 || lx >= 32 || ly < 0 || ly >= 32) continue;
          const dist2 = dx * dx + dy * dy;
          if (dist2 > rr1) continue;
          if (dist2 > rr2) {
            writeRGB(lx, ly, pal[0][0], pal[0][1], pal[0][2]);
          } else {
            const shade = (dx + dy) / (rr * 2);
            const ci = shade < -0.3 ? 3 : shade < 0.2 ? 2 : 1;
            writeRGB(lx, ly, pal[ci][0], pal[ci][1], pal[ci][2]);
          }
        }
      }
    }

    // Scattered flowers on grass
    const flowerColors = ['#e84060', '#e8d040', '#d070e0', '#70a0e8', '#e8a040'];
    if (rnd() < 0.15) {
      for (let i = 0; i < 2; i++) {
        const fx = 2 + Math.floor(rnd() * 28);
        const fy = 2 + Math.floor(rnd() * 28);
        const wfx = basePx + fx, wfy = basePy + fy;
        const onRiver = Math.abs(wfx - vcx[fy]) <= RIVER_HALF_W + ROCK_W
                     || Math.abs(wfy - hcy[fx]) <= RIVER_HALF_W + ROCK_W;
        if (!onRiver) {
          put(fx, fy, flowerColors[Math.floor(rnd() * flowerColors.length)]);
          put(fx, fy + 1, '#1a3a18');
        }
      }
    }
  };
}

// Grasslands ground — gradient transitions between green shades like Bounty of One
// Dark green → medium green → light green → yellow-green in large smooth zones
function drawGroundWorld(tileX: number, tileY: number) {
  return (put: Put) => {
    // 4 grass shades from dark to light
    const shades = [
      [0x2a, 0x48, 0x26],
      [0x32, 0x52, 0x2e],
      [0x3c, 0x5e, 0x36],
      [0x48, 0x6a, 0x3e],
    ];
    // Pre-compute hex strings for the 4 base shades
    const shadeHex = shades.map(([r, g, b]) =>
      '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0')
    );
    // Lerp helper for transition bands
    const lerpCol = (a: number[], b: number[], t: number): string => {
      const r = Math.round(a[0] + (b[0] - a[0]) * t);
      const g = Math.round(a[1] + (b[1] - a[1]) * t);
      const bl = Math.round(a[2] + (b[2] - a[2]) * t);
      return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + bl.toString(16).padStart(2, '0');
    };

    // Per-tile RNG for small detail placement
    let s = ((tileX * 73856093 + tileY * 19349669) >>> 0) % 2147483647;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

    // Transition: fade-out, solid mid band, fade-in (each as fraction of shade range)
    const fadeW = 0.06;  // fade from current shade to midpoint
    const midW  = 0.03;  // thin solid band of the midpoint color
    const totalW = fadeW + midW + fadeW; // full transition zone width

    // Precompute noise at 1/4 resolution for performance
    const sampleN = precomputeNoise(tileX, tileY, 8000, 1000, 400);

    for (let py = 0; py < 32; py++) {
      for (let px = 0; px < 32; px++) {
        const n = sampleN(px, py);

        // Continuous position within shade space (0..4 mapped to 4 shades)
        const pos = Math.min(3.999, n * 4);
        const idx = Math.floor(pos);
        const frac = pos - idx; // 0..1 within this shade

        // Two-layer transition at boundaries between shades
        // Layout: [solid shade] [fade→mid] [solid mid] [fade→next] [solid next shade]
        const bandStart = 1 - totalW;
        if (idx < 3 && frac > bandStart) {
          const mid = shades[idx].map((c, i) => Math.round((c + shades[idx + 1][i]) / 2));
          const t = frac - bandStart; // 0..totalW
          if (t < fadeW) {
            // Fade from current shade toward midpoint
            put(px, py, lerpCol(shades[idx], mid, t / fadeW));
          } else if (t < fadeW + midW) {
            // Thin solid midpoint band
            put(px, py, lerpCol(mid, mid, 0)); // just mid color
          } else {
            // Fade from midpoint toward next shade
            put(px, py, lerpCol(mid, shades[idx + 1], (t - fadeW - midW) / fadeW));
          }
        } else {
          put(px, py, shadeHex[idx]);
        }
      }
    }

    // Scattered single flowers (0-2 per tile, ~15% of tiles)
    const flowerCount = rnd() < 0.15 ? (rnd() < 0.5 ? 1 : 2) : 0;
    const flowerColors = ['#e84060', '#e8d040', '#d070e0', '#70a0e8', '#e8a040'];
    for (let i = 0; i < flowerCount; i++) {
      const fx = 2 + Math.floor(rnd() * 28);
      const fy = 2 + Math.floor(rnd() * 28);
      const col = flowerColors[Math.floor(rnd() * flowerColors.length)];
      put(fx, fy, col);
      put(fx, fy + 1, '#1a3a18');
    }

    // Scattered single rock (0-1, ~10% of tiles)
    if (rnd() < 0.1) {
      const rx = 2 + Math.floor(rnd() * 28);
      const ry = 2 + Math.floor(rnd() * 28);
      put(rx, ry, '#7a8290');
      put(rx + 1, ry, '#6a7280');
      put(rx, ry + 1, '#5a6270');
    }

    // Rare grass tuft (~20% of tiles)
    if (rnd() < 0.2) {
      const tx = 3 + Math.floor(rnd() * 26);
      const ty = 3 + Math.floor(rnd() * 26);
      put(tx, ty, '#4a7a42');
      put(tx + 1, ty, '#4a7a42');
      put(tx, ty - 1, '#4a7a42');
    }
  };
}

// Castle ground — smooth flagstone and courtyard dirt with decorations
function drawGroundCastle(tileX: number, tileY: number) {
  return (put: Put) => {
    let s = ((tileX * 73856093 + tileY * 19349669) >>> 0) % 2147483647;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

    // Use noise to decide flagstone vs dirt zones
    const sampleN = precomputeNoise(tileX, tileY, 5000, 3000, 600);

    // Flagstone shades
    const stoneShades = ['#4e5864', '#5a6270', '#525c68', '#636d7a'];
    // Dirt shades
    const dirtShades = ['#4a3a28', '#5a4a38', '#6a5a46', '#524232'];
    // Mortar color
    const mortar = '#3e4654';

    // Per-pixel hash for dithering at transitions
    const pxHash = (x: number, y: number) => {
      let h = ((x * 374761393 + y * 668265263 + 1274126177) >>> 0);
      h = ((h ^ (h >> 13)) * 1103515245 + 12345) >>> 0;
      return (h & 0xffff) / 0xffff;
    };
    const transitionW = 0.06; // noise range over which we dither

    for (let py = 0; py < 32; py++) {
      for (let px = 0; px < 32; px++) {
        const n = sampleN(px, py);
        const worldPx = tileX * 32 + px;
        const worldPy = tileY * 32 + py;

        // Transition dithering: in the band around 0.45, randomly mix both textures
        const threshold = 0.45;
        let useStone: boolean;
        if (n > threshold + transitionW) {
          useStone = true;
        } else if (n < threshold - transitionW) {
          useStone = false;
        } else {
          // Dither zone: probability ramps from 0 to 1 across the band
          const t = (n - (threshold - transitionW)) / (2 * transitionW);
          useStone = pxHash(worldPx, worldPy) < t;
        }

        if (useStone) {
          // Flagstone zone
          // Grid pattern for stone slabs (16x16 slabs with offset rows)
          const slabRow = Math.floor(worldPy / 16);
          const slabOff = (slabRow % 2) * 8;
          const localX = (worldPx + slabOff) % 16;
          const localY = worldPy % 16;
          // Mortar lines
          if (localX === 0 || localY === 0) {
            put(px, py, mortar);
          } else {
            // Shade variation per slab
            const slabSeed = ((Math.floor((worldPx + slabOff) / 16) * 7919 + slabRow * 104729) >>> 0) % 4;
            put(px, py, stoneShades[slabSeed]);
          }
        } else {
          // Dirt zone
          const di = Math.floor(rnd() * dirtShades.length);
          put(px, py, dirtShades[di < dirtShades.length ? di : 0]);
        }
      }
    }

    // Subtle stone speckles in flagstone areas
    for (let i = 0; i < 20; i++) {
      const sx = Math.floor(rnd() * 32), sy = Math.floor(rnd() * 32);
      const n = sampleN(sx, sy);
      if (n > 0.45) put(sx, sy, rnd() > 0.5 ? '#6a747e' : '#4a5462');
    }

    // Pebbles in dirt areas
    for (let i = 0; i < 8; i++) {
      const sx = Math.floor(rnd() * 32), sy = Math.floor(rnd() * 32);
      const n = sampleN(sx, sy);
      if (n <= 0.45) put(sx, sy, '#7a7060');
    }

    // --- Decorations (deterministic per tile) ---

    // Crack pattern (~12% of tiles)
    if (rnd() < 0.12) {
      const cx = 4 + Math.floor(rnd() * 24);
      const cy = 4 + Math.floor(rnd() * 24);
      const len = 4 + Math.floor(rnd() * 8);
      const dx = rnd() > 0.5 ? 1 : 0;
      const dy = rnd() > 0.5 ? 1 : (dx === 0 ? 1 : 0);
      for (let i = 0; i < len; i++) {
        put(cx + i * dx + Math.floor(rnd() * 2 - 0.5), cy + i * dy + Math.floor(rnd() * 2 - 0.5), '#3a4250');
      }
    }

    // Scorch mark (~2% of tiles)
    if (rnd() < 0.02) {
      const sx = 8 + Math.floor(rnd() * 16);
      const sy = 8 + Math.floor(rnd() * 16);
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (dx * dx + dy * dy <= 9) {
            const px2 = sx + dx, py2 = sy + dy;
            if (px2 >= 0 && px2 < 32 && py2 >= 0 && py2 < 32) {
              put(px2, py2, dx * dx + dy * dy <= 4 ? '#1a1a22' : '#2a2a30');
            }
          }
        }
      }
    }

    // Moss patch (~10% of tiles)
    if (rnd() < 0.10) {
      const mx = 8 + Math.floor(rnd() * 16);
      const my = 8 + Math.floor(rnd() * 16);
      for (let i = 0; i < 8; i++) {
        put(mx + Math.floor(rnd() * 6 - 3), my + Math.floor(rnd() * 6 - 3), rnd() > 0.5 ? '#2e4a2a' : '#3e5f38');
      }
    }

    // Bones (~6% of tiles) — varied patterns
    if (rnd() < 0.06) {
      const bx = 6 + Math.floor(rnd() * 20);
      const by = 8 + Math.floor(rnd() * 16);
      const bone = '#c8c0b0';
      const boneHi = '#d8d0c0';
      const boneLo = '#a8a090';
      const pattern = Math.floor(rnd() * 5);
      if (pattern === 0) {
        // Femur — diagonal with knobs
        put(bx, by, boneHi); put(bx + 1, by, bone);
        put(bx + 1, by + 1, bone); put(bx + 2, by + 1, bone);
        put(bx + 2, by + 2, bone); put(bx + 3, by + 2, boneHi);
        put(bx - 1, by, boneLo); put(bx + 4, by + 2, boneLo);
      } else if (pattern === 1) {
        // Skull fragment — small circle
        put(bx, by, bone); put(bx + 1, by, boneHi); put(bx + 2, by, bone);
        put(bx, by + 1, boneHi); put(bx + 1, by + 1, '#2a2228'); put(bx + 2, by + 1, boneHi);
        put(bx, by + 2, boneLo); put(bx + 1, by + 2, boneLo); put(bx + 2, by + 2, boneLo);
      } else if (pattern === 2) {
        // Ribcage — curved lines
        put(bx, by, bone); put(bx + 1, by - 1, bone); put(bx + 2, by - 1, boneHi); put(bx + 3, by, bone);
        put(bx, by + 2, boneLo); put(bx + 1, by + 1, boneLo); put(bx + 2, by + 1, bone); put(bx + 3, by + 2, boneLo);
      } else if (pattern === 3) {
        // Crossed bones — X shape
        put(bx, by, boneHi); put(bx + 3, by, boneHi);
        put(bx + 1, by + 1, bone); put(bx + 2, by + 1, bone);
        put(bx + 1, by + 2, bone); put(bx + 2, by + 2, bone);
        put(bx, by + 3, boneLo); put(bx + 3, by + 3, boneLo);
      } else {
        // Scattered small bones — 2-3 fragments
        put(bx, by, bone); put(bx + 1, by, boneHi);
        put(bx + 3, by + 2, bone); put(bx + 4, by + 2, boneLo);
        if (rnd() > 0.4) { put(bx + 1, by + 3, boneLo); put(bx + 2, by + 3, bone); }
      }
    }

    // Fallen leaves (~10% of tiles)
    if (rnd() < 0.10) {
      const leafColors = ['#6a4a20', '#8a5a20', '#5a3a10', '#9a6a30'];
      for (let i = 0; i < 3; i++) {
        const lx = 4 + Math.floor(rnd() * 24);
        const ly = 4 + Math.floor(rnd() * 24);
        const col = leafColors[Math.floor(rnd() * leafColors.length)];
        put(lx, ly, col);
        put(lx + 1, ly, col);
      }
    }
  };
}

// Forest ground — darker greens with brown dirt patches, leaf litter, mushrooms, moss
function drawGroundForest(tileX: number, tileY: number) {
  return (put: Put) => {
    // Forest green shades — tighter range so transitions are subtle
    const greenHex = ['#2a4626', '#2e4c2c', '#324f30', '#365434'];

    // Dirt shades — earthy browns
    const dirtHex = ['#4a3828', '#3e2e20', '#32261a'];

    let s = ((tileX * 73856093 + tileY * 19349669) >>> 0) % 2147483647;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

    // Per-pixel hash for dithering — use two rounds to break diagonal patterns
    const pxHash = (x: number, y: number) => {
      let h = ((x * 374761393 + y * 668265263 + 1274126177) >>> 0);
      h = ((h ^ (h >> 13)) * 1103515245 + 12345) >>> 0;
      return (h & 0xffff) / 0xffff;
    };

    // Dither zone width (fraction of shade range where mixing occurs)
    const ditherW = 0.06;

    // Precompute both noise layers at 1/4 resolution
    const sampleN = precomputeNoise(tileX, tileY, 8000, 1000, 400);
    const sampleDirt = precomputeNoise(tileX, tileY, 5000, 2000, 300);

    for (let py = 0; py < 32; py++) {
      for (let px = 0; px < 32; px++) {
        const wx = tileX * 32 + px;
        const wy = tileY * 32 + py;

        const n = sampleN(px, py);
        const dirtN = sampleDirt(px, py);
        const h = pxHash(wx, wy); // 0..1 random per pixel

        // Jitter the dirt threshold per-pixel for ragged edges
        const dirtThresh = 0.62 + (h - 0.5) * 0.03;

        if (dirtN > dirtThresh) {
          // Green-to-dirt edge dithering
          const edgeDither = 0.025;
          if (dirtN < dirtThresh + edgeDither) {
            // Mix green and dirt pixels randomly at the border
            const mixChance = (dirtN - dirtThresh) / edgeDither;
            if (h > mixChance) {
              // Green pixel
              const gPos = Math.min(3.999, n * 4);
              put(px, py, greenHex[Math.floor(gPos)]);
            } else {
              put(px, py, dirtHex[0]); // lightest dirt
            }
          } else {
            // Inner dirt — dithered shade transitions
            const inner = (dirtN - dirtThresh - edgeDither) / (1.0 - dirtThresh - edgeDither);
            const dPos = Math.min(2.999, Math.max(0, inner * 3));
            const dIdx = Math.floor(dPos);
            const dFrac = dPos - dIdx;
            // Dither near boundaries
            if (dIdx < 2 && dFrac > (1 - ditherW) && h > (dFrac - (1 - ditherW)) / ditherW) {
              put(px, py, dirtHex[dIdx]);
            } else if (dIdx < 2 && dFrac > (1 - ditherW)) {
              put(px, py, dirtHex[dIdx + 1]);
            } else {
              put(px, py, dirtHex[dIdx]);
            }
          }
        } else {
          // Green shades — dithered transitions
          const gPos = Math.min(3.999, n * 4);
          const gIdx = Math.floor(gPos);
          const gFrac = gPos - gIdx;
          // Dither near shade boundaries
          if (gIdx < 3 && gFrac > (1 - ditherW) && h > (gFrac - (1 - ditherW)) / ditherW) {
            put(px, py, greenHex[gIdx]);
          } else if (gIdx < 3 && gFrac > (1 - ditherW)) {
            put(px, py, greenHex[gIdx + 1]);
          } else {
            put(px, py, greenHex[gIdx]);
          }
        }
      }
    }

    // Scattered leaf litter (~12% of tiles, 1-2 leaves)
    if (rnd() < 0.12) {
      const leafColors = ['#c07030', '#8a5020', '#b09040', '#a06828', '#7a4018'];
      const count = 1 + Math.floor(rnd() * 2);
      for (let i = 0; i < count; i++) {
        const lx = 1 + Math.floor(rnd() * 30);
        const ly = 1 + Math.floor(rnd() * 30);
        put(lx, ly, leafColors[Math.floor(rnd() * leafColors.length)]);
      }
    }

    // Scattered mushrooms (~2.5% of tiles)
    if (rnd() < 0.025) {
      const mx = 2 + Math.floor(rnd() * 28);
      const my = 2 + Math.floor(rnd() * 28);
      put(mx, my - 1, '#d04040');    // red cap
      put(mx + 1, my - 1, '#b03030');
      put(mx, my, '#e8e0d0');        // white stem
    }

    // Moss patches (~6% of tiles)
    if (rnd() < 0.06) {
      const mx = 3 + Math.floor(rnd() * 26);
      const my = 3 + Math.floor(rnd() * 26);
      put(mx, my, '#4a8a30');
      put(mx + 1, my, '#3a7a28');
      put(mx, my + 1, '#4a8a30');
    }

    // Rare rock (~4%) on any ground
    if (rnd() < 0.04) {
      const rx = 2 + Math.floor(rnd() * 28);
      const ry = 2 + Math.floor(rnd() * 28);
      put(rx, ry, '#5a6270');
      put(rx + 1, ry, '#4a5260');
      put(rx, ry + 1, '#3e4654');
    }

    // Small rocks/pebbles in dirt patches (~30% of tiles, placed only if in dirt)
    if (rnd() < 0.30) {
      const rockColors = ['#6a6260', '#5a5450', '#7a7068', '#4e4844'];
      const count = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < count; i++) {
        const rx = 2 + Math.floor(rnd() * 28);
        const ry = 2 + Math.floor(rnd() * 28);
        // Only place if this pixel is in a dirt region
        const wx = tileX * 32 + rx;
        const wy = tileY * 32 + ry;
        const dn = wnoise(wx + 5000, wy + 2000, 300);
        if (dn > 0.68) {
          const col = rockColors[Math.floor(rnd() * rockColors.length)];
          put(rx, ry, col);
          if (rnd() > 0.5) put(rx + 1, ry, col); // sometimes 2px wide
        }
      }
    }

    // Rare grass tuft (~8%)
    if (rnd() < 0.08) {
      const tx = 3 + Math.floor(rnd() * 26);
      const ty = 3 + Math.floor(rnd() * 26);
      put(tx, ty, '#2a5a20');
      put(tx + 1, ty, '#2a5a20');
      put(tx, ty - 1, '#3a6a28');
    }
  };
}

// Infected riverside ground — dark purples with toxic green patches, sickly vegetation
function drawGroundInfected(tileX: number, tileY: number) {
  return (put: Put) => {
    // Base shades: dark purples to sickly greens
    const shades = [
      [0x22, 0x18, 0x30],  // deep purple
      [0x2a, 0x20, 0x38],  // medium purple
      [0x28, 0x30, 0x22],  // dark infected green
      [0x30, 0x3a, 0x28],  // sickly green
    ];
    const shadeHex = shades.map(([r, g, b]) =>
      '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0')
    );
    const lerpCol = (a: number[], b: number[], t: number): string => {
      const r = Math.round(a[0] + (b[0] - a[0]) * t);
      const g = Math.round(a[1] + (b[1] - a[1]) * t);
      const bl = Math.round(a[2] + (b[2] - a[2]) * t);
      return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + bl.toString(16).padStart(2, '0');
    };

    let s = ((tileX * 73856093 + tileY * 19349669) >>> 0) % 2147483647;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

    const fadeW = 0.06;
    const midW  = 0.03;
    const totalW = fadeW + midW + fadeW;

    const sampleN = precomputeNoise(tileX, tileY, 6000, 800, 350);

    for (let py = 0; py < 32; py++) {
      for (let px = 0; px < 32; px++) {
        const n = sampleN(px, py);
        const pos = Math.min(3.999, n * 4);
        const idx = Math.floor(pos);
        const frac = pos - idx;

        const bandStart = 1 - totalW;
        if (idx < 3 && frac > bandStart) {
          const mid = shades[idx].map((c, i) => Math.round((c + shades[idx + 1][i]) / 2));
          const t = frac - bandStart;
          if (t < fadeW) {
            put(px, py, lerpCol(shades[idx], mid, t / fadeW));
          } else if (t < fadeW + midW) {
            put(px, py, lerpCol(mid, mid, 0));
          } else {
            put(px, py, lerpCol(mid, shades[idx + 1], (t - fadeW - midW) / fadeW));
          }
        } else {
          put(px, py, shadeHex[idx]);
        }
      }
    }

    // Toxic puddle (~3% of tiles)
    if (rnd() < 0.03) {
      const px0 = 4 + Math.floor(rnd() * 24);
      const py0 = 4 + Math.floor(rnd() * 24);
      const sz = 2 + Math.floor(rnd() * 2);
      for (let dy = 0; dy < sz; dy++) {
        for (let dx = 0; dx < sz; dx++) {
          if (rnd() > 0.4) put(px0 + dx, py0 + dy, rnd() > 0.5 ? '#40e060' : '#30b848');
        }
      }
    }

    // Infected moss (~4% of tiles)
    if (rnd() < 0.04) {
      const mx = 2 + Math.floor(rnd() * 26);
      const my = 2 + Math.floor(rnd() * 26);
      put(mx, my, '#6040a0');
      put(mx + 1, my, '#5a38a0');
    }
  };
}

// Tree cluster patterns — each defines which tiles are occupied
// Coordinates are relative (dx, dy) from the top-left of the cluster
export const TREE_PATTERNS: { tiles: { dx: number; dy: number }[]; w: number; h: number }[] = [
  // All convex shapes — no internal pockets that enemies can get stuck in
  // Small (2-3 tiles)
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }], w: 2, h: 1 },
  { tiles: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }], w: 1, h: 2 },
  { tiles: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: 2 }], w: 1, h: 3 },
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }], w: 3, h: 1 },
  // Medium (4 tiles)
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }], w: 2, h: 2 },
  { tiles: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }], w: 2, h: 2 },
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }], w: 2, h: 2 },
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }, { dx: 3, dy: 0 }], w: 4, h: 1 },
  { tiles: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: 2 }, { dx: 0, dy: 3 }], w: 1, h: 4 },
  // Large (5-6 tiles) — wide/tall rectangles
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 2, dy: 1 }], w: 3, h: 2 },
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 0, dy: 2 }, { dx: 1, dy: 2 }], w: 2, h: 3 },
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }], w: 3, h: 2 },
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 0, dy: 2 }], w: 2, h: 3 },
  // Large (6-8 tiles) — big blocks
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }, { dx: 3, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 2, dy: 1 }, { dx: 3, dy: 1 }], w: 4, h: 2 },
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 2, dy: 1 }, { dx: 0, dy: 2 }, { dx: 1, dy: 2 }, { dx: 2, dy: 2 }], w: 3, h: 3 },
];

// Castle floor spike cluster patterns. Same convex-shape rule the trees
// use so enemies don't path-stick on internal pockets. Each tile within
// a pattern is rendered with a randomly chosen variant texture so even
// long rows don't look stamped.
export const SPIKE_PATTERNS: { tiles: { dx: number; dy: number }[]; w: number; h: number }[] = [
  // Singles (still want some lone spikes mixed in)
  { tiles: [{ dx: 0, dy: 0 }], w: 1, h: 1 },
  // Pairs
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }], w: 2, h: 1 },
  { tiles: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }], w: 1, h: 2 },
  // Rows of 3
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }], w: 3, h: 1 },
  { tiles: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: 2 }], w: 1, h: 3 },
  // 2x2 square
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }], w: 2, h: 2 },
  // 3x2 wide strip
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 2, dy: 1 }], w: 3, h: 2 },
  // 2x3 tall strip
  { tiles: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 0, dy: 2 }, { dx: 1, dy: 2 }], w: 2, h: 3 },
];

// Number of visual jitter variants registered as castle_spikes_0..N-1.
// Independent from SPIKE_PATTERNS so the cluster shape and the per-tile
// art aren't tangled.
export const SPIKE_VARIANT_COUNT = 3;

/** SMB-style staggered spike patch — 3 small back spikes + 2 larger
 *  front spikes for depth. variantIdx jitters x positions so nearby
 *  spike tiles don't all look identical. */
function drawCastleSpikesCanvas(variantIdx: number): HTMLCanvasElement {
  const T = 32;
  const canvas = document.createElement('canvas');
  canvas.width = T; canvas.height = T;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Steel-blue palette (matches castle-spikes-options.html previews).
  const PAL = {
    outline: '#1d2027',
    dark:    '#2f3640',
    mid:     '#5a606c',
    light:   '#8e95a3',
    shine:   '#c8cdd6',
  };

  // Soft ground shadow under the cluster
  (function shadow(cx: number, cy: number, rx: number, ry: number) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#0e0e16';
    for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) {
      if ((xx * xx) / (rx * rx) + (yy * yy) / (ry * ry) <= 1) ctx.fillRect(cx + xx, cy + yy, 1, 1);
    }
    ctx.restore();
  })(16, 28, 12, 2);

  // Triangle spike: lit-left / shaded-right with a dark outline + tip shine.
  function drawSpike(cx: number, baseY: number, halfBaseW: number, height: number) {
    for (let i = 0; i <= height; i++) {
      const y = baseY - i;
      const t = i / height;
      const w = Math.max(0, halfBaseW * (1 - t));
      const xL = Math.round(cx - w);
      const xR = Math.round(cx + w);
      ctx.fillStyle = PAL.mid;
      if (xR > xL) ctx.fillRect(xL, y, xR - xL, 1);
      ctx.fillStyle = PAL.dark;
      ctx.fillRect(cx, y, xR - cx + 1, 1);
      ctx.fillStyle = PAL.light;
      ctx.fillRect(xL, y, 1, 1);
      if (xR > xL) {
        ctx.fillStyle = PAL.outline;
        ctx.fillRect(xR, y, 1, 1);
      }
    }
    const tipY = baseY - height;
    ctx.fillStyle = PAL.shine;
    ctx.fillRect(cx - 1, tipY, 1, 1);
    ctx.fillRect(cx - 1, tipY + 1, 1, 1);
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(Math.round(cx - halfBaseW), baseY + 1, halfBaseW * 2 + 1, 1);
  }

  // Per-variant x jitter so consecutive spike tiles don't look stamped.
  const j = [-2, 0, 2][variantIdx % 3];

  // Back row (smaller, drawn first so the front overlaps them)
  drawSpike( 9 + j, 22, 3, 10);
  drawSpike(16 + j, 22, 3, 12);
  drawSpike(23 + j, 22, 3, 10);
  // Front row (larger)
  drawSpike(12 + j, 27, 4, 13);
  drawSpike(20 + j, 27, 4, 13);

  return canvas;
}

// Draw a WC2-style conifer tree cluster — triangular tiered pine trees packed tightly
function drawTreeClusterCanvas(patternIdx: number): HTMLCanvasElement {
  const pattern = TREE_PATTERNS[patternIdx];
  const T = 32; // tile size in pixels (world space)
  // Large padding — trees are much taller than a single tile
  const pad = 40;
  const cw = pattern.w * T + pad * 2;
  const ch = pattern.h * T + pad * 2;

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Seeded RNG per pattern
  let seed = (patternIdx * 73856093 + 54321) >>> 0;
  const rnd = () => { seed = (seed * 16807 + 1) % 2147483647; return seed / 2147483647; };

  // Place 2-3 trees per tile, tightly packed with jitter for dense clumps
  type TreeDef = { cx: number; cy: number; h: number; baseW: number; shade: number };
  const trees: TreeDef[] = [];

  for (const t of pattern.tiles) {
    const tileCx = t.dx * T + T / 2 + pad;
    const tileCy = t.dy * T + T * 0.85 + pad;
    const treesPerTile = 2 + (rnd() > 0.5 ? 1 : 0); // 2-3 trees per tile
    for (let i = 0; i < treesPerTile; i++) {
      const cx = tileCx + (rnd() - 0.5) * T * 0.7;
      const cy = tileCy + (rnd() - 0.5) * T * 0.4;
      const treeH = 48 + Math.floor(rnd() * 14); // much taller: 48-62px
      trees.push({
        cx, cy, h: treeH,
        baseW: 26 + Math.floor(rnd() * 8), // wider: 26-34px
        shade: Math.floor(rnd() * 3)
      });
    }
  }

  // Sort back-to-front (higher cy = closer to camera = drawn later)
  trees.sort((a, b) => a.cy - b.cy);

  // Color palettes — 3 shade variants
  const palettes = [
    { dark: '#0e2408', mid: '#1a3a12', light: '#28521e', highlight: '#38682c', bright: '#4a7e3a' },
    { dark: '#102608', mid: '#1c3e14', light: '#2a5420', highlight: '#3a6a2e', bright: '#4c823c' },
    { dark: '#0c2206', mid: '#183810', light: '#26501c', highlight: '#36642a', bright: '#488038' },
  ];

  for (const tree of trees) {
    const p = palettes[tree.shade];
    const { cx, cy, h, baseW } = tree;
    const topY = cy - h;

    // Trunk — short, visible below the lowest branches
    const trunkW = 4;
    const trunkH = 7;
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(Math.floor(cx - trunkW / 2) - 1, Math.floor(cy - trunkH), trunkW + 2, trunkH + 1);
    ctx.fillStyle = '#4a2e14';
    ctx.fillRect(Math.floor(cx - trunkW / 2), Math.floor(cy - trunkH), trunkW, trunkH);

    // 3 tiers of triangular branch layers, bottom to top
    const tiers = 3;
    for (let tier = 0; tier < tiers; tier++) {
      const t0 = tier / tiers;
      const t1 = (tier + 1) / tiers;
      const tierBot = cy - h * t0 * 0.75 - 3;
      const tierTop = cy - h * (t0 + (t1 - t0) * 0.85) - 3;
      const tierMid = (tierBot + tierTop) / 2;
      const tierW = baseW * (1 - t0 * 0.55);

      // Dark shadow triangle (slightly offset)
      ctx.fillStyle = p.dark;
      ctx.beginPath();
      ctx.moveTo(cx, tierTop - 1);
      ctx.lineTo(cx - tierW / 2 - 1, tierBot + 1);
      ctx.lineTo(cx + tierW / 2 + 1, tierBot + 1);
      ctx.closePath();
      ctx.fill();

      // Main body triangle
      ctx.fillStyle = p.mid;
      ctx.beginPath();
      ctx.moveTo(cx, tierTop);
      ctx.lineTo(cx - tierW / 2, tierBot);
      ctx.lineTo(cx + tierW / 2, tierBot);
      ctx.closePath();
      ctx.fill();

      // Left-side highlight (light from top-left)
      ctx.fillStyle = p.light;
      ctx.beginPath();
      ctx.moveTo(cx - 1, tierTop + 1);
      ctx.lineTo(cx - tierW / 2 + 1, tierBot);
      ctx.lineTo(cx - tierW * 0.15, tierBot);
      ctx.lineTo(cx - 1, tierMid);
      ctx.closePath();
      ctx.fill();

      // Bright highlight near top-left
      ctx.fillStyle = p.highlight;
      ctx.beginPath();
      ctx.moveTo(cx - 1, tierTop + 2);
      ctx.lineTo(cx - tierW * 0.3, tierMid + 1);
      ctx.lineTo(cx - 1, tierMid - 1);
      ctx.closePath();
      ctx.fill();

      // Branch edge detail — jagged pixels along edges
      const steps = Math.floor(tierBot - tierTop);
      for (let i = 0; i < steps; i += 2) {
        const fy = tierTop + i;
        const frac = i / steps;
        const edgeW = tierW / 2 * frac;
        if (rnd() > 0.3) {
          const jx = cx - edgeW - 1 + rnd() * 2;
          ctx.fillStyle = rnd() > 0.5 ? p.dark : p.mid;
          ctx.fillRect(Math.floor(jx), Math.floor(fy), 1, 1);
        }
        if (rnd() > 0.3) {
          const jx = cx + edgeW - 1 + rnd() * 2;
          ctx.fillStyle = rnd() > 0.5 ? p.dark : p.mid;
          ctx.fillRect(Math.floor(jx), Math.floor(fy), 1, 1);
        }
      }
    }

    // Pointed tip
    ctx.fillStyle = p.bright;
    ctx.fillRect(Math.floor(cx), Math.floor(topY - 2), 1, 3);
    ctx.fillStyle = p.highlight;
    ctx.fillRect(Math.floor(cx - 1), Math.floor(topY - 1), 1, 1);

    // Scattered bright needle highlights
    for (let i = 0; i < 10; i++) {
      const hx = cx + (rnd() - 0.5) * baseW * 0.6;
      const hy = cy - rnd() * h * 0.8 - 3;
      ctx.fillStyle = rnd() > 0.5 ? p.bright : p.highlight;
      ctx.fillRect(Math.floor(hx), Math.floor(hy), 1, 1);
    }
  }

  return canvas;
}

// Draw infected plant cluster — bulbous, sickly purple/green growths
function drawInfectedPlantCanvas(patternIdx: number): HTMLCanvasElement {
  const pattern = TREE_PATTERNS[patternIdx];
  const T = 32;
  const pad = 30;
  const cw = pattern.w * T + pad * 2;
  const ch = pattern.h * T + pad * 2;

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  let seed = (patternIdx * 48271 + 99991) >>> 0;
  const rnd = () => { seed = (seed * 16807 + 1) % 2147483647; return seed / 2147483647; };

  type PlantDef = { cx: number; cy: number; h: number; w: number; variant: number };
  const plants: PlantDef[] = [];

  for (const t of pattern.tiles) {
    const tileCx = t.dx * T + T / 2 + pad;
    const tileCy = t.dy * T + T * 0.85 + pad;
    const plantsPerTile = 2 + (rnd() > 0.6 ? 1 : 0);
    for (let i = 0; i < plantsPerTile; i++) {
      plants.push({
        cx: tileCx + (rnd() - 0.5) * T * 0.6,
        cy: tileCy + (rnd() - 0.5) * T * 0.3,
        h: 30 + Math.floor(rnd() * 20),
        w: 18 + Math.floor(rnd() * 10),
        variant: Math.floor(rnd() * 3)
      });
    }
  }

  plants.sort((a, b) => a.cy - b.cy);

  const palettes = [
    { stem: '#2a1040', dark: '#4a2070', mid: '#6a30a0', light: '#8a48c0', glow: '#50e070' },
    { stem: '#1a2030', dark: '#2a4038', mid: '#3a6050', light: '#4a8068', glow: '#80ff90' },
    { stem: '#2a1838', dark: '#5a2880', mid: '#7a38b0', light: '#9a50d0', glow: '#60e880' },
  ];

  for (const plant of plants) {
    const p = palettes[plant.variant];
    const { cx, cy, h, w } = plant;

    // Thick stem
    const stemW = 3 + Math.floor(rnd() * 2);
    ctx.fillStyle = p.stem;
    ctx.fillRect(Math.floor(cx - stemW / 2), Math.floor(cy - h * 0.4), stemW, Math.floor(h * 0.4));

    // Bulbous infected growth — stacked ovals
    const layers = 2 + Math.floor(rnd() * 2);
    for (let l = 0; l < layers; l++) {
      const ly = cy - h * 0.3 - l * h * 0.2;
      const lw = w * (1 - l * 0.2) / 2;
      const lh = h * 0.25;

      // Dark outline
      ctx.fillStyle = p.dark;
      ctx.beginPath();
      ctx.ellipse(cx, ly, lw + 1, lh / 2 + 1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main body
      ctx.fillStyle = p.mid;
      ctx.beginPath();
      ctx.ellipse(cx, ly, lw, lh / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = p.light;
      ctx.beginPath();
      ctx.ellipse(cx - lw * 0.2, ly - lh * 0.15, lw * 0.5, lh * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glowing spore tips
    const sporeCount = 3 + Math.floor(rnd() * 4);
    for (let i = 0; i < sporeCount; i++) {
      const sx = cx + (rnd() - 0.5) * w * 0.8;
      const sy = cy - h * 0.5 - rnd() * h * 0.4;
      ctx.fillStyle = p.glow;
      ctx.fillRect(Math.floor(sx), Math.floor(sy), 2, 2);
      // Subtle glow around spore
      ctx.globalAlpha = 0.3;
      ctx.fillRect(Math.floor(sx) - 1, Math.floor(sy) - 1, 4, 4);
      ctx.globalAlpha = 1;
    }

    // Dripping tendrils from bottom
    const tendrils = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < tendrils; i++) {
      const tx = cx + (rnd() - 0.5) * w * 0.5;
      const tLen = 4 + Math.floor(rnd() * 8);
      ctx.fillStyle = rnd() > 0.5 ? '#40c060' : '#6030a0';
      for (let j = 0; j < tLen; j++) {
        ctx.fillRect(Math.floor(tx + (rnd() - 0.5) * 2), Math.floor(cy + j), 1, 1);
      }
    }
  }

  return canvas;
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

// ==================================================================
//  MEADOW BOSS — The Ancient Ram (64x64)
// ==================================================================

interface RamOpts {
  bob?: number;
  flash?: boolean;
  chargeGlow?: boolean;
  pockets?: number;
  rearUp?: boolean;
  legStep?: number;
  headDown?: boolean; // atk windup: head lowered
}

function drawRamBody(put: Put, opts: RamOpts) {
  const cx = 32;
  const baseCy = 34 + (opts.bob ?? 0) + (opts.rearUp ? -2 : 0);

  const col = {
    out: opts.flash ? P.white : P.outline,
    d:   opts.flash ? P.white : P.ramD,
    m:   opts.flash ? P.white : P.ramM,
    b:   opts.flash ? P.white : P.ram,
    l:   opts.flash ? P.white : P.ramL
  };
  const wc = {
    d: opts.flash ? P.white : P.woolD,
    b: opts.flash ? P.white : P.wool,
    l: opts.flash ? P.white : P.woolL
  };
  const hc = {
    d: opts.flash ? P.white : P.hornD,
    m: opts.flash ? P.white : P.hornM,
    b: opts.flash ? P.white : P.horn,
    l: opts.flash ? P.white : P.hornL
  };

  // Drop shadow
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -24; dx <= 24; dx++)
      if ((dx * dx) / 576 + (dy * dy) / 5 <= 1) put(cx + dx, 59 + dy, P.shadow);

  // --- Legs (4 thick legs) ---
  const legStep = opts.legStep ?? 0;
  // Back legs
  rect(put, cx - 18, baseCy + 12 + legStep, 5, 10, col.d);
  rect(put, cx - 17, baseCy + 13 + legStep, 3, 8, col.m);
  rect(put, cx - 10, baseCy + 14 - legStep, 5, 9, col.d);
  rect(put, cx - 9, baseCy + 15 - legStep, 3, 7, col.m);
  // Front legs
  rect(put, cx + 6, baseCy + 14 - legStep, 5, 9, col.d);
  rect(put, cx + 7, baseCy + 15 - legStep, 3, 7, col.m);
  rect(put, cx + 14, baseCy + 12 + legStep, 5, 10, col.d);
  rect(put, cx + 15, baseCy + 13 + legStep, 3, 8, col.m);
  // Hooves (dark)
  rect(put, cx - 18, baseCy + 22 + legStep, 6, 2, col.out);
  rect(put, cx - 10, baseCy + 22 - legStep, 6, 2, col.out);
  rect(put, cx + 6, baseCy + 22 - legStep, 6, 2, col.out);
  rect(put, cx + 14, baseCy + 22 + legStep, 6, 2, col.out);

  // --- Woolly body (big round barrel) ---
  disc(put, cx, baseCy, 22, col.out);
  disc(put, cx, baseCy, 21, wc.d);
  disc(put, cx, baseCy, 19, wc.b);

  // Upper back wool — darker, textured
  for (let y = -19; y <= -3; y++)
    for (let x = -18; x <= 18; x++)
      if (x * x + y * y <= 361) put(cx + x, baseCy + y, wc.d);
  for (let y = -17; y <= -5; y++)
    for (let x = -16; x <= 16; x++)
      if (x * x + y * y <= 289) put(cx + x, baseCy + y, wc.b);

  // Wool highlight (upper-left)
  for (let y = -16; y <= -8; y++)
    for (let x = -14; x <= -2; x++)
      if (x * x + y * y <= 225) put(cx + x, baseCy + y, wc.l);

  // Wool texture lumps
  disc(put, cx - 8, baseCy - 8, 5, wc.b);
  disc(put, cx + 4, baseCy - 6, 4, wc.b);
  disc(put, cx - 2, baseCy - 12, 4, wc.l);
  disc(put, cx + 10, baseCy - 4, 3, wc.b);

  // Belly (lighter underside)
  for (let y = 4; y <= 19; y++)
    for (let x = -16; x <= 16; x++)
      if (x * x + y * y <= 380) put(cx + x, baseCy + y, P.ramBelly);
  for (let y = 10; y <= 19; y++)
    for (let x = -12; x <= 12; x++)
      if (x * x + y * y <= 340) put(cx + x, baseCy + y, P.ramL);

  // --- Shoulder hump ---
  disc(put, cx + 12, baseCy - 6, 8, wc.d);
  disc(put, cx + 12, baseCy - 6, 6, wc.b);

  // --- Head ---
  const headOff = opts.headDown ? 3 : 0;
  const hx = cx + 22, hy = baseCy - 4 + headOff;

  // Neck
  rect(put, cx + 12, hy - 4, 12, 12, col.b);
  rect(put, cx + 14, hy - 2, 8, 8, col.l);

  // Head shape
  disc(put, hx, hy, 8, col.out);
  disc(put, hx, hy, 7, col.d);
  disc(put, hx, hy, 6, col.b);
  // Forehead lighter
  disc(put, hx + 1, hy - 2, 4, col.l);
  // Muzzle
  rect(put, hx + 4, hy, 6, 5, col.b);
  rect(put, hx + 5, hy + 1, 5, 3, col.l);
  // Nose
  put(hx + 9, hy + 1, col.out); put(hx + 10, hy + 1, col.out);
  put(hx + 9, hy + 2, col.out); put(hx + 10, hy + 2, col.out);
  // Mouth
  rect(put, hx + 5, hy + 4, 5, 1, col.d);
  // Ear
  rect(put, hx - 2, hy - 8, 3, 4, col.d);
  put(hx - 1, hy - 7, '#8a5a5a');

  // Eye — angry amber
  put(hx + 2, hy - 2, '#ffcc20'); put(hx + 3, hy - 2, '#ffcc20');
  put(hx + 2, hy - 1, '#ffaa00'); put(hx + 3, hy - 1, '#ffcc20');
  put(hx + 3, hy - 2, col.out); // pupil
  // Brow ridge
  rect(put, hx + 1, hy - 3, 4, 1, col.d);

  // --- HORNS — massive curling spirals ---
  // Right horn (curls from forehead outward and down)
  rect(put, hx - 2, hy - 6, 4, 3, hc.b);
  rect(put, hx - 5, hy - 8, 4, 3, hc.b);
  rect(put, hx - 8, hy - 8, 4, 3, hc.m);
  rect(put, hx - 10, hy - 6, 3, 4, hc.m);
  rect(put, hx - 11, hy - 3, 3, 4, hc.d);
  rect(put, hx - 10, hy, 3, 3, hc.d);
  rect(put, hx - 8, hy + 2, 3, 2, hc.d);
  // Horn ridges (texture rings)
  put(hx - 3, hy - 7, hc.d); put(hx - 6, hy - 8, hc.d);
  put(hx - 9, hy - 6, hc.d); put(hx - 10, hy - 1, hc.d);
  // Horn highlight
  put(hx - 4, hy - 7, hc.l); put(hx - 7, hy - 7, hc.l);

  // Left horn (behind head, partial)
  rect(put, hx + 2, hy - 7, 3, 3, hc.b);
  rect(put, hx + 4, hy - 9, 3, 3, hc.b);
  rect(put, hx + 6, hy - 9, 3, 2, hc.m);
  rect(put, hx + 8, hy - 7, 2, 3, hc.d);
  put(hx + 5, hy - 8, hc.d);

  // Charge glow — horns shimmer
  if (opts.chargeGlow) {
    put(hx - 6, hy - 8, P.sparkL);
    put(hx - 10, hy - 2, P.sparkL);
    put(hx - 8, hy + 2, P.spark);
    put(hx + 6, hy - 9, P.sparkL);
  }

  // --- Tail (short woolly) ---
  put(cx - 22, baseCy + 2, wc.d);
  put(cx - 23, baseCy + 1, wc.d);
  put(cx - 22, baseCy + 3, wc.d);
  put(cx - 23, baseCy + 2, wc.b);

  // --- Birth pockets on back ---
  if (opts.pockets !== undefined) {
    const stage = opts.pockets;
    const pockets: Array<[number, number]> = [
      [-10, -13], [-2, -15], [6, -14]
    ];
    for (const [px, py] of pockets) {
      const ox = cx + px, oy = baseCy + py;
      if (stage === 0) {
        disc(put, ox, oy, 3, wc.l);
        disc(put, ox, oy, 2, wc.b);
      } else if (stage === 1) {
        disc(put, ox, oy, 3, wc.d);
        disc(put, ox, oy, 2, col.out);
        put(ox, oy, P.redD);
      } else if (stage === 2) {
        disc(put, ox, oy, 3, wc.d);
        disc(put, ox, oy, 2, P.red);
        put(ox - 1, oy, P.white);
        put(ox + 1, oy, P.white);
        put(ox, oy + 1, col.out);
      } else if (stage === 3) {
        disc(put, ox, oy - 1, 4, wc.d);
        disc(put, ox, oy - 1, 3, P.red);
        disc(put, ox, oy - 2, 2, P.redL);
        put(ox - 1, oy - 1, P.white);
        put(ox + 1, oy - 1, P.white);
        put(ox, oy, col.out);
      } else if (stage === 4) {
        disc(put, ox, oy, 3, col.out);
        disc(put, ox, oy, 2, wc.d);
      }
    }
  }
}

function drawRam(frame: BossFrame) {
  return (put: Put) => {
    switch (frame) {
      case 'idle0':      return drawRamBody(put, { bob: 0 });
      case 'idle1':      return drawRamBody(put, { bob: 1 });
      case 'move0':      return drawRamBody(put, { bob: 0, legStep: 1 });
      case 'move1':      return drawRamBody(put, { bob: 1, legStep: 0 });
      case 'move2':      return drawRamBody(put, { bob: 0, legStep: -1 });
      case 'move3':      return drawRamBody(put, { bob: 1, legStep: 0 });
      case 'atk0':       return drawRamBody(put, { rearUp: true, headDown: true, bob: -1 });
      case 'atk1':       return drawRamBody(put, { bob: 2 });
      case 'chargeWind': return drawRamBody(put, { chargeGlow: true, headDown: true, bob: 0 });
      case 'hit':        return drawRamBody(put, { flash: true });
      case 'birth0':     return drawRamBody(put, { pockets: 0 });
      case 'birth1':     return drawRamBody(put, { pockets: 1 });
      case 'birth2':     return drawRamBody(put, { pockets: 2 });
      case 'birth3':     return drawRamBody(put, { pockets: 3 });
      case 'birth4':     return drawRamBody(put, { pockets: 4 });
      case 'die0':       return drawRamDie(put, 0);
      case 'die1':       return drawRamDie(put, 1);
      case 'die2':       return drawRamDie(put, 2);
      case 'die3':       return drawRamDie(put, 3);
      case 'die4':       return drawRamDie(put, 4);
    }
  };
}

function drawRamDie(put: Put, step: number) {
  const cx = 32, cy = 36;
  const r = Math.max(0, 24 - step * 5);
  if (r > 0) {
    disc(put, cx, cy, r, P.woolD);
    disc(put, cx, cy, Math.max(0, r - 1), P.wool);
    disc(put, cx, cy, Math.max(0, r - 3), P.woolL);
  }
  // Horn + wool chunks flying out
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + step * 0.3;
    const d = step * 6 + 6;
    const x = Math.round(cx + Math.cos(a) * d);
    const y = Math.round(cy + Math.sin(a) * d);
    put(x, y, P.woolD);
    put(x + 1, y, i % 3 === 0 ? P.horn : P.ramD);
    if (i % 4 === 0) put(x, y + 1, P.ramBelly);
  }
  // Central flash
  if (step < 2) disc(put, cx, cy, 6, P.sparkL);
}

// ==================================================================
//  INFECTED BOSS — The Blighted One (purple/orange/yellow)
// ==================================================================
function drawInfectedBossBody(put: Put, opts: BossOpts) {
  const cx = 32;
  const baseCy = 34 + (opts.bob ?? 0) + (opts.rearUp ? -2 : 0);

  const col = {
    out: opts.flash ? P.white : P.outline,
    d:   opts.flash ? P.white : P.infectD,
    m:   opts.flash ? P.white : P.infectM,
    b:   opts.flash ? P.white : P.infect,
    l:   opts.flash ? P.white : P.infectL
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

  // orange/yellow infected underbelly
  const bellyCol  = opts.flash ? P.white : '#d08020';
  const bellyColM = opts.flash ? P.white : '#a06018';
  const bellyColD = opts.flash ? P.white : '#6a3808';
  for (let y = 4; y <= 22; y++)
    for (let x = -20; x <= 20; x++)
      if (x * x + y * y <= 476) put(cx + x, baseCy + y, bellyCol);
  for (let y = 10; y <= 22; y++)
    for (let x = -17; x <= 17; x++)
      if (x * x + y * y <= 400) put(cx + x, baseCy + y, bellyColM);
  // segmentation lines
  for (let x = -17; x <= 17; x++) {
    if (Math.abs(x) < 16) put(cx + x, baseCy + 8, bellyColD);
    if (Math.abs(x) < 14) put(cx + x, baseCy + 14, bellyColD);
    if (Math.abs(x) < 10) put(cx + x, baseCy + 19, bellyColD);
  }

  // glowing green pustule spines along top
  const spinePositions: Array<[number, number]> = [
    [-16, -16], [-10, -19], [-4, -21], [2, -21], [8, -20], [14, -17]
  ];
  for (const [sx, sy] of spinePositions) {
    put(cx + sx, baseCy + sy + 1, '#40e060');
    put(cx + sx, baseCy + sy, '#40e060');
    put(cx + sx, baseCy + sy - 1, col.out);
  }

  // eye cluster — glowing yellow eyes
  const eyes: Array<[number, number]> = [
    [-12, -4], [-6, -8], [0, -10], [6, -8], [12, -4]
  ];
  for (const [ex, ey] of eyes) {
    const glow = opts.chargeGlow ? P.sparkL : '#e0ff40';
    put(cx + ex - 1, baseCy + ey, P.outline);
    put(cx + ex,     baseCy + ey, glow);
    put(cx + ex + 1, baseCy + ey, opts.chargeGlow ? P.spark : '#ffff80');
    put(cx + ex,     baseCy + ey + 1, P.infectD);
  }

  // mouth — green ooze drip
  rect(put, cx - 5, baseCy + 1, 10, 1, P.outline);
  put(cx - 6, baseCy + 1, '#40e060');
  put(cx + 5, baseCy + 1, '#40e060');
  put(cx - 3, baseCy + 2, '#40e060');
  put(cx + 2, baseCy + 2, '#40e060');

  // birth pockets
  if (opts.pockets !== undefined) {
    const stage = opts.pockets;
    const pockets: Array<[number, number]> = [
      [-10, -13], [-2, -15], [6, -14]
    ];
    for (const [px, py] of pockets) {
      const ox = cx + px, oy = baseCy + py;
      if (stage === 0) {
        disc(put, ox, oy, 3, col.l);
        disc(put, ox, oy, 2, col.b);
      } else if (stage === 1) {
        disc(put, ox, oy, 3, col.d);
        disc(put, ox, oy, 2, P.outline);
        put(ox, oy, '#40e060');
      } else if (stage === 2) {
        disc(put, ox, oy, 3, col.d);
        disc(put, ox, oy, 2, P.infect);
        put(ox - 1, oy, '#e0ff40');
        put(ox + 1, oy, '#e0ff40');
        put(ox, oy + 1, P.outline);
      } else if (stage === 3) {
        disc(put, ox, oy - 1, 4, col.d);
        disc(put, ox, oy - 1, 3, P.infect);
        disc(put, ox, oy - 2, 2, P.infectL);
        put(ox - 1, oy - 1, '#e0ff40');
        put(ox + 1, oy - 1, '#e0ff40');
        put(ox, oy, P.outline);
      } else if (stage === 4) {
        disc(put, ox, oy, 3, P.outline);
        disc(put, ox, oy, 2, col.d);
      }
    }
  }
}

function drawInfectedBossDie(put: Put, step: number) {
  const cx = 32, cy = 36;
  const r = Math.max(0, 24 - step * 5);
  if (r > 0) {
    disc(put, cx, cy, r, P.infectD);
    disc(put, cx, cy, Math.max(0, r - 1), P.infect);
    disc(put, cx, cy, Math.max(0, r - 3), P.infectL);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + step * 0.3;
    const d = step * 6 + 6;
    const x = Math.round(cx + Math.cos(a) * d);
    const y = Math.round(cy + Math.sin(a) * d);
    put(x, y, P.infectD);
    put(x + 1, y, '#d08020');
    if (i % 3 === 0) put(x, y + 1, '#40e060');
  }
  if (step < 2) disc(put, cx, cy, 6, P.sparkL);
}

function drawInfectedBoss(frame: BossFrame) {
  return (put: Put) => {
    switch (frame) {
      case 'idle0':      return drawInfectedBossBody(put, { bob: 0 });
      case 'idle1':      return drawInfectedBossBody(put, { bob: 1 });
      case 'move0':      return drawInfectedBossBody(put, { bob: 0, legStep: 1 });
      case 'move1':      return drawInfectedBossBody(put, { bob: 1, legStep: 0 });
      case 'move2':      return drawInfectedBossBody(put, { bob: 0, legStep: -1 });
      case 'move3':      return drawInfectedBossBody(put, { bob: 1, legStep: 0 });
      case 'atk0':       return drawInfectedBossBody(put, { rearUp: true, bob: -1 });
      case 'atk1':       return drawInfectedBossBody(put, { bob: 2 });
      case 'chargeWind': return drawInfectedBossBody(put, { chargeGlow: true, bob: 0 });
      case 'hit':        return drawInfectedBossBody(put, { flash: true });
      case 'birth0':     return drawInfectedBossBody(put, { pockets: 0 });
      case 'birth1':     return drawInfectedBossBody(put, { pockets: 1 });
      case 'birth2':     return drawInfectedBossBody(put, { pockets: 2 });
      case 'birth3':     return drawInfectedBossBody(put, { pockets: 3 });
      case 'birth4':     return drawInfectedBossBody(put, { pockets: 4 });
      case 'die0':       return drawInfectedBossDie(put, 0);
      case 'die1':       return drawInfectedBossDie(put, 1);
      case 'die2':       return drawInfectedBossDie(put, 2);
      case 'die3':       return drawInfectedBossDie(put, 3);
      case 'die4':       return drawInfectedBossDie(put, 4);
    }
  };
}

// ==================================================================
//  FOREST BOSS — The Wendigo (Corrupted Stag Spirit)
// ==================================================================
interface WendigoOpts {
  bob?: number;
  flash?: boolean;
  chargeGlow?: boolean;
  pockets?: number;
  phase?: number;      // 0-3 for mist animation
  armSway?: number;    // -1 to 1
}

function drawWendigoBody(put: Put, opts: WendigoOpts) {
  const cx = 32;
  const bob = opts.bob ?? 0;
  const cy = 30 + bob;
  const phase = opts.phase ?? 0;
  const armSway = opts.armSway ?? 0;
  const flash = opts.flash ?? false;
  const chargeGlow = opts.chargeGlow ?? false;

  const bone  = flash ? P.white : P.wBone;
  const boneD = flash ? P.white : P.wBoneD;
  const boneL = flash ? P.white : P.wBoneL;
  const ghost = flash ? P.white : P.wGhost;
  const ghostD= flash ? P.white : P.wGhostD;
  const ghostL= flash ? P.white : P.wGhostL;
  const ghostB= flash ? P.white : P.wGhostB;
  const out   = flash ? P.white : P.outline;

  // Ghostly ground glow instead of shadow
  for (let dx = -16; dx <= 16; dx++)
    for (let dy = -1; dy <= 1; dy++)
      if ((dx * dx) / 256 + (dy * dy) / 2 <= 1) put(cx + dx, 58 + dy, P.wGhostD);

  // Spectral mist body — wispy lower body (no legs, it floats)
  for (let y = 8; y <= 26; y++) {
    const spread = Math.floor(14 - (y - 8) * 0.4);
    const sway = Math.round(Math.sin((y * 0.3) + phase * 1.2) * 2);
    for (let x = -spread; x <= spread; x++) {
      const dist = Math.abs(x) / (spread || 1);
      // Dithered mist: skip some edge pixels based on position + phase
      if (dist > 0.8 && ((x + y + phase) % 3 === 0)) continue;
      put(cx + x + sway, cy + y, dist > 0.7 ? ghostD : dist > 0.4 ? ghost : ghostL);
    }
  }

  // Wisp tendrils trailing down
  for (let t = 0; t < 5; t++) {
    const tx = cx - 8 + t * 4;
    const sway = Math.round(Math.sin((t + phase) * 1.5) * 2);
    for (let j = 0; j < 4 + (t % 2) * 2; j++)
      put(tx + sway, cy + 26 + j, ghostD);
  }

  // Torso — spine visible through mist
  for (let y = -4; y <= 8; y++)
    put(cx, cy + y, bone);

  // Ribs
  for (let r = 0; r < 4; r++) {
    const ry = cy - 2 + r * 3;
    for (let x = 1; x <= 6 - r; x++) {
      put(cx - x, ry, boneD);
      put(cx + x, ry, boneD);
    }
    put(cx - (6 - r), ry + 1, boneD);
    put(cx + (6 - r), ry + 1, boneD);
  }

  // Shoulder bones
  rect(put, cx - 10, cy - 4, 4, 3, boneD);
  rect(put, cx + 6, cy - 4, 4, 3, boneD);

  // Arms — skeletal, dangling
  const aOff = Math.floor(armSway * 2);
  // Left arm bones
  rect(put, cx - 12, cy - 2 + aOff, 2, 8, boneD);
  put(cx - 13, cy + 6 + aOff, bone);
  put(cx - 12, cy + 7 + aOff, boneD);
  put(cx - 11, cy + 7 + aOff, boneD);
  // Right arm
  rect(put, cx + 10, cy - 2 - aOff, 2, 8, boneD);
  put(cx + 11, cy + 6 - aOff, bone);
  put(cx + 10, cy + 7 - aOff, boneD);
  put(cx + 12, cy + 7 - aOff, boneD);

  // Skull — deer skull
  disc(put, cx, cy - 10, 8, out);
  disc(put, cx, cy - 10, 7, boneD);
  disc(put, cx, cy - 10, 6, bone);
  disc(put, cx, cy - 11, 4, boneL);
  // Snout — elongated
  rect(put, cx - 3, cy - 8, 6, 6, bone);
  rect(put, cx - 2, cy - 6, 4, 5, boneL);
  // Eye sockets — glowing green fire
  const eyeCol = chargeGlow ? P.sparkL : P.entEye;
  const eyeHL = chargeGlow ? P.white : '#a0ffa0';
  const eyeDk = chargeGlow ? P.spark : P.entEyeD;
  disc(put, cx - 3, cy - 12, 2, out);
  put(cx - 3, cy - 12, eyeCol); put(cx - 2, cy - 12, eyeHL);
  put(cx - 3, cy - 13, eyeDk);
  disc(put, cx + 3, cy - 12, 2, out);
  put(cx + 3, cy - 12, eyeCol); put(cx + 4, cy - 12, eyeHL);
  put(cx + 3, cy - 13, eyeDk);
  // Nose holes
  put(cx - 1, cy - 6, out); put(cx + 1, cy - 6, out);
  // Teeth
  for (let x = -2; x <= 2; x++) {
    put(cx + x, cy - 3, bone);
    if (x % 2 === 0) put(cx + x, cy - 2, boneD);
  }
  // Jaw line
  rect(put, cx - 3, cy - 3, 6, 1, boneD);

  // ANTLERS — massive bone antlers
  const al = cy - 18;
  // Left antler
  rect(put, cx - 4, al, 2, 6, bone);
  rect(put, cx - 6, al - 6, 2, 6, bone);
  rect(put, cx - 8, al - 10, 2, 4, boneL);
  put(cx - 9, al - 12, boneL);
  rect(put, cx - 2, al - 2, 2, 3, bone);
  put(cx - 1, al - 4, boneD);
  rect(put, cx - 8, al - 4, 2, 3, bone);
  put(cx - 10, al - 4, boneD);
  // Right antler
  rect(put, cx + 2, al, 2, 6, bone);
  rect(put, cx + 4, al - 6, 2, 6, bone);
  rect(put, cx + 6, al - 10, 2, 4, boneL);
  put(cx + 7, al - 12, boneL);
  rect(put, cx, al - 2, 2, 3, bone);
  put(cx - 1, al - 4, boneD);
  rect(put, cx + 6, al - 4, 2, 3, bone);
  put(cx + 8, al - 4, boneD);

  // Spectral glow around antlers
  if (!flash) {
    for (let a = 0; a < 12; a++) {
      const angle = (a / 12) * Math.PI * 2 + phase * 0.5;
      const r = 10 + Math.sin(a * 2) * 3;
      const gx = Math.round(cx + Math.cos(angle) * r);
      const gy = Math.round(cy - 22 + Math.sin(angle) * r);
      put(gx, gy, ghostB);
    }
  }

  // Birth pockets — spectral bulges on torso
  if (opts.pockets !== undefined) {
    const stage = opts.pockets;
    const pockets: Array<[number, number]> = [
      [-4, -6], [0, -8], [4, -6]
    ];
    for (const [px, py] of pockets) {
      const ox = cx + px, oy = cy + py;
      if (stage === 0) {
        disc(put, ox, oy, 3, ghostL);
        disc(put, ox, oy, 2, ghost);
      } else if (stage === 1) {
        disc(put, ox, oy, 3, ghostL);
        disc(put, ox, oy, 2, out);
        put(ox, oy, P.entEye);
      } else if (stage === 2) {
        disc(put, ox, oy, 3, ghostL);
        disc(put, ox, oy, 2, P.wolfM);
        put(ox - 1, oy, P.white);
        put(ox + 1, oy, P.white);
      } else if (stage === 3) {
        disc(put, ox, oy - 1, 4, ghostD);
        disc(put, ox, oy - 1, 3, P.wolfM);
        disc(put, ox, oy - 2, 2, P.wolf);
        put(ox - 1, oy - 1, P.white);
        put(ox + 1, oy - 1, P.white);
      } else if (stage === 4) {
        disc(put, ox, oy, 3, out);
        disc(put, ox, oy, 2, ghostD);
      }
    }
  }
}

type ForestBossFrame =
  | 'idle0' | 'idle1'
  | 'move0' | 'move1' | 'move2' | 'move3'
  | 'atk0' | 'atk1'
  | 'chargeWind'
  | 'hit'
  | 'birth0' | 'birth1' | 'birth2' | 'birth3' | 'birth4'
  | 'die0' | 'die1' | 'die2' | 'die3' | 'die4';

const forestBossFrames: ForestBossFrame[] = [
  'idle0','idle1',
  'move0','move1','move2','move3',
  'atk0','atk1',
  'chargeWind','hit',
  'birth0','birth1','birth2','birth3','birth4',
  'die0','die1','die2','die3','die4'
];

function drawForestBoss(frame: ForestBossFrame) {
  return (put: Put) => {
    switch (frame) {
      case 'idle0':      return drawWendigoBody(put, { bob: 0, phase: 0 });
      case 'idle1':      return drawWendigoBody(put, { bob: -2, phase: 1 });
      case 'move0':      return drawWendigoBody(put, { bob: 0, phase: 0, armSway: 0.5 });
      case 'move1':      return drawWendigoBody(put, { bob: -2, phase: 1, armSway: 0 });
      case 'move2':      return drawWendigoBody(put, { bob: 0, phase: 2, armSway: -0.5 });
      case 'move3':      return drawWendigoBody(put, { bob: -2, phase: 3, armSway: 0 });
      case 'atk0':       return drawWendigoBody(put, { bob: -2, armSway: 1, phase: 0 });
      case 'atk1':       return drawWendigoBody(put, { bob: 2, armSway: -1, phase: 1 });
      case 'chargeWind': return drawWendigoBody(put, { chargeGlow: true, bob: 0, phase: 0 });
      case 'hit':        return drawWendigoBody(put, { flash: true });
      case 'birth0':     return drawWendigoBody(put, { pockets: 0, phase: 0 });
      case 'birth1':     return drawWendigoBody(put, { pockets: 1, phase: 1 });
      case 'birth2':     return drawWendigoBody(put, { pockets: 2, phase: 2 });
      case 'birth3':     return drawWendigoBody(put, { pockets: 3, phase: 3 });
      case 'birth4':     return drawWendigoBody(put, { pockets: 4, phase: 0 });
      case 'die0':       return drawWendigoDie(put, 0);
      case 'die1':       return drawWendigoDie(put, 1);
      case 'die2':       return drawWendigoDie(put, 2);
      case 'die3':       return drawWendigoDie(put, 3);
      case 'die4':       return drawWendigoDie(put, 4);
    }
  };
}

function drawWendigoDie(put: Put, step: number) {
  const cx = 32, cy = 30;
  const r = Math.max(0, 20 - step * 4);
  if (r > 0) {
    disc(put, cx, cy, r, P.wGhostD);
    disc(put, cx, cy, Math.max(0, r - 1), P.wGhost);
    disc(put, cx, cy, Math.max(0, r - 3), P.wBone);
  }
  // Bone shards + wisps flying out
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + step * 0.35;
    const d = step * 7 + 5;
    const x = Math.round(cx + Math.cos(a) * d);
    const y = Math.round(cy + Math.sin(a) * d);
    put(x, y, i % 3 === 0 ? P.wBoneD : i % 3 === 1 ? P.wBone : P.wGhostL);
    put(x + 1, y, i % 2 === 0 ? P.wBoneL : P.wGhostD);
    if (i % 4 === 0) put(x, y + 1, P.entEye);
  }
  // Green spectral flash
  if (step < 2) disc(put, cx, cy, 5, P.entEye);
}

function add(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

// ==================================================================
//  OFF-SCREEN TOWER INDICATORS (32x32 logical → 64 physical)
// ==================================================================
function drawIndicatorArrow() {
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

function drawIndicatorCannon() {
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

function drawIndicatorBoss() {
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

function drawIndicatorPointer() {
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

/** Create and register a ground chunk texture covering chunkSize×chunkSize tiles */
// Parse a hex color string to [r, g, b]
const _colorCache = new Map<string, [number, number, number]>();
function hexToRgb(hex: string): [number, number, number] {
  let c = _colorCache.get(hex);
  if (c) return c;
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  c = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  _colorCache.set(hex, c);
  return c;
}

export function createGroundChunk(scene: Phaser.Scene, chunkX: number, chunkY: number, chunkSize: number, tileSize: number, biome = 'grasslands'): string {
  const key = `gnd_chunk_${biome}_${chunkX}_${chunkY}`;
  if (scene.textures.exists(key)) return key;
  const pxSize = chunkSize * tileSize; // e.g. 16 * 32 = 512
  const canvas = document.createElement('canvas');
  canvas.width = pxSize; canvas.height = pxSize;
  const ctx = canvas.getContext('2d')!;
  // Use ImageData for bulk pixel writes — orders of magnitude faster than fillRect
  const imageData = ctx.createImageData(pxSize, pxSize);
  const buf = imageData.data;
  const startTX = chunkX * chunkSize;
  const startTY = chunkY * chunkSize;
  for (let ty = 0; ty < chunkSize; ty++) {
    for (let tx = 0; tx < chunkSize; tx++) {
      const worldTX = startTX + tx;
      const worldTY = startTY + ty;
      const draw = biome === 'forest' ? drawGroundForest(worldTX, worldTY)
                 : biome === 'infected' ? drawGroundInfected(worldTX, worldTY)
                 : biome === 'river' ? drawGroundRiver(worldTX, worldTY)
                 : biome === 'castle' ? drawGroundCastle(worldTX, worldTY)
                 : drawGroundWorld(worldTX, worldTY);
      const ox = tx * tileSize;
      const oy = ty * tileSize;
      const put: Put = (x, y, col) => {
        if (col == null) return;
        const px = Math.floor(x), py = Math.floor(y);
        if (px < 0 || py < 0 || px >= tileSize || py >= tileSize) return;
        const idx = ((oy + py) * pxSize + (ox + px)) * 4;
        const [r, g, b] = hexToRgb(col);
        buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
      };
      const putRGB: PutRGB = (x, y, r, g, b) => {
        if (x < 0 || y < 0 || x >= tileSize || y >= tileSize) return;
        const idx = ((oy + y) * pxSize + (ox + x)) * 4;
        buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
      };
      draw(put, putRGB);
    }
  }
  ctx.putImageData(imageData, 0, 0);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
  return key;
}

// ==================================================================
//  CASTLE BOSS 1 — Phantom Queen (ghostly queen wraith, 64x64)
// ==================================================================
interface PhantomQueenOpts {
  bob?: number;
  flash?: boolean;
  chargeGlow?: boolean;
  pockets?: number;
  rearUp?: boolean;
  orbPhase?: number;
  mouthOpen?: boolean;
}

function drawPhantomQueenBody(put: Put, opts: PhantomQueenOpts) {
  const cx = 32;
  const bob = opts.bob ?? 0;
  const baseCy = 30 + bob;
  const phase = opts.orbPhase ?? 0;

  const col = {
    out:  opts.flash ? P.white : P.outline,
    d:    opts.flash ? P.white : '#3a5a7a',
    m:    opts.flash ? P.white : '#4a6a8a',
    b:    opts.flash ? P.white : '#6a8aaa',
    l:    opts.flash ? P.white : '#8abadd',
    glow: opts.flash ? P.white : '#aad0ff',
    hair: opts.flash ? P.white : '#5a7a9a',
    hairL:opts.flash ? P.white : '#8aaac8',
    crown:opts.flash ? P.white : '#8abadd',
    crownL:opts.flash? P.white : '#aad0ff',
    jewel:opts.flash ? P.white : '#4060ff',
    eye:  opts.flash ? P.white : '#ffffff',
    wisp: opts.flash ? P.white : '#6a8aaa',
  };

  // Ground shadow
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -12; dx <= 12; dx++)
      if ((dx * dx) / 144 + (dy * dy) / 5 <= 1) put(cx + dx, 60 + dy, P.shadow);

  // Flowing dress — tapers to wisps at bottom
  // Upper dress (torso region)
  for (let y = baseCy + 2; y < baseCy + 24; y++) {
    const t = (y - (baseCy + 2)) / 22;
    const hw = Math.round(6 + t * 10);
    for (let dx = -hw; dx <= hw; dx++) {
      const edge = Math.abs(dx) / hw;
      // Wispy bottom: skip some pixels for taper effect
      if (t > 0.7 && ((dx + y) % 3 === 0 || Math.abs(dx) > hw - 2)) continue;
      if (t > 0.85 && (dx + y) % 2 === 0) continue;
      let c: string;
      if (edge < 0.3) c = col.l;
      else if (edge < 0.6) c = col.b;
      else if (edge < 0.85) c = col.m;
      else c = col.d;
      put(cx + dx, y, c);
    }
  }
  // Wispy tendrils at dress bottom
  for (let t = 0; t < 5; t++) {
    const tx = cx - 8 + t * 4 + Math.round(Math.sin(phase * 0.5 + t) * 2);
    for (let dy = 0; dy < 6 + (phase + t) % 3; dy++) {
      if ((dy + t) % 2 === 0) put(tx, baseCy + 24 + dy, col.d);
    }
  }

  // Upper body / torso
  ellipse(put, cx, baseCy, 8, 6, col.d);
  ellipse(put, cx, baseCy, 7, 5, col.m);
  ellipse(put, cx, baseCy - 1, 5, 4, col.b);

  // Neck
  rect(put, cx - 1, baseCy - 7, 3, 3, col.b);

  // Head
  disc(put, cx, baseCy - 12, 7, col.d);
  disc(put, cx, baseCy - 12, 6, col.m);
  disc(put, cx, baseCy - 12, 5, col.b);
  disc(put, cx, baseCy - 13, 3, col.l);

  // Flowing hair — long strands down the sides
  for (let side = -1; side <= 1; side += 2) {
    for (let y = baseCy - 16; y < baseCy + 8; y++) {
      const sway = Math.round(Math.sin((y + phase) * 0.3) * 1.5);
      const baseX = cx + side * 7 + sway;
      put(baseX, y, col.hair);
      put(baseX + side, y, col.hairL);
      if (y < baseCy - 8) put(baseX - side, y, col.hair);
    }
  }

  // Crown
  const crownY = baseCy - 19;
  for (let dx = -5; dx <= 5; dx++) put(cx + dx, crownY + 2, col.crown);
  for (let dx = -4; dx <= 4; dx++) put(cx + dx, crownY + 1, col.crownL);
  // Crown points
  put(cx - 4, crownY, col.crown); put(cx - 3, crownY - 1, col.crownL);
  put(cx, crownY, col.crown); put(cx, crownY - 1, col.crownL);
  put(cx + 4, crownY, col.crown); put(cx + 3, crownY - 1, col.crownL);
  // Jewels
  put(cx - 2, crownY + 1, col.jewel);
  put(cx + 2, crownY + 1, col.jewel);
  put(cx, crownY + 2, col.jewel);

  // Eyes — hollow glowing white
  put(cx - 3, baseCy - 13, col.out);
  put(cx - 2, baseCy - 13, col.eye);
  put(cx - 1, baseCy - 13, col.out);
  put(cx + 1, baseCy - 13, col.out);
  put(cx + 2, baseCy - 13, col.eye);
  put(cx + 3, baseCy - 13, col.out);
  // Eye glow
  put(cx - 2, baseCy - 14, col.glow);
  put(cx + 2, baseCy - 14, col.glow);

  // Mouth — wailing
  const mw = opts.mouthOpen ? 4 : 2;
  const mh = opts.mouthOpen ? 3 : 1;
  for (let dx = -mw; dx <= mw; dx++)
    for (let dy = 0; dy < mh; dy++)
      put(cx + dx, baseCy - 9 + dy, col.out);
  if (opts.mouthOpen) {
    for (let dx = -mw + 1; dx <= mw - 1; dx++)
      put(cx + dx, baseCy - 8, col.d);
  }

  // Arms (raised in attack, down normally)
  if (opts.rearUp || opts.mouthOpen) {
    // Arms raised
    for (let dy = -6; dy <= 0; dy++) {
      put(cx - 9 - dy, baseCy + dy, col.b);
      put(cx + 9 + dy, baseCy + dy, col.b);
    }
  } else {
    // Arms at sides
    for (let dy = -2; dy <= 6; dy++) {
      put(cx - 8, baseCy + dy, col.b);
      put(cx + 8, baseCy + dy, col.b);
    }
  }

  // Orbiting ghost orbs (3 orbs at different positions based on phase)
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + phase * 0.8;
    const orbR = opts.rearUp ? 8 : 16;
    const orbX = Math.round(cx + Math.cos(angle) * orbR);
    const orbY = Math.round(baseCy - 4 + Math.sin(angle) * orbR * 0.5);
    disc(put, orbX, orbY, 2, col.glow);
    put(orbX, orbY, col.eye);
  }

  // Charge glow — body pulses bright
  if (opts.chargeGlow) {
    disc(put, cx, baseCy, 16, col.glow);
    disc(put, cx, baseCy, 12, col.l);
    disc(put, cx, baseCy - 12, 8, col.glow);
  }

  // Birth animation — summoning spirits
  if (opts.pockets != null) {
    const p = opts.pockets;
    for (let t = 0; t < 4; t++) {
      const a = (t / 4) * Math.PI * 2 + 0.3;
      const len = 5 + p * 3;
      for (let i = 0; i < len; i++) {
        const r = 14 + i * 1.5;
        const px = Math.round(cx + Math.cos(a) * r);
        const py = Math.round(baseCy + Math.sin(a) * r * 0.5);
        if (i % 2 === 0) put(px, py, col.glow);
        else put(px, py, col.wisp);
      }
    }
    if (p >= 3) {
      for (let t = 0; t < 4; t++) {
        const a = (t / 4) * Math.PI * 2 + 0.3;
        const r = 14 + (5 + p * 3) * 1.5;
        disc(put, Math.round(cx + Math.cos(a) * r), Math.round(baseCy + Math.sin(a) * r * 0.5), 2, col.glow);
      }
    }
  }
}

function drawPhantomQueenDie(put: Put, step: number) {
  const cx = 32, cy = 30;
  // Dissolve from bottom up
  const cutoff = 60 - step * 10;
  const r = Math.max(0, 12 - step * 2);
  if (r > 0) {
    // Draw remaining body above cutoff
    for (let dy = -r; dy <= r; dy++) {
      if (cy + dy > cutoff) continue;
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const dist = Math.sqrt(dx * dx + dy * dy) / r;
        put(cx + dx, cy + dy, dist < 0.5 ? '#8abadd' : '#4a6a8a');
      }
    }
  }
  // Dispersing wisps
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + step * 0.5;
    const d = step * 6 + 4;
    const x = Math.round(cx + Math.cos(a) * d);
    const y = Math.round(cy + Math.sin(a) * d * 0.6);
    put(x, y, '#6a8aaa');
    put(x + 1, y, '#aad0ff');
    if (i % 3 === 0) put(x, y - 1, '#ffffff');
  }
  if (step < 2) disc(put, cx, cy, 4, '#aad0ff');
}

function drawPhantomQueen(frame: BossFrame) {
  return (put: Put) => {
    switch (frame) {
      case 'idle0':      return drawPhantomQueenBody(put, { bob: 0, orbPhase: 0 });
      case 'idle1':      return drawPhantomQueenBody(put, { bob: -1, orbPhase: 1 });
      case 'move0':      return drawPhantomQueenBody(put, { bob: 0, orbPhase: 0 });
      case 'move1':      return drawPhantomQueenBody(put, { bob: -1, orbPhase: 1 });
      case 'move2':      return drawPhantomQueenBody(put, { bob: -2, orbPhase: 2 });
      case 'move3':      return drawPhantomQueenBody(put, { bob: -1, orbPhase: 3 });
      case 'atk0':       return drawPhantomQueenBody(put, { rearUp: true, mouthOpen: true, bob: -2, orbPhase: 0 });
      case 'atk1':       return drawPhantomQueenBody(put, { bob: 1, mouthOpen: true, orbPhase: 2 });
      case 'chargeWind': return drawPhantomQueenBody(put, { chargeGlow: true, bob: 0, orbPhase: 0 });
      case 'hit':        return drawPhantomQueenBody(put, { flash: true, orbPhase: 0 });
      case 'birth0':     return drawPhantomQueenBody(put, { pockets: 0, orbPhase: 0 });
      case 'birth1':     return drawPhantomQueenBody(put, { pockets: 1, orbPhase: 1 });
      case 'birth2':     return drawPhantomQueenBody(put, { pockets: 2, orbPhase: 2 });
      case 'birth3':     return drawPhantomQueenBody(put, { pockets: 3, orbPhase: 3 });
      case 'birth4':     return drawPhantomQueenBody(put, { pockets: 4, orbPhase: 0 });
      case 'die0':       return drawPhantomQueenDie(put, 0);
      case 'die1':       return drawPhantomQueenDie(put, 1);
      case 'die2':       return drawPhantomQueenDie(put, 2);
      case 'die3':       return drawPhantomQueenDie(put, 3);
      case 'die4':       return drawPhantomQueenDie(put, 4);
    }
  };
}

// ==================================================================
//  CASTLE BOSS 2 — Castle Dragon (massive red dragon, 64x64)
// ==================================================================
interface CastleDragonOpts {
  bob?: number;
  flash?: boolean;
  chargeGlow?: boolean;
  pockets?: number;
  rearUp?: boolean;
  legStep?: number;
  mouthOpen?: boolean;
  wingsSpread?: boolean;
}

function drawCastleDragonBody(put: Put, opts: CastleDragonOpts) {
  const bob = opts.bob ?? 0;
  const by = bob;           // vertical bob offset

  const col = {
    out:    opts.flash ? P.white : P.outline,
    d:      opts.flash ? P.white : '#6a1818',
    m:      opts.flash ? P.white : '#8a2020',
    b:      opts.flash ? P.white : '#a03030',
    l:      opts.flash ? P.white : '#b04040',
    belly:  opts.flash ? P.white : '#b06030',
    bellyL: opts.flash ? P.white : '#c07040',
    bellyM: opts.flash ? P.white : '#d08050',
    horn:   opts.flash ? P.white : '#5a3a18',
    hornD:  opts.flash ? P.white : '#4a2a10',
    hornL:  opts.flash ? P.white : '#6a4a20',
    eye:    opts.flash ? P.white : '#ffa020',
    eyeL:   opts.flash ? P.white : '#ffd040',
    fire:   opts.flash ? P.white : '#ff6020',
    fireL:  opts.flash ? P.white : '#ffa040',
    fireW:  opts.flash ? P.white : '#ffd060',
    fireH:  opts.flash ? P.white : '#ffe880',
    fireD:  opts.flash ? P.white : '#ff2000',
    wingD:  opts.flash ? P.white : '#4a1010',
    wing:   opts.flash ? P.white : '#6a2020',
    wingL:  opts.flash ? P.white : '#8a3030',
    scale:  opts.flash ? P.white : '#905020',
    tooth:  opts.flash ? P.white : '#e8e0d0',
    toothD: opts.flash ? P.white : '#d8d0c0',
    claw:   opts.flash ? P.white : '#4a2a10',
    smoke:  opts.flash ? P.white : '#4a4a4a',
    browD:  opts.flash ? P.white : '#8a1818',
    nostril:opts.flash ? P.white : '#6a2020',
  };

  // Ground shadow
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -16; dx <= 16; dx++)
      if ((dx * dx) / 256 + (dy * dy) / 4 <= 1) put(32 + dx, 59 + dy, P.shadow);

  // === Tail (curving left, wavy) ===
  for (let i = 0; i < 22; i++) {
    const tx = 18 - i;
    const ty = 38 + by + Math.round(Math.sin(i * 0.4) * 4);
    const tr = Math.max(1, 3 - Math.floor(i / 6));
    disc(put, tx, ty, tr, col.m);
    if (tr > 1) disc(put, tx, ty, tr - 1, col.b);
  }
  // Tail spikes
  put(0, 36 + by, col.hornD); put(1, 35 + by, col.horn);
  put(0, 38 + by, col.hornD); put(1, 39 + by, col.horn);

  // === Left wing (behind body) ===
  const wingSpread = opts.wingsSpread ? 4 : 0;
  for (let i = 0; i < 22; i++) {
    const wy = 14 + Math.floor(i * 0.4) - wingSpread + Math.floor(i * wingSpread / 22);
    const wh = 6 + Math.floor(i * 0.3);
    rect(put, 4 + i, wy + by, 2, wh, col.wing);
    if (i % 3 === 0) put(4 + i, wy + by, col.wingL); // membrane veins
  }
  // Wing bone
  line(put, 14, 20 + by - Math.floor(wingSpread / 2), 4, 14 + by - wingSpread, col.wingD);

  // === Right wing (behind body) ===
  for (let i = 0; i < 18; i++) {
    const wy = 14 + Math.floor(i * 0.4) - wingSpread + Math.floor(i * wingSpread / 18);
    const wh = 5 + Math.floor(i * 0.2);
    rect(put, 38 + i, wy + by, 2, wh, col.wing);
    if (i % 3 === 0) put(38 + i, wy + by, col.wingL);
  }
  line(put, 38, 20 + by - Math.floor(wingSpread / 2), 54, 14 + by - wingSpread, col.wingD);

  // === Legs ===
  const ls = opts.legStep ?? 0;
  rect(put, 24, 44 + by + (ls > 0 ? -1 : 0), 6, 12, col.m);
  rect(put, 36, 44 + by + (ls < 0 ? -1 : 0), 6, 12, col.m);
  // Claws
  for (let i = 0; i < 3; i++) {
    put(24 + i * 2, 55 + by + (ls > 0 ? -1 : 0), col.claw);
    put(36 + i * 2, 55 + by + (ls < 0 ? -1 : 0), col.claw);
  }

  // === Body (large round) ===
  disc(put, 32, 34 + by, 14, col.m);
  disc(put, 32, 33 + by, 12, col.b);
  // Belly scales (lighter center)
  disc(put, 32, 36 + by, 8, col.belly);
  disc(put, 32, 36 + by, 6, col.bellyL);
  disc(put, 32, 36 + by, 4, col.bellyM);
  // Scale detail
  for (let y = 30; y < 42; y += 3)
    for (let x = 26; x < 38; x += 4)
      put(x, y + by, col.scale);

  // === Neck (thick, angled right) ===
  rect(put, 34, 18 + by, 10, 14, col.b);
  rect(put, 35, 19 + by, 8, 12, col.l);
  // Neck scales
  for (let y = 20; y < 30; y += 2) put(36, y + by, col.m);

  // === Head (detailed, facing right) ===
  rect(put, 36, 12 + by, 18, 12, col.b);
  rect(put, 38, 13 + by, 16, 10, col.l);
  // Snout
  rect(put, 50, 15 + by, 8, 6, col.l);
  rect(put, 52, 16 + by, 6, 4, '#c05050');
  // Nostrils
  put(57, 17 + by, col.nostril); put(57, 19 + by, col.nostril);
  // Jaw
  rect(put, 40, 22 + by, 16, 3, col.m);
  rect(put, 42, 22 + by, 12, 2, col.b);
  // Teeth
  for (let x = 42; x < 54; x += 3) {
    put(x, 22 + by, col.tooth); put(x, 23 + by, col.toothD);
  }
  // Brow ridge
  rect(put, 38, 12 + by, 14, 2, col.browD);

  // === Horns ===
  rect(put, 40, 6 + by, 3, 8, col.hornD);
  rect(put, 41, 4 + by, 2, 4, col.horn);
  rect(put, 48, 6 + by, 3, 8, col.hornD);
  rect(put, 49, 4 + by, 2, 4, col.horn);
  put(41, 3 + by, col.hornL); put(49, 3 + by, col.hornL);

  // === Eye (glowing orange, menacing) ===
  rect(put, 44, 14 + by, 4, 3, col.out);
  put(45, 14 + by, col.eye);
  put(46, 14 + by, col.eyeL);
  put(45, 15 + by, col.eye);

  // === Mouth open with fire (attack frames) ===
  if (opts.mouthOpen) {
    // Wider open jaw
    rect(put, 50, 21 + by, 8, 4, col.m);
    rect(put, 52, 22 + by, 6, 2, col.b);
    // Fire breath (expanding cone to the right)
    for (let i = 0; i < 6; i++) {
      const spread = Math.floor(i * 0.6);
      for (let s = -spread; s <= spread; s++) {
        const fx = 58 + i;
        const fy = 19 + by + s;
        if (fx < 64 && fy >= 0 && fy < 64) {
          const colors = [col.fireD, col.fire, col.fireL, col.fireW, col.fireH];
          put(fx, fy, colors[Math.min(Math.abs(s), 4)]);
        }
      }
    }
  } else {
    // Smoke from nostrils when not breathing
    put(58, 17 + by, col.smoke);
    put(59, 16 + by, col.smoke);
    put(58, 19 + by, col.smoke);
  }

  // === Back spines along body top ===
  for (let x = 26; x < 38; x += 3) {
    put(x, 24 + by, col.d);
    put(x, 23 + by, col.l);
  }

  // Charge glow — fire aura building
  if (opts.chargeGlow) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = 18;
      const gx = Math.round(32 + Math.cos(a) * r);
      const gy = Math.round(34 + by + Math.sin(a) * r * 0.6);
      disc(put, gx, gy, 2, col.fire);
      put(gx, gy, col.fireL);
    }
    disc(put, 56, 18 + by, 3, col.fireL);
  }

  // Rear up pose (attack windup) — wings spread wider
  if (opts.rearUp) {
    for (let i = 0; i < 5; i++) {
      put(4 - i, 10 + by + i, col.wingL);
      put(56 + i, 10 + by + i, col.wingL);
    }
  }

  // Birth animation — roaring/summoning
  if (opts.pockets != null) {
    const p = opts.pockets;
    for (let t = 0; t < 6; t++) {
      const a = (t / 6) * Math.PI * 2;
      const r = 8 + p * 3;
      const fx = Math.round(32 + Math.cos(a) * r);
      const fy = Math.round(34 + by + Math.sin(a) * r * 0.5);
      put(fx, fy, col.fire);
      if (p >= 2) put(fx + 1, fy, col.fireL);
      if (p >= 4) disc(put, fx, fy, 2, col.fireL);
    }
  }
}

function drawCastleDragonDie(put: Put, step: number) {
  const cx = 32, cy = 34;
  const r = Math.max(0, 14 - step * 3);
  if (r > 0) {
    disc(put, cx, cy, r, '#8a2020');
    disc(put, cx, cy, Math.max(0, r - 2), '#a03030');
    disc(put, cx, cy, Math.max(0, r - 4), '#b04040');
  }
  // Flames dying out — chunks dispersing
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + step * 0.4;
    const d = step * 5 + 5;
    const x = Math.round(cx + Math.cos(a) * d);
    const y = Math.round(cy + Math.sin(a) * d * 0.6);
    put(x, y, '#8a2020');
    put(x + 1, y, i % 3 === 0 ? '#5a3a18' : '#6a1818');
    if (i % 2 === 0) put(x, y - 1, step < 3 ? '#ff6020' : '#c07040');
  }
  // Central flame dying
  if (step < 2) disc(put, cx, cy, 4, '#ff8020');
  if (step < 1) disc(put, cx, cy, 6, '#ffaa40');
}

function drawCastleDragon(frame: BossFrame) {
  return (put: Put) => {
    switch (frame) {
      case 'idle0':      return drawCastleDragonBody(put, { bob: 0 });
      case 'idle1':      return drawCastleDragonBody(put, { bob: 1 });
      case 'move0':      return drawCastleDragonBody(put, { bob: 0, legStep: 1 });
      case 'move1':      return drawCastleDragonBody(put, { bob: 1, legStep: 0 });
      case 'move2':      return drawCastleDragonBody(put, { bob: 0, legStep: -1 });
      case 'move3':      return drawCastleDragonBody(put, { bob: 1, legStep: 0 });
      case 'atk0':       return drawCastleDragonBody(put, { rearUp: true, mouthOpen: true, bob: -2 });
      case 'atk1':       return drawCastleDragonBody(put, { bob: 1, mouthOpen: true });
      case 'chargeWind': return drawCastleDragonBody(put, { chargeGlow: true, wingsSpread: true, bob: 0 });
      case 'hit':        return drawCastleDragonBody(put, { flash: true });
      case 'birth0':     return drawCastleDragonBody(put, { pockets: 0, mouthOpen: true });
      case 'birth1':     return drawCastleDragonBody(put, { pockets: 1, mouthOpen: true });
      case 'birth2':     return drawCastleDragonBody(put, { pockets: 2, mouthOpen: true });
      case 'birth3':     return drawCastleDragonBody(put, { pockets: 3, mouthOpen: true });
      case 'birth4':     return drawCastleDragonBody(put, { pockets: 4, mouthOpen: true });
      case 'die0':       return drawCastleDragonDie(put, 0);
      case 'die1':       return drawCastleDragonDie(put, 1);
      case 'die2':       return drawCastleDragonDie(put, 2);
      case 'die3':       return drawCastleDragonDie(put, 3);
      case 'die4':       return drawCastleDragonDie(put, 4);
    }
  };
}

// ==================================================================
//  QUEEN ORB projectile (32x32) — blue-white glowing orb
// ==================================================================
function drawQueenOrb(frame: 0|1) {
  return (put: Put) => {
    const cx = 16, cy = 16, r = 5;
    // Outer glow
    disc(put, cx, cy, r + 1, '#3a5a8a');
    // Main orb body
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const dist = Math.sqrt(dx * dx + dy * dy) / r;
        let color: string;
        if (dist < 0.3) color = '#ffffff';
        else if (dist < 0.5) color = '#cce0ff';
        else if (dist < 0.7) color = '#8abadd';
        else color = '#4a6a8a';
        put(cx + dx, cy + dy, color);
      }
    }
    // Specular highlight — shifts per frame for spin
    const hx = frame === 0 ? cx - 2 : cx - 1;
    const hy = frame === 0 ? cy - 2 : cy - 3;
    put(hx, hy, '#ffffff');
    put(hx + 1, hy, '#cce0ff');
    // Wispy trail
    put(cx + 3 + frame, cy + 2, '#6a8aaa');
    put(cx + 4 + frame, cy + 3, '#4a6a8a');
  };
}

// ==================================================================
//  DRAGON FIREBALL projectile (32x32) — round flame ball with flickering wisps
// ==================================================================
function drawDragonFireball(frame: 0|1|2|3) {
  return (put: Put) => {
    const cx = 16, cy = 16, r = 7;
    const rot = frame * 0.8; // rotation offset per frame

    // Outer fire glow — soft halo
    for (let dy = -(r + 3); dy <= r + 3; dy++) {
      for (let dx = -(r + 3); dx <= r + 3; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > (r + 3) * (r + 3) || d2 <= (r + 1) * (r + 1)) continue;
        put(cx + dx, cy + dy, '#6a1800');
      }
    }

    // Main flame body — layered with color gradient
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const dist = Math.sqrt(dx * dx + dy * dy) / r;
        // Angle-based color variation for flame feel
        const ang = Math.atan2(dy, dx) + rot;
        const flicker = Math.sin(ang * 3) * 0.12;
        const d = dist + flicker;
        let color: string;
        if (d < 0.2) color = '#ffffcc';
        else if (d < 0.35) color = '#ffee60';
        else if (d < 0.5) color = '#ffaa40';
        else if (d < 0.7) color = '#ff6020';
        else color = '#c04010';
        put(cx + dx, cy + dy, color);
      }
    }

    // Outline ring
    for (let dy = -(r + 1); dy <= r + 1; dy++) {
      for (let dx = -(r + 1); dx <= r + 1; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > (r + 1) * (r + 1) || d2 <= r * r) continue;
        if (Math.sqrt(d2) > r && Math.sqrt(d2) <= r + 1.2) put(cx + dx, cy + dy, '#8a2010');
      }
    }

    // Flame wisps radiating outward (rotating per frame)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rot;
      for (let d = r; d < r + 3 + (i % 2); d++) {
        const fx = Math.round(cx + Math.cos(a) * d);
        const fy = Math.round(cy + Math.sin(a) * d);
        const colors = ['#ff6020', '#ff8030', '#c04010', '#ff4000'];
        put(fx, fy, colors[(i + frame) % colors.length]);
      }
    }

    // Hot center specular
    const hx = cx + (frame < 2 ? -1 : 0);
    const hy = cy + (frame % 2 === 0 ? -2 : -1);
    put(hx, hy, '#ffffff');
    put(hx + 1, hy, '#ffffcc');
    put(hx, hy + 1, '#ffee60');
  };
}

// ==================================================================
//  DRAGON FIREBALL EXPLOSION (32x32) — fiery burst, 5 frames
// ==================================================================
function drawDragonFireExplosion(frame: number) {
  return (put: Put) => {
    const cx = 16, cy = 16;
    // Expanding ring of fire
    const outerR = 3 + frame * 3;
    const innerR = Math.max(0, frame * 2 - 1);
    const alpha = 1 - frame * 0.15;

    // Outer fire ring
    for (let dy = -outerR; dy <= outerR; dy++) {
      for (let dx = -outerR; dx <= outerR; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > outerR || d < innerR) continue;
        const norm = (d - innerR) / (outerR - innerR);
        let color: string;
        if (norm < 0.3) color = frame < 2 ? '#ffffcc' : '#ffee60';
        else if (norm < 0.5) color = '#ffaa40';
        else if (norm < 0.7) color = '#ff6020';
        else color = '#c04010';
        if (alpha < 0.6 && norm > 0.5) continue; // fade outer edges
        put(cx + dx, cy + dy, color);
      }
    }

    // Flying ember chunks
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + frame * 0.3;
      const d = outerR + 1 + frame;
      const ex = Math.round(cx + Math.cos(a) * d);
      const ey = Math.round(cy + Math.sin(a) * d);
      if (ex >= 0 && ex < 32 && ey >= 0 && ey < 32) {
        const colors = ['#ff4000', '#ff8030', '#ffaa40', '#c04010'];
        put(ex, ey, colors[i % colors.length]);
        if (frame < 3) put(ex + (i % 2 === 0 ? 1 : -1), ey, '#ff6020');
      }
    }

    // Central bright core (fades out)
    if (frame < 3) {
      const coreR = Math.max(0, 3 - frame);
      disc(put, cx, cy, coreR, frame === 0 ? '#ffffff' : '#ffee60');
    }

    // Smoke wisps (later frames)
    if (frame >= 3) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + frame * 0.5;
        const d = outerR - 2;
        const sx = Math.round(cx + Math.cos(a) * d);
        const sy = Math.round(cy + Math.sin(a) * d);
        if (sx >= 0 && sx < 32 && sy >= 0 && sy < 32) {
          put(sx, sy, '#4a4a4a');
        }
      }
    }
  };
}

// ==================================================================
//  SKELETON SOLDIER (32x32) — bone-white warrior with rusty sword
// ==================================================================
function drawEnemySkeleton(f: EFrame) {
  return (rawPut: Put) => {
    const put = f.startsWith('die') ? rawPut : mirrorX(rawPut);
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 8 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 18, Math.max(0, r), '#d8d0c0');
      disc(put, 16, 18, Math.max(0, r - 2), '#c8c0a8');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + step * 0.5;
        const d = step * 3 + 2;
        put(Math.round(16 + Math.cos(a) * d), Math.round(18 + Math.sin(a) * d), '#b8b098');
      }
      return;
    }
    const flash = f === 'hit';
    const bone = flash ? P.white : '#d8d0c0';
    const boneD = flash ? P.white : '#c8c0a8';
    const boneDD = flash ? P.white : '#b8b098';
    const cloth = flash ? P.white : '#3a4a5a';
    const sword = flash ? P.white : '#8892a0';

    const phase = f === 'move0' ? 0 : f === 'move1' ? 1 : f === 'move2' ? 2 : f === 'move3' ? 3 :
                  f === 'atk0' ? 0 : f === 'atk1' ? 2 : 0;
    const bob = [0, -1, 0, 1][phase];

    // Skull
    rect(put, 14, 4 + bob, 5, 5, bone);
    rect(put, 15, 3 + bob, 3, 1, bone);
    // Eye sockets
    put(14, 6 + bob, P.outline); put(15, 6 + bob, P.outline);
    put(17, 6 + bob, P.outline); put(18, 6 + bob, P.outline);
    // Nose
    put(16, 7 + bob, boneDD);
    // Jaw
    rect(put, 14, 9 + bob, 5, 1, boneD);
    put(14, 9 + bob, boneDD); put(18, 9 + bob, boneDD);

    // Spine
    rect(put, 16, 10 + bob, 1, 3, boneD);

    // Ribcage
    rect(put, 13, 11 + bob, 7, 4, boneD);
    // Rib gaps
    put(14, 12 + bob, cloth); put(18, 12 + bob, cloth);
    put(14, 14 + bob, cloth); put(18, 14 + bob, cloth);
    put(16, 12 + bob, cloth); put(16, 14 + bob, cloth);

    // Tattered cloth around waist
    rect(put, 13, 15 + bob, 7, 3, cloth);
    put(13, 17 + bob, null); put(15, 17 + bob, null); put(19, 17 + bob, null);

    // Arms — bone segments
    // Left arm
    put(12, 11 + bob, boneD); put(11, 12 + bob, boneD); put(10, 13 + bob, boneD);
    // Right arm holding sword
    put(20, 11 + bob, boneD); put(21, 12 + bob, boneD); put(22, 13 + bob, boneD);

    // Sword in right hand
    if (f === 'atk0') {
      // Sword raised
      put(22, 10 + bob, sword); put(22, 9 + bob, sword); put(22, 8 + bob, sword);
      put(22, 7 + bob, sword); put(22, 6 + bob, '#a0a8b8');
    } else if (f === 'atk1') {
      // Sword swung down
      put(23, 14 + bob, sword); put(24, 15 + bob, sword); put(25, 16 + bob, sword);
      put(26, 17 + bob, sword); put(27, 18 + bob, '#a0a8b8');
    } else {
      // Sword at rest, angled
      put(23, 12 + bob, sword); put(24, 11 + bob, sword); put(25, 10 + bob, sword);
      put(26, 9 + bob, sword); put(27, 8 + bob, '#a0a8b8');
    }

    // Legs — bone with cloth
    const legOff = [0, 1, 0, -1][phase];
    // Left leg
    put(14, 18 + bob, boneD); put(14, 19 + bob + legOff, boneD);
    put(14, 20 + bob + legOff, boneD); put(14, 21 + bob + legOff, boneD);
    put(13, 22 + bob + legOff, boneDD); put(14, 22 + bob + legOff, boneDD);
    // Right leg
    put(18, 18 + bob, boneD); put(18, 19 + bob - legOff, boneD);
    put(18, 20 + bob - legOff, boneD); put(18, 21 + bob - legOff, boneD);
    put(17, 22 + bob - legOff, boneDD); put(18, 22 + bob - legOff, boneDD);
  };
}

// ==================================================================
//  WARLOCK (32x32) — dark robed magic caster with glowing purple eyes
// ==================================================================
function drawEnemyWarlock(f: EFrame) {
  return (rawPut: Put) => {
    const put = f.startsWith('die') ? rawPut : mirrorX(rawPut);
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 8 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 18, Math.max(0, r), '#2a0a3a');
      disc(put, 16, 18, Math.max(0, r - 2), '#3a1a4a');
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + step * 0.6;
        const d = step * 3 + 2;
        put(Math.round(16 + Math.cos(a) * d), Math.round(18 + Math.sin(a) * d), '#aa40ff');
      }
      return;
    }
    const flash = f === 'hit';
    const robe = flash ? P.white : '#2a0a3a';
    const robeM = flash ? P.white : '#3a1a4a';
    const glow = flash ? P.white : '#aa40ff';
    const glowL = flash ? P.white : '#dd80ff';
    const hands = flash ? P.white : '#6a8a5a';

    const phase = f === 'move0' ? 0 : f === 'move1' ? 1 : f === 'move2' ? 2 : f === 'move3' ? 3 :
                  f === 'atk0' ? 0 : f === 'atk1' ? 2 : 0;
    const bob = [0, -1, 0, 1][phase];

    // Hood
    rect(put, 13, 4 + bob, 7, 6, robe);
    rect(put, 12, 5 + bob, 1, 4, robe);
    rect(put, 20, 5 + bob, 1, 4, robe);
    rect(put, 14, 3 + bob, 5, 1, robeM);

    // Face shadow inside hood
    rect(put, 14, 6 + bob, 5, 3, '#1a0828');

    // Glowing purple eyes
    put(15, 7 + bob, glow); put(17, 7 + bob, glow);
    put(15, 6 + bob, glowL); put(17, 6 + bob, glowL);

    // Robe body
    rect(put, 13, 10 + bob, 7, 8, robe);
    rect(put, 12, 12 + bob, 1, 6, robeM);
    rect(put, 20, 12 + bob, 1, 6, robeM);
    // Robe flare at bottom
    rect(put, 11, 18 + bob, 11, 3, robe);
    rect(put, 12, 21 + bob, 9, 1, robeM);
    // Ragged bottom edge
    put(11, 20 + bob, null); put(21, 20 + bob, null);
    put(13, 21 + bob, null); put(19, 21 + bob, null);

    // Staff in left hand
    put(11, 8 + bob, '#5a3a1a'); put(11, 9 + bob, '#5a3a1a');
    put(11, 10 + bob, '#5a3a1a'); put(11, 11 + bob, '#5a3a1a');
    put(11, 12 + bob, '#5a3a1a'); put(11, 13 + bob, '#5a3a1a');
    put(11, 14 + bob, '#5a3a1a'); put(11, 15 + bob, '#5a3a1a');
    put(11, 16 + bob, '#5a3a1a'); put(11, 17 + bob, '#5a3a1a');
    // Crystal on top
    put(11, 6 + bob, glow); put(11, 5 + bob, glowL);
    put(10, 6 + bob, glow); put(12, 6 + bob, glow);
    put(11, 7 + bob, glow);

    // Left hand on staff
    put(12, 13 + bob, hands);
    // Right casting hand
    put(20, 14 + bob, hands); put(21, 14 + bob, hands);

    // Casting effect on attack
    if (f === 'atk0') {
      put(22, 13 + bob, glow); put(23, 13 + bob, glow);
      put(22, 14 + bob, glowL); put(23, 14 + bob, glow);
      put(22, 15 + bob, glow); put(23, 15 + bob, glow);
    } else if (f === 'atk1') {
      disc(put, 23, 14 + bob, 2, glowL);
      put(25, 14 + bob, glow); put(26, 14 + bob, glow);
      put(23, 12 + bob, glow); put(23, 16 + bob, glow);
    }

    // Robe sway on walk
    const legOff = [0, 1, 0, -1][phase];
    put(14, 21 + bob + legOff, robeM);
    put(18, 21 + bob - legOff, robeM);
  };
}

// ==================================================================
//  GOLEM (32x32) — massive stone guardian with glowing orange runes
// ==================================================================
function drawEnemyGolem(f: EFrame) {
  return (rawPut: Put) => {
    const put = f.startsWith('die') ? rawPut : mirrorX(rawPut);
    // Darker basalt/obsidian palette — the previous mid-grey '#5a6270' and
    // '#636d7a' were two of the four castle flagstone shades, so the golem
    // disappeared into the floor on the castle level.
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 10 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 16, Math.max(0, r), '#2c303a');
      disc(put, 16, 16, Math.max(0, r - 2), '#3c4250');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + step * 0.4;
        const d = step * 3 + 3;
        put(Math.round(16 + Math.cos(a) * d), Math.round(16 + Math.sin(a) * d), '#ffa020');
      }
      return;
    }
    const flash = f === 'hit';
    const stone = flash ? P.white : '#2c303a';
    const stoneD = flash ? P.white : '#1c1f26';
    const stoneL = flash ? P.white : '#3c4250';
    const rune = flash ? P.white : '#ffa020';

    const phase = f === 'move0' ? 0 : f === 'move1' ? 1 : f === 'move2' ? 2 : f === 'move3' ? 3 :
                  f === 'atk0' ? 0 : f === 'atk1' ? 2 : 0;
    const bob = [0, -1, 0, 1][phase];

    // Massive blocky head
    rect(put, 12, 2 + bob, 9, 7, stone);
    rect(put, 13, 1 + bob, 7, 1, stoneL);
    // Glowing eyes
    put(14, 5 + bob, rune); put(15, 5 + bob, rune);
    put(18, 5 + bob, rune); put(19, 5 + bob, rune);
    // Brow ridge
    rect(put, 13, 4 + bob, 7, 1, stoneD);
    // Jaw
    rect(put, 13, 8 + bob, 7, 1, stoneD);

    // Massive torso
    rect(put, 10, 9 + bob, 13, 10, stone);
    rect(put, 9, 10 + bob, 1, 8, stoneD);
    rect(put, 23, 10 + bob, 1, 8, stoneD);
    // Chest rune lines
    put(16, 11 + bob, rune); put(16, 12 + bob, rune); put(16, 13 + bob, rune);
    put(14, 12 + bob, rune); put(18, 12 + bob, rune);
    put(13, 13 + bob, rune); put(19, 13 + bob, rune);

    // Shoulders (blocky)
    rect(put, 7, 9 + bob, 3, 4, stoneL);
    rect(put, 23, 9 + bob, 3, 4, stoneL);

    // Arms
    const atkSwing = f === 'atk1' ? 3 : 0;
    // Left arm
    rect(put, 7, 13 + bob, 3, 5, stone);
    put(7, 18 + bob, stoneD); put(8, 18 + bob, stoneD); put(9, 18 + bob, stoneD);
    // Right arm
    rect(put, 23, 13 + bob - atkSwing, 3, 5, stone);
    put(23, 18 + bob - atkSwing, stoneD); put(24, 18 + bob - atkSwing, stoneD); put(25, 18 + bob - atkSwing, stoneD);

    // Arm runes
    put(8, 15 + bob, rune);
    put(24, 15 + bob - atkSwing, rune);

    // Legs — thick pillars
    const legOff = [0, 1, 0, -1][phase];
    // Left leg
    rect(put, 11, 19 + bob, 4, 5 + legOff, stone);
    rect(put, 11, 24 + bob + legOff, 5, 1, stoneD);
    // Right leg
    rect(put, 18, 19 + bob, 4, 5 - legOff, stone);
    rect(put, 17, 24 + bob - legOff, 5, 1, stoneD);
    // Leg runes
    put(13, 21 + bob + legOff, rune);
    put(19, 21 + bob - legOff, rune);

    // Attack: fist glow
    if (f === 'atk0') {
      put(24, 17 + bob, rune); put(25, 17 + bob, rune);
    } else if (f === 'atk1') {
      put(24, 14 + bob, rune); put(25, 14 + bob, rune);
      put(23, 15 + bob, rune); put(26, 15 + bob, rune);
    }
  };
}

// ==================================================================
//  SHADOW IMP (32x32) — small dark fiend with horns, orange eyes
// ==================================================================
function drawEnemyShadowImp(f: EFrame) {
  return (rawPut: Put) => {
    const put = f.startsWith('die') ? rawPut : mirrorX(rawPut);
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 6 - step * 1.5;
      if (r <= 0) return;
      disc(put, 16, 20, Math.max(0, Math.round(r)), '#1a1028');
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + step * 0.6;
        const d = step * 3 + 2;
        put(Math.round(16 + Math.cos(a) * d), Math.round(20 + Math.sin(a) * d), '#3a2a48');
      }
      return;
    }
    const flash = f === 'hit';
    const body = flash ? P.white : '#1a1028';
    const bodyM = flash ? P.white : '#2a1a38';
    const bodyL = flash ? P.white : '#3a2a48';
    const eyes = flash ? P.white : '#ff8800';
    const grin = flash ? P.white : '#ff4040';

    const phase = f === 'move0' ? 0 : f === 'move1' ? 1 : f === 'move2' ? 2 : f === 'move3' ? 3 :
                  f === 'atk0' ? 0 : f === 'atk1' ? 2 : 0;
    const bob = [0, -1, 0, 1][phase];

    // Shadow on ground
    for (let dy = -1; dy <= 0; dy++)
      for (let dx = -3; dx <= 3; dx++)
        if (Math.abs(dx) + Math.abs(dy) <= 3) put(16 + dx, 27 + dy, P.shadow);

    // Small body
    disc(put, 16, 18 + bob, 4, body);
    disc(put, 16, 18 + bob, 3, bodyM);

    // Head
    disc(put, 16, 12 + bob, 4, bodyM);
    disc(put, 16, 12 + bob, 3, bodyL);

    // Horns
    put(12, 10 + bob, bodyL); put(11, 9 + bob, bodyL); put(10, 8 + bob, body);
    put(20, 10 + bob, bodyL); put(21, 9 + bob, bodyL); put(22, 8 + bob, body);

    // Eyes — bright orange
    put(14, 12 + bob, eyes); put(18, 12 + bob, eyes);
    // Eye glow
    put(14, 11 + bob, '#ffaa44'); put(18, 11 + bob, '#ffaa44');

    // Red grin
    put(14, 14 + bob, grin); put(15, 14 + bob, grin); put(16, 14 + bob, grin);
    put(17, 14 + bob, grin); put(18, 14 + bob, grin);

    // Thin arms
    put(11, 17 + bob, bodyL); put(10, 18 + bob, bodyL); put(9, 19 + bob, bodyL);
    put(21, 17 + bob, bodyL); put(22, 18 + bob, bodyL); put(23, 19 + bob, bodyL);

    // Claws
    put(8, 19 + bob, grin); put(9, 20 + bob, grin);
    put(24, 19 + bob, grin); put(23, 20 + bob, grin);

    // Small legs
    const legOff = [0, 1, 0, -1][phase];
    put(14, 22 + bob + legOff, bodyL); put(14, 23 + bob + legOff, bodyL);
    put(13, 24 + bob + legOff, body);
    put(18, 22 + bob - legOff, bodyL); put(18, 23 + bob - legOff, bodyL);
    put(19, 24 + bob - legOff, body);

    // Pointed tail
    put(16, 22 + bob, body); put(17, 23 + bob, body); put(18, 24 + bob, bodyL);
    put(19, 25 + bob, bodyL);

    // Smoky wisps
    if (phase % 2 === 0) {
      put(13, 20 + bob, bodyL); put(19, 16 + bob, bodyL);
    } else {
      put(19, 20 + bob, bodyL); put(13, 16 + bob, bodyL);
    }

    // Attack: claws forward
    if (f === 'atk0') {
      put(8, 17 + bob, grin); put(7, 17 + bob, grin);
      put(24, 17 + bob, grin); put(25, 17 + bob, grin);
    } else if (f === 'atk1') {
      put(7, 16 + bob, grin); put(6, 15 + bob, grin);
      put(25, 16 + bob, grin); put(26, 15 + bob, grin);
    }
  };
}

// ==================================================================
//  CASTLE BAT (32x32) — dark bat with spread wings, red eyes, fangs
// ==================================================================
function drawEnemyCastleBat(f: EFrame) {
  return (put: Put) => {
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 7 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 18, Math.max(0, r), '#2a1a2a');
      disc(put, 16, 18, Math.max(0, r - 1), '#3a2a3a');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + step * 0.4;
        const d = step * 3 + 3;
        put(Math.round(16 + Math.cos(a) * d), Math.round(18 + Math.sin(a) * d), '#1a0a1a');
      }
      return;
    }
    const flash = f === 'hit';
    const body = flash ? P.white : '#2a1a2a';
    const bodyD = flash ? P.white : '#1a0a1a';
    const bodyL = flash ? P.white : '#3a2a3a';
    const membrane = flash ? P.white : '#221428';
    const membraneL = flash ? P.white : '#3a2838';
    const eyeC = flash ? P.white : '#ff2020';
    const fang = flash ? P.white : '#d8d0c0';

    const phase = f === 'move0' ? 0 : f === 'move1' ? 1 : f === 'move2' ? 2 : f === 'move3' ? 3 :
                  f === 'atk0' ? 0 : f === 'atk1' ? 1 : 0;
    const bob = [0, -1, 0, 1][phase];
    const wingA = [0, -5, -6, -3][phase];

    // Shadow
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -6; dx <= 6; dx++)
        if ((dx * dx) / 36 + (dy * dy) / 1.5 <= 1) put(16 + dx, 28 + dy, P.shadow);

    // Wing membranes
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const wy = 15 + bob + Math.round(wingA * Math.sin(t * Math.PI));
      const memH = Math.round(3 + Math.sin(t * Math.PI) * 4);
      for (let dy = 0; dy <= memH; dy++) {
        put(12 - i, wy + dy, membrane);
        put(20 + i, wy + dy, membrane);
      }
      // Wing bones
      put(12 - i, wy, membraneL);
      put(20 + i, wy, membraneL);
    }
    // Wing claw tips
    put(0, 15 + bob + wingA, bodyL);
    put(31, 15 + bob + wingA, bodyL);

    // Body — oval
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -3; dx <= 3; dx++)
        if ((dx * dx) / 9 + (dy * dy) / 16 <= 1) put(16 + dx, 17 + bob + dy, body);
    // Lighter belly
    for (let dy = 0; dy <= 3; dy++)
      for (let dx = -2; dx <= 2; dx++)
        if ((dx * dx) / 4 + (dy * dy) / 9 <= 1) put(16 + dx, 18 + bob + dy, bodyL);

    // Head
    disc(put, 16, 11 + bob, 3, bodyL);
    disc(put, 16, 11 + bob, 2, body);

    // Pointed ears
    put(12, 8 + bob, bodyL); put(12, 7 + bob, bodyL); put(13, 9 + bob, bodyL);
    put(20, 8 + bob, bodyL); put(20, 7 + bob, bodyL); put(19, 9 + bob, bodyL);

    // Red eyes
    put(14, 11 + bob, eyeC); put(18, 11 + bob, eyeC);
    // Eye glow
    put(14, 10 + bob, '#ff4040'); put(18, 10 + bob, '#ff4040');

    // Fangs
    put(15, 14 + bob, fang); put(17, 14 + bob, fang);
    if (f === 'atk0' || f === 'atk1') {
      put(15, 15 + bob, fang); put(17, 15 + bob, fang);
      if (f === 'atk1') {
        put(15, 16 + bob, fang); put(17, 16 + bob, fang);
      }
    }

    // Mouth
    put(15, 13 + bob, bodyD); put(16, 13 + bob, bodyD); put(17, 13 + bob, bodyD);
  };
}

// ==================================================================
//  CASTLE RAT (32x32) — plague rat, dark castle themed
// ==================================================================
function drawEnemyCastleRat(f: EFrame) {
  return (rawPut: Put) => {
    const put = f.startsWith('die') ? rawPut : mirrorX(rawPut);
    if (f.startsWith('die')) {
      const step = parseInt(f.slice(3));
      const r = 7 - step * 2;
      if (r <= 0) return;
      disc(put, 16, 20, Math.max(0, r), '#4a3a2a');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + step * 0.5;
        const d = step * 3 + 2;
        put(Math.round(16 + Math.cos(a) * d), Math.round(20 + Math.sin(a) * d), '#5a4a38');
      }
      return;
    }
    const flash = f === 'hit';
    const bodyA = flash ? P.white : '#4a3a2a';
    const bodyB = flash ? P.white : '#5a4a38';
    const bodyC = flash ? P.white : '#3a2a1a';
    const tail = flash ? P.white : '#6a5a48';

    const phase = f === 'move0' ? 0 : f === 'move1' ? 1 : f === 'move2' ? 2 : f === 'move3' ? 3 :
                  f === 'atk0' ? 0 : f === 'atk1' ? 2 : 0;

    const rats = [
      { x: 10, y: 19 + [0, 1, 0, -1][phase], c: bodyA },
      { x: 16, y: 17 + [0, -1, 0, 1][(phase + 1) % 4], c: bodyB },
      { x: 14, y: 22 + [0, 1, 0, -1][(phase + 2) % 4], c: bodyA },
    ];

    // Tails first (behind)
    for (let i = 0; i < rats.length; i++) {
      const r = rats[i];
      const tw = [0, 1, 0, -1][(phase + i) % 4];
      put(r.x + 6, r.y + 1 + tw, tail);
      put(r.x + 7, r.y + tw, tail);
      put(r.x + 8, r.y + tw, tail);
      put(r.x + 9, r.y - 1 + tw, tail);
    }

    // Rat bodies
    for (let i = 0; i < rats.length; i++) {
      const r = rats[i];
      const legOff = [0, 1, 0, 1][(phase + i) % 4];
      // Body
      rect(put, r.x, r.y, 7, 4, r.c);
      rect(put, r.x + 1, r.y - 1, 5, 1, r.c);
      // Darker stripe
      rect(put, r.x + 1, r.y, 5, 1, bodyC);
      // Legs
      put(r.x, r.y + 4 - legOff, bodyC);
      put(r.x + 1, r.y + 4 - legOff, bodyC);
      put(r.x + 5, r.y + 4 + legOff, bodyC);
      put(r.x + 6, r.y + 4 + legOff, bodyC);
      // Head
      rect(put, r.x - 2, r.y, 3, 3, r.c);
      // Ear
      put(r.x - 1, r.y - 1, '#8a6a5a');
      // Eye — red
      put(r.x - 2, r.y + 1, '#ff2020');
      // Pink nose
      put(r.x - 3, r.y + 1, '#e0a0a0');
    }
  };
}

// ==================================================================
//  WARLOCK MAGIC BOLT (32x32) — purple orb projectile
// ==================================================================
function drawWarlockBolt(f: 'bolt0' | 'bolt1') {
  return (put: Put) => {
    const phase = f === 'bolt0' ? 0 : 1;
    const glow = '#aa40ff';
    const glowL = '#dd80ff';
    const core = '#ffffff';
    const trail = '#6a20c0';

    // Outer glow
    disc(put, 16, 16, 5, trail);
    disc(put, 16, 16, 4, glow);
    disc(put, 16, 16, 2, glowL);
    // Core
    put(16, 16, core); put(15, 16, core); put(17, 16, core);
    put(16, 15, core); put(16, 17, core);

    // Sparkle effect rotating between frames
    if (phase === 0) {
      put(12, 16, glowL); put(20, 16, glowL);
      put(16, 12, glowL); put(16, 20, glowL);
    } else {
      put(13, 13, glowL); put(19, 13, glowL);
      put(13, 19, glowL); put(19, 19, glowL);
    }

    // Trail wisps
    put(10, 16 + (phase === 0 ? -1 : 1), trail);
    put(9, 16, trail);
    put(8, 16 + (phase === 0 ? 1 : -1), trail);
  };
}

let artGenerated = false;
export function generateAllArt(scene: Phaser.Scene) {
  if (artGenerated) return;
  artGenerated = true;
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
  for (const f of eFrames) add(scene, `esnk_${f}`, makeCanvas(32, drawEnemySnake(f)));
  for (const f of eFrames) add(scene, `erat_${f}`, makeCanvas(32, drawEnemyRat(f)));
  for (const f of eFrames) add(scene, `eder_${f}`, makeCanvas(32, drawEnemyDeer(f)));
  for (const f of eFrames) add(scene, `eib_${f}`, makeCanvas(32, drawEnemyInfectedBasic(f)));
  for (const f of eFrames) add(scene, `eih_${f}`, makeCanvas(32, drawEnemyInfectedHeavy(f)));
  // Blighted Toad — uses its own frame set (idle + hop + atk + hit + die)
  const toadFrames: ToadFrame[] = ['idle', 'hop0', 'hop1', 'hop2', 'hop3', 'atk0', 'atk1', 'hit', 'die0', 'die1', 'die2', 'die3'];
  for (const f of toadFrames) add(scene, `etd_${f}`, makeCanvas(32, drawEnemyToad(f)));
  // Toad glob projectile
  add(scene, 'tglob_0', makeCanvas(16, drawToadGlob('glob0')));
  add(scene, 'tglob_1', makeCanvas(16, drawToadGlob('glob1')));
  for (const f of eFrames) add(scene, `ew_${f}`, makeCanvas(32, drawEnemyWolf(f)));
  // Bear: extract frames from sprite sheet, strip grey bg, register as textures
  extractBearFrames(scene);
  for (const f of eFrames) add(scene, `es_${f}`, makeCanvas(32, drawEnemySpider(f)));
  // River flying enemies
  for (const f of eFrames) add(scene, `ecr_${f}`, makeCanvas(32, drawEnemyCrow(f)));
  for (const f of eFrames) add(scene, `ebt_${f}`, makeCanvas(32, drawEnemyBat(f)));
  for (const f of eFrames) add(scene, `edf_${f}`, makeCanvas(32, drawEnemyDragonfly(f)));
  for (const f of eFrames) add(scene, `emq_${f}`, makeCanvas(32, drawEnemyMosquito(f)));
  // Mosquito dart projectile
  add(scene, 'mdart_0', makeCanvas(16, drawMosquitoDart('dart0')));
  add(scene, 'mdart_1', makeCanvas(16, drawMosquitoDart('dart1')));
  // Bird poop splat
  add(scene, 'bird_poop', makeCanvas(16, drawBirdPoop()));

  // Castle enemies
  for (const f of eFrames) add(scene, `esk_${f}`, makeCanvas(32, drawEnemySkeleton(f)));
  for (const f of eFrames) add(scene, `ewl_${f}`, makeCanvas(32, drawEnemyWarlock(f)));
  for (const f of eFrames) add(scene, `ego_${f}`, makeCanvas(32, drawEnemyGolem(f)));
  for (const f of eFrames) add(scene, `esi_${f}`, makeCanvas(32, drawEnemyShadowImp(f)));
  for (const f of eFrames) add(scene, `ecb_${f}`, makeCanvas(32, drawEnemyCastleBat(f)));
  for (const f of eFrames) add(scene, `ecrat_${f}`, makeCanvas(32, drawEnemyCastleRat(f)));
  // Warlock magic bolt projectile
  add(scene, 'wbolt_0', makeCanvas(32, drawWarlockBolt('bolt0')));
  add(scene, 'wbolt_1', makeCanvas(32, drawWarlockBolt('bolt1')));

  // Shared helper to copy a loaded PNG texture to a new key
  const copyTex = (src: string, dst: string) => {
    if (scene.textures.exists(dst)) scene.textures.remove(dst);
    const srcTex = scene.textures.get(src);
    const srcImg = srcTex.getSourceImage() as HTMLImageElement;
    const c = document.createElement('canvas');
    c.width = srcImg.width; c.height = srcImg.height;
    c.getContext('2d')!.drawImage(srcImg, 0, 0);
    scene.textures.addCanvas(dst, c);
  };

  // Tower — PNG base + procedural ballista top
  if (scene.textures.exists('t_base_png')) {
    copyTex('t_base_png', 't_base');
  } else {
    add(scene, 't_base',  makeCanvas(64, drawTowerBase));
  }
  // Arrow tower upgrade bases (level 1 = sprite #7, level 2 = sprite #0)
  if (scene.textures.exists('t_base_1_png')) {
    copyTex('t_base_1_png', 't_base_1');
  }
  if (scene.textures.exists('t_base_2_png')) {
    copyTex('t_base_2_png', 't_base_2');
  }
  // Cannon tower — PNG base (sprite #29)
  if (scene.textures.exists('c_base_png')) {
    const cleanAndCopy = (src: string, dst: string) => {
      if (scene.textures.exists(dst)) scene.textures.remove(dst);
      const srcTex = scene.textures.get(src);
      const srcImg = srcTex.getSourceImage() as HTMLImageElement;
      const c = document.createElement('canvas');
      c.width = srcImg.width; c.height = srcImg.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(srcImg, 0, 0);
      // Strip magenta fringe: any pixel where R and B are high but G is low
      const id = ctx.getImageData(0, 0, c.width, c.height);
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (r > 180 && b > 180 && g < 100) {
          d[i + 3] = 0; // make transparent
        }
      }
      ctx.putImageData(id, 0, 0);
      scene.textures.addCanvas(dst, c);
    };
    cleanAndCopy('c_base_png', 'c_base');
  } else {
    add(scene, 'c_base', makeCanvas(64, drawTowerBase));
  }
  // Cannon tower upgrade bases (level 1 = sprite #11, level 2 = sprite #32)
  if (scene.textures.exists('c_base_1_png')) {
    copyTex('c_base_1_png', 'c_base_1');
  }
  if (scene.textures.exists('c_base_2_png')) {
    copyTex('c_base_2_png', 'c_base_2');
  }
  // Arrow tower: static archer body + rotatable bow (same system as player)
  add(scene, 't_archer', makeCanvas(32, drawTowerArcher));
  add(scene, 't_top_0', makeCanvas(32, drawTowerBow(false)));
  add(scene, 't_top_1', makeCanvas(32, drawTowerBow(true)));
  add(scene, 'c_mount', makeCanvas(64, drawCannonMount()));
  add(scene, 'c_top_0', makeCanvas(64, drawCannonTop(false)));
  add(scene, 'c_top_1', makeCanvas(64, drawCannonTop(true)));

  // Off-screen tower indicators
  add(scene, 'ind_arrow',  makeCanvas(32, drawIndicatorArrow()));
  add(scene, 'ind_cannon', makeCanvas(32, drawIndicatorCannon()));
  add(scene, 'ind_boss',   makeCanvas(32, drawIndicatorBoss()));
  add(scene, 'ind_ptr',    makeCanvas(16, drawIndicatorPointer()));

  // Green checkmark for level select
  {
    const s = 20;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const x = c.getContext('2d')!;
    // Black outline
    x.strokeStyle = '#000';
    x.lineWidth = 4;
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.beginPath();
    x.moveTo(3, 10);
    x.lineTo(8, 16);
    x.lineTo(17, 4);
    x.stroke();
    // Green fill
    x.strokeStyle = '#4ad96a';
    x.lineWidth = 2.5;
    x.beginPath();
    x.moveTo(3, 10);
    x.lineTo(8, 16);
    x.lineTo(17, 4);
    x.stroke();
    add(scene, 'ui_check', c);
  }

  // Wall
  // Walls — 16 autotile variants (N=1, E=2, S=4, W=8) × normal/damaged
  for (let mask = 0; mask < 16; mask++) {
    add(scene, `wall_${mask}`,     makeCanvas(32, drawWall(mask, false)));
    add(scene, `wall_${mask}_dmg`, makeCanvas(32, drawWall(mask, true)));
  }
  // Legacy keys for ghost preview and default
  add(scene, 'wall',     makeCanvas(32, drawWall(0, false)));
  add(scene, 'wall_dmg', makeCanvas(32, drawWall(0, true)));

  // Arrow
  add(scene, 'arrow_0', makeCanvas(32, drawArrow(0)));
  add(scene, 'arrow_1', makeCanvas(32, drawArrow(1)));

  // Cannonball
  add(scene, 'cball_0', makeCanvas(32, drawCannonball(0)));
  add(scene, 'cball_1', makeCanvas(32, drawCannonball(1)));
  add(scene, 'cball_shadow', makeCanvas(32, drawCannonballShadow()));

  // Boulder (boss projectile)
  add(scene, 'boulder_0', makeCanvas(32, drawBoulder(0)));
  add(scene, 'boulder_1', makeCanvas(32, drawBoulder(1)));
  add(scene, 'boulder_shadow', makeCanvas(32, drawBoulderShadow()));

  // Coin (bronze / silver / gold tiers)
  for (let i = 0; i < 6; i++) add(scene, `coin_${i}`, makeCanvas(32, drawCoin(i as any, 'gold')));
  for (const tier of ['bronze','silver','gold'] as const) {
    for (let i = 0; i < 6; i++) add(scene, `coin_${tier}_${i}`, makeCanvas(32, drawCoin(i as any, tier)));
  }

  // Effects
  for (let i = 0; i < 3; i++) add(scene, `fx_hit_${i}`,   makeCanvas(32, drawHitSpark(i as any)));
  for (let i = 0; i < 5; i++) add(scene, `fx_death_${i}`, makeCanvas(32, drawDeathBurst(i as any)));
  for (let i = 0; i < 3; i++) add(scene, `fx_pop_${i}`,   makeCanvas(32, drawCoinPop(i as any)));
  for (let i = 0; i < 5; i++) add(scene, `fx_boulder_${i}`, makeCanvas(32, drawBoulderImpact(i as any)));

  // Ground tile variations
  // Ground tiles are generated per-tile in GameScene.generateChunksAround()
  add(scene, 'foundation', makeCanvas(64, drawFoundation));

  // Tree cluster sprites (one per pattern)
  for (let i = 0; i < TREE_PATTERNS.length; i++) add(scene, `tree_cluster_${i}`, drawTreeClusterCanvas(i));

  // Infected plant cluster sprites (one per pattern)
  for (let i = 0; i < TREE_PATTERNS.length; i++) add(scene, `infected_plant_${i}`, drawInfectedPlantCanvas(i));

  // Castle floor spikes — register N jitter variants. The placement code
  // picks per-tile across patterns so multi-tile clusters don't look stamped.
  for (let i = 0; i < SPIKE_VARIANT_COUNT; i++) add(scene, `castle_spikes_${i}`, drawCastleSpikesCanvas(i));

  // Firefly particle (tiny yellow-green glow, 4x4 logical)
  {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 4;
    const x = c.getContext('2d')!;
    x.fillStyle = '#80c040';
    x.fillRect(0, 0, 4, 4);
    x.fillStyle = '#b0ff60';
    x.fillRect(1, 1, 2, 2);
    add(scene, 'firefly', c);
  }

  // Infection spore particle (4x4 — purple/green glow)
  {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 4;
    const x = c.getContext('2d')!;
    x.fillStyle = '#6030a0';
    x.fillRect(0, 0, 4, 4);
    x.fillStyle = '#a060e0';
    x.fillRect(1, 1, 2, 2);
    add(scene, 'infection_spore', c);
  }

  // Infection spore green variant (4x4)
  {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 4;
    const x = c.getContext('2d')!;
    x.fillStyle = '#208040';
    x.fillRect(0, 0, 4, 4);
    x.fillStyle = '#40e060';
    x.fillRect(1, 1, 2, 2);
    add(scene, 'infection_spore_green', c);
  }

  // Spider web texture (16x16 semi-transparent white circle)
  {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 32;
    const x = c.getContext('2d')!;
    x.globalAlpha = 0.4;
    x.fillStyle = '#ffffff';
    x.beginPath(); x.arc(16, 16, 14, 0, Math.PI * 2); x.fill();
    // Cross lines for web look
    x.globalAlpha = 0.5;
    x.strokeStyle = '#ffffff';
    x.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      x.beginPath();
      x.moveTo(16, 16);
      x.lineTo(16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13);
      x.stroke();
    }
    // Concentric rings
    x.globalAlpha = 0.3;
    for (const r of [5, 9, 12]) {
      x.beginPath(); x.arc(16, 16, r, 0, Math.PI * 2); x.stroke();
    }
    add(scene, 'spider_web', c);
  }

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
  for (const f of bossFrames) add(scene, `ram_${f}`, makeCanvas(64, drawRam(f)));
  for (const f of bossFrames) add(scene, `iboss_${f}`, makeCanvas(64, drawInfectedBoss(f)));

  // Forest boss (Ent) textures
  for (const f of forestBossFrames) add(scene, `fboss_${f}`, makeCanvas(64, drawForestBoss(f)));

  // River boss (Fog Phantom) textures
  for (const f of bossFrames) add(scene, `rboss_${f}`, makeCanvas(64, drawFogPhantom(f)));

  // Castle boss (Phantom Queen) textures
  for (const f of bossFrames) add(scene, `cqboss_${f}`, makeCanvas(64, drawPhantomQueen(f)));
  // Castle boss (Castle Dragon) textures
  for (const f of bossFrames) add(scene, `cdboss_${f}`, makeCanvas(64, drawCastleDragon(f)));

  // Queen orb projectile
  add(scene, 'qorb_0', makeCanvas(32, drawQueenOrb(0)));
  add(scene, 'qorb_1', makeCanvas(32, drawQueenOrb(1)));

  // Dragon fireball projectile (4 frames for rotation)
  add(scene, 'dfball_0', makeCanvas(32, drawDragonFireball(0)));
  add(scene, 'dfball_1', makeCanvas(32, drawDragonFireball(1)));
  add(scene, 'dfball_2', makeCanvas(32, drawDragonFireball(2)));
  add(scene, 'dfball_3', makeCanvas(32, drawDragonFireball(3)));

  // Dragon fireball explosion (5 frames)
  for (let i = 0; i < 5; i++)
    add(scene, `dfexpl_${i}`, makeCanvas(32, drawDragonFireExplosion(i)));
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

  mk('esnk-move', ['esnk_move0','esnk_move1','esnk_move2','esnk_move3'], 8, -1);
  mk('esnk-atk',  ['esnk_atk0','esnk_atk1'], 8, -1);
  mk('esnk-hit',  ['esnk_hit'], 10, 0);
  mk('esnk-die',  ['esnk_die0','esnk_die1','esnk_die2','esnk_die3'], 10, 0);

  mk('erat-move', ['erat_move0','erat_move1','erat_move2','erat_move3'], 10, -1);
  mk('erat-atk',  ['erat_atk0','erat_atk1'], 10, -1);
  mk('erat-hit',  ['erat_hit'], 10, 0);
  mk('erat-die',  ['erat_die0','erat_die1','erat_die2','erat_die3'], 10, 0);

  mk('eder-move', ['eder_move0','eder_move1','eder_move2','eder_move3'], 6, -1);
  mk('eder-atk',  ['eder_atk0','eder_atk1'], 6, -1);
  mk('eder-hit',  ['eder_hit'], 8, 0);
  mk('eder-die',  ['eder_die0','eder_die1','eder_die2','eder_die3'], 8, 0);

  mk('eib-move', ['eib_move0','eib_move1','eib_move2','eib_move3'], 8, -1);
  mk('eib-atk',  ['eib_atk0','eib_atk1'], 8, -1);
  mk('eib-hit',  ['eib_hit'], 10, 0);
  mk('eib-die',  ['eib_die0','eib_die1','eib_die2','eib_die3'], 10, 0);

  mk('eih-move', ['eih_move0','eih_move1','eih_move2','eih_move3'], 6, -1);
  mk('eih-atk',  ['eih_atk0','eih_atk1'], 6, -1);
  mk('eih-hit',  ['eih_hit'], 8, 0);
  mk('eih-die',  ['eih_die0','eih_die1','eih_die2','eih_die3'], 8, 0);

  // Blighted Toad
  mk('etd-idle', ['etd_idle'], 1, -1);
  mk('etd-hop',  ['etd_hop0','etd_hop1','etd_hop2','etd_hop3'], 8, 0); // plays once per hop
  mk('etd-atk',  ['etd_atk0','etd_atk1'], 6, 0);
  mk('etd-hit',  ['etd_hit'], 8, 0);
  mk('etd-die',  ['etd_die0','etd_die1','etd_die2','etd_die3'], 8, 0);
  mk('tglob-spin', ['tglob_0','tglob_1'], 8, -1);

  mk('ew-move', ['ew_move0','ew_move1','ew_move2','ew_move3'], 10, -1);
  mk('ew-atk',  ['ew_atk0','ew_atk1'], 10, -1);
  mk('ew-hit',  ['ew_hit'], 10, 0);
  mk('ew-die',  ['ew_die0','ew_die1','ew_die2','ew_die3'], 10, 0);

  // Bear: directional animations (right-facing and left-facing)
  mk('ear-move', ['ear_move0','ear_move1','ear_move2','ear_move3','ear_move4','ear_move5','ear_move6','ear_move7'], 10, -1);
  mk('ear-atk',  ['ear_atk0','ear_atk1','ear_atk2','ear_atk3','ear_atk4'], 6, 0);
  mk('ear-hit',  ['ear_hit'], 8, 0);
  mk('ear-die',  ['ear_die0','ear_die1','ear_die2','ear_die3'], 8, 0);
  mk('eal-move', ['eal_move0','eal_move1','eal_move2','eal_move3','eal_move4','eal_move5','eal_move6','eal_move7'], 10, -1);
  mk('eal-atk',  ['eal_atk0','eal_atk1','eal_atk2','eal_atk3','eal_atk4'], 6, 0);
  mk('eal-hit',  ['eal_hit'], 8, 0);
  mk('eal-die',  ['eal_die0','eal_die1','eal_die2','eal_die3'], 8, 0);

  mk('es-move', ['es_move0','es_move1','es_move2','es_move3'], 8, -1);
  mk('es-atk',  ['es_atk0','es_atk1'], 8, -1);
  mk('es-hit',  ['es_hit'], 10, 0);
  mk('es-die',  ['es_die0','es_die1','es_die2','es_die3'], 10, 0);

  // River flying enemies
  mk('ecr-move', ['ecr_move0','ecr_move1','ecr_move2','ecr_move3'], 8, -1);
  mk('ecr-atk',  ['ecr_atk0','ecr_atk1'], 8, -1);
  mk('ecr-hit',  ['ecr_hit'], 10, 0);
  mk('ecr-die',  ['ecr_die0','ecr_die1','ecr_die2','ecr_die3'], 10, 0);

  mk('ebt-move', ['ebt_move0','ebt_move1','ebt_move2','ebt_move3'], 6, -1);
  mk('ebt-atk',  ['ebt_atk0','ebt_atk1'], 6, -1);
  mk('ebt-hit',  ['ebt_hit'], 8, 0);
  mk('ebt-die',  ['ebt_die0','ebt_die1','ebt_die2','ebt_die3'], 8, 0);

  mk('edf-move', ['edf_move0','edf_move1','edf_move2','edf_move3'], 12, -1);
  mk('edf-atk',  ['edf_atk0','edf_atk1'], 12, -1);
  mk('edf-hit',  ['edf_hit'], 10, 0);
  mk('edf-die',  ['edf_die0','edf_die1','edf_die2','edf_die3'], 10, 0);

  mk('emq-move', ['emq_move0','emq_move1','emq_move2','emq_move3'], 10, -1);
  mk('emq-atk',  ['emq_atk0','emq_atk1'], 10, -1);
  mk('emq-hit',  ['emq_hit'], 10, 0);
  mk('emq-die',  ['emq_die0','emq_die1','emq_die2','emq_die3'], 10, 0);

  // Mosquito dart
  mk('mdart-spin', ['mdart_0','mdart_1'], 8, -1);

  // Castle enemies
  mk('esk-move', ['esk_move0','esk_move1','esk_move2','esk_move3'], 8, -1);
  mk('esk-atk',  ['esk_atk0','esk_atk1'], 8, -1);
  mk('esk-hit',  ['esk_hit'], 10, 0);
  mk('esk-die',  ['esk_die0','esk_die1','esk_die2','esk_die3'], 10, 0);

  mk('ewl-move', ['ewl_move0','ewl_move1','ewl_move2','ewl_move3'], 8, -1);
  mk('ewl-atk',  ['ewl_atk0','ewl_atk1'], 8, -1);
  mk('ewl-hit',  ['ewl_hit'], 10, 0);
  mk('ewl-die',  ['ewl_die0','ewl_die1','ewl_die2','ewl_die3'], 10, 0);

  mk('ego-move', ['ego_move0','ego_move1','ego_move2','ego_move3'], 6, -1);
  mk('ego-atk',  ['ego_atk0','ego_atk1'], 6, -1);
  mk('ego-hit',  ['ego_hit'], 8, 0);
  mk('ego-die',  ['ego_die0','ego_die1','ego_die2','ego_die3'], 8, 0);

  mk('esi-move', ['esi_move0','esi_move1','esi_move2','esi_move3'], 10, -1);
  mk('esi-atk',  ['esi_atk0','esi_atk1'], 10, -1);
  mk('esi-hit',  ['esi_hit'], 10, 0);
  mk('esi-die',  ['esi_die0','esi_die1','esi_die2','esi_die3'], 10, 0);

  mk('ecb-move', ['ecb_move0','ecb_move1','ecb_move2','ecb_move3'], 6, -1);
  mk('ecb-atk',  ['ecb_atk0','ecb_atk1'], 6, -1);
  mk('ecb-hit',  ['ecb_hit'], 8, 0);
  mk('ecb-die',  ['ecb_die0','ecb_die1','ecb_die2','ecb_die3'], 8, 0);

  mk('ecrat-move', ['ecrat_move0','ecrat_move1','ecrat_move2','ecrat_move3'], 10, -1);
  mk('ecrat-atk',  ['ecrat_atk0','ecrat_atk1'], 10, -1);
  mk('ecrat-hit',  ['ecrat_hit'], 10, 0);
  mk('ecrat-die',  ['ecrat_die0','ecrat_die1','ecrat_die2','ecrat_die3'], 10, 0);

  // Warlock bolt
  mk('wbolt-spin', ['wbolt_0','wbolt_1'], 8, -1);

  mk('tower-top-idle',  ['t_top_0'], 1, 0);
  mk('tower-top-shoot', ['t_top_1','t_top_0'], 14, 0);
  mk('cannon-top-idle',  ['c_top_0'], 1, 0);
  mk('cannon-top-shoot', ['c_top_1','c_top_0'], 10, 0);

  mk('arrow-spin', ['arrow_0','arrow_1'], 20, -1);
  mk('cball-spin', ['cball_0','cball_1'], 8, -1);
  mk('boulder-spin', ['boulder_0','boulder_1'], 6, -1);

  mk('coin-spin',  ['coin_0','coin_1','coin_2','coin_3','coin_4','coin_5'], 10, -1);
  for (const tier of ['bronze','silver','gold'] as const) {
    mk(`coin-${tier}-spin`,
      [`coin_${tier}_0`,`coin_${tier}_1`,`coin_${tier}_2`,`coin_${tier}_3`,`coin_${tier}_4`,`coin_${tier}_5`],
      10, -1);
  }

  mk('fx-hit',    ['fx_hit_0','fx_hit_1','fx_hit_2'], 22, 0);
  mk('fx-death',  ['fx_death_0','fx_death_1','fx_death_2','fx_death_3','fx_death_4'], 18, 0);
  mk('fx-pop',    ['fx_pop_0','fx_pop_1','fx_pop_2'], 20, 0);
  mk('fx-boulder', ['fx_boulder_0','fx_boulder_1','fx_boulder_2','fx_boulder_3','fx_boulder_4'], 14, 0);

  // Boss
  mk('boss-idle',       ['boss_idle0','boss_idle1'], 2, -1);
  mk('boss-move',       ['boss_move0','boss_move1','boss_move2','boss_move3'], 5, -1);
  mk('boss-atk',        ['boss_atk0','boss_atk1'], 4, 0);
  mk('boss-chargewind', ['boss_chargeWind','boss_idle0'], 6, -1);
  mk('boss-hit',        ['boss_hit'], 10, 0);
  mk('boss-birth',      ['boss_birth0','boss_birth1','boss_birth2','boss_birth3','boss_birth4'], 4, 0);
  mk('boss-die',        ['boss_die0','boss_die1','boss_die2','boss_die3','boss_die4'], 6, 0);

  // Meadow boss (Ancient Ram) animations
  mk('ram-idle',       ['ram_idle0','ram_idle1'], 2, -1);
  mk('ram-move',       ['ram_move0','ram_move1','ram_move2','ram_move3'], 5, -1);
  mk('ram-atk',        ['ram_atk0','ram_atk1'], 4, 0);
  mk('ram-chargewind', ['ram_chargeWind','ram_idle0'], 6, -1);
  mk('ram-hit',        ['ram_hit'], 10, 0);
  mk('ram-birth',      ['ram_birth0','ram_birth1','ram_birth2','ram_birth3','ram_birth4'], 4, 0);
  mk('ram-die',        ['ram_die0','ram_die1','ram_die2','ram_die3','ram_die4'], 6, 0);

  // Infected boss animations
  mk('iboss-idle',       ['iboss_idle0','iboss_idle1'], 2, -1);
  mk('iboss-move',       ['iboss_move0','iboss_move1','iboss_move2','iboss_move3'], 5, -1);
  mk('iboss-atk',        ['iboss_atk0','iboss_atk1'], 4, 0);
  mk('iboss-chargewind', ['iboss_chargeWind','iboss_idle0'], 6, -1);
  mk('iboss-hit',        ['iboss_hit'], 10, 0);
  mk('iboss-birth',      ['iboss_birth0','iboss_birth1','iboss_birth2','iboss_birth3','iboss_birth4'], 4, 0);
  mk('iboss-die',        ['iboss_die0','iboss_die1','iboss_die2','iboss_die3','iboss_die4'], 6, 0);

  // Forest boss (Ent) animations
  mk('fboss-idle',       ['fboss_idle0','fboss_idle1'], 2, -1);
  mk('fboss-move',       ['fboss_move0','fboss_move1','fboss_move2','fboss_move3'], 5, -1);
  mk('fboss-atk',        ['fboss_atk0','fboss_atk1'], 4, 0);
  mk('fboss-chargewind', ['fboss_chargeWind','fboss_idle0'], 6, -1);
  mk('fboss-hit',        ['fboss_hit'], 10, 0);
  mk('fboss-birth',      ['fboss_birth0','fboss_birth1','fboss_birth2','fboss_birth3','fboss_birth4'], 4, 0);
  mk('fboss-die',        ['fboss_die0','fboss_die1','fboss_die2','fboss_die3','fboss_die4'], 6, 0);

  // River boss (Fog Phantom)
  mk('rboss-idle',       ['rboss_idle0','rboss_idle1'], 2, -1);
  mk('rboss-move',       ['rboss_move0','rboss_move1','rboss_move2','rboss_move3'], 5, -1);
  mk('rboss-atk',        ['rboss_atk0','rboss_atk1'], 4, 0);
  mk('rboss-chargewind', ['rboss_chargeWind','rboss_idle0'], 6, -1);
  mk('rboss-hit',        ['rboss_hit'], 10, 0);
  mk('rboss-birth',      ['rboss_birth0','rboss_birth1','rboss_birth2','rboss_birth3','rboss_birth4'], 4, 0);
  mk('rboss-die',        ['rboss_die0','rboss_die1','rboss_die2','rboss_die3','rboss_die4'], 6, 0);

  // Castle boss (Phantom Queen) animations
  mk('cqboss-idle',       ['cqboss_idle0','cqboss_idle1'], 2, -1);
  mk('cqboss-move',       ['cqboss_move0','cqboss_move1','cqboss_move2','cqboss_move3'], 5, -1);
  mk('cqboss-atk',        ['cqboss_atk0','cqboss_atk1'], 4, 0);
  mk('cqboss-chargewind', ['cqboss_chargeWind','cqboss_idle0'], 6, -1);
  mk('cqboss-hit',        ['cqboss_hit'], 10, 0);
  mk('cqboss-birth',      ['cqboss_birth0','cqboss_birth1','cqboss_birth2','cqboss_birth3','cqboss_birth4'], 4, 0);
  mk('cqboss-die',        ['cqboss_die0','cqboss_die1','cqboss_die2','cqboss_die3','cqboss_die4'], 6, 0);

  // Castle boss (Castle Dragon) animations
  mk('cdboss-idle',       ['cdboss_idle0','cdboss_idle1'], 2, -1);
  mk('cdboss-move',       ['cdboss_move0','cdboss_move1','cdboss_move2','cdboss_move3'], 5, -1);
  mk('cdboss-atk',        ['cdboss_atk0','cdboss_atk1'], 4, 0);
  mk('cdboss-chargewind', ['cdboss_chargeWind','cdboss_idle0'], 6, -1);
  mk('cdboss-hit',        ['cdboss_hit'], 10, 0);
  mk('cdboss-birth',      ['cdboss_birth0','cdboss_birth1','cdboss_birth2','cdboss_birth3','cdboss_birth4'], 4, 0);
  mk('cdboss-die',        ['cdboss_die0','cdboss_die1','cdboss_die2','cdboss_die3','cdboss_die4'], 6, 0);

  // Queen orb spin animation
  mk('qorb-spin', ['qorb_0','qorb_1'], 8, -1);

  // Dragon fireball spin animation
  mk('dfball-spin', ['dfball_0','dfball_1','dfball_2','dfball_3'], 10, -1);
  mk('dfexpl', ['dfexpl_0','dfexpl_1','dfexpl_2','dfexpl_3','dfexpl_4'], 14, 0);

  // Pre-render river squiggle textures (small clusters of dashes)
  for (let vi = 0; vi < 5; vi++) {
    const sz = 20;
    const c = document.createElement('canvas');
    c.width = sz; c.height = sz;
    const x = c.getContext('2d')!;
    x.strokeStyle = '#ffffff';
    x.lineWidth = 1;
    x.lineCap = 'round';
    let h = ((vi * 73856093 + 12345) >>> 0) % 2147483647;
    const rng = () => { h = (h * 16807) % 2147483647; return h / 2147483647; };
    const count = 3 + (vi % 3);
    for (let j = 0; j < count; j++) {
      const ox = sz / 2 + (rng() - 0.5) * 14;
      const oy = sz / 2 + (rng() - 0.5) * 10;
      const ang = rng() * Math.PI;
      const halfLen = 1.5 + rng() * 3;
      x.globalAlpha = 0.5 + rng() * 0.3;
      x.beginPath();
      x.moveTo(ox - Math.cos(ang) * halfLen, oy - Math.sin(ang) * halfLen);
      x.lineTo(ox + Math.cos(ang) * halfLen, oy + Math.sin(ang) * halfLen);
      x.stroke();
    }
    if (scene.textures.exists(`river_squig_${vi}`)) scene.textures.remove(`river_squig_${vi}`);
    scene.textures.addCanvas(`river_squig_${vi}`, c);
  }
}
