import { GameService } from "src/app/services/game.service";

import { Main } from "src/assets/scenes/main";
import { Juego } from "../reglas/juego";
import { Equipo } from "./equipo";
import { Mano } from "./cartas/mano";
import { Mesa } from "./cartas/mesa";
import { IBaraja } from "../cartas/baraja";
import { ICarta } from "../cartas/carta";
import { IObjeto } from "../cartas/objeto";
import { DataJugador } from "../data";
import { Zone } from "../ui";

export { Jugador, IJugador };

interface IJugador {

  tipo: string;
  internal: Phaser.Events.EventEmitter;

  face: Phaser.GameObjects.Image;
  onView: IJugador[];
  pareja: Equipo;
  enMano: ICarta[];

  mano: Mano;
  mesa: Mesa;

  main: Main;
  juego: Juego;
  service: GameService;
  facePlace: Phaser.Math.Vector2;
  lugar: Phaser.Math.Vector2;
  rotation: number;
  baraja: IBaraja;

  datos: DataJugador;
  nombre: string;
  label: Phaser.GameObjects.Text;
  highlight: Phaser.GameObjects.Graphics;

  distancia: (spot: Phaser.Math.Vector2) => Phaser.Math.Vector2 ;
  unsetAngle: (vector: Phaser.Math.Vector2) => Phaser.Math.Vector2 ;
  setAngle: (vector: Phaser.Math.Vector2) => Phaser.Math.Vector2 ;
  next: (delta: number) => IJugador;

  setMano: () => void;
  setMesa: () => void;
  setHighlight: (yes: boolean) => void;
  ver: (indice: number, yes: boolean) => void;

  mesaDrop: (carta: ICarta) => void;

  tomar: (item: IObjeto) => Promise<void>;
  soltar: (item: IObjeto, zone?: Zone, delta?: any) => Promise<IObjeto>;

  dealer: () => void;
  repartir: (indice: number[]) => Promise<void>;
  recoger: () => Promise<void>;
  setDatos: (carta: ICarta) => void;

  recibir: (carta: ICarta) => void;
  coger: (carta: ICarta) => Promise<void>;
  lanzar: (carta: ICarta, quemar: boolean) => Promise<void>;

  dragAuto: (item: IObjeto, props?: any, zone?: Zone) => Promise<void>;
  cogerAuto: (carta: ICarta, indice: number) => Promise<void>;

  hablar: (texto: string) => Promise<void>;
  signal: (faceID: string) => Promise<void>;
  onContarPuntos: () => Promise<void>;

}

class Jugador implements IJugador {

  tipo = 'humano';
  internal = new Phaser.Events.EventEmitter();

  face: Phaser.GameObjects.Image;
  onView: IJugador[] = [];
  estaContando: boolean = false;
  pareja: Equipo;
  get enMano(): ICarta[] {
    return this.mano ? this.mano.cartas : [];
  }

  mano: Mano;
  mesa: Mesa;

  label: Phaser.GameObjects.Text;
  highlight: Phaser.GameObjects.Graphics;

  // #region info
  get screen() { return this.service.phaser.screen; }
  get main(): Main { return this.service.main; }
  get juego(): Juego { return this.service.juego; }
  get facePlace(): Phaser.Math.Vector2 {
    return this.setAngle(new Phaser.Math.Vector2(0, (3 * this.screen.h / 4) - (80 * this.service.escala)));
    // return this.setAngle(new Phaser.Math.Vector2(0, (3 * screen.h / 4) - (800 * this.scene.escala)));
  }
  get lugar(): Phaser.Math.Vector2 {
    /*
    switch (this.indice) {
      case 0: return new Phaser.Math.Vector2(0, screen.h / 2);
      case 1: return new Phaser.Math.Vector2(screen.w / 2, 0);
      case 2: return new Phaser.Math.Vector2(0, -screen.h / 2);
      case 3: return new Phaser.Math.Vector2(-screen.w / 2, 0);
    }
    */
    return this.setAngle(new Phaser.Math.Vector2(0, this.screen.h / 2));
  }
  get rotation(): number {
    switch (this.indice) {
      case 0: return 0;
      case 1: return -Math.PI / 2;
      case 2: return -Math.PI;
      case 3: return Math.PI / 2;

      default: return this.indice * Math.PI / 2;
    }
  }
  get baraja(): IBaraja {
    // return this.juego.baraja;
    return this.juego.baraja;
  }
  get manoLog(): any { return this.mano.log; } ////////
  get mesaLog(): any { return this.mesa.log; }

