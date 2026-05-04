// Bear is its own thing: bigger than the other ground enemies, has a unique
// 8-frame walk cycle, and uses a dedicated PB palette so the colour scheme
// stays consistent across all bear frames without bleeding into other art.

import Phaser from 'phaser';
import { Put, P, mirrorX, rect, disc, ring, line, makeCanvas, add } from './canvas';

// ==================================================================
//  ENEMY BEAR (32x32) — Classic Brown Bear (realistic grizzly)
// ==================================================================
export type BearFrame =
  | 'move0' | 'move1' | 'move2' | 'move3' | 'move4' | 'move5' | 'move6' | 'move7'
  | 'atk0' | 'atk1' | 'atk2' | 'atk3' | 'atk4'
  | 'hit'
  | 'die0' | 'die1' | 'die2' | 'die3';

export const bearFrames: BearFrame[] = [
  'move0','move1','move2','move3','move4','move5','move6','move7',
  'atk0','atk1','atk2','atk3','atk4',
  'hit',
  'die0','die1','die2','die3'
];

export const PB = {
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
export function drawBearDir(f: BearFrame, dir: 'r' | 'l') {
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
export function extractBearFrames(scene: Phaser.Scene) {
  for (const f of bearFrames) {
    add(scene, `ear_${f}`, makeCanvas(32, drawBearDir(f, 'r')));
    add(scene, `eal_${f}`, makeCanvas(32, drawBearDir(f, 'l')));
  }
}
