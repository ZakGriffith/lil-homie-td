declare module 'jsfxr' {
  interface SfxrParams {
    sound_vol: number;
    [key: string]: any;
  }
  interface SfxrWave {
    dataURI: string;
    header: any;
    wav: any;
  }
  interface Sfxr {
    generate(preset: string): SfxrParams;
    toAudio(sound: SfxrParams | string): HTMLAudioElement;
    toWave(sound: SfxrParams | string): SfxrWave;
    toBuffer(sound: SfxrParams | string): number[];
    b58encode(sound: SfxrParams): string;
    b58decode(str: string): SfxrParams;
    play(sound: SfxrParams | string): void;
  }
  export const sfxr: Sfxr;
  export const jsfxr: { sfxr: Sfxr };
  export default jsfxr;
}
