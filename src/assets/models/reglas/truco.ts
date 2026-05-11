import { IJugador } from "../jugadores/jugador";
import { Juego } from "./juego";

export type TrucoEstado = 'NADA' | 'CANTADO' | 'ACEPTADO' | 'RECHAZADO';

export class Truco {
  public estado: TrucoEstado = 'NADA';
  public nivel: number = 1; // 1 (base), 3 (Truco), 6 (Retruco), 9 (Vale Nueve), 12 (Vale Juego)
  public equipoQueCanto: number = -1;
  public equipoConLaPalabra: number = -1; // -1: cualquiera, 0 o 1: equipo que puede subir
  public esperandoRespuesta: boolean = false;

  constructor(private juego: Juego) {}

  /**
   * Registra un canto de Truco o sus aumentos
   */
  registrarCanto(jugador: IJugador, texto: string): boolean {
    const t = texto.toLowerCase();
    let nuevoNivel = this.nivel;
    const equipoActual = jugador.pareja.indice;

    // 1. Validar si puede cantar (posesión)
    if (this.equipoConLaPalabra !== -1 && this.equipoConLaPalabra !== equipoActual) {
      console.warn(`${jugador.nombre} intentó cantar pero no tiene la palabra.`);
      return false;
    }

    // 2. Determinar nuevo nivel
    if (t === 'truco') {
      if (this.nivel >= 3) return false;
      nuevoNivel = 3;
    } else if (t === 'retruco') {
      if (this.nivel !== 3) return false;
      nuevoNivel = 6;
    } else if (t === 'vale nueve' || t === 'vale 9') {
      if (this.nivel !== 6) return false;
      nuevoNivel = 9;
    } else if (t === 'vale juego' || t === 'vale 12') {
      if (this.nivel !== 9) return false;
      nuevoNivel = 12;
    } else {
      return false;
    }

    // 3. Actualizar estado
    this.nivel = nuevoNivel;
    this.estado = 'CANTADO';
    this.equipoQueCanto = equipoActual;
    this.esperandoRespuesta = true;

    console.log(`%c [TRUCO] ${jugador.nombre} cantó ${t.toUpperCase()} (Nivel: ${this.nivel}) `, 'background: #aa0000; color: #fff;');
    
    // Emitir evento para que los demás reaccionen
    this.juego.service.phaser.emitter.emit('trucoCantado', { 
      jugador, 
      nivel: this.nivel,
      texto: t 
    });

    return true;
  }

  /**
   * Registra la respuesta (Quiero / No Quiero)
   */
  registrarRespuesta(jugador: IJugador, respuesta: string): void {
    if (!this.esperandoRespuesta) return;

    const r = respuesta.toLowerCase();
    const equipoResponde = jugador.pareja.indice;

    // Solo el equipo contrario puede responder
    if (equipoResponde === this.equipoQueCanto) return;

    this.esperandoRespuesta = false;

    if (r === 'quiero') {
      this.estado = 'ACEPTADO';
      // La palabra pasa al equipo que aceptó
      this.equipoConLaPalabra = equipoResponde;
      console.log(`%c [TRUCO] Aceptado por ${jugador.nombre}. Palabra para Equipo ${this.equipoConLaPalabra + 1} `, 'color: #00ff00;');
    } else if (r === 'no quiero') {
      this.estado = 'RECHAZADO';
      console.log(`%c [TRUCO] Rechazado por ${jugador.nombre}. `, 'color: #ff0000;');
    }

    this.juego.service.phaser.emitter.emit('trucoRespondido', { 
      jugador, 
      respuesta: r, 
      estado: this.estado 
    });
  }

  /**
   * Puntos a otorgar si se rechaza el canto actual
   */
  puntosAlRechazar(): number {
    switch (this.nivel) {
      case 3: return 1;  // Rechaza Truco -> 1 punto
      case 6: return 3;  // Rechaza Retruco -> 3 puntos
      case 9: return 6;  // Rechaza Vale Nueve -> 6 puntos
      case 12: return 9; // Rechaza Vale Juego -> 9 puntos
      default: return 1;
    }
  }

  /**
   * Puntos al ganar la mano (si fue aceptado)
   */
  puntosAlGanarMano(): number {
    if (this.estado === 'ACEPTADO') {
      return this.nivel;
    }
    return 1; // Valor por defecto de la mano
  }

  /**
   * Traduce el nivel numérico a nombre
   */
  getNombreNivel(n: number = this.nivel): string {
    switch (n) {
      case 3: return 'Truco';
      case 6: return 'Retruco';
      case 9: return 'Vale Nueve';
      case 12: return 'Vale Juego';
      default: return '';
    }
  }

  reset(): void {
    this.estado = 'NADA';
    this.nivel = 1;
    this.equipoQueCanto = -1;
    this.equipoConLaPalabra = -1;
    this.esperandoRespuesta = false;
  }
}
