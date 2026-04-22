/**
 * Sound effects manager.
 *
 * Drop WAV/MP3/OGG files into public/audio/ and map them below.
 * Any sound without a file falls back to a jsfxr-generated tone.
 *
 * File naming convention:  public/audio/<key>.wav  (e.g. public/audio/arrowShoot.wav)
 */
import { sfxr } from 'jsfxr';

// ---- Sound keys the game uses ----
const SFX_KEYS = [
  'arrowShoot',   // player & arrow tower fires
  'cannonShoot',  // cannon tower fires
  'hit',          // enemy takes damage
  'coin',         // coin collected
  'towerPlace',   // tower built
  'wallPlace',    // wall placed
  'boom',         // cannon splash explosion
  'bossSpawn',    // boss appears
  'playerHurt',   // player takes damage
  'upgrade',      // tower upgraded
  'victory',      // game won
  'gameOver',     // game lost
  'click',        // UI button click
] as const;

export type SfxKey = typeof SFX_KEYS[number];

// ---- Audio files: map key → path under public/ ----
// When you drop a file into public/audio/, add it here.
// Supported formats: .wav, .mp3, .ogg
const AUDIO_FILES: Partial<Record<SfxKey, string>> = {
  arrowShoot: '/audio/arrow_1.wav',
  // cannonShoot: '/audio/cannonShoot.wav',
  hit: '/audio/arrowhit.wav',
  // coin: '/audio/coin.wav',
  // towerPlace: '/audio/towerPlace.wav',
  // wallPlace: '/audio/wallPlace.wav',
  // boom: '/audio/boom.wav',
  // bossSpawn: '/audio/bossSpawn.wav',
  // playerHurt: '/audio/playerHurt.wav',
  // upgrade: '/audio/upgrade.wav',
  // victory: '/audio/victory.wav',
  // gameOver: '/audio/gameOver.wav',
  // click: '/audio/click.wav',
};

// ---- jsfxr fallbacks (b58 encoded) for sounds without a file ----
const FALLBACKS: Partial<Record<SfxKey, string>> = {
  arrowShoot:  '7BMHBGKeaSRzutqux35L2nmieBVFHEcyT4QbJ5wDG18HBTGWqmQjdmTadfaCUnpdTSdp946i84nRdcFDxXiHn7RgQ7aoRe8GbZzz2JmWDYufW4eQBQb3Gv8u1',
  cannonShoot: '12eZRSDW9BMogwNAtzYnLSRoy3YwZx6LxmvDVzyRESygjypkNZbnJsttfvpVtet95EpujKgmAYxtqRHddt5TDH7n6g4wjx2qmx8Szk3YFba8fmPKJRa41VF1yZ',
  hit:         '12eZRSDGK2a8nkE7ocbPN2Zfn34PjaBUS2KFypdmt2hBhWtcRfVMabfr2MCGEaj2op9XeKw5NELanteLuMhsgRQVeCwJJsNdEiAj55sMwroNS8kJ8rpm8AQgRD',
  coin:        '12eZRSDGK26xo5kBkd8Vub98beAMXRQtxoauUbjGCQn4NdFX7wByAhBptA1YSe5eo9gMtnBZonoMd9xgP1Jak9V5DpvZGbhDyvwPyFnCGjNZSus9ZhRDgsjqYj',
  towerPlace:  '7BMHBGG45s3FvKh6FzS7kZfiABdTAz9MnSYVcFhuDwCxHSywhwSyjDxrPJrV3FA74MLDseKvrHTGsAcCa3vBYDuASRXVABXboaWqYT8joRuAUoYGFeeLGtrt7',
  wallPlace:   '12eZRSDGK2a8ncanb4HHKxEkayTgXz1bEGVRiT35nZXFBk38k5xYdmjADDLNFnMEJPG2gYFCMuHcepZzUbEKmhs6E6CM6oHRi7isDz48fB1m5WcUuAYrdGnHj5',
  boom:        '12eZRSDRnjsSkoovj21LDvGd5SbDnrfDbsaxdmMRaT3XK9Qa8jgXdTSa1MaBys6CgmNjtff7futsPfmfcRpWTZUnXr2TWv2gdboDKZmc6GTpUZxc97qpXJWtyD',
  bossSpawn:   '12eZRSDSVRrD67KRceReSAHfH5R3pqU9JuRJpxZuQ1eMG9Fn1aSWE8wmnE3HgvjZiNptQo2zpHgj9fqofhSaDFuEok9jcFWnVvN3cW1iDBbN4qzVuw8gJNnhKM',
  playerHurt:  '12eZRSDGK26xkrJpNakcz4XTrH1g68EjAXHgAYGhaSMTiyy9kWZ2K1zGM4jjXyKhWXTYXmWo5n7nUEYm22Y12WbJfAHpY4VD37Va7qctx3UbXNTnEyTC9CP2EB',
  upgrade:     '12eZRSDGK2a8oJayiANNjieJrb5utu7mU5pXPmFYAyZsFk7CFbvQi2UfkbzVyufe8uDNMkzwLj6knu3YZ5YL7WJNdH4mrfgKjcPtjKPJJgKaH3PfLnEbVpWw2w',
  victory:     '12eZRSDSVRrD4ighYdxUJtJhbVM7kzBaESDDXD9y9c3gB9aqm7KCQmne61TQrJLPbeVZ55B9tgz9FcmqdQGuWbneGcgGAzT38WkhBUNh5tjysbwgkjcuPkTP51',
  gameOver:    '12eZRSDW9BpyimpJ2g3CzvFeX7gYUb8STeQhqTheS6kbAXPHtF43iMHM4X4FDyt6hu2Gpiiz5scgQdCbp1Kd9YLifs2Xp7PKJhDZqHPZAsDXZesN5w4R7vko6X',
  click:       '12eZRSDGK26xi4WWw9ZffiyueaRQghYobqM2dciN5v7g8DwPyeyPubN97B65TQfA7E61VLevFC7d7LadNohdshb89bbabfsmQqkJCzWkmKGKLFN2Zqubx1N3eo',
};

