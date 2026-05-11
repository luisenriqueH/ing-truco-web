import * as Phaser from 'phaser';
import { GameService } from '../../../app/services/game.service';
import { IJugador } from '../jugadores/jugador';
import { IA_Jugador } from '../jugadores/ia_jugador';
import { ICarta } from '../cartas/carta';
import { Juego } from './juego';

export class Mano {
  public vira: ICarta;
  public activa: boolean = false;
  public cartasJugadas: { jugador: IJugador, carta: ICarta }[] = [];
  public rondasGanadas: number[] = [0, 0]; // Equipo 1 y 2
  public rondaActual: number = 0;
  public ganadoresRonda: number[] = []; // -1 para empate, 0 o 1 para equipos

  constructor(private juego: Juego, private service: GameService) { }

  registrarJugada(jugador: IJugador, carta: ICarta) {
    this.cartasJugadas.push({ jugador, carta });
  }

  get esFinDeRonda(): boolean {
    return this.cartasJugadas.length === this.juego.jugadores.length;
  }

  evaluarGanadorRonda(): { jugador: IJugador, carta: ICarta } {
    console.log('%c --- Evaluando Ganador de Ronda --- ', 'background: #333; color: #fff; font-weight: bold;');
    
    let mejorJugada = this.cartasJugadas[0];
    let mejorValor = -1;
    let hayEmpate = false;

    this.cartasJugadas.forEach((j, i) => {
      const valor = this.juego.getValor(j.carta);
      console.log(`[${i}] ${j.jugador.nombre}: ${j.carta.numero} de ${j.carta.pinta} (Valor: ${valor})`);
      
      if (valor > mejorValor) {
        mejorValor = valor;
        mejorJugada = j;
        hayEmpate = false;
      } else if (valor === mejorValor && valor !== -1) {
        // Empate solo si es con un oponente
        if (j.jugador.pareja.indice !== mejorJugada.jugador.pareja.indice) {
          hayEmpate = true;
          mejorJugada = j; // El que parda sale
        }
      }
    });

    let equipoGanadorRonda = -1; // -1 significa empate (parda)

    if (hayEmpate) {
      console.log('%c ¡EMPATE (PARDA)! ', 'background: #555; color: #fff;');
      if (this.rondaActual === 0) {
        // Parda en primera: nadie suma, ganadoresRonda queda con -1
        equipoGanadorRonda = -1;
      } else {
        // Parda en 2da o 3ra: gana el de la primera (regla del usuario)
        const ganadorPrimera = this.ganadoresRonda[0];
        if (ganadorPrimera !== -1) {
          equipoGanadorRonda = ganadorPrimera;
        } else {
          // Si 1ra fue parda y 2da es parda, sigue siendo parda
          equipoGanadorRonda = -1;
        }
      }
    } else {
      equipoGanadorRonda = mejorJugada.jugador.pareja.indice;
    }

    this.ganadoresRonda.push(equipoGanadorRonda);

    // Asignar puntos y verificar victoria de la mano
    if (equipoGanadorRonda !== -1) {
      // Regla: Si 1ra fue parda, ganar la 2da vale por la mano
      if (this.rondaActual === 1 && this.ganadoresRonda[0] === -1) {
        this.rondasGanadas[equipoGanadorRonda] = 2;
      } 
      // Regla: Si 1ra y 2da fueron pardas, ganar la 3ra vale por la mano
      else if (this.rondaActual === 2 && this.ganadoresRonda[0] === -1 && this.ganadoresRonda[1] === -1) {
        this.rondasGanadas[equipoGanadorRonda] = 2;
      }
      else {
        this.rondasGanadas[equipoGanadorRonda]++;
      }
    }

    if (equipoGanadorRonda !== -1) {
      const msg = `Gana Ronda ${this.rondaActual + 1}: ${mejorJugada.jugador.nombre}`;
      this.juego.hablar({ texto: msg });
      console.log(`%c > GANADOR: ${mejorJugada.jugador.nombre} (Equipo ${equipoGanadorRonda + 1}) con ${mejorJugada.carta.numero} de ${mejorJugada.carta.pinta} (Valor: ${mejorValor}) `, 'background: #004400; color: #fff; border: 1px solid #00ff00;');
    } else {
      this.juego.hablar({ texto: `Empate en ronda ${this.rondaActual + 1}` });
      console.log(`%c > EMPATE EN RONDA ${this.rondaActual + 1} `, 'background: #444; color: #fff;');
      // En caso de empate, el que empezó la ronda (la mano) vuelve a empezar
      mejorJugada = this.cartasJugadas[0];
    }

    console.log(`%c Marcador de la Mano: Equipo 1: ${this.rondasGanadas[0]} | Equipo 2: ${this.rondasGanadas[1]} `, 'color: #aaa;');
    
    this.rondaActual++;
    return mejorJugada;
  }

