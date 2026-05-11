import { IJugador } from "../jugadores/jugador";
import { ICarta } from "../cartas/carta";
import { Juego } from "./juego";
import { IA_Jugador } from "../jugadores/ia_jugador";

export class Envido {
  constructor(private juego: Juego) {}

  /**
   * Identifica si una carta es una pieza (Perico/Perica)
   */
  esPieza(carta: ICarta): boolean {
    return this.juego.esPieza(carta);
  }

  /**
   * Normaliza los nombres de las cartas para comparaciones
   */
  normalize(val: string): string {
    const dict: { [key: string]: string } = { 
      'as': '1', 'uno': '1', 
      'dos': '2', 'tres': '3', 'cuatro': '4', 'cinco': '5', 'seis': '6', 'siete': '7',
      'sota': '10', 'diez': '10', 'caballo': '11', 'once': '11', 'rey': '12', 'doce': '12' 
    };
    return dict[val.toLowerCase()] || val.toLowerCase();
  }

  /**
   * Calcula los puntos de Envido o Flor para un jugador
   */
  calcularPuntos(jugador: IJugador): number {
    const cartas = [...(jugador.enMano || []), ...(jugador.mesa?.cartas || [])];
    if (cartas.length < 3) return 0;

    const piezas = cartas.filter(c => this.esPieza(c));
    const noPiezas = cartas.filter(c => !this.esPieza(c));

    const getValorCarta = (c: ICarta) => {
      const n_norm = this.normalize(c.numero);
      const n_num = parseInt(n_norm);
      return (n_num < 10) ? n_num : 0;
    };

    const getValorPieza = (c: ICarta) => {
      const vira = this.juego.vira;
      if (!vira) return 0;
      
      const vn_norm = this.normalize(vira.numero);
      const n_norm = this.normalize(c.numero);
      
      let perico = '11';
      if (vn_norm === '11') perico = '12';

      return (n_norm === perico) ? 30 : 29;
    };

    // Caso 1: Tiene piezas
    if (piezas.length > 0) {
      let ptsPiezas = piezas.reduce((acc, p) => acc + getValorPieza(p), 0);
      
      if (piezas.length === 1) {
        // 1 pieza + las otras dos si son del mismo palo
        if (noPiezas.length === 2 && noPiezas[0].pinta.toLowerCase() === noPiezas[1].pinta.toLowerCase()) {
          return ptsPiezas + getValorCarta(noPiezas[0]) + getValorCarta(noPiezas[1]);
        }
        return ptsPiezas + Math.max(getValorCarta(noPiezas[0]), getValorCarta(noPiezas[1]));
      } else {
        // 2 o 3 piezas
        return ptsPiezas + (noPiezas.length > 0 ? getValorCarta(noPiezas[0]) : 0);
      }
    }

    // Caso 2: No tiene piezas, buscar Envido normal (2 del mismo palo)
    const conteo: { [key: string]: ICarta[] } = { oro: [], copa: [], espada: [], basto: [] };
    cartas.forEach(c => conteo[c.pinta.toLowerCase()]?.push(c));

    let maxEnvido = 0;
    for (const pinta in conteo) {
      const grupo = conteo[pinta];
      if (grupo.length >= 2) {
        // Envido de 2 o 3 cartas (Flor sin piezas)
        const sorted = grupo.map(c => getValorCarta(c)).sort((a, b) => b - a);
        const pts = 20 + sorted[0] + sorted[1];
        if (pts > maxEnvido) maxEnvido = pts;
      }
    }

    // Si no hay nada del mismo palo, el mejor valor individual
    if (maxEnvido === 0) {
      maxEnvido = Math.max(...cartas.map(c => getValorCarta(c)));
    }

    return maxEnvido;
  }

  /**
   * Verifica si el jugador tiene una Flor válida (con Favor del Rey)
   */
  tieneFlor(jugador: IJugador): boolean {
    const cartas = [...(jugador.enMano || []), ...(jugador.mesa?.cartas || [])];
    if (cartas.length < 3) return false;

    let comodines = 0;
    const conteo: { [key: string]: number } = { oro: 0, copa: 0, espada: 0, basto: 0 };

    cartas.forEach(c => {
      if (this.esPieza(c)) {
        comodines++;
      } else {
        const p = c.pinta.toLowerCase();
        if (conteo[p] !== undefined) conteo[p]++;
      }
    });

    // Una Flor es válida si (cartas del mismo palo + comodines) >= 3
    for (const pinta in conteo) {
      if (conteo[pinta] + comodines >= 3) return true;
    }

    // Caso especial: 3 comodines (aunque la lógica de arriba ya lo cubre 0 + 3 >= 3)
    if (comodines >= 3) return true;

    return false;
  }

  /**
   * Maneja el registro de cantos (Flor/Envido)
   */
  registrarCanto(jugador: IJugador, texto: string) {
    const t = texto.toLowerCase();
    if (t === 'flor') {
      this.juego.floresCantadas.add(jugador.indice);
    } else if (t === 'envido') {
      this.juego.envidoEstado = 'CANTADO';
      this.juego.equipoQueCantoEnvido = jugador.pareja.indice;
    }
  }

