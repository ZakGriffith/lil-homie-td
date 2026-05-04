// All tower art: base/ballista/archer/bow/top + cannon mount and top.

import { Put, P, mirrorX, rect, disc, ring, line, ellipse } from './canvas';

// ==================================================================
//  TOWER (64x64) — 2x2 tile crossbow turret
// ==================================================================
export function drawTowerBase(put: Put) {
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
export function drawBallistaStand(put: Put) {
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
export function drawTowerArcher(put: Put) {
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
export function drawTowerBow(shooting: boolean) {
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
export function drawTowerTop(shoot = false) {
  return drawTowerBow(shoot);
}

// ==================================================================
//  CANNON TURRET TOP (64x64) — fat dark cannon, pivot (32,32), aims right
// ==================================================================
// Static cannon mount / carriage — does not rotate
export function drawCannonMount() {
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

export function drawCannonTop(shoot = false) {
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
