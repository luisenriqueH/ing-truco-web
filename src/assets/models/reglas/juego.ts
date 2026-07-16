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

  // Lock: evita que dos instancias paralelas del turno IA corran a la vez
  private iaEnEjecucion: Set<number> = new Set();

  // Lock: bloquea el juego de cartas mientras se coordina una respuesta
  public coordinandoRespuesta: boolean = false;

  // Flag: true mientras la mano está en juego, false desde manoFinished hasta nueva mano
  public manoEnCurso: boolean = false;

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

    // 2. Escuchar eventos de Truco y Envido para la coordinación
    this.service.phaser.emitter.on('trucoRespondido', (data: any) => this.onTrucoRespondido(data));
    this.service.phaser.emitter.on('trucoCantado', (data: any) => this.coordinarRespuestaTruco(data));
    this.service.phaser.emitter.on('envidoCantado', (data: any) => this.coordinarRespuestaEnvido(data));

    // 3. Renderizar después
    this.render();
  }

  render() {
    const baraja = new Baraja(this.service, 0, 0);

    // Mapear clientes de la sala a los slots 0, 1, 2, 3
    const roomClients = this.service.connectedClients.filter(c => c.room === this.service.currentRoom);
    roomClients.sort((a, b) => a.userId.localeCompare(b.userId));

    const localIdx = roomClients.findIndex(c => c.userId === this.service.userId);
    const myIndexInRoom = localIdx !== -1 ? localIdx : 0;
    this.service.myIndexInRoom = myIndexInRoom;

    const jugadores: IJugador[] = [];
    const selected = this.service.selectedIAs && this.service.selectedIAs.length >= 3 ? this.service.selectedIAs : CATALOGO_IA.slice(0, 3);

    let iaPointer = 0;
    for (let i = 0; i < 4; i++) {
      if (roomClients[i]) {
        // Si el cliente en esta posición es el local, se crea como local
        jugadores.push(new Jugador(this.service, roomClients[i].name, i));
      } else {
        const personaje = selected[iaPointer++ % selected.length];
        jugadores.push(new IA_Jugador(this.service, personaje, i));
      }
    }

    this.baraja = baraja;
    this.jugadores = jugadores;
    this.service.local = jugadores[myIndexInRoom];

    // Configurar equipos (0 y 2 vs 1 y 3)
    new Equipo([jugadores[0], jugadores[2]], 0);
    new Equipo([jugadores[1], jugadores[3]], 1);

    this.turno.set(0); // Iniciar turno
    this.service.data.juego = { baraja, jugadores };
  }

  // --- MÉTODOS DE ACCIÓN ---

  async ejecutarTurnoIA(ia: IA_Jugador) {
    if (this.service.myIndexInRoom !== 0) {
      console.log(`[SSE-IA] Non-host client skipping IA decision for ${ia.nombre}`);
      return;
    }

    // Lock: si ya hay una instancia corriendo para esta IA, no lanzar otra
    if (this.iaEnEjecucion.has(ia.indice)) {
      console.warn(`%c [TURNO-LOCK] ${ia.nombre} ya tiene un turno en ejecución, ignorando nueva llamada `, 'color: #ff4444;');
      return;
    }
    this.iaEnEjecucion.add(ia.indice);

    try {
      // 1. Esperar mientras haya cualquier canto pendiente de respuesta en el juego
      while (this.envidoEstado === 'CANTADO' || this.truco.esperandoRespuesta || this.coordinandoRespuesta) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // 2. Asegurarse de tener la mano recogida
      await ia.decidirRecuperar();

      // Verificaciones de estado por si terminó la mano/partida durante la espera o recogida
      if (this.partida.puntos[0] >= this.partida.limite || this.partida.puntos[1] >= this.partida.limite) return;
      if (this.faseActual === 'PUNTAJE') return;
      if (this.turno.actual !== ia.indice) return;

      // 3. Evaluar cantos proactivos antes de jugar carta
      const cantoEnvido = await ia.decidirCantarEnvidoProactivo();
      if (cantoEnvido) {
        await ia.hablar(cantoEnvido);
        while (this.envidoEstado === 'CANTADO' || this.coordinandoRespuesta) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      if (this.partida.puntos[0] >= this.partida.limite || this.partida.puntos[1] >= this.partida.limite) return;
      if (this.faseActual === 'PUNTAJE') return;
      if (this.turno.actual !== ia.indice) return;

      const cantoTruco = await ia.decidirCantarTrucoProactivo();
      if (cantoTruco) {
        await ia.hablar(cantoTruco);
        while (this.truco.esperandoRespuesta || this.coordinandoRespuesta) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      if (this.partida.puntos[0] >= this.partida.limite || this.partida.puntos[1] >= this.partida.limite) return;
      if (this.faseActual === 'PUNTAJE') return;
      if (this.turno.actual !== ia.indice) return;

      // 4. Proceder a jugar
      if (ia.enMano.length > 0) {
        console.log(`%c ${ia.nombre} tiene sus cartas y procede a decidir... `, 'color: #44ff44;');
        const carta = await ia.decidirCarta();
        // Doble chequeo final antes de jugar
        if (carta && this.turno.actual === ia.indice && !this.truco.esperandoRespuesta && !this.coordinandoRespuesta && this.manoEnCurso) {
          this.jugarCarta(ia, carta);
        } else if (carta) {
          console.warn(`%c [TURNO-LOCK] ${ia.nombre} descartó su jugada: condiciones cambiaron antes de lanzar `, 'color: #ff8800;');
        }
      } else {
        console.warn(`${ia.nombre} no puede jugar: mano vacía.`);
      }
    } finally {
      // Siempre liberar el lock al terminar
      this.iaEnEjecucion.delete(ia.indice);
    }
  }

  jugarCarta(jugador: IJugador, carta: ICarta) {
    if (this.turno.actual !== jugador.indice) {
      console.warn(`${jugador.nombre} intentó jugar fuera de turno.`);
      return;
    }

    if (this.truco.esperandoRespuesta || this.coordinandoRespuesta) {
      console.warn(`No se puede jugar: se está resolviendo un canto de Truco o Envido.`);
      return;
    }

    if (!this.manoEnCurso) {
      console.warn(`${jugador.nombre} intentó jugar una carta pero la mano ya no está en curso.`);
      return;
    }

    // Registrar la jugada en la mano actual
    this.partida.manoActual.registrarJugada(jugador, carta);

    // Propagar si es una IA y somos el Host
    if (this.service.myIndexInRoom === 0 && jugador.tipo === 'ia') {
      this.service.sendRoomAction('cardPlayed', {
        playerIndex: jugador.indice,
        cardName: carta.nombre,
        tapada: carta.tapada
      });
    }

    console.log(`${jugador.nombre} juega ${carta.numero} de ${carta.pinta}`);
    this.service.phaser.emitter.emit('cardPlayed', { jugador, carta });
    const totalJugadas = this.jugadores.reduce((acc, j) => acc + j.mesa.cartas.length, 0);
    const offset = totalJugadas * 5;

    jugador.soltar(carta, jugador.mesa.zone, { x: offset, y: offset })
      .then(() => {
        this.proximoTurno();
        this.sincronizarEstadoServidor();
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

          // Marcar la mano como terminada ANTES de emitir el evento
          // para que los turnos de IA en vuelo no puedan seguir cantando
          this.manoEnCurso = false;

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

  async contarPuntos(fromRemote: boolean = false) {
    if (this.faseActual === 'PUNTAJE') return;

    if (!fromRemote) {
      this.service.sendRoomAction('contarPuntos', {});
    }

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
    if (this.truco.estado === 'RECHAZADO') {
      const pts = this.truco.puntosAlRechazar();
      const equipoGanador = this.truco.equipoQueCanto;
      const ganadorNombre = equipoGanador === 0 ? "Nosotros" : "Ellos";

      console.log(`%c [TRUCO] Contando puntos por rechazo. Ganador: Equipo ${equipoGanador + 1} (+${pts}) `, 'background: #004488; color: #fff;');
      this.hablar({ texto: `¡Puntos por no querer para ${ganadorNombre}! (+${pts})` });
      this.partida.sumarPuntos(equipoGanador, pts);
    } else {
      const mano = this.partida.manoActual;
      const equipoGanadorIdx = mano.rondasGanadas[0] >= 2 ? 0 : 1;
      const ganadorNombre = equipoGanadorIdx === 0 ? "Nosotros" : "Ellos";

      const ptsTruco = this.truco.puntosAlGanarMano();
      console.log(`%c [TRUCO] Contando puntos de mano ganada. Ganador: Equipo ${equipoGanadorIdx + 1} (+${ptsTruco}) `, 'background: #004488; color: #fff;');
      this.hablar({ texto: `¡Mano para ${ganadorNombre}! (+${ptsTruco})` });
      this.partida.sumarPuntos(equipoGanadorIdx, ptsTruco);
    }
    this.faseActual = 'REPARTIR';
    this.service.phaser.emitter.emit('puntosContados');
    // Sincronizar el estado actualizado (incluyendo puntos) al servidor
    this.sincronizarEstadoServidor();
  }

  onTrucoRespondido(data: { jugador: any, respuesta: string, estado: string }) {
    if (data.respuesta === 'no quiero') {
      this.manoEnCurso = false;
      console.log(`%c [TRUCO] Mano cortada por No Quiero. Esperando a que el dealer cuente los puntos. `, 'background: #770000; color: #fff;');

      // Terminar la mano inmediatamente
      this.service.phaser.emitter.emit('manoFinished');
    } else {
      // Quiero: Reanudar el juego pasando el turno correctamente
      console.log(`%c [TRUCO] Juego continúa con nivel ${this.truco.nivel} `, 'color: #00bb00;');

      // Relanzar turno usando turno.set() -- éste maneja el lock de ia internamente.
      // El lock coordinandoRespuesta ya fue liberado por el método coordinar* antes de llegar aquí.
      const idxActual = this.turno.actual;
      this.turno.set(idxActual);
    }
  }


  async recogerTodo(fromRemote: boolean = false) {
    console.log('%c --- RECOGIENDO CARTAS --- ', 'background: #555; color: #fff;');

    if (!fromRemote) {
      this.service.sendRoomAction('recoger', {});
    }

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

    // Sincronizar estado limpio al servidor para que clientes que se reconecten partan de un estado limpio
    this.sincronizarEstadoServidor();

    // 6. Si el nuevo dealer es IA, debe repartir automáticamente
    if (this.dealer.tipo === 'ia') {
      console.log(`%c IA ${this.dealer.nombre} decide repartir... `, 'color: #00ff00;');
      setTimeout(() => {
        this.repartir(this.dealer);
      }, 1500);
    }
  }

  start() {
    // Activar el flag de mano en curso al iniciar una nueva mano
    this.manoEnCurso = true;
    // Limpiar locks de turno de manos anteriores
    this.iaEnEjecucion.clear();
    this.coordinandoRespuesta = false;
    this.jugadores.forEach((item) => item.mano.setEvents());
  }

  async repartir(repartidor?: IJugador, presetIndices?: number[]) {
    const dealer = repartidor || this.dealer || this.jugadores[0];

    if (presetIndices) {
      await this.partida.manoActual.repartir(dealer, presetIndices);
      this.sincronizarEstadoServidor();
      return;
    }

    // El repartidor real o el host para las IAs genera el reparto determinista y lo propaga
    const isDealerLocal = dealer.indice === this.service.myIndexInRoom;
    const isIAAndIHost = (dealer.tipo === 'ia' && this.service.myIndexInRoom === 0);

    if (isDealerLocal || isIAAndIHost) {
      const indices = Phaser.Utils.Array.NumberArray(0, 39);
      Phaser.Utils.Array.Shuffle(indices);

      this.service.sendRoomAction('repartir', {
        dealerIndex: dealer.indice,
        indices: indices
      });

      await this.partida.manoActual.repartir(dealer, indices);
      this.sincronizarEstadoServidor();
    }
  }

  // --- REGLAS DE VALOR ---

  getValor(carta: ICarta, ignorarTapada: boolean = false): number {
    // Si la carta está tapada (jugada boca abajo), su valor es 0 (menor a un 4)
    // Pero permitimos ignorar esto para que la IA pueda evaluar sus propias cartas
    if (carta.tapada && !ignorarTapada) return 0;

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

    // Guardas: no procesar cantos si la mano ya terminó o estamos en fase de puntaje
    const esCantoDeJuego = [
      'envido', 'flor',
      'truco', 'retruco', 'vale nueve', 'vale 9', 'vale juego', 'vale 12',
      'quiero', 'no quiero'
    ].includes(texto);

    if (esCantoDeJuego && datos.jugador && (!this.manoEnCurso || this.faseActual === 'PUNTAJE')) {
      console.warn(`%c [HABLAR] ${datos.jugador?.nombre} intentó cantar "${texto}" pero la mano ya no está en curso. Se ignora. `, 'color: #ff4444;');
      return Promise.resolve();
    }

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
        this.sincronizarEstadoServidor();
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
    return n_norm === perico || n_norm === perica;
  }

  async coordinarRespuestaTruco(data: { jugador: IJugador, nivel: number }) {
    // Evitar que el mismo canto dispare dos coordinaciones (p. ej.: listener duplicado)
    if (this.coordinandoRespuesta) {
      console.warn(`%c [COORDINACION TRUCO] Ya hay una coordinación en curso, ignorando `, 'color: #ff4444;');
      return;
    }
    this.coordinandoRespuesta = true;

    try {
      const retador = data.jugador;
      const equipoRespondeIdx = (retador.pareja.indice + 1) % 2;

      console.log(`%c [COORDINACION TRUCO] Coordinando respuesta para Equipo ${equipoRespondeIdx + 1} `, 'color: #ffaa00; font-weight: bold;');

      const equipo = this.jugadores.filter(j => j.pareja.indice === equipoRespondeIdx);
      const jugadorA = equipo[0];
      const jugadorB = equipo[1];

      if (jugadorA.tipo === 'ia' && jugadorB.tipo === 'ia') {
        const iaA = jugadorA as IA_Jugador;
        const iaB = jugadorB as IA_Jugador;

        const opinionA = iaA.calcularOpinionTruco();
        const opinionB = iaB.calcularOpinionTruco();

        console.log(`%c [COORDINACION TRUCO] IA ${iaA.nombre} opina: ${opinionA.toUpperCase()}, IA ${iaB.nombre} opina: ${opinionB.toUpperCase()} `, 'color: #ffaa00;');

        const decisionFinal = (opinionA === 'quiero' || opinionB === 'quiero') ? 'quiero' : 'no quiero';
        const vocero = (opinionA === decisionFinal) ? iaA : iaB;

        const delay = Math.min(iaA.personaje.stats.inteligencia, iaB.personaje.stats.inteligencia) * 1000 + 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        if (this.truco.esperandoRespuesta && this.truco.equipoQueCanto !== equipoRespondeIdx) {
          console.log(`%c [COORDINACION TRUCO] Vocero ${vocero.nombre} habla: ${decisionFinal.toUpperCase()} `, 'color: #ffaa00;');
          await vocero.hablar(decisionFinal);
        }
      } else {
        const localPlayerIdx = this.service.myIndexInRoom;
        const isLocalPlayerResponding = (jugadorA.indice === localPlayerIdx || jugadorB.indice === localPlayerIdx);

        if (isLocalPlayerResponding) {
          const humano = (jugadorA.indice === localPlayerIdx) ? jugadorA : jugadorB;
          const compañero = (jugadorA.indice === localPlayerIdx) ? jugadorB : jugadorA;

          let opinionCompañero = 'quiero';
          if (compañero.tipo === 'ia') {
            opinionCompañero = (compañero as IA_Jugador).calcularOpinionTruco();
          }

          const nivelNombre = this.truco.getNombreNivel(data.nivel).toUpperCase();
          const opinionTexto = opinionCompañero === 'quiero' ? 'QUIERO' : 'NO QUIERO';
          const mensaje = `${retador.nombre} cantó ${nivelNombre}.\nTu compañero ${compañero.nombre} opina: ${opinionTexto}.\n¿Qué decides?`;

          await new Promise<void>(resolve => {
            this.service.phaser.emitter.emit('mostrarPregunta', {
              texto: mensaje,
              callback: async (aceptaHumano: boolean) => {
                const opinionHumano = aceptaHumano ? 'quiero' : 'no quiero';
                // La decisión final la toma el humano (tiene la última palabra)
                const decisionFinal = opinionHumano;

                console.log(`%c [COORDINACION TRUCO] Humano decide: ${opinionHumano.toUpperCase()}. Final (del humano): ${decisionFinal.toUpperCase()} `, 'color: #ffaa00;');

                await humano.hablar(decisionFinal);
                resolve();
              }
            });
          });
        } else {
          console.log(`%c [COORDINACION TRUCO] Esperando respuesta remota... `, 'color: #ffaa00;');
          while (this.truco.esperandoRespuesta) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }
    } finally {
      this.coordinandoRespuesta = false;
      console.log(`%c [COORDINACION TRUCO] Coordinación completada. Lock liberado. `, 'color: #44ff44;');
    }
  }

  async coordinarRespuestaEnvido(data: { jugador: IJugador, puntos: number }) {
    // Evitar doble coordinación simultánea
    if (this.coordinandoRespuesta) {
      console.warn(`%c [COORDINACION ENVIDO] Ya hay una coordinación en curso, ignorando `, 'color: #ff4444;');
      return;
    }
    this.coordinandoRespuesta = true;

    try {
      const retador = data.jugador;
      const equipoRespondeIdx = (retador.pareja.indice + 1) % 2;

      console.log(`%c [COORDINACION ENVIDO] Coordinando respuesta para Equipo ${equipoRespondeIdx + 1} `, 'color: #ffaa00; font-weight: bold;');

      const equipo = this.jugadores.filter(j => j.pareja.indice === equipoRespondeIdx);
      const jugadorA = equipo[0];
      const jugadorB = equipo[1];

      if (jugadorA.tipo === 'ia' && jugadorB.tipo === 'ia') {
        const iaA = jugadorA as IA_Jugador;
        const iaB = jugadorB as IA_Jugador;

        const opinionA = iaA.calcularOpinionEnvido();
        const opinionB = iaB.calcularOpinionEnvido();

        console.log(`%c [COORDINACION ENVIDO] IA ${iaA.nombre} opina: ${opinionA.toUpperCase()}, IA ${iaB.nombre} opina: ${opinionB.toUpperCase()} `, 'color: #ffaa00;');

        const decisionFinal = (opinionA === 'quiero' || opinionB === 'quiero') ? 'quiero' : 'no quiero';
        const vocero = (opinionA === decisionFinal) ? iaA : iaB;

        const delay = Math.min(iaA.personaje.stats.inteligencia, iaB.personaje.stats.inteligencia) * 1000 + 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        // Verificar que la mano sigue activa y el envido sigue esperando
        if (!this.manoEnCurso) {
          console.warn(`%c [COORDINACION ENVIDO] Mano finalizó durante la espera. Se cancela la respuesta. `, 'color: #ff4444;');
        } else if (this.envidoEstado === 'CANTADO' && this.equipoQueCantoEnvido !== equipoRespondeIdx) {
          console.log(`%c [COORDINACION ENVIDO] Vocero ${vocero.nombre} habla: ${decisionFinal.toUpperCase()} `, 'color: #ffaa00;');
          await vocero.hablar(decisionFinal);
        }
      } else {
        const localPlayerIdx = this.service.myIndexInRoom;
        const isLocalPlayerResponding = (jugadorA.indice === localPlayerIdx || jugadorB.indice === localPlayerIdx);

        if (isLocalPlayerResponding) {
          const humano = (jugadorA.indice === localPlayerIdx) ? jugadorA : jugadorB;
          const compañero = (jugadorA.indice === localPlayerIdx) ? jugadorB : jugadorA;

          let opinionCompañero = 'quiero';
          if (compañero.tipo === 'ia') {
            opinionCompañero = (compañero as IA_Jugador).calcularOpinionEnvido();
          }

          const opinionTexto = opinionCompañero === 'quiero' ? 'QUIERO' : 'NO QUIERO';
          const mensaje = `${retador.nombre} cantó ENVIDO.\nTu compañero ${compañero.nombre} opina: ${opinionTexto}.\n¿Qué decides?`;

          await new Promise<void>(resolve => {
            this.service.phaser.emitter.emit('mostrarPregunta', {
              texto: mensaje,
              callback: async (aceptaHumano: boolean) => {
                // Si la mano terminó mientras el humano pensaba, descartar silenciosamente
                if (!this.manoEnCurso) {
                  console.warn(`%c [COORDINACION ENVIDO] Mano finalizó antes de que el humano respondiera. Se descarta. `, 'color: #ff4444;');
                  resolve();
                  return;
                }
                const opinionHumano = aceptaHumano ? 'quiero' : 'no quiero';
                // La decisión final la toma el humano (tiene la última palabra)
                const decisionFinal = opinionHumano;

                console.log(`%c [COORDINACION ENVIDO] Humano decide: ${opinionHumano.toUpperCase()}. Final (del humano): ${decisionFinal.toUpperCase()} `, 'color: #ffaa00;');

                await humano.hablar(decisionFinal);
                resolve();
              }
            });
          });
        } else {
          console.log(`%c [COORDINACION ENVIDO] Esperando respuesta remota... `, 'color: #ffaa00;');
          while (this.envidoEstado === 'CANTADO') {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }
    } finally {
      this.coordinandoRespuesta = false;
      console.log(`%c [COORDINACION ENVIDO] Coordinación completada. Lock liberado. `, 'color: #44ff44;');
    }
  }

  obtenerSnapshotEstado() {
    return {
      faseActual: this.faseActual,
      manoEnCurso: this.manoEnCurso,
      envidoEstado: this.envidoEstado,
      envidoPuntos: this.envidoPuntos,
      equipoQueCantoEnvido: this.equipoQueCantoEnvido,
      floresCantadas: Array.from(this.floresCantadas),
      
      // Partida
      puntos: this.partida.puntos,
      
      // Mano
      dealerIndex: this.dealer.indice,
      rondaActual: this.partida.manoActual.rondaActual,
      rondasGanadas: this.partida.manoActual.rondasGanadas,
      ganadoresRonda: this.partida.manoActual.ganadoresRonda,
      activa: this.partida.manoActual.activa,
      
      // Truco
      trucoEstado: this.truco.estado,
      trucoNivel: this.truco.nivel,
      trucoEquipoQueCanto: this.truco.equipoQueCanto,
      trucoEsperandoRespuesta: this.truco.esperandoRespuesta,
      
      // Turno
      turnoActual: this.turno.actual,

      // Cartas y manos
      jugadoresCartas: this.jugadores.map(j => ({
        indice: j.indice,
        enMano: j.enMano.map(c => c.nombre),
        mesaCartas: j.mesa.cartas.map(c => ({
          nombre: c.nombre,
          tapada: c.tapada
        }))
      })),
      
      // Vira card
      viraNombre: this.vira ? this.vira.nombre : null,
      
      // Cartas jugadas en la ronda actual
      cartasJugadas: this.partida.manoActual.cartasJugadas.map(cj => ({
        jugadorIndice: cj.jugador.indice,
        cartaNombre: cj.carta.nombre
      }))
    };
  }

  async aplicarSnapshotEstado(snapshot: any) {
    console.log('%c --- APLICANDO SNAPSHOT DE ESTADO DEL JUEGO --- ', 'background: #aa00ff; color: #fff; font-weight: bold;');
    
    // 1. Restaurar fases y flags
    this.faseActual = snapshot.faseActual;
    this.manoEnCurso = snapshot.manoEnCurso;
    this.envidoEstado = snapshot.envidoEstado;
    this.envidoPuntos = snapshot.envidoPuntos;
    this.equipoQueCantoEnvido = snapshot.equipoQueCantoEnvido;
    this.floresCantadas = new Set(snapshot.floresCantadas);
    
    // 2. Restaurar puntuación
    this.partida.puntos = [...snapshot.puntos];
    this.service.phaser.emitter.emit('puntosUpdated', this.partida.puntos);
    
    // 3. Restaurar mano
    this.dealer = this.jugadores[snapshot.dealerIndex];
    this.partida.manoActual.rondaActual = snapshot.rondaActual;
    this.partida.manoActual.rondasGanadas = [...snapshot.rondasGanadas];
    this.partida.manoActual.ganadoresRonda = [...snapshot.ganadoresRonda];
    this.partida.manoActual.activa = snapshot.activa;
    
    // 4. Restaurar Truco
    this.truco.estado = snapshot.trucoEstado;
    this.truco.nivel = snapshot.trucoNivel;
    this.truco.equipoQueCanto = snapshot.trucoEquipoQueCanto;
    this.truco.esperandoRespuesta = snapshot.trucoEsperandoRespuesta;
    
    // 5. Restaurar Turno
    this.turno.actual = snapshot.turnoActual;

    // 6. Restaurar Vira
    if (snapshot.viraNombre) {
      const vira = this.baraja.getCarta(snapshot.viraNombre);
      if (vira) {
        this.service.vira = vira;
        this.partida.manoActual.vira = vira;
        vira.destapar();
        
        // Colocar la vira en el mazo del dealer
        const rotation = this.dealer.rotation * (180 / Math.PI);
        const offset = this.dealer.setAngle(new Phaser.Math.Vector2(260 * this.service.escala, 200 * this.service.escala));
        vira.x = offset.x;
        vira.y = offset.y;
        vira.rotation = rotation * (Math.PI / 180);
      }
    }

    // 7. Colocar cartas físicas
    for (const jData of snapshot.jugadoresCartas) {
      const jugador = this.jugadores[jData.indice];
      
      // Limpiar listas físicas previas de cartas en mano y mesa sin perder interactividad
      jugador.mano.cartas = [];
      jugador.mesa.cartas = [];
      
      // Cartas en mano
      for (let index = 0; index < jData.enMano.length; index++) {
        const nombre = jData.enMano[index];
        const carta = this.baraja.getCarta(nombre);
        if (carta) {
          jugador.mano.add(carta);
          
          if (jugador.indice === this.service.myIndexInRoom) {
            carta.destapar(); // Mostrar al jugador local
            carta.setInteractive(true);
            this.service.main.input.setDraggable(carta, true);
          } else {
            carta.tapar();    // Ocultar para rivales e IAs
            carta.setInteractive(false);
          }
          
          // Posicionar físicamente en la mano usando la lógica de cogerAuto (dentro de mano.zone)
          const spacing = jugador.indice === this.service.myIndexInRoom ? 150 : 100;
          const baseScale = jugador.indice === this.service.myIndexInRoom ? this.service.escala * 1.5 : this.service.escala;
          const place = new Phaser.Math.Vector2((index - 1) * spacing * this.service.escala, 0);
          const spot = jugador.setAngle(place);
          
          carta.x = spot.x + jugador.mano.zone.x;
          carta.y = spot.y + jugador.mano.zone.y;
          carta.rotation = jugador.rotation;
          carta.scale = baseScale;
          carta.depth = 150;
        }
      }
      
      // Cartas en mesa
      for (let index = 0; index < jData.mesaCartas.length; index++) {
        const mData = jData.mesaCartas[index];
        const carta = this.baraja.getCarta(mData.nombre);
        if (carta) {
          jugador.mesa.add(carta);
          carta.setInteractive(false);
          
          if (mData.tapada) {
            carta.tapar();
          } else {
            carta.destapar();
          }
          
          // Posicionar físicamente en la zona de juego del jugador usando la lógica de lanzar (dentro de mesa.zone)
          const dy = index * 1 * this.service.escala;
          const vector = jugador.setAngle(new Phaser.Math.Vector2(0, dy));
          
          carta.x = vector.x + jugador.mesa.zone.x;
          carta.y = vector.y + jugador.mesa.zone.y;
          carta.rotation = jugador.rotation;
          carta.scale = this.service.escala;
          carta.depth = 100;
        }
      }
    }
    
    // 8. Reconstruir cartas jugadas en la ronda
    this.partida.manoActual.cartasJugadas = snapshot.cartasJugadas.map((cj: any) => ({
      jugador: this.jugadores[cj.jugadorIndice],
      carta: this.baraja.getCarta(cj.cartaNombre)
    }));

    // 9. Actualizar HUD y UI
    this.service.phaser.emitter.emit('estadoActualizado');
    console.log('%c --- SNAPSHOT DE ESTADO APLICADO CON ÉXITO --- ', 'background: #00ff66; color: #000; font-weight: bold;');
  }

  sincronizarEstadoServidor() {
    if (this.service.myIndexInRoom === 0) {
      const snapshot = this.obtenerSnapshotEstado();
      this.service.sendRoomAction('updateGameState', { snapshot });
    }
  }
}
