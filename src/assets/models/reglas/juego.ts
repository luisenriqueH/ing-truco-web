import { GameService } from '../../../app/services/game.service';
import { Jugador, IJugador } from '../jugadores/jugador';
import { IA_Jugador, CATALOGO_IA } from '../jugadores/ia_jugador';
import { ICarta } from '../cartas/carta';
import { Baraja, IBaraja } from '../cartas/baraja';
import { LogItem } from '../data';

// Importar nuevos módulos
import { Partida } from './partida';
import { Mano } from './mano';
import { Turno } from './turno';
import { Envido } from './envido';
import { Truco } from './truco';
import { Equipo } from '../jugadores/equipo';

export { Juego };

class Juego {
  public baraja: IBaraja;
  public jugadores: IJugador[];
  public dealer: IJugador;

  // Módulos delegados
  public partida: Partida;
  public turno: Turno;
  public envido: Envido;
  public truco: Truco;
  public faseActual: 'REPARTIR' | 'RONDAS' | 'PUNTAJE' = 'REPARTIR';
  public floresCantadas: Set<number> = new Set(); // Índices de jugadores que cantaron flor

  public onJuego: boolean = false; // Flag para compatibilidad

  // Lógica de Envido
  public envidoEstado: 'NADA' | 'CANTADO' | 'ACEPTADO' | 'RECHAZADO' = 'NADA';
  public envidoPuntos: number = 0;
  public equipoQueCantoEnvido: number = -1;

  get turnoActual() { return this.turno ? this.turno.actual : 0; }
  get vira() { return this.partida.manoActual.vira; }
  get scene() { return this.service.main; }

  constructor(protected service: GameService) {
    this.service.juego = this;

    // 1. Inicializar módulos primero
    this.turno = new Turno(this, this.service);
    this.partida = new Partida(this, this.service);
    this.envido = new Envido(this);
    this.truco = new Truco(this);

    // 2. Escuchar eventos de Truco
    this.service.phaser.emitter.on('trucoRespondido', (data: any) => this.onTrucoRespondido(data));

    // 3. Renderizar después
    this.render();
  }

  render() {
    const baraja = new Baraja(this.service, 0, 0);
    const jugadores: IJugador[] = [
      new Jugador(this.service, this.service.data.userID || 'Tú', 0)
    ];

    const pool = [...CATALOGO_IA];
    for (let i = 1; i <= 3; i++) {
      const randomIdx = Math.floor(Math.random() * pool.length);
      const personaje = pool.splice(randomIdx, 1)[0];
      jugadores.push(new IA_Jugador(this.service, personaje, i));
    }

    this.baraja = baraja;
    this.jugadores = jugadores;
    this.service.local = jugadores[0];

    // Configurar equipos (0 y 2 vs 1 y 3)
    new Equipo([jugadores[0], jugadores[2]], 0);
    new Equipo([jugadores[1], jugadores[3]], 1);

    this.turno.set(0); // Iniciar turno
    this.service.data.juego = { baraja, jugadores };
  }

  // --- MÉTODOS DE ACCIÓN ---

  async ejecutarTurnoIA(ia: IA_Jugador) {
    // 1. Responder a Envido si está pendiente
    if (this.envidoEstado === 'CANTADO' && ia.pareja.indice !== this.equipoQueCantoEnvido) {
      const pts = this.envido.calcularPuntos(ia);
      console.log(`%c IA ${ia.nombre} analiza su envido: ${pts} puntos `, 'color: #aaa;');

      const delay = (ia.personaje.razonamiento / 5) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      if (pts >= 25) {
        await ia.hablar('quiero');
      } else {
        await ia.hablar('no quiero');
      }
    }

    // 2. Asegurarse de tener la mano recogida
    await ia.decidirRecuperar();

    // 3. Proceder a jugar
    if (ia.enMano.length > 0) {
      console.log(`%c ${ia.nombre} tiene sus cartas y procede a decidir... `, 'color: #44ff44;');
      const carta = await ia.decidirCarta();
      if (carta) {
        this.jugarCarta(ia, carta);
      }
    } else {
      console.warn(`${ia.nombre} no puede jugar: mano vacía.`);
    }
  }