  get datos(): DataJugador {
    const mano = [];
    const mesa = [];
    for (const item of this.mano.cartas) {
      mano.push(item.datos)
    }
    for (const item of this.mesa.cartas) {
      mesa.push(item.datos)
    }
    return { mano, mesa };
  }
  set datos(data: DataJugador) {
    const baraja = this.baraja;
    for (const item of data.mano) {
      const carta = baraja.getCarta(item.nombre);
      this.coger(carta);
    }
    for (const item of data.mesa) {
      const carta = baraja.getCarta(item.nombre);
      this.recibir(carta);
    }
  }

  distancia(spot: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const d = spot.clone().subtract(this.lugar);
    this.unsetAngle(d);
    return d;
  }
  unsetAngle(vector: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    vector.rotate(-this.rotation);
    return vector;
  }
  setAngle(vector: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    vector.rotate(this.rotation);
    return vector;
  }
  next(delta: number): IJugador {
    const i = (this.indice + 4 + delta) % 4;
    // return this.juego.jugadores[i];
    return this.juego.jugadores[i];
  }
  // #endregion info

  // <= barajaFull
  // <= manoOn
  // <= manoOff

  // manoOn =>
  // manoUp =>
  // mesaFull =>
  speech: Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound;
  constructor(public service: GameService, public nombre: string, public indice: number) {
    this.setMano();
    this.setMesa();
    this.render();

    const config = {
      mute: false,
      volume: 1,
      rate: 1,
      detune: 0,
      seek: 0,
      loop: false,
      delay: 0
    };

    const normName = this.nombre.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/__+/g, '_');
    const key = `voces/${normName}`;
    const voiceKey = this.main.cache.audio.exists(key) ? key : 'voces/miguel';
    this.speech = this.main.sound.addAudioSprite(voiceKey, config);
    // this.sound.play('envido');

