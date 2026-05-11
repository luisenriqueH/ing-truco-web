import { GameService } from "src/app/services/game.service";

import { IJugador } from "../jugadores/jugador";
import { Carta, ICarta } from "./carta";
import { IObjeto } from "./objeto";
import { DataBaraja } from "../data";
import { Zone } from "../ui";

export { Baraja, IBaraja };

interface IBaraja extends Phaser.GameObjects.Group, IObjeto {

  datos: DataBaraja;

  step: number;
  cartas: ICarta[];

  full: boolean;
  first: ICarta;
  last: ICarta;
  local: IJugador;
  dealer: IJugador;

  setCartas: () => void;
  setDatos: (carta: ICarta, n?: number, p?: number) => void;
  getCarta: (nombre: string) => ICarta;
  sacar: (i?: number) => ICarta;
  meter: (carta: ICarta) => void;

}

class Baraja extends Phaser.GameObjects.Group implements IBaraja {

  tipo = 'baraja';
  zone: Zone;

  step: number = 0.1 * this.escala;
  cartas: ICarta[] = [];
  salidas: ICarta[] = [];

  get escala() { return this.service.escala; }
  get main() { return this.service.main; }
  get juego() { return this.main.juego; }
  enMano: IJugador;
  enDrag: IObjeto;

  get full(): boolean { return this.getLength() === 40; }
  get first(): ICarta { return this.getFirst(true); }
  get last(): ICarta { return this.getLast(true); }
  get local(): IJugador { if (this.juego) { return this.juego.jugadores[0]; } }
  get dealer(): IJugador { if (this.juego) { return this.juego.dealer; } }
  get activa() { return this.zone.visible; }

  get x(): number { return this.first.x; }
  get y(): number { return this.first.y; }
  // get angle(): number { return this.first.angle; }
  get rotation(): number { return this.first.rotation; }
  get width(): number { return this.first.width; }
  get height(): number { return this.first.height; }
  get scale(): number { return this.first.scale; }
  get depth(): number { return this.first.depth; }

  get datos(): DataBaraja {
    const cartas = [];
    this.cartas.forEach((item) => {
      if (!this.contains(item)) {
        cartas.push(item.datos);
      }
    });
    // console.log(cartas);
    return {
      x: this.first.x, y: this.first.y, z: this.first.depth,
      angulo: this.first.angle,
      activa: this.activa, cartas
    };
  }
  set datos(data: DataBaraja) {
    this.first.setAngle(data.angulo);
    for (const item of data.cartas) {
      const carta = this.last;
      this.remove(carta);
      carta.datos = item;
    }
    this.ubicar(data.x, data.y);
    if (data.activa) { this.setInteractive(); }
  }

  constructor(public service: GameService, x: number, y: number) {
    super(service.main);
    this.render();
    this.ubicar(x, y);
  }

  setZone() {
    this.zone = new Zone(this.main, this.last.x, this.last.y, this.last.width, this.last.height, 0x00ff00, 0.2);
    this.zone.click = () => this.click();
    this.zone.dragstart = (pointer) => this.dragstart();
    this.zone.holdstart = (pointer) => this.holdstart();
    this.zone.drag = (pointer) => this.drag(pointer.worldX, pointer.worldY);
    this.zone.dragend = (pointer, dropped) => this.dragend(dropped);
    this.zone.drop = (pointer, dropZone) => this.enDrag.drop(dropZone);
    this.zone.dropped = (item: IObjeto) => this.dropped(item);
    this.zone.setDraggable(true);
    this.zone.name = 'baraja';
  }
  updateZone() {
    this.zone.update(this.last.x, this.last.y, this.last.rotation, this.last.scale, this.last.depth);
  }
  setInteractive() {
    this.updateZone();
    this.zone.setInteractive(true);
    return this;
  }
  disableInteractive() {
    this.zone.disableInteractive();
    return this;
  }