  jugarCarta(jugador: IJugador, carta: ICarta) {
    if (this.turno.actual !== jugador.indice) {
      console.warn(`${jugador.nombre} intentó jugar fuera de turno.`);
      return;
    }

    if (this.truco.esperandoRespuesta) {
      console.warn("No puedes jugar cartas mientras se espera respuesta al Truco.");
      return;
    }

    // Registrar la jugada en la mano actual
    this.partida.manoActual.registrarJugada(jugador, carta);

    console.log(`${jugador.nombre} juega ${carta.numero} de ${carta.pinta}`);
    this.service.phaser.emitter.emit('cardPlayed', { jugador, carta });
    const totalJugadas = this.jugadores.reduce((acc, j) => acc + j.mesa.cartas.length, 0);
    const offset = totalJugadas * 5;

    jugador.soltar(carta, jugador.mesa.zone, { x: offset, y: offset })
      .then(() => {
        this.proximoTurno();
      });
  }

  proximoTurno() {
    const mano = this.partida.manoActual;

    if (mano.esFinDeRonda) {
      // 1. Evaluar quién ganó la vuelta
      const ganadora = mano.evaluarGanadorRonda();
      this.service.phaser.emitter.emit('rondaFinished');

      // 2. Esperar un momento para que el usuario vea el resultado
      setTimeout(() => {
        // 3. Limpiar la mesa
        mano.limpiarRonda();

        // 4. ¿Es fin de mano (2 de 3)?
        if (mano.esFinDeMano) {
          console.log('%c ¡MANO FINALIZADA! Esperando a que el repartidor inicie el conteo. ', 'background: #aa0000; color: #fff; font-weight: bold;');
          
          // Solo notificamos que la mano terminó. 
          // El repartidor (Humano o IA) debe ser quien llame a contarPuntos().
          this.service.phaser.emitter.emit('manoFinished');
        } else {
          // 5. El ganador inicia la siguiente ronda
          this.turno.set(ganadora.jugador.indice);
        }
      }, 2000);

    } else {
      // Si no ha terminado la ronda, rotación normal
      this.turno.proximo();
    }
  }

  async contarPuntos() {
    if (this.faseActual === 'PUNTAJE') return;
    this.faseActual = 'PUNTAJE';
    console.log('%c --- FASE DE PUNTAJE --- ', 'background: #004488; color: #fff;');

    // Emitir evento para que todos los jugadores preparen sus cartas (las recojan de la mesa)
    this.service.phaser.emitter.emit('contarPuntosStarted');
    
    // Esperar un momento a que los jugadores recojan sus cartas antes de empezar a cantar puntos
    await new Promise(resolve => setTimeout(resolve, 2000));

    // La resolución de Flor e Envido ahora está integrada en el módulo Envido
    await this.envido.resolver();

    // 2. Fase 2: Mostrar TODAS las cartas de TODOS los jugadores (Visual/Estético)
    // El proceso se inicia mediante el evento 'contarPuntosStarted' que escuchan los jugadores.
    console.log('%c Esperando a que los jugadores revelen sus cartas... ', 'color: #888;');
    
    // Esperamos un tiempo base para que las animaciones de recogida y revelación ocurran
    await new Promise(resolve => setTimeout(resolve, 3000));

    await new Promise(resolve => setTimeout(resolve, 1500));

    // 3. Fase 3: Truco (Ganador de la mano)
    const mano = this.partida.manoActual;
    const equipoGanadorIdx = mano.rondasGanadas[0] >= 2 ? 0 : 1;
    const ganadorNombre = equipoGanadorIdx === 0 ? "Nosotros" : "Ellos";
    
    const ptsTruco = this.truco.puntosAlGanarMano();
    this.hablar({ texto: `¡Mano para ${ganadorNombre}! (+${ptsTruco})` });

    this.partida.sumarPuntos(equipoGanadorIdx, ptsTruco);
    this.faseActual = 'REPARTIR';
    this.service.phaser.emitter.emit('puntosContados');
  }

