import { GameService } from "src/app/services/game.service";
import { Jugador } from "./jugador";
import { ICarta } from "../cartas/carta";

export interface PersonajeIA {
  nombre: string;
  razonamiento: number; // 1 a 10
  estilo: string;
}

export const CATALOGO_IA: PersonajeIA[] = [
  { nombre: 'Don Juan', razonamiento: 8, estilo: 'Estratega y calmado' },
  { nombre: 'La Catira', razonamiento: 3, estilo: 'Impulsiva y rápida' },
  { nombre: 'El Chamo', razonamiento: 5, estilo: 'Equilibrado' },
  { nombre: 'Doña María', razonamiento: 10, estilo: 'Calculadora y lenta' },
  { nombre: 'El General', razonamiento: 7, estilo: 'Autoritario' },
  { nombre: 'La Flaca', razonamiento: 2, estilo: 'Muy impaciente' },
  { nombre: 'El Gocho', razonamiento: 9, estilo: 'Paciente y analítico' },
  { nombre: 'El Catire', razonamiento: 4, estilo: 'Arriesgado' }
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
        const delay = (this.personaje.razonamiento / 10) * 3000 + 1000;
        console.log(`%c ${this.nombre} (IA Dealer) esperará ${Math.round(delay)}ms para iniciar el conteo... `, 'color: #888;');
        await new Promise(resolve => setTimeout(resolve, delay));
        this.juego.contarPuntos();
      }
    });

    // Reaccionar al Truco cantado por el rival
    this.service.phaser.emitter.on('trucoCantado', async (data: any) => {
      // Solo responder si el Truco fue cantado por el EQUIPO CONTRARIO
      if (this.juego.truco.esperandoRespuesta && data.jugador.pareja.indice !== this.pareja.indice) {
        await this.decidirResponderTruco();
      }
    });

    // Reaccionar al Envido cantado por el rival
    this.service.phaser.emitter.on('envidoCantado', async (data: any) => {
      if (this.juego.envidoEstado === 'CANTADO' && data.jugador.pareja.indice !== this.pareja.indice) {
        await this.decidirResponderEnvido();
      }
    });
  }

  async decidirResponderEnvido(): Promise<void> {
    const delay = (this.personaje.razonamiento / 10) * 1500 + 500;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Si ya no está en estado CANTADO (alguien respondió), salimos
    if (this.juego.envidoEstado !== 'CANTADO') return;

    const pts = this.juego.envido.calcularPuntos(this);
    let respuesta = 'no quiero';

    // Lógica simple: aceptar con 25 o más
    if (pts >= 25) {
      respuesta = 'quiero';
    } else if (this.personaje.estilo.includes('Arriesgado') && pts >= 20) {
      respuesta = 'quiero';
    }

    console.log(`%c [IA] ${this.nombre} decide responder al Envido: ${respuesta.toUpperCase()} (${pts} pts) `, 'color: #ffaa00;');
    await this.hablar(respuesta);
  }

  async decidirResponderTruco(): Promise<void> {
    const delay = (this.personaje.razonamiento / 10) * 2000 + 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Si mientras esperábamos, alguien ya respondió, salimos
    if (!this.juego.truco.esperandoRespuesta) return;

    // Lógica táctica simple: 
    // - Si tengo piezas, acepto siempre.
    // - Si tengo buen razonamiento, acepto más.
    // - Si soy arriesgado, acepto más.
    const tienePiezas = this.enMano.some(c => this.juego.esPieza(c));
    const umbral = this.personaje.estilo.includes('Arriesgado') ? 3 : 5;
    
    let respuesta = 'no quiero';
    if (tienePiezas || this.personaje.razonamiento >= umbral) {
      respuesta = 'quiero';
    }

    console.log(`%c [IA] ${this.nombre} decide responder: ${respuesta.toUpperCase()} `, 'color: #ffaa00;');
    await this.hablar(respuesta);
  }

  // Lógica para recuperar la baraja de la mesa
  // Basado en f = t / 10 (resultado en segundos)
  async decidirRecuperar() {
    // 1. No recoger si el reparto aún no termina
    if (this.juego.onJuego) return;

    const cartasEnMesa = this.mesa.cartas.length;
    const cartasEnMano = this.enMano.length;

    // 2. Lógica de recogida: 
    // - Si estamos al inicio (reparto), esperamos a tener las 3.
    // - Si es durante la partida, la IA solo recoge si no tiene nada en mano.
    if (cartasEnMesa > 0 && cartasEnMano === 0) {
      console.log(`${this.nombre} ve ${cartasEnMesa} cartas en su mesa. Decidiendo recoger...`);
      const delay = (this.personaje.razonamiento / 10) * 1000;
      
      await new Promise<void>(resolve => setTimeout(resolve, delay));
      
      console.log(`${this.nombre} (IA) empieza a recoger sus cartas...`);
      await this.mano.cogerMano(); // AHORA SÍ ESPERAMOS

      // Verificar si tiene Flor y cantarla inmediatamente
      if (this.juego.envido.tieneFlor(this)) {
        await this.hablar('flor');
      }

      return;
    } else {
      // Log para debug si se salta el paso
      if (cartasEnMesa > 0) {
        // console.log(`${this.nombre} no recoge: Mesa=${cartasEnMesa}, Mano=${cartasEnMano}`);
      }
      return Promise.resolve();
    }
  }
  // Lógica para elegir qué carta lanzar
  async decidirCarta(): Promise<ICarta | undefined> {
    console.log(`%c ${this.nombre} está analizando su mano... `, 'color: #aaa; font-style: italic;');
    const delay = (this.personaje.razonamiento / 5) * 1000;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.enMano.length === 0) {
          console.warn(`${this.nombre} no tiene cartas para jugar.`);
          resolve(undefined);
          return;
        }

        // FASE 2: Estrategia Táctica (Nivel 2)
        const cartasMano = (this.enMano as ICarta[]).sort((a, b) => this.juego.getValor(a, true) - this.juego.getValor(b, true));
        
        // 1. Ver qué es lo más alto que hay en la mesa EN ESTA RONDA
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
          // Soy el primero en jugar: juego la más baja boca arriba
          cartaElegida = cartasMano[0];
          cartaElegida.destapar();
          console.log(`%c ${this.nombre} es mano y abre con su carta más baja `, 'color: #888;');
        } else {
          // Intento "matar" lo que hay en mesa con lo mínimo necesario
          const ganadoras = cartasMano.filter(c => this.juego.getValor(c, true) > valorMasAltoEnMesa);
          
          if (ganadoras.length > 0) {
            // Juego la más baja de las que ganan (siempre boca arriba)
            cartaElegida = ganadoras[0];
            cartaElegida.destapar();
            console.log(`%c ${this.nombre} intenta ganar la ronda con ${cartaElegida.numero} de ${cartaElegida.pinta} `, 'color: #44ff44;');
          } else {
            // No puedo ganar: "tiro" mi carta más baja
            cartaElegida = cartasMano[0];
            
            // REGLA: "La primera se ve".
            if (this.enMano.length === 3) {
              console.log(`${this.nombre} no puede ganar, pero muestra su carta por ser primera ronda.`);
              cartaElegida.destapar();
            } else {
              console.log(`${this.nombre} no puede ganar y quema su carta.`);
              cartaElegida.tapar();
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
    const delay = (this.personaje.razonamiento / 10) * 1000;
    
    await new Promise(resolve => setTimeout(resolve, delay));

    // REGLA: No perder la oportunidad de mostrar Flor o Envido > 25
    if (this.juego.envido.tieneFlor(this)) return true;
    if (pts >= 25) return true;

    // Si mis puntos son menores o iguales al mejor actual, no tiene sentido mostrar
    if (pts <= mejorActual) return false;

    // Si nadie ha mostrado todavía y tengo algo decente (>= 20)
    if (mejorActual === -1 && pts >= 20) return true;

    // Personalidad: arriesgados muestran con menos
    if (this.personaje.estilo.includes('Arriesgado') && pts >= 15) return true;

    return false;
  }
  async onContarPuntos(): Promise<void> {
    const delay = (this.personaje.razonamiento / 10) * 500;
    await new Promise(resolve => setTimeout(resolve, delay)); // "Piensa" antes de mostrar
    return super.onContarPuntos();
  }
}
