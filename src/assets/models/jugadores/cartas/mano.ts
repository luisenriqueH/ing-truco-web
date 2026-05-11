import { IJugador } from '../jugador';
import { IBaraja } from '../../cartas/baraja';
import { ICarta } from '../../cartas/carta';
import { IObjeto } from '../../cartas/objeto';
import { Cartas } from './cartas';
import { Zone } from '../../ui';

export { Mano, IMano };

interface IMano {

  setEvents: () => void;
  cogerMano:() => Promise<void>;
  botarMano: () => void;

}

class Mano extends Cartas implements IMano {

  constructor(jugador: IJugador) {
    super(jugador);
  }

  setZone(): void {
    const area = 100 * this.service.escala;
    const spot = this.jugador.setAngle(new Phaser.Math.Vector2(0, (this.screen.h - area) / 2));
    const baseScale = this.jugador.indice === 0 ? 1.5 : 1.0;
    const size = this.jugador.setAngle(new Phaser.Math.Vector2(area * 4 * baseScale, area * baseScale));
    size.x = Math.abs(size.x); size.y = Math.abs(size.y);

    if (!this.zone) {
      const zone = new Zone(this.jugador.main, spot.x, spot.y, size.x, size.y, 0x00ff00, 0.2);
      zone.setInteractive(true);
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
    } else {
      this.zone.setPosition(spot.x, spot.y);
      this.zone.setSize(size.x, size.y);
      this.zone.setRotation(this.jugador.rotation);
    }
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
  async cogerMano(): Promise<void> {
    // Capturamos las referencias exactas de las cartas que hay en la mesa ahora
    const cartasEnMesa = [...this.jugador.mesa.cartas];
    const promesas = [];
    
    cartasEnMesa.forEach((carta, i) => {
      const p = new Promise<void>((resolve) => {
        this.jugador.main.time.delayedCall(i * 300, () => {
          if (carta) {
            this.jugador.cogerAuto(carta, i).then(() => resolve());
          } else {
            resolve();
          }
        });
      });
      promesas.push(p);
    });

    return Promise.all(promesas).then(() => {
      console.log(`${this.jugador.nombre} ha terminado de recoger su mano.`);
    });
  }
  botarMano(): void {
    const m = this.cartas.length;
    if (m > 0) {
      this.cartas.forEach((carta: ICarta, i: number) => {
        this.jugador.main.time.delayedCall(i * 500, () => {
          this.jugador.lanzar(carta, true);
        });
      });
    } else {
      this.jugador.mesa.full();
    }
  }

  full() {
    this.emitter.emit('manoFull', this.jugador);
  }

}
