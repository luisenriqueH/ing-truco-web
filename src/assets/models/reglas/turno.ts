import { GameService } from '../../../app/services/game.service';
import { IA_Jugador } from '../jugadores/ia_jugador';
import { Juego } from './juego';

export class Turno {
  public actual: number = 0;

  constructor(private juego: Juego, private service: GameService) {}

  set(indice: number) {
    // 1. GUARDIA: Si hay un Truco esperando respuesta, no activar el turno de juego
    if (this.juego.truco.esperandoRespuesta) {
      console.log(`%c [TURNO] Pausado - Esperando respuesta de Truco `, 'color: #aaa;');
      this.actual = indice; // Guardamos quién debería jugar para cuando se reanude
      return;
    }

    const proximo = this.juego.jugadores[indice];
    console.log(`%c > Turno de: ${proximo.nombre} (ID: ${indice}) `, 'background: #222; color: #bada55; font-weight: bold;');

    this.juego.jugadores.forEach((j, i) => j.setHighlight(i === indice));
    this.actual = indice;
    this.service.phaser.emitter.emit('turnoChanged', indice);

    if (proximo.tipo === 'ia') {
      this.juego.ejecutarTurnoIA(proximo as IA_Jugador);
    }
  }

  proximo() {
    const siguiente = (this.actual + 1) % this.juego.jugadores.length;
    this.set(siguiente);
  }
}
