import { Injectable } from '@angular/core';
import { IngJuego } from '../../assets/models';
import * as Phaser from 'phaser';
import { Main } from '../game/scenes/main';
import { TestAIScene } from '../game/scenes/test_ai';
import { IJugador } from '../models/jugadores';
import { CreditService } from './credit.service';

export const DEFAULT_CHARACTERS = [
  {
    nombre: "Don Juan",
    estilo: "Estratega y calmado",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.4, paciencia: 0.8, bluff: 0.3, inteligencia: 0.8 }
  },
  {
    nombre: "Doña María",
    estilo: "Calculadora y lenta",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.2, paciencia: 0.9, bluff: 0.2, inteligencia: 0.9 }
  },
  {
    nombre: "El Catire",
    estilo: "Arriesgado",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.7, paciencia: 0.3, bluff: 0.8, inteligencia: 0.5 }
  },
  {
    nombre: "El Chamo",
    estilo: "Equilibrado",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.5, paciencia: 0.5, bluff: 0.4, inteligencia: 0.6 }
  },
  {
    nombre: "El General",
    estilo: "Autoritario",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.8, paciencia: 0.4, bluff: 0.5, inteligencia: 0.7 }
  },
  {
    nombre: "El Gocho",
    estilo: "Paciente y analítico",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.3, paciencia: 0.9, bluff: 0.2, inteligencia: 0.8 }
  },
  {
    nombre: "La Catira",
    estilo: "Impulsiva y rápida",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.9, paciencia: 0.2, bluff: 0.6, inteligencia: 0.4 }
  },
  {
    nombre: "La Flaca",
    estilo: "Muy impaciente",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.8, paciencia: 0.1, bluff: 0.7, inteligencia: 0.3 }
  }
];

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private game: Phaser.Game | undefined;

  public isMuted: boolean = localStorage.getItem('truco_muted') === 'true';
  public autoDealer: boolean = localStorage.getItem('truco_auto_dealer') === 'true';
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

  public characters: any[] = [];
  public selectedIAs: any[] = [];

  constructor(public credit: CreditService) { }

  async loadCharacters(): Promise<any[]> {
    try {
      const response = await fetch('/api/characters');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          this.characters = data;
          localStorage.setItem('truco_characters', JSON.stringify(data));
          return data;
        }
      }
    } catch (e) {
      console.warn('API /api/characters failed, trying localStorage...', e);
    }

    const localData = localStorage.getItem('truco_characters');
    if (localData) {
      try {
        this.characters = JSON.parse(localData);
        return this.characters;
      } catch (e) {
        console.error('Error parsing localStorage characters', e);
      }
    }

    // Default fallback
    this.characters = JSON.parse(JSON.stringify(DEFAULT_CHARACTERS));
    localStorage.setItem('truco_characters', JSON.stringify(this.characters));
    return this.characters;
  }

  async saveCharacter(character: any): Promise<boolean> {
    const idx = this.characters.findIndex(c => c.nombre === character.nombre);
    if (idx !== -1) {
      this.characters[idx] = character;
    }
    localStorage.setItem('truco_characters', JSON.stringify(this.characters));

    try {
      const response = await fetch('/api/characters/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(character)
      });
      if (response.ok) {
        console.log(`Character ${character.nombre} saved to server.`);
        return true;
      }
    } catch (e) {
      console.warn(`Could not save character ${character.nombre} to server (local environment fallback)`, e);
    }
    return false;
  }

  async initGame(containerId: string) {
    this.phaser.emitter = new Phaser.Events.EventEmitter();

    // Cargar personajes y seleccionar 3
    if (!this.characters || this.characters.length === 0) {
      await this.loadCharacters();
    }
    const pool = [...this.characters];
    this.selectedIAs = [];
    for (let i = 0; i < 3; i++) {
      if (pool.length === 0) break;
      const idx = Math.floor(Math.random() * pool.length);
      this.selectedIAs.push(pool.splice(idx, 1)[0]);
    }

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

      const startScene = this.testMode ? 'test_ai' : 'main';
      console.log('Starting scene:', startScene);

      this.game.scene.start(startScene, { service: this });
    });
  }

  destroyGame() {
    if (this.game) {
      this.game.destroy(true);
      this.game = undefined;
    }
  }
}
