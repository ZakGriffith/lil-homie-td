import Phaser from 'phaser';
import { generateAllArt, registerAnimations } from '../assets/generateArt';
import towerBaseImg from '../assets/sprites/tower_base.png';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.load.image('t_base_png', towerBaseImg);
  }

  create() {
    generateAllArt(this);
    registerAnimations(this);
    this.scene.start('Game', { playerName: (window as any).__playerName || 'hero' });
    this.scene.launch('UI');
  }
}
