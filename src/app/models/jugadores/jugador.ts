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
  enMano: IObjeto[];

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

  distancia: (spot: Phaser.Math.Vector2) => Phaser.Math.Vector2 ;
  unsetAngle: (vector: Phaser.Math.Vector2) => Phaser.Math.Vector2 ;
  setAngle: (vector: Phaser.Math.Vector2) => Phaser.Math.Vector2 ;
  next: (delta: number) => IJugador;

  setMano: () => void;
  setMesa: () => void;
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

}

class Jugador implements IJugador {

  tipo = 'jugador';
  internal = new Phaser.Events.EventEmitter();

  face: Phaser.GameObjects.Image;
  onView: IJugador[] = [];
  pareja: Equipo;
  enMano: IObjeto[] = [];

  mano: Mano;
  mesa: Mesa;

  // #region info
  get screen() { return this.service.phaser.screen; }
  get main(): Main { return this.service.main; }
  get juego(): Juego { return this.main.juego; }
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
    this.render();
    this.setMano();
    this.setMesa();

    const config = {
      mute: false,
      volume: 1,
      rate: 1,
      detune: 0,
      seek: 0,
      loop: false,
      delay: 0
    };
    this.speech = this.main.sound.addAudioSprite('voces/miguel', config);
    // this.sound.play('envido');
  }

  render() {
    const label = this.main.add.text(0, 0, this.nombre);
    let menos = (80 * this.service.escala);
    if (this.indice === 0) { menos = -menos; }
    label.setOrigin(0.5, 0.5);
    label.setPosition(this.facePlace.x, this.facePlace.y + menos);
    label.setFontSize(12);
  }
  setMano() {
    this.mano = new Mano(this);
  }
  setMesa() {
    this.mesa = new Mesa(this);
  }
  update() {
    console.log(this.onView);
  }

  // #region zone
  mesaDrop(carta: ICarta) {
    this.recibir(carta);
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
      item.tween(props, 100, onStart, onComplete);
    });

  }
  soltar(item: IObjeto, zone?: Zone, delta?: any): Promise<IObjeto> {

    item.enMano = undefined;
    this.enMano = this.enMano.filter((a) => a !== item);
    return new Promise((resolve) => {
      const onComplete = () => {
        // this.service.data.update();
        item.updateZone();
        item.setInteractive();
        resolve(item);
      }

      const props = { x: item.x, y: item.y, rotation: item.rotation, scale: item.escala, depth: 0 };
      if (zone) { props.x = zone.x; props.y = zone.y; props.rotation = zone.rotation; }
      if (delta) {
        for (const key of Object.keys(delta)) {
          props[key] += delta[key];
        }
      }
      item.tween(props, 100, undefined, onComplete);

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
      const props = {
        x: spot.x, y: spot.y,
        scale: 2 * this.service.escala,
        rotation: this.rotation,
        depth: 100,
      };
      const onComplete = () => {
        this.mano.add(carta);

        this.main.children.bringToTop(carta);
        carta.updateZone();
        resolve();
      };
      carta.tween(props, 200, undefined, onComplete);
    });
  }
  lanzar(carta: ICarta, quemar: boolean = false): Promise<void> {
    return new Promise((resolve) => {
      // this.tomar(carta);
      // const dx = (Math.random() - 0.5) * 5;
      const dy = (this.mesa.cartas.length - 1) * 40;
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
      const onStart = () => this.tomar(item);
      const onComplete = () => {
        // console.log(props);
        if (zone) {
          zone.dropped(item);
          resolve()
        } else {
          this.soltar(item, zone/*, props*/).then(() => resolve());
        }
      }
      item.tween(props, 200, onStart, onComplete);
    });
  }
  cogerAuto(carta: ICarta, indice: number): Promise<void> {
    return new Promise((resolve) => {
      const place = new Phaser.Math.Vector2((indice - 1) * 200 * this.service.escala, 0);
      const spot = this.setAngle(place);
      const props = { x: spot.x, y: spot.y, rotation: this.rotation };
      // console.log('cogerAuto', this.nombre, carta.nombre, props, this.mano.zone);
      this.dragAuto(carta, props, this.mano.zone)
        .then(() => {
          carta.tapar();
          resolve()
        });
    });
  }
  // #endregion mano

}
