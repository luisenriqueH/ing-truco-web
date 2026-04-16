import { IJugador } from '../jugador';
import { ICarta } from '../../cartas/carta';
import { Zone } from '../../ui';

export { Cartas, ICartas };

interface ICartas {

  zone: Zone;
  cartas: ICarta[];

  log: [];

  setZone: () => void;
  setVisible: (value: boolean) => void;

  add: (carta: ICarta) => void;
  remove: (carta: ICarta) => void;
  full: () => void;

}

class Cartas implements ICartas {

  zone: Zone;
  cartas: ICarta[] = [];

  get service() { return this.jugador.service; }
  get screen() { return this.service.phaser.screen; }

  get emitter() { return this.service.phaser.emitter; }

  get log(): any {
    const log = [];
    this.cartas.forEach((carta, i) => {
      log.push(carta.nombre);
    });
    return log;
  }
  get last(): ICarta {
    const size = this.cartas.length;
    if (size > 0) {
      return this.cartas[size - 1];;
    }
  }

  constructor(protected jugador: IJugador) {
    this.setZone();
  }

  setZone(): void { }
  setVisible(value: boolean) {
    this.zone.setVisible(value);
  }

  add(carta: ICarta) {
    // console.log('add', this);
    if (!this.cartas.includes(carta)) {
      this.cartas.push(carta);
    }
    if (this.cartas.length === 3) {
      this.full();
    }
  }
  remove(carta: ICarta) {
    if (this.cartas.includes(carta)) {
      this.cartas = this.cartas.filter((i) => i !== carta);
    }
  }
  full() { }

}
