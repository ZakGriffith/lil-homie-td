// Player + bow sprites. The "Ranger" hero — top-down blue-clad,
// 16-px-wide body, plus a separate bow frame that the ranger holds.

import { Put, P, mirrorX, rect, disc, line } from './canvas';

export type PFrame = 'idle0'|'idle1'|'move0'|'move1'|'move2'|'move3'|'shoot0'|'shoot1'|'hit';

export function drawPlayer(frame: PFrame) {
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
export function drawBow(shooting: boolean) {
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
