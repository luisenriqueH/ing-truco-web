import { Injectable } from '@angular/core';
import { IngJuego } from 'src/assets/models';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  
  public naipes: string = 'naipes'; // Default naipe atlas name
  public escala: number = 1;
  public main: any; // Reference to Phaser Main Scene
  
  public data: any = {
    userID: 'Player',
    PC: false,
    juego: null
  };

  public phaser: any = {
    screen: { w: 800, h: 600 },
    emitter: null // Will be initialized with Phaser Emitter
  };

  public gameComponent: any = {
    onCreate: () => { console.log('GameComponent.onCreate called'); }
  };

  public local: any = {
    ver: (i: number, yes: boolean) => { console.log('Local.ver called', i, yes); }
  };

  constructor() { }
}
