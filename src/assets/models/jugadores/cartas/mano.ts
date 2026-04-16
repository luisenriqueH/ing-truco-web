import { IJugador } from '../jugador';
import { IBaraja } from '../../cartas/baraja';
import { ICarta } from '../../cartas/carta';
import { IObjeto } from '../../cartas/objeto';
import { Cartas } from './cartas';
import { Zone } from '../../ui';

export { Mano, IMano };

interface IMano {

  setEvents: () => void;
  cogerMano:() => void;
  botarMano: () => void;

}

class Mano extends Cartas implements IMano {

  constructor(jugador: IJugador) {
    super(jugador);
  }

  setZone(): void {
    // const area = this.scene.area;
    const area = 100;
    const spot = this.jugador.setAngle(new Phaser.Math.Vector2(0, (this.screen.h - area) / 2));
    const size = this.jugador.setAngle(new Phaser.Math.Vector2(area * 4, area));
    size.x = Math.abs(size.x); size.y = Math.abs(size.y);
    // zone.setRectangleDropZone(size.x, size.y);
    const zone = new Zone(this.jugador.main, spot.x, spot.y, size.x, size.y, 0x00ff00, 0.2);
    // const zone = this.scene.add.rectangle(spot.x, spot.y, size.x, size.y, 0x00ff00, 0.2);
    zone.setInteractive(true);
    zone.dropenter = (item: any) => {
      // console.log('enter drop')
    };
    zone.dropexit = (item: any) => {
      // console.log('exit drop')
    };
    zone.dropped = (item: IObjeto) => {
      const jugador = item.enMano;
      switch (item.tipo) {
        case 'carta':
          this.jugador.soltar(item);
          this.jugador.coger(item as ICarta);
          break;
        case 'baraja': jugador.soltar(item).then((baraja: IBaraja) => baraja.setInteractive()); break;

        default: break;
      }
    };

    zone.name = 'mano';
    this.zone = zone;
  }

  add(carta: ICarta) {
    super.add(carta);
    if (!carta.jugador) {
      carta.jugador = this.jugador;
    }
  }

  setEvents(): void {
    this.emitter.on('manoOn', () => this.cogerMano());
    this.emitter.on('manoOff', () => this.botarMano());
  }
  cogerMano(): void {
    const size = this.jugador.mesa.cartas.length;
    for (let i = 0; i < size; i++) {
      setTimeout(() => {
        const carta = this.jugador.mesa.last;
        this.jugador.cogerAuto(carta, i);
      }, i * 500);
    }
  }
  botarMano(): void {
    const m = this.cartas.length;
    if (m > 0) {
      this.cartas
        .forEach((carta: ICarta, i: number) => {
          setTimeout(() => {
            this.jugador.lanzar(carta, true);
          }, i * 500);
        });
    } else {
      this.jugador.mesa.full();
    }
  }

  full() {
    this.emitter.emit('manoFull', this.jugador);
  }

}