// ---- Manager ----
class SfxManager {
  /** Pre-decoded AudioBuffers for instant playback */
  private buffers: Partial<Record<SfxKey, AudioBuffer>> = {};
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private _volume = 0.35;
  private _muted = false;
  private lastPlayed: Partial<Record<SfxKey, number>> = {};
  private cooldowns: Partial<Record<SfxKey, number>> = {
    hit: 80,
    coin: 50,
    arrowShoot: 60,
    cannonShoot: 100,
    wallPlace: 80,
  };

  /** Call once at boot. Preloads all audio into AudioBuffers for zero-latency playback. */
  async init() {
    this.ctx = new AudioContext();
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this._volume;
    this.gainNode.connect(this.ctx.destination);

    const loads: Promise<void>[] = [];
    for (const key of SFX_KEYS) {
      const filePath = AUDIO_FILES[key];
      if (filePath) {
        loads.push(this.loadFile(key, filePath));
      } else {
        const b58 = FALLBACKS[key];
        if (b58) this.loadSfxr(key, b58);
      }
    }
    await Promise.all(loads);
  }

  private async loadFile(key: SfxKey, path: string) {
    try {
      const resp = await fetch(path);
      const arrayBuf = await resp.arrayBuffer();
      this.buffers[key] = await this.ctx!.decodeAudioData(arrayBuf);
    } catch (e) {
      console.warn(`SFX: failed to load ${path}, falling back to synth`);
      const b58 = FALLBACKS[key];
      if (b58) this.loadSfxr(key, b58);
    }
  }

  private loadSfxr(key: SfxKey, b58: string) {
    const samples = sfxr.toBuffer(b58);
    if (!samples || samples.length === 0) return;
    const buf = this.ctx!.createBuffer(1, samples.length, 44100);
    const channel = buf.getChannelData(0);
    for (let i = 0; i < samples.length; i++) channel[i] = (samples[i] - 128) / 128;
    this.buffers[key] = buf;
  }

  /** Play a sound effect. Uses Web Audio API for instant playback. */
  play(key: SfxKey) {
    if (this._muted || !this.ctx || !this.gainNode) return;
    const buf = this.buffers[key];
    if (!buf) return;

    const now = performance.now();
    const cd = this.cooldowns[key] ?? 0;
    if (cd > 0) {
      const last = this.lastPlayed[key] ?? 0;
      if (now - last < cd) return;
    }
    this.lastPlayed[key] = now;

    // Resume context if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.connect(this.gainNode);
    source.start(0);
  }

  get volume() { return this._volume; }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.gainNode) this.gainNode.gain.value = this._volume;
  }

  get muted() { return this._muted; }
  set muted(m: boolean) { this._muted = m; }

  toggle() { this._muted = !this._muted; }
}

/** Global SFX singleton — call SFX.init() once at boot, then SFX.play('key') anywhere. */
export const SFX = new SfxManager();
