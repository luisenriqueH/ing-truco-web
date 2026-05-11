import { GameService } from '../../../app/services/game.service';

import { Main } from '../../scenes/main';
import { DataObjeto } from '../data';
import { IJugador } from '../jugadores/jugador';
import { Zone } from "../ui";

export { Objeto, IObjeto, IProps, applyMixins };

interface IObjeto {

  service: GameService;
  escala: number;
  main: Main;
  enMano: IJugador;
  // juego: Juego;

  x: number; y: number;
  rotation: number;
  width: number;
  height: number;
  scale: number;
  depth: number;

  tipo: string;
  datos: DataObjeto;
  zone: Zone;

  activa: boolean;

  setZone: () => void;
  updateZone: () => void;
  setInteractive(shape?: any, callback?: Phaser.Types.Input.HitAreaCallback, dropZone?: boolean): this;
  disableInteractive: () => this;

  click: () => void;
  hold: () => void;
  dragstart: () => void;
  holdstart: () => void;
  drag: (worldX?: number, worldY?: number) => void;
  dragend: (dropped?: boolean) => void;
  drop: (dropZone: Zone) => void;
  dropped: (item: IObjeto) => void;

  isAuto?: boolean;
  ubicar(x: number, y: number, z?: number): void;

  tween: (props: IProps, duration: number, onStart?: () => void, onComplete?: () => void) => void;

}

class Objeto implements IObjeto {

  get escala() { return this.service.escala; }
  get main() { return this.service.main; }
  // get juego() { return this.main.juego; }
  enMano: IJugador;

  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  scale: number;
  depth: number;

  tipo = 'carta';
  isAuto: boolean = false;
  datos: DataObjeto;
  zone: Zone;

  get activa() { return this.zone.visible; }

  constructor(public service: GameService, x: number, y: number) {
    this.setZone();
  }

  setZone() {
    this.zone = new Zone(this.main, this.x, this.y, this.width, this.height, 0xffffff, 0.2);
    this.zone.click = () => this.click();
    this.zone.dragstart = (pointer) => this.dragstart();
    this.zone.holdstart = (pointer) => this.holdstart();
    this.zone.drag = (pointer) => this.drag(pointer.worldX, pointer.worldY);
    this.zone.dragend = (pointer, dropped) => this.dragend(dropped);
    this.zone.drop = (pointer, dropZone) => this.drop(dropZone);
    this.zone.dropped = (item: IObjeto) => this.dropped(item);
    this.zone.setDraggable(true);
    // this.zone.name = this.nombre;
  }
  updateZone() {
    this.zone.update(this.x, this.y, this.rotation, this.scale, this.depth);
  }
  setInteractive() {
    this.updateZone();
    this.zone.setInteractive(false);
    return this;
  }
  disableInteractive() {
    this.zone.disableInteractive();
    return this;
  }

  click() { }
  hold() { }
  dragstart() { }
  holdstart() { }
  drag(worldX: number, worldY: number) { }
  dragend(dropped: boolean) { }
  drop(dropZone: Zone) { }
  dropped(item: IObjeto) { }

  ubicar(x: number, y: number, z?: number) { }

  tween(props: any, duration: number, onStart?: () => void, onComplete?: () => void) { }

}

interface IProps {
  [key: string]: string | number | Phaser.Types.Tweens.GetEndCallback | Phaser.Types.Tweens.TweenPropConfig;
}
function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach(baseCtor => {
      Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
           if (name !== 'constructor') {
              derivedCtor.prototype[name] = baseCtor.prototype[name];
          }
      });
  });
}
