import { GameService } from "src/app/services/game.service";
import { Jugador } from "./jugador";
import { ICarta } from "../cartas/carta";

export interface PersonajeIA {
  nombre: string;
  estilo: string;
  partidasJugadas: number;
  partidasGanadas: number;
  xp: number;
  stats: {
    agresividad: number;
    paciencia: number;
    bluff: number;
    inteligencia: number;
  };
}

export const CATALOGO_IA: PersonajeIA[] = [
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

export class IA_Jugador extends Jugador {

  public personaje: PersonajeIA;

  constructor(service: GameService, personaje: PersonajeIA, indice: number) {
    super(service, personaje.nombre, indice);
    this.personaje = personaje;
    this.tipo = 'ia';

    // Escuchar evento para iniciar el conteo (asegurar reacción en IA)
    this.service.phaser.emitter.on('contarPuntosStarted', () => {
      console.log(`%c [IA-LOG] ${this.nombre} detecta inicio de conteo `, 'color: #00ff00;');
      this.onContarPuntos();
    });

    // Reaccionar al fin de la mano: Solo el repartidor inicia el conteo
    this.service.phaser.emitter.on('manoFinished', async () => {
      if (this.juego.dealer === this) {
        // Si la partida ya terminó, no contar puntos
        const p = this.juego.partida;
        if (p.puntos[0] >= p.limite || p.puntos[1] >= p.limite) {
          console.log(`%c [IA-DEALER] Partida terminada. No se inicia el conteo. `, 'color: #ff4444;');
          return;
        }

        const delay = (this.personaje.stats.inteligencia) * 3000 + 1000;
        console.log(`%c ${this.nombre} (IA Dealer) esperará ${Math.round(delay)}ms para iniciar el conteo... `, 'color: #888;');
        await new Promise(resolve => setTimeout(resolve, delay));

        // Doble chequeo tras la espera
        if (p.puntos[0] >= p.limite || p.puntos[1] >= p.limite) return;
        this.juego.contarPuntos();
      }
    });

  }

  calcularOpinionEnvido(): string {
    const pts = this.juego.envido.calcularPuntos(this);
    const agresividad = this.personaje.stats.agresividad;
    const bluff = this.personaje.stats.bluff;

    // Umbral de decisión adaptado a las estadísticas
    const threshold = 25 - (agresividad * 4) - (bluff * 3);
    const respuesta = pts >= threshold ? 'quiero' : 'no quiero';

    console.log(`%c [IA-OPINION-ENVIDO] ${this.nombre}: ${respuesta.toUpperCase()} (${pts} pts, threshold: ${threshold.toFixed(1)}) `, 'color: #ffaa00;');
    return respuesta;
  }

  calcularOpinionTruco(): string {
    const cards = this.enMano;
    const hasPiece = cards.some(c => this.juego.esPieza(c));
    const maxVal = cards.length > 0 ? Math.max(...cards.map(c => this.juego.getValor(c, true))) : 0;
    const agresividad = this.personaje.stats.agresividad;
    const bluff = this.personaje.stats.bluff;
    const inteligencia = this.personaje.stats.inteligencia;

    let quiero = false;

    if (hasPiece) {
      quiero = true; // Con pieza siempre queremos
    } else if (maxVal >= 40) { // Un 3, 2 o mejor
      quiero = true;
    } else {
      // Si no tiene buenas cartas, depende de agresividad, bluff, y nivel
      const nivel = this.juego.truco.nivel;
      let prob = (agresividad * 0.3) + (bluff * 0.3);
      if (nivel > 3) {
        prob *= (1 - inteligencia); // Más prudentes en Retruco o superior
      }
      quiero = Math.random() < prob;
    }

    const respuesta = quiero ? 'quiero' : 'no quiero';
    console.log(`%c [IA-OPINION-TRUCO] ${this.nombre}: ${respuesta.toUpperCase()} `, 'color: #ffaa00;');
    return respuesta;
  }

  // Lógica para cantar Envido proactivamente
  async decidirCantarEnvidoProactivo(): Promise<string | null> {
    const mano = this.juego.partida.manoActual;
    if (!this.juego.manoEnCurso) return null;

    const tieneFlorPropia = this.juego.envido.tieneFlor(this);
    const algunaFlorCantada = this.juego.floresCantadas.size > 0;
    const teamsWithFlor = Array.from(this.juego.floresCantadas).map(idx => this.juego.jugadores[idx].pareja.indice);
    const bothTeamsHaveFlor = teamsWithFlor.includes(0) && teamsWithFlor.includes(1);

    if (mano.rondaActual === 0) {
      if (tieneFlorPropia || algunaFlorCantada || this.juego.envidoEstado !== 'NADA') {
        return null;
      }

      const pts = this.juego.envido.calcularPuntos(this);
      const agresividad = this.personaje.stats.agresividad;
      const bluff = this.personaje.stats.bluff;

      // Si tiene muy buenos puntos, canta envido
      if (pts >= 26) {
        return 'envido';
      }
      // Si tiene puntos decentes (20-25), canta según agresividad
      if (pts >= 20 && Math.random() < agresividad) {
        return 'envido';
      }
      // Bluff: si tiene pocos puntos, pero alto bluff/agresividad
      if (pts < 20 && Math.random() < (bluff * agresividad * 0.2)) {
        console.log(`%c [IA-BLUFF] ${this.nombre} decide cantar Envido de farol con ${pts} pts `, 'color: #ff00ff;');
        return 'envido';
      }
    } else if (mano.rondaActual === 1) {
      // Envido de Flores: solo si ambos equipos tienen Flor
      if (bothTeamsHaveFlor && this.juego.envidoEstado === 'NADA') {
        const pts = this.juego.envido.calcularPuntos(this);
        const agresividad = this.personaje.stats.agresividad;
        if (pts >= 33 || (pts >= 28 && Math.random() < agresividad)) {
          return 'envido';
        }
      }
    }

    return null;
  }

  // Lógica para cantar Truco proactivamente
  async decidirCantarTrucoProactivo(): Promise<string | null> {
    // Guardia: si la mano ya terminó, no cantar
    if (!this.juego.manoEnCurso) return null;

    const t = this.juego.truco;
    if (t.esperandoRespuesta) return null;

    const equipoLocal = this.pareja.indice;
    if (t.nivel >= 12 || (t.equipoConLaPalabra !== -1 && t.equipoConLaPalabra !== equipoLocal)) {
      return null;
    }

    const cards = this.enMano;
    if (cards.length === 0) return null;

    const maxVal = Math.max(...cards.map(c => this.juego.getValor(c, true)));
    const hasPiece = cards.some(c => this.juego.esPieza(c));
    const agresividad = this.personaje.stats.agresividad;
    const bluff = this.personaje.stats.bluff;
    const paciencia = this.personaje.stats.paciencia;

    let proximoNivel = 3;
    if (t.nivel === 3) proximoNivel = 6;
    else if (t.nivel === 6) proximoNivel = 9;
    else if (t.nivel === 9) proximoNivel = 12;
    const textoTruco = t.getNombreNivel(proximoNivel).toLowerCase();

    // Con pieza o carta muy fuerte, cantamos
    if (hasPiece || maxVal >= 60) {
      const ronda = this.juego.partida.manoActual.rondaActual;
      if (ronda > 0 || Math.random() < (agresividad + (1 - paciencia)) / 2) {
        return textoTruco;
      }
    }

    // Mano promedio aceptable
    const avgVal = cards.reduce((acc, c) => acc + this.juego.getValor(c, true), 0) / cards.length;
    if (avgVal >= 30 && Math.random() < agresividad * 0.4) {
      return textoTruco;
    }

    // Bluff de Truco
    if (Math.random() < (bluff * agresividad * 0.15)) {
      console.log(`%c [IA-BLUFF] ${this.nombre} decide cantar ${textoTruco.toUpperCase()} de farol `, 'color: #ff00ff;');
      return textoTruco;
    }

    return null;
  }

  // Lógica para recuperar la baraja de la mesa
  async decidirRecuperar() {
    if (this.juego.onJuego) return;

    const cartasEnMesa = this.mesa.cartas.length;
    const cartasEnMano = this.enMano.length;

    if (cartasEnMesa > 0 && cartasEnMano === 0) {
      console.log(`${this.nombre} ve ${cartasEnMesa} cartas en su mesa. Decidiendo recoger...`);
      const delay = (this.personaje.stats.inteligencia) * 1000;
      
      await new Promise<void>(resolve => setTimeout(resolve, delay));
      
      console.log(`${this.nombre} (IA) empieza a recoger sus cartas...`);
      await this.mano.cogerMano();

      // Verificar si tiene Flor y cantarla inmediatamente
      if (this.juego.envido.tieneFlor(this)) {
        await this.hablar('flor');
      }

      return;
    }
  }

  // Lógica para elegir qué carta lanzar
  async decidirCarta(): Promise<ICarta | undefined> {
    console.log(`%c ${this.nombre} está analizando su mano... `, 'color: #aaa; font-style: italic;');
    const delay = (this.personaje.stats.inteligencia) * 1000;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.enMano.length === 0) {
          console.warn(`${this.nombre} no tiene cartas para jugar.`);
          resolve(undefined);
          return;
        }

        const cartasMano = (this.enMano as ICarta[]).sort((a, b) => this.juego.getValor(a, true) - this.juego.getValor(b, true));
        
        let cartaMasAltaEnMesa: ICarta | null = null;
        let valorMasAltoEnMesa = -1;

        const jugadasEstaRonda = this.juego.partida.manoActual.cartasJugadas;
        
        jugadasEstaRonda.forEach(jugada => {
          const v = this.juego.getValor(jugada.carta);
          if (v > valorMasAltoEnMesa) {
            valorMasAltoEnMesa = v;
            cartaMasAltaEnMesa = jugada.carta;
          }
        });

        let cartaElegida: ICarta;

        if (!cartaMasAltaEnMesa) {
          // Primero en jugar
          if (this.personaje.stats.agresividad > 0.7 && Math.random() < 0.4) {
            cartaElegida = cartasMano[cartasMano.length - 1]; // Juega la más alta
          } else if (this.personaje.stats.inteligencia > 0.7 && cartasMano.length === 3) {
            cartaElegida = cartasMano[1]; // Juega la del medio
          } else {
            cartaElegida = cartasMano[0]; // Juega la más baja
          }
          cartaElegida.destapar();
          console.log(`%c ${this.nombre} abre la ronda con ${cartaElegida.numero} de ${cartaElegida.pinta} `, 'color: #888;');
        } else {
          // Intento ganar
          const ganadoras = cartasMano.filter(c => this.juego.getValor(c, true) > valorMasAltoEnMesa);
          
          if (ganadoras.length > 0) {
            if (this.personaje.stats.agresividad > 0.8 && Math.random() < 0.3) {
              cartaElegida = ganadoras[ganadoras.length - 1]; // Sobremata con la más alta
            } else {
              cartaElegida = ganadoras[0]; // Gana con lo mínimo
            }
            cartaElegida.destapar();
            console.log(`%c ${this.nombre} intenta ganar la ronda con ${cartaElegida.numero} de ${cartaElegida.pinta} `, 'color: #44ff44;');
          } else {
            // No ganamos: Quemar carta baja
            cartaElegida = cartasMano[0];
            
            if (this.enMano.length === 3) {
              cartaElegida.destapar(); // Primera ronda siempre boca arriba
            } else {
              // Tapar según bluff o inteligencia
              if (this.personaje.stats.bluff > 0.5 || this.personaje.stats.inteligencia > 0.5) {
                cartaElegida.tapar();
              } else {
                cartaElegida.destapar();
              }
            }
          }
        }
        
        console.log(`%c ${this.nombre} decide jugar: ${cartaElegida.numero} de ${cartaElegida.pinta} `, 'color: #44aaff; font-weight: bold;');
        resolve(cartaElegida);
      }, delay);
    });
  }

  async decidirMostrarEnvido(mejorActual: number): Promise<boolean> {
    const pts = this.juego.envido.calcularPuntos(this);
    const delay = (this.personaje.stats.inteligencia) * 800 + 200;
    
    await new Promise(resolve => setTimeout(resolve, delay));

    if (this.juego.envido.tieneFlor(this)) return true;
    if (pts >= 25) return true;
    if (pts <= mejorActual) return false;

    if (mejorActual === -1 && pts >= 20) return true;

    if (pts >= (20 - this.personaje.stats.agresividad * 6)) return true;

    return false;
  }

  async onContarPuntos(): Promise<void> {
    const delay = (this.personaje.stats.inteligencia) * 500;
    await new Promise(resolve => setTimeout(resolve, delay));
    return super.onContarPuntos();
  }

  async aprender(victoria: boolean) {
    this.personaje.partidasJugadas++;
    if (victoria) {
      this.personaje.partidasGanadas++;
    }

    const xpGanada = 10 + (victoria ? 20 : 0);
    this.personaje.xp += xpGanada;

    const stats = this.personaje.stats;
    if (victoria) {
      stats.inteligencia = Math.min(0.95, stats.inteligencia + 0.005);
      stats.bluff = Math.min(0.95, stats.bluff + 0.005);
      stats.agresividad = Math.min(0.95, stats.agresividad + 0.002);
    } else {
      stats.inteligencia = Math.min(0.95, stats.inteligencia + 0.01);
      stats.paciencia = Math.min(0.95, stats.paciencia + 0.005);
      stats.agresividad = Math.max(0.1, stats.agresividad - 0.005);
    }

    console.log(`%c [APRENDIZAJE] ${this.nombre} finaliza partida. Victoria: ${victoria}. XP total: ${this.personaje.xp}. Nuevas Stats:`, 'color: #00ffff;', stats);

    await this.service.saveCharacter(this.personaje);
  }
}