  get esFinDeMano(): boolean {
    return this.rondasGanadas[0] >= 2 || this.rondasGanadas[1] >= 2;
  }

  limpiarRonda() {
    this.cartasJugadas = [];
  }

  async repartir(repartidor?: IJugador) {
    if (this.activa) return;
    this.activa = true;
    this.juego.onJuego = true; // Sincronización con el estado global

    if (repartidor) {
      this.juego.dealer = repartidor;
    }

    const indices = Phaser.Utils.Array.NumberArray(0, 39);
    Phaser.Utils.Array.Shuffle(indices);

    const dealer = this.juego.dealer || this.juego.jugadores[0];
    const numJugadores = this.juego.jugadores.length;

    // Fase 1: Reparto de 12 cartas
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < numJugadores; j++) {
        const index = (dealer.indice + 1 + j) % numJugadores;
        const jugador = this.juego.jugadores[index];

        const cardIndex = indices.pop();
        const carta = this.juego.baraja.sacar(cardIndex);
        if (carta) {
          carta.tapar(); // Tapar antes de que empiece a volar
          const dy = i * 20 * this.service.escala;
          const vector = jugador.setAngle(new Phaser.Math.Vector2(0, dy));
          await jugador.dragAuto(carta, { x: vector.x, y: vector.y }, jugador.mesa.zone);
        }
      }
    }

    // Fase 2: Mover el mazo
    const offset = dealer.setAngle(new Phaser.Math.Vector2(260 * this.service.escala, 200 * this.service.escala));
    const deckX = offset.x;
    const deckY = offset.y;

    await new Promise<void>((resolve) => {
      this.juego.baraja.tween({ x: deckX, y: deckY }, 600, undefined, () => resolve());
    });

    // Fase 3: Revelar la Vira
    const viraIndex = indices.pop();
    const vira = this.juego.baraja.sacar(viraIndex);
    if (vira) {
      vira.destapar();
      const rotation = dealer.rotation * (180 / Math.PI);
      await new Promise<void>((resolve) => {
        vira.tween({ x: deckX, y: deckY, rotation: rotation * (Math.PI / 180) }, 500, undefined, () => {
          this.service.vira = vira;
          this.vira = vira;
          resolve();
        });
      });
      this.juego.baraja.children.each((c: any) => c.setAngle(rotation + 30));
    }

    // Fase 4: Finalización del reparto y inicio de juego
    this.activa = false;
    this.juego.onJuego = false;
    console.log('%c --- REPARTO FINALIZADO --- ', 'background: #004400; color: #ffffff; font-weight: bold;');
    this.juego.start();

    // Esperar a que las IAs recojan
    const recoverPromises = this.juego.jugadores.map(j => {
      if (j.tipo === 'ia') {
        return (j as IA_Jugador).decidirRecuperar();
      }
      return Promise.resolve();
    });

    Promise.all(recoverPromises).then(() => {
      const manoIndice = (dealer.indice + 1) % this.juego.jugadores.length;
      this.juego.turno.set(manoIndice);
      this.service.phaser.emitter.emit('repartoFinished');
    });
  }
}
