import { GameService } from '../../../app/services/game.service';
import { Juego } from './juego';
import { Mano } from './mano';

export class Partida {
  public puntos: number[] = [0, 0]; // Equipo 1 y Equipo 2
  public limite: number = 12;
  public manoActual: Mano;

  constructor(private juego: Juego, private service: GameService) {
    this.nuevaMano();
  }

  nuevaMano() {
    this.manoActual = new Mano(this.juego, this.service);
  }

  sumarPuntos(equipo: number, cantidad: number) {
    this.puntos[equipo] += cantidad;
    this.service.phaser.emitter.emit('puntosUpdated', this.puntos);
    console.log(`Puntuación: Equipo 1: ${this.puntos[0]} | Equipo 2: ${this.puntos[1]}`);
    
    if (this.puntos[equipo] >= this.limite) {
      console.log(`¡Victoria para el Equipo ${equipo + 1}!`);
      this.service.phaser.emitter.emit('gameOver', { ganador: equipo, puntos: this.puntos });
    }
  }
}