  /**
   * Resuelve la fase de Envido y Flor al final de la mano
   */
  async resolver(): Promise<void> {
    console.log('%c --- RESOLVIENDO ENVIDO Y FLOR (Módulo Envido) --- ', 'background: #004488; color: #fff;');
    
    const dealerIdx = this.juego.dealer.indice;
    const numJugadores = this.juego.jugadores.length;
    let mejorPuntajeFlor = -1;
    let ganadorFlor: IJugador | null = null;
    let floresMostradas: IJugador[] = [];

    // 1. Fase de Flores
    if (this.juego.floresCantadas.size > 0) {
      for (let i = 0; i < numJugadores; i++) {
        const idx = (dealerIdx + 1 + i) % numJugadores;
        const jugador = this.juego.jugadores[idx];
        
        if (this.juego.floresCantadas.has(jugador.indice)) {
          let quiereMostrar = false;
          const pts = this.calcularPuntos(jugador);
          const esValida = this.tieneFlor(jugador);

          const preguntar = (texto: string): Promise<boolean> => {
            return new Promise(resolve => {
              this.juego.service.phaser.emitter.emit('mostrarPregunta', { texto, callback: resolve });
            });
          };

          if (jugador.tipo === 'ia') {
            quiereMostrar = true; 
          } else {
            quiereMostrar = await preguntar(`Tienes Flor (${pts} pts). ¿Deseas mostrarla para sumar puntos?`);
          }

          if (quiereMostrar && esValida) {
            floresMostradas.push(jugador);
            await jugador.hablar(`¡Aquí está mi Flor! (${pts})`);
            if (pts > mejorPuntajeFlor) {
              mejorPuntajeFlor = pts;
              ganadorFlor = jugador;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else if (quiereMostrar) {
             await jugador.hablar("Mi flor no es válida o me equivoqué...");
          } else {
             await jugador.hablar("Paso de mostrar mi flor");
          }
        }
      }

      if (floresMostradas.length > 0) {
        const equiposConFlor = new Set(floresMostradas.map(j => j.pareja.indice));
        if (equiposConFlor.size === 1) {
          const ganador = floresMostradas[0];
          await this.juego.hablar({ texto: `¡Flor para el equipo de ${ganador.nombre}! (+3)`, jugador: ganador });
          this.juego.partida.sumarPuntos(ganador.pareja.indice, 3);
        } else {
          if (ganadorFlor) {
            await this.juego.hablar({ texto: `¡Gana la mejor Flor: ${ganadorFlor.nombre}! (+6)`, jugador: ganadorFlor });
            this.juego.partida.sumarPuntos(ganadorFlor.pareja.indice, 6);
          }
        }
        this.juego.envidoEstado = 'NADA';
        return;
      }
    }

    // 2. Fase de Envido Normal
    if (this.juego.envidoEstado === 'NADA') return;
    if (this.juego.envidoEstado === 'RECHAZADO') return;

    let mejorPuntaje = -1;
    let ganadorEnvido: IJugador | null = null;
    let alguienMostro = false;

    for (let i = 0; i < numJugadores; i++) {
      const idx = (dealerIdx + 1 + i) % numJugadores;
      const jugador = this.juego.jugadores[idx];
      const pts = this.calcularPuntos(jugador);
      
      let quiereMostrar = false;
      if (jugador.tipo === 'ia') {
        quiereMostrar = await (jugador as IA_Jugador).decidirMostrarEnvido(mejorPuntaje);
      } else {
        const preguntar = (texto: string): Promise<boolean> => {
          return new Promise(resolve => {
            this.juego.service.phaser.emitter.emit('mostrarPregunta', { texto, callback: resolve });
          });
        };
        const msg = this.juego.envidoEstado === 'ACEPTADO' ? 
          `¿Quieres mostrar tus ${pts} puntos para el Envido?` : 
          `No se cantó envido. ¿Deseas mostrar tus ${pts} puntos de todas formas?`;
        quiereMostrar = await preguntar(msg);
      }

      if (quiereMostrar) {
        alguienMostro = true;
        await jugador.hablar(`Tengo ${pts}`);
        if (pts > mejorPuntaje) {
          mejorPuntaje = pts;
          ganadorEnvido = jugador;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        await jugador.hablar("Paso");
      }
    }

    if (ganadorEnvido && alguienMostro) {
      const ptsASumar = this.juego.envidoEstado === 'ACEPTADO' ? 2 : 1;
      await this.juego.hablar({ texto: `¡Gana el Envido ${ganadorEnvido.nombre} con ${mejorPuntaje}! (+${ptsASumar})`, jugador: ganadorEnvido });
      this.juego.partida.sumarPuntos(ganadorEnvido.pareja.indice, ptsASumar);
    }
    
    this.juego.envidoEstado = 'NADA';
  }
}