  click() {
    this.service.local.dragAuto(this, undefined, this.service.local.mesa.zone);
    // this.dropAuto(this.dealer.zone.mesa);
    // this.recoger();
  }
  hold() {
    // this.tomar();
  }
  holdstart() {
    this.enDrag = this;
    this.service.local.tomar(this);
  }
  dragstart() {
    const carta = this.sacar();
    this.enDrag = carta;
    carta.dragstart();
  }
  drag(worldX: number, worldY: number) {
    const item = this.enDrag;
    switch (item.tipo) {
      case 'carta': item.drag(worldX, worldY); break;
      case 'baraja': this.ubicar(worldX, worldY); break;

      default: break;
    }
  }
  dragend(dropped: boolean) {
    const item = this.enDrag;
    switch (item.tipo) {
      case 'carta': item.dragend(dropped); break;
      case 'baraja':
        if (!dropped) {
          this.service.local.soltar(this)
        }
        break;

      default: break;
    }
  }
  drop(dropZone: Zone) {
    dropZone.dropped(this);
  }
  dropped(item: IObjeto) {
    // jugador.enMano.pop();
    // console.log('dropped');
    switch (item.tipo) {
      case 'carta': this.meter(item as ICarta); break;
      case 'baraja': this.updateZone(); break;

      default: break;
    }
  }

  ubicar(x: number, y: number) {
    this.children.each((carta: ICarta, i: number) => {
      carta.setRotation(this.first.rotation);
      carta.ubicar(x + (i * this.step), y + (i * this.step), i + 1);
    });
  }

  tween(props: any, duration: number = 500, onStart?: () => void, onComplete?: () => void) {
    const value: (pipe: (i: number) => number) => Phaser.Types.Tweens.TweenPropConfig = (pipe: (i: number) => number) => {
      return {
        value: {
          getEnd: (target, key, value, targetIndex, totalTargets, tween) => {
            return pipe(targetIndex);
          }
        }
      }
    }

    let pipe: (i: number) => number;
    for (const key of Object.keys(props)) {
      const base = props[key];
      switch (key) {
        case 'x': case 'y':
          pipe = (i: number) => { return base + (i * this.step); };
          break;
        case 'depth':
          pipe = (i: number) => { return base + i; };
          break;

        default:
          pipe = (i: number) => { return base; };
          break;
      }
      if (pipe) {
        props[key] = value(pipe);
      }
    }

    const config: Phaser.Types.Tweens.TweenBuilderConfig = {
      targets: this.getChildren(),
      props,
      duration,
      ease: 'Cubic.easeOut',
      onStart, onComplete
    }
    this.scene.tweens.add(config);
  }

  render() {
    this.setCartas();
    this.setZone();
  }
  setCartas() {
    for (let i = 0; i < 40; i++) {
      const carta = new Carta(this.service, 0, 0);
      carta.setScale(this.escala);
      this.cartas.push(carta);
      this.add(carta);
    }
  }
  setDatos(carta: ICarta, n?: number, p?: number) {
    const quedan = this.getChildren().find((item: ICarta) => { return item.nombre === 'carta'; });
    if (!quedan) { console.log('quedan', carta.nombre); return; }
    let filter: any[] = undefined;
    do {
      carta.setDatos(n, p);
      filter = this.cartas.filter((item) => {
        return (item.numero === carta.numero && item.pinta === carta.pinta);
      });
    } while (filter.length > 1);
  }
  getCarta(nombre: string): ICarta {
    return this.cartas.find((item) => item.nombre === nombre);
  }
  sacar(i?: number): ICarta {
    if (this.getLength() === 0) { console.log('vacio'); return; }
    const carta = this.last;
    const n = i % 10; const p = Math.floor(i / 10);
    // console.log('sacar', n , p);
    this.setDatos(carta, n, p);
    this.remove(carta);
    this.salidas.push(carta);
    this.updateZone();
    return carta;
  }
  meter(carta: ICarta) {
    // console.log('meter');
    const i = this.getLength();
    if (!carta.tapada) { carta.voltear(); }
    const props = {
      x: this.last.x + this.step,
      y: this.last.y + this.step,
      scale: this.escala, angle: this.first.angle,
      depth: i + 1
    };
    const onStart = () => {
      carta.setAlpha(1);
    };
    const onComplete = () => {
      carta.disableInteractive();
      carta.clear();
      this.add(carta);
      if (this.full) {
        this.service.phaser.emitter.emit('barajaFull');
      }
      this.updateZone();
    };
    // console.log('meter');
    carta.tween(props, 100, onStart, onComplete);
  }

}