    // Escuchar evento para iniciar el conteo (todos los jugadores)
    this.service.phaser.emitter.on('contarPuntosStarted', () => this.onContarPuntos());
  }

  render() {
    if (!this.label) {
      this.label = this.main.add.text(0, 0, this.nombre);
      this.label.setOrigin(0.5, 0.5);
      this.label.setFontSize(12);
    }
    let menos = (80 * this.service.escala);
    if (this.indice === 0) { menos = -menos; }
    if (!this.highlight) {
      this.highlight = this.main.add.graphics();
      this.highlight.setDepth(-1);
    }
    this.highlight.clear();
    this.highlight.fillStyle(0xffffff, 0.2);
    this.highlight.fillCircle(0, 0, 40 * this.service.escala);
    this.highlight.setPosition(this.facePlace.x, this.facePlace.y);
    this.highlight.setVisible(false); // Default to hidden

    this.label.setPosition(this.facePlace.x, this.facePlace.y + menos);
    this.mano.setZone();
    this.mesa.setZone();
  }
  setMano() {
    this.mano = new Mano(this);
  }
  setMesa() {
    this.mesa = new Mesa(this);
  }
  setHighlight(value: boolean) {
    if (this.face) {
      this.face.setAlpha(value ? 1 : 0.5);
    }
    // Resaltar las cartas en mano si es el turno del jugador
    if (this.mano && this.mano.cartas) {
      this.mano.cartas.forEach((carta: ICarta) => {
        carta.setAlpha(value ? 1 : 0.8);
        
        // SOLO modificar escala si la carta NO se está animando (ej: repartiendo o moviéndose)
        if (!this.main.tweens.isTweening(carta)) {
          const baseScale = this.indice === 0 ? this.service.escala * 1.5 : this.service.escala;
          if (value) {
            carta.setScale(baseScale * 1.15);
            carta.setDepth(200);
          } else {
            carta.setScale(baseScale);
            carta.setDepth(150);
          }
          carta.updateZone();
        }
      });
    }

    // Mostrar/Ocultar la zona de la mesa según el turno
    if (this.mesa && this.mesa.zone) {
      if (value) {
        this.mesa.zone.setVisible(true);
        this.mesa.zone.setInteractive(true);
      } else {
        this.mesa.zone.setVisible(false);
        this.mesa.zone.setInteractive(false);
      }
    }

    if (this.highlight) {
      this.highlight.setVisible(value);
      if (value) {
        this.main.tweens.add({
          targets: this.highlight,
          alpha: { from: 0.2, to: 0.5 },
          duration: 500,
          yoyo: true,
          repeat: -1
        });
      } else {
        this.main.tweens.killTweensOf(this.highlight);
      }
    }
  }

  update() {
    console.log(this.onView);
  }

  // #region zone
  mesaDrop(carta: ICarta) {
    this.recibir(carta);
    
    // IMPORTANTE: Registrar la jugada para que cuente al evaluar la ronda
    if (!this.juego.onJuego) {
      this.juego.partida.manoActual.registrarJugada(this, carta);
      console.log(`%c ${this.nombre} (Humano) juega ${carta.numero} de ${carta.pinta} `, 'color: #aaa;');
      this.service.phaser.emitter.emit('cardPlayed', { jugador: this, carta });
      this.juego.proximoTurno();
    }
  }
  // #endregion zone

  tomar(item: IObjeto): Promise<void> {

    item.enMano = this;
    this.enMano.push(item);
    return new Promise((resolve) => {
      const props = { scale: 3 * this.service.escala / 2, depth: 50, rotation: this.rotation };
      const onStart = () => {
        switch (item.tipo) {
          case 'carta':
            const carta = item as ICarta;
            if (carta.jugador) {
              carta.jugador.mano.remove(carta);
              carta.jugador.mesa.remove(carta);
            } else {
              this.mano.remove(carta);
              this.mesa.remove(carta);
            }
            break;

          default:
            break;
        }
        item.disableInteractive();
      };
      const onComplete = () => {
        item.updateZone();
        resolve();
      }
      item.tween(props, 400, onStart, onComplete);
    });

  }
  soltar(item: IObjeto, zone?: Zone, delta?: any): Promise<IObjeto> {
    item.enMano = undefined;
    return new Promise((resolve) => {
      const onComplete = () => {
        // this.service.data.update();
        if (zone?.name === 'mesa' && item.tipo === 'carta') {
          this.mesa.add(item as ICarta);
        }
        item.updateZone();
        item.setInteractive();
        resolve(item);
      }

      const props = { x: item.x, y: item.y, rotation: item.rotation, scale: this.service.escala, depth: 0 };
      if (zone) { props.x = zone.x; props.y = zone.y; props.rotation = zone.rotation; }
      if (delta) {
        for (const key of Object.keys(delta)) {
          props[key] += delta[key];
        }
      }
      const onStart = () => {
        if (zone?.name === 'mesa' && item.tipo === 'carta') {
          this.mano.remove(item as ICarta);
        }
      };

      item.tween(props, 400, onStart, onComplete);

    });

  }

  // #region dealer
  dealer(): void {
    // setDealer(this);
    const baraja = this.baraja;

    setTimeout(() => {
      this.dragAuto(baraja, undefined, this.mesa.zone);
    }, 500);
  }
  repartir(indice = []): Promise<void> {
    return new Promise((resolve, rejected) => { resolve(); });
  }
  recoger(): Promise<void> {
    return new Promise((resolve, rejected) => { resolve(); });
  }
  setDatos(carta: ICarta) {
    this.baraja.setDatos(carta);
  }
  // #endregion dealer

  // #region carta
  recibir(carta: ICarta): void {
    this.mesa.add(carta);
  }
  coger(carta: ICarta): Promise<void> {
    // console.log('coger', carta, carta.x, carta.y);
    return new Promise((resolve) => {
      const distancia = this.distancia(new Phaser.Math.Vector2(carta.x, carta.y));
      const place = new Phaser.Math.Vector2(distancia.x, 0);
      place.add(this.unsetAngle(this.lugar));
      const spot = this.setAngle(place);
      const baseScale = this.indice === 0 ? this.service.escala * 1.5 : this.service.escala;
      const props = {
        x: spot.x, y: spot.y,
        scale: baseScale,
        rotation: this.rotation,
        depth: 150,
      };
      const onComplete = () => {
        this.mesa.remove(carta); // Quitar de la mesa
        this.mano.add(carta);    // Añadir a la mano

        this.main.children.bringToTop(carta);
        carta.updateZone();
        resolve();
      };
      carta.tween(props, 600, undefined, onComplete);
    });
  }
  lanzar(carta: ICarta, quemar: boolean = false): Promise<void> {
    return new Promise((resolve) => {
      // this.tomar(carta);
      // const dx = (Math.random() - 0.5) * 5;
      const dy = (this.mesa.cartas.length - 1) * 1 * this.service.escala;
      const vector = this.setAngle(new Phaser.Math.Vector2(0, dy));
      this.mano.remove(carta);
      this.dragAuto(carta, { x: vector.x, y: vector.y }, this.mesa.zone)
        .then(() => {
          if (quemar) { carta.tapar(); }
          else { carta.destapar(); }
          resolve();
        });
    });
  }
  // #endregion carta

  async hablar(texto: string): Promise<void> {
    console.log(`%c [HABLAR] ${this.nombre}: "${texto}" `, 'color: #00ffcc; font-weight: bold;');
    await Promise.all([
      this.play(texto),
      this.juego.hablar({ jugador: this, texto })
    ]);
  }

  async onContarPuntos(): Promise<void> {
    if (this.estaContando) return;
    this.estaContando = true;
    console.log(`%c [EVENTO] ${this.nombre} inicia su proceso de conteo. `, 'color: #00ccff;');

    // 1. Tomar las cartas que están en su mesa (las que ha jugado)
    if (this.mesa.cartas.length > 0) {
      await this.mano.cogerMano();
    }

    // 2. SEGURIDAD: Esperar a tener las 3 cartas antes de revelar
    // Si por animaciones o lag aún no están las 3, esperamos al evento 'manoFull'
    if (this.enMano.length < 3) {
      console.log(`%c [ESPERA] ${this.nombre} esperando completar su mano (actual: ${this.enMano.length})... `, 'color: #aaaaaa;');
      await new Promise(resolve => {
        const timeout = setTimeout(() => {
          console.warn(`%c [TIMEOUT] ${this.nombre} no completó su mano a tiempo. `, 'color: #ff0000;');
          resolve(false);
        }, 3000);

        this.service.phaser.emitter.once('manoFull', (j: any) => {
          if (j === this) {
            clearTimeout(timeout);
            resolve(true);
          }
        });
      });
    }

    // 3. Revelar y colocar todas las cartas una al lado de la otra
    const todasLasCartas = [...this.enMano];
    
    if (todasLasCartas.length < 3) {
      console.warn(`%c ${this.nombre} intenta contar con ${todasLasCartas.length} cartas. Deberían ser 3. `, 'color: #ffaa00;');
    }

    todasLasCartas.forEach(c => { if (c.tapada) c.destapar(); });

    const promesasAnim = todasLasCartas.map((carta, i) => {
      return new Promise<void>(resolve => {
        const areaMesa = this.mesa.zone;
        const spacing = 75 * this.service.escala; // Más compacto para evitar colisiones laterales
        
        // Desplazamos más hacia afuera del centro para ganar espacio
        const offsetAlCentro = 120 * this.service.escala;
        const centroX = areaMesa.x + Math.cos(this.rotation + Math.PI/2) * offsetAlCentro;
        const centroY = areaMesa.y + Math.sin(this.rotation + Math.PI/2) * offsetAlCentro;

        // Centrar la fila de cartas respecto a la rotación del jugador
        const totalWidth = (todasLasCartas.length - 1) * spacing;
        const startX = centroX - (totalWidth / 2) * Math.cos(this.rotation);
        const startY = centroY - (totalWidth / 2) * Math.sin(this.rotation);

        const targetX = startX + (i * spacing) * Math.cos(this.rotation);
        const targetY = startY + (i * spacing) * Math.sin(this.rotation);

        this.main.tweens.add({
          targets: carta,
          x: targetX,
          y: targetY,
          scale: this.service.escala * 1.1, // Escala ligeramente menor para mayor claridad
          rotation: areaMesa.rotation,
          depth: 3000 + i,
          duration: 800,
          ease: 'Back.easeOut',
          onComplete: () => resolve()
        });
      });
    });
    await Promise.all(promesasAnim);
  }

  onTrucoPrompt(data: { jugador: any, nivel: number, texto: string }) {
    console.log(`%c [PROMPT] Mostrando overlay de Truco al Humano `, 'color: #00ffff;');
    
    // El sistema de UI ya tiene un 'mostrarPregunta' que recibe texto y un callback booleano
    // Para el Truco, usaremos el mismo patrón:
    const nivelNombre = this.juego.truco.getNombreNivel(data.nivel);
    const mensaje = `${data.jugador.nombre} cantó ${nivelNombre.toUpperCase()}. ¿Aceptas?`;

    this.service.phaser.emitter.emit('mostrarPregunta', {
      texto: mensaje,
      callback: (acepta: boolean) => {
        const respuesta = acepta ? 'quiero' : 'no quiero';
        this.hablar(respuesta);
      }
    });
  }

  onEnvidoPrompt(data: { jugador: any, puntos: number }) {
    console.log(`%c [PROMPT] Mostrando overlay de Envido al Humano `, 'color: #ffff00;');
    const mensaje = `${data.jugador.nombre} cantó ENVIDO. ¿Aceptas?`;

    this.service.phaser.emitter.emit('mostrarPregunta', {
      texto: mensaje,
      callback: (acepta: boolean) => {
        const respuesta = acepta ? 'quiero' : 'no quiero';
        this.hablar(respuesta);
      }
    });
  }
  parseTextToMarkers(texto: string): string[] {
    const clean = texto.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[¡!¿?()]/g, "") // Remove punctuation/brackets
      .trim();

    // Extract any number between 3 and 60
    const numMatch = clean.match(/\b\d+\b/);
    const numberStr = numMatch ? numMatch[0] : null;

    if (numberStr) {
      const num = parseInt(numberStr, 10);
      if (num >= 3 && num <= 60) {
        if (clean.includes("con mi flor")) {
          return ["con mi flor ", numberStr];
        } else if (clean.includes("flor")) {
          return ["tengo flor de ", numberStr];
        } else {
          return ["tengo ", numberStr];
        }
      }
    }

    // Keyword mapping for clean text
    if (clean === "quiero") return ["quiero"];
    if (clean === "no quiero") return ["no quiero"];
    if (clean === "truco") return ["truco"];
    if (clean === "retruco") return ["retruco"];
    if (clean === "vale 9" || clean === "vale nueve") return ["vale 9"];
    if (clean === "vale 12" || clean === "vale doce") return ["vale 12"];
    if (clean === "vale juego") return ["vale juego"];
    if (clean === "envido" || clean === "real envido" || clean === "falta envido") return ["envido"];
    if (clean === "flor") return ["flor"];
    if (clean === "tengo flor") return ["tengo flor"];
    if (clean.includes("mate")) return ["mate!"];
    if (clean.includes("ganamos")) return ["ganamos!"];

    // Fallbacks for substring matches
    if (clean.includes("no quiero")) return ["no quiero"];
    if (clean.includes("quiero")) return ["quiero"];
    if (clean.includes("retruco")) return ["retruco"];
    if (clean.includes("truco")) return ["truco"];
    if (clean.includes("envido")) return ["envido"];
    if (clean.includes("flor")) return ["flor"];

    return [];
  }

  async playVoiceSequence(markers: string[]): Promise<void> {
    for (const marker of markers) {
      if (this.speech && (this.speech as any).markers && (this.speech as any).markers[marker]) {
        const markerInfo = (this.speech as any).markers[marker];
        const durationMs = (markerInfo.duration || 0.8) * 1000;
        
        console.log(`%c [SPEECH] ${this.nombre} reproduce "${marker}" (${durationMs}ms) `, 'color: #ffaa00;');
        this.speech.play(marker);
        
        await new Promise<void>((resolve) => {
          setTimeout(resolve, durationMs);
        });
      } else {
        console.warn(`%c [SPEECH] Marcador "${marker}" no encontrado en el spritemap del jugador ${this.nombre} `, 'color: #ffaa00;');
      }
    }
  }

  async play(texto: string): Promise<void> {
    const markers = this.parseTextToMarkers(texto);
    if (markers.length === 0) {
      return Promise.resolve();
    }
    await this.playVoiceSequence(markers);
  }
  signal(faceID: string): Promise<void> {
    return new Promise((resolve) => {
      this.face.setFrame(faceID);
      setTimeout(() => {
        this.face.setFrame('smile');
        resolve();
      }, 1000);
    });
  }
  ver(indice: number, yes: boolean) {
    const jugador = this.next(indice);
    const pareja = jugador.pareja === this.pareja;
    // console.log(this.nombre, 'ver', jugador.nombre, yes);
    if (yes) {
      jugador.onView.push(this);
    } else {
      jugador.onView = jugador.onView
        .filter((item) => item !== this);
    }
  }

  // #region auto
  dragAuto(item: IObjeto, props?: any, zone?: Zone): Promise<void> {
    if (zone) {
      if (!props) { props = { x: 0, y: 0, rotation: 0 }; }
      for (const key of Object.keys(props)) {
        props[key] += zone[key];
      }
    }
    // console.log('dragAuto', this.nombre, props, zone);
    return new Promise((resolve) => {
      item.isAuto = true; // Marcamos como movimiento automático
      item.tween(props, 500, undefined, () => {
        if (zone) {
          zone.dropped(item);
        }
        item.isAuto = false; // Ahora sí terminó
        resolve();
      });
    });
  }
  cogerAuto(carta: ICarta, indice: number): Promise<void> {
    return new Promise((resolve) => {
      // Ajustar espaciado según la escala (200 para local, 150 para otros)
      const spacing = this.indice === 0 ? 150 : 100;
      const baseScale = this.indice === 0 ? this.service.escala * 1.5 : this.service.escala;
      
      const place = new Phaser.Math.Vector2((indice - 1) * spacing * this.service.escala, 0);
      const spot = this.setAngle(place);
      const props = { 
        x: spot.x, 
        y: spot.y, 
        rotation: this.rotation, 
        scale: baseScale,
        depth: 150
      };
      // console.log('cogerAuto', this.nombre, carta.nombre, props, this.mano.zone);
      this.dragAuto(carta, props, this.mano.zone)
        .then(() => {
          if (this.tipo === 'humano') {
            carta.destapar(); // Mostrar al jugador local
          } else {
            carta.tapar();    // Ocultar para IAs
          }
          resolve()
        });
    });
  }
  // #endregion mano

}