  onTrucoRespondido(data: { jugador: any, respuesta: string, estado: string }) {
    if (data.respuesta === 'no quiero') {
      // El equipo que cantó gana los puntos correspondientes
      const pts = this.truco.puntosAlRechazar();
      const equipoGanador = this.truco.equipoQueCanto;
      
      console.log(`%c [TRUCO] Mano terminada por No Quiero. Equipo ${equipoGanador + 1} suma ${pts} pts. `, 'background: #770000; color: #fff;');
      this.partida.sumarPuntos(equipoGanador, pts);
      
      // Terminar la mano inmediatamente
      this.service.phaser.emitter.emit('manoFinished');
    } else {
      // Quiero: Simplemente reanudamos (el turno.set() en Truco.registrarRespuesta no es necesario si manejamos bien el estado)
      console.log(`%c [TRUCO] Juego continúa con nivel ${this.truco.nivel} `, 'color: #00bb00;');
      
      // Si era turno de una IA, relanzamos su lógica
      const jugadorActual = this.jugadores[this.turno.actual];
      if (jugadorActual.tipo === 'ia') {
        this.ejecutarTurnoIA(jugadorActual as any);
      }
    }
  }


  async recogerTodo() {
    console.log('%c --- RECOGIENDO CARTAS --- ', 'background: #555; color: #fff;');

    const promesas = [];

    // 3. RECOGIDA TOTAL: Usamos la lista global de cartas fuera del mazo
    const todasLasFuera = [...this.baraja.salidas];

    for (const carta of todasLasFuera) {
      // Quitar de cualquier colección donde pueda estar
      this.jugadores.forEach(j => {
        j.mano.remove(carta);
        j.mesa.remove(carta);
      });

      promesas.push(new Promise<void>(resolve => {
        this.baraja.meter(carta);
        setTimeout(resolve, 300);
      }));
    }

    // 4. Asegurar que la Vira también vuelva (ya debería estar en salidas, pero por si acaso)
    if (this.vira) {
      const vira = this.vira;
      this.service.vira = undefined;
      promesas.push(new Promise<void>(resolve => {
        this.baraja.meter(vira);
        setTimeout(resolve, 300);
      }));
    }

    await Promise.all(promesas);

    // Limpiar la lista de salidas de la baraja ya que todas han vuelto
    this.baraja.salidas = [];

    // 4. Rotar el repartidor (Jugador de la derecha)
    const dealerActualIdx = this.dealer ? this.dealer.indice : 0;
    const proximoDealerIdx = (dealerActualIdx + 1) % this.jugadores.length;
    this.dealer = this.jugadores[proximoDealerIdx];

    console.log(`%c El mazo pasa a: ${this.dealer.nombre} `, 'background: #aa8800; color: #fff;');
    this.jugadores.forEach(j => (j as any).estaContando = false);
    
    // 5. Preparar nueva mano
    this.partida.nuevaMano();
    this.floresCantadas.clear();
    this.envidoEstado = 'NADA';
    this.truco.reset();
    this.faseActual = 'REPARTIR';
    this.service.phaser.emitter.emit('repartoFinished'); // Resetear UI

    // 6. Si el nuevo dealer es IA, debe repartir automáticamente
    if (this.dealer.tipo === 'ia') {
      console.log(`%c IA ${this.dealer.nombre} decide repartir... `, 'color: #00ff00;');
      setTimeout(() => {
        this.repartir(this.dealer);
      }, 1500);
    }
  }

  start() {
    this.jugadores.forEach((item) => item.mano.setEvents());
  }

  repartir(repartidor?: IJugador) {
    this.partida.manoActual.repartir(repartidor);
  }

  // --- REGLAS DE VALOR ---

