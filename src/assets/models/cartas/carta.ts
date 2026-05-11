import { GameService } from 'src/app/services/game.service';

import { IJugador } from "../jugadores/jugador";
import { IObjeto } from './objeto';
import { DataCarta } from '../data';
import { Zone } from "../ui";

export { Carta, ICarta };

interface ICarta extends Phaser.GameObjects.Sprite, IObjeto {

  datos: DataCarta;

  numero: string; pinta: string;
  nombre: string;

  jugador: IJugador;

  tapada: boolean;

  clear: () => void;
  setDatos: (n?: number, p?: number) => void;
  voltear: () => void;
  tapar: () => void;
  destapar: () => void;
  updateZone: () => void;

}

class Carta extends Phaser.GameObjects.Sprite implements ICarta {

  tipo = 'carta';
  zone: Zone;

  numero: string; pinta: string;
  jugador: IJugador;

  get escala() { return this.service.escala; }
  get main() { return this.service.main; }
  get juego() { return this.main.juego; }
  enMano: IJugador;

  get nombre() {
    if (this.numero && this.pinta) {
      return this.numero + ' de ' + this.pinta;
    } else { return 'carta'; }
  }
  get frameID() { return this.numero + 'de' + this.pinta; }
  get tapada() { return this.frame.name === 'reverso'; }
  get activa() { return this.zone.visible; }

  get datos(): DataCarta {
    return {
      x: this.x, y: this.y, z: this.depth,
      angulo: this.angle,
      nombre: this.nombre,
      numero: this.numero, pinta: this.pinta,
      tapada: this.tapada, activa: this.activa
    };
  }
  set datos(data: DataCarta) {
    this.ubicar(data.x, data.y, data.z);
    this.numero = data.numero;
    this.pinta = data.pinta;
    this.setAngle(data.angulo);
    if (!data.tapada) { this.destapar(); }
    if (data.activa) { this.setInteractive(); }
  }

  constructor(public service: GameService, x: number, y: number) {
    super(service.main, x, y, 'naipes', 'reverso');

    this.setScale(this.escala);
    this.setZone();

    service.main.children.add(this);
  }

  clear() {
    this.jugador = undefined;
    this.numero = undefined;
    this.pinta = undefined;
  }

  setZone() {
    this.zone = new Zone(this.main, this.x, this.y, this.width, this.height, 0xffffff, 0.0);
    this.zone.click = () => this.click();
    this.zone.dragstart = (pointer) => this.dragstart();
    this.zone.holdstart = (pointer) => this.holdstart();
    this.zone.drag = (pointer) => this.drag(pointer.worldX, pointer.worldY);
    this.zone.dragend = (pointer, dropped) => this.dragend(dropped);
    this.zone.drop = (pointer, dropZone) => this.drop(dropZone);
    this.zone.dropped = (item: IObjeto) => this.dropped(item);
    this.zone.setDraggable(true);
    this.zone.name = this.nombre;
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
  listeners(event: string | symbol) {
    return this.zone.listeners(event);
  }

  click() {
    this.voltear();
  }
  hold() {
    const image = this.scene.add.sprite(0, -this.escala * 100, 'naipes', this.frameID);
    image.setScale(0);
    // this.scene.children.bringToTop(image);
    //image.setDepth(100);
    this.scene.tweens.add({
      targets: image,
      props: {
        depth: 100,
        scale: this.escala * 5
      },
      duration: 200
    });
  }
  dragstart() {
    const isMyTurn = this.juego?.turnoActual === this.service.local.indice;
    const isLocalPlayer = this.service.local === this.enMano;
    
    if (isMyTurn && isLocalPlayer) {
      this.service.local.tomar(this);
    } else {
      console.log('No es tu turno o la carta no está en tu mano');
    }
  }
  holdstart() {
    // this.tomar();
  }
  drag(worldX: number, worldY: number) {
    // console.log('drag');
    this.ubicar(worldX, worldY);
  }
  dragend(dropped: boolean) {
    if (!dropped) {
      if (this.jugador) {
        // this.enMano.enMano = this.enMano.enMano.filter((a) => a !== this);
        this.jugador.soltar(this);
        this.jugador.coger(this);
      } else {
        this.enMano.soltar(this);
      }
    }
  }
  drop(dropZone: Zone) {
    // console.log('drop');
    // this.enMano.enMano = this.enMano.enMano.filter((a) => a !== this);
    dropZone.dropped(this);
  }
  dropped(item: IObjeto) {
    console.log('dropped');
  }

  ubicar(x: number, y: number, z?: number) {
    this.setPosition(
      Math.floor(x * 100) / 100,
      Math.floor(y * 100) / 100
    );
    if (z !== undefined) { this.setDepth(z); }
  }

  tween(props: any, duration: number = 500, onStart?: () => void, onComplete?: () => void) {
    const config: Phaser.Types.Tweens.TweenBuilderConfig = {
      targets: this,
      props,
      duration,
      ease: 'Cubic.easeOut',
      onStart, onComplete
    }
    this.scene.tweens.add(config);
  }

  tapar() {
    this.setFrame('reverso');
    // this.service.data.update();
  }
  destapar() {
    this.setFrame(this.frameID);
    // this.service.data.update();
  }
  voltear() {
    if (this.tapada) { this.destapar(); }
    else { this.tapar(); }
  }

  static numeros = [
    'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis',
    'siete', /*'ocho', 'nueve',*/ 'diez', 'once', 'doce'
  ];
  static pintas = ['oro', 'copa', 'espada', 'basto'];
  setDatos(n?: number, p?: number) {
    let numero: string; let pinta: string;
    if (isNaN(n) || n === undefined) { numero = Phaser.Math.RND.pick(Carta.numeros); }
    else { numero = Carta.numeros[n]; }
    if (isNaN(p) || p === undefined) { pinta = Phaser.Math.RND.pick(Carta.pintas); }
    else { pinta = Carta.pintas[p]; }
    this.numero = numero; this.pinta = pinta;
  }

}
