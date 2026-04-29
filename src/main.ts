import Phaser from 'phaser';
import { CFG } from './config';
import { BootScene } from './scenes/BootScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { TutorialScene } from './scenes/TutorialScene';
import { SFX } from './audio/sfx';

const overlay = document.getElementById('overlay') as HTMLDivElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;

let started = false;

// Preload play button sound so it's instant on click
let playBtnBuffer: ArrayBuffer | null = null;
fetch('/audio/PlayButton.wav').then(r => r.arrayBuffer()).then(b => { playBtnBuffer = b; }).catch(() => {});

// Keep the screen awake so the game doesn't pause/restart when the user
// walks away. Re-acquires the lock whenever the tab becomes visible again.
let wakeLock: any = null;
async function requestWakeLock() {
  try {
    const nav: any = navigator;
    if (nav.wakeLock && typeof nav.wakeLock.request === 'function') {
      wakeLock = await nav.wakeLock.request('screen');
      wakeLock.addEventListener?.('release', () => { wakeLock = null; });
    }
  } catch (err) {
    // user may have denied, or API unsupported — not fatal
    console.warn('Wake lock unavailable:', err);
  }
}
document.addEventListener('visibilitychange', () => {
  if (started && document.visibilityState === 'visible' && !wakeLock) {
    requestWakeLock();
  }
});

function start() {
  if (started) return;
  started = true;

  // Play preloaded castle door sound instantly
  if (playBtnBuffer) {
    const ctx = new AudioContext();
    ctx.decodeAudioData(playBtnBuffer.slice(0)).then(audioBuf => {
      const src = ctx.createBufferSource();
      src.buffer = audioBuf;
      src.playbackRate.value = 1.6;
      const g = ctx.createGain();
      g.gain.value = 0.16;
      src.connect(g);
      g.connect(ctx.destination);
      src.start(0, 0.15);
    });
  }

  // Hide overlay immediately — level select appears fast since art is deferred
  overlay.classList.add('hidden');
  requestWakeLock();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: CFG.width,
    height: CFG.height,
    backgroundColor: '#0b0f1a',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.NO_CENTER
    },
    scene: [BootScene, LevelSelectScene, GameScene, UIScene, TutorialScene]
  });

  // Hide overlay once GameScene is ready (after "Generating world..." from level select)
  game.events.on('game-ready', () => {
    overlay.classList.add('hidden');
    const landing = document.getElementById('landingPanel');
    if (landing) landing.classList.remove('loading');
  });
}

startBtn.addEventListener('click', start);