  getValor(carta: ICarta): number {
    // Si la carta está tapada (jugada boca abajo), su valor es 0 (menor a un 4)
    if (carta.tapada) return 0;

    const vira = this.service.vira || this.partida.manoActual.vira;

    const normalize = (val: string) => {
      const dict: { [key: string]: string } = { 
        'as': '1', 'uno': '1', 
        'dos': '2', 'tres': '3', 'cuatro': '4', 'cinco': '5', 'seis': '6', 'siete': '7',
        'sota': '10', 'diez': '10', 'caballo': '11', 'once': '11', 'rey': '12', 'doce': '12' 
      };
      return dict[val] || val;
    };

    const n_norm = normalize(carta.numero.toLowerCase());
    const n_num = parseInt(n_norm);

    // 1. Piezas (Solo si hay vira y es del mismo palo)
    if (vira) {
      const vn_norm = normalize(vira.numero.toLowerCase());
      const vp = vira.pinta.toLowerCase();
      const cp = carta.pinta.toLowerCase();

      if (cp === vp && n_norm !== vn_norm) {
        let perico = '11';
        let perica = '10';

        if (vn_norm === '11') perico = '12';
        else if (vn_norm === '10') perica = '12';

        if (n_norm === perico) return 100;
        if (n_norm === perica) return 90;
      }
    }

    const jerarquia: { [key: string]: { [key: string]: number } } = {
      '1': { 'espada': 80, 'basto': 70, 'default': 20 },
      '7': { 'espada': 60, 'oro': 50, 'default': 10 },
      '3': { 'default': 40 },
      '2': { 'default': 30 },
      '12': { 'default': 15 },
      '11': { 'default': 14 },
      '10': { 'default': 13 },
      '6': { 'default': 8 },
      '5': { 'default': 5 },
      '4': { 'default': 2 }
    };

    const p = carta.pinta.toLowerCase();

    if (jerarquia[n_norm]) {
      return jerarquia[n_norm][p] || jerarquia[n_norm]['default'] || 0;
    }
    return 0;
  }

  hablar(datos: LogItem): Promise<void> {
    this.service.phaser.emitter.emit('hablar', datos);

    const texto = datos.texto.toLowerCase();
    
    // 1. Delegar a Envido
    if (datos.jugador) {
      this.envido.registrarCanto(datos.jugador, texto);
    }

    // 2. Delegar a Truco
    const trucoVoces = ['truco', 'retruco', 'vale nueve', 'vale 9', 'vale juego', 'vale 12'];
    if (trucoVoces.includes(texto) && datos.jugador) {
      this.truco.registrarCanto(datos.jugador, texto);
    }

    // 3. Manejar Respuestas (Quiero / No Quiero)
    if ((texto === 'quiero' || texto === 'no quiero') && datos.jugador) {
      // Prioridad al Truco si está esperando respuesta
      if (this.truco.esperandoRespuesta) {
        this.truco.registrarRespuesta(datos.jugador, texto);
      } else if (this.envidoEstado === 'CANTADO') {
        // Lógica de Envido (Mantener compatibilidad)
        if (texto === 'quiero') this.envidoEstado = 'ACEPTADO';
        if (texto === 'no quiero') {
          this.envidoEstado = 'RECHAZADO';
          const equipoGanador = (datos.jugador.pareja.indice + 1) % 2;
          this.partida.sumarPuntos(equipoGanador, 1);
        }
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }

  // --- AYUDANTES DE REGLAS ---

  esPieza(carta: ICarta): boolean {
    const vira = this.service.vira || this.partida.manoActual.vira;
    if (!vira) return false;

    const n = carta.numero.toLowerCase();
    const p = carta.pinta.toLowerCase();
    const vp = vira.pinta.toLowerCase();
    const vn = vira.numero.toLowerCase();

    // Solo las cartas del mismo palo que la vira pueden ser piezas
    if (p !== vp) return false;

    // La vira en sí no es una pieza (es la vira)
    if (n === vn) return false;

    // Traducción para normalizar comparación
    const normalize = (val: string) => {
      const dict: { [key: string]: string } = {
        'as': '1', 'uno': '1',
        'dos': '2', 'tres': '3', 'cuatro': '4', 'cinco': '5', 'seis': '6', 'siete': '7',
        'sota': '10', 'diez': '10', 'caballo': '11', 'once': '11', 'rey': '12', 'doce': '12'
      };
      return dict[val] || val;
    };

    const n_norm = normalize(n);
    const vn_norm = normalize(vn);

    let perico = '11';
    let perica = '10';

    if (vn_norm === '11') perico = '12';
    if (vn_norm === '10') perica = '12';

    return n_norm === perico || n_norm === perica;
  }
}
