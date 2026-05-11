import { Injectable } from '@angular/core';
import { IngJuego } from '../../assets/models';
import * as Phaser from 'phaser';
import { Main } from '../game/scenes/main';
import { GUIScene } from '../game/scenes/gui';
import { TestAIScene } from '../game/scenes/test_ai';
import { IJugador } from '../models/jugadores';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private game: Phaser.Game | undefined;

  public naipes: string = 'naipes-gemini-0';//'naipes1';
  public escala: number = 1;
  public area: number = 100;
  public main: Main;
  local: IJugador;
  juego: any; // Instancia real de la lógica de juego
  vira: any;

  public testMode: boolean = false;
  public data: any = {
    userID: 'Player',
    PC: false,
    juego: null
  };

  public phaser: any = {
    screen: { w: 800, h: 600 },
    emitter: null
  };

  constructor() { }

  initGame(containerId: string) {
    this.phaser.emitter = new Phaser.Events.EventEmitter();
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerId,
      transparent: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: []
    };

    if (this.game) {
      this.game.destroy(true);
    }
    this.game = new Phaser.Game(config);
    this.game.events.once('ready', () => {
      this.game.scene.add('main', Main, false);
      this.game.scene.add('test_ai', TestAIScene, false);
      this.game.scene.add('gui', GUIScene, false);
      
      const startScene = this.testMode ? 'test_ai' : 'main';
      console.log('Starting scene:', startScene);
      
      this.game.scene.start(startScene, { service: this });
      this.game.scene.start('gui', { service: this });
    });
  }

  destroyGame() {
    if (this.game) {
      this.game.destroy(true);
      this.game = undefined;
    }
  }
}
