
import { IJugador } from '../jugador';
import { IBaraja } from '../../cartas/baraja';
import { ICarta } from '../../cartas/carta';
import { IObjeto } from '../../cartas/objeto';
import { Cartas } from './cartas';
import { Zone } from '../../ui';

export { Mesa };

class Mesa extends Cartas {

  constructor(jugador: IJugador) {
    super(jugador);
  }

  setZone(): void {
    const area = this.jugador.service.area;
    const distancia = (2 - 2 / 4) * area;
    const fromCenter = new Phaser.Math.Vector2(0, distancia);
    let size = new Phaser.Math.Vector2(4 * area / 3, 4 * area / 3);

    let spot = this.jugador.setAngle(fromCenter.clone());
    const zone = new Zone(this.jugador.main, spot.x, spot.y, size.x, size.y, 0xffffff, 0.2);
    // let zone = this.scene.add.rectangle(spot.x, spot.y, size.x, size.y, 0xff00ff, 0.2);
    zone.setRotation(this.jugador.rotation);
    zone.setInteractive(true);
    // zone.setDepth(-1);
    zone.dropped = (item: IObjeto) => {
      const jugador = item.enMano;
      switch (item.tipo) {
        case 'carta':
          const carta = item as ICarta;
          const dx = (carta.x - zone.x) / 4;
          const dy = (carta.y - zone.y) / 4;
          const dr = carta.rotation - zone.rotation;
          // const delta = new Phaser.Math.Vector2(dx, dy);
          const props = { x: dx, y: dy, rotation: dr };
          jugador.soltar(item, zone, props)
            .then(() => this.jugador.mesaDrop(carta));
          break;
        case 'baraja':
          const baraja = item as IBaraja;
          if (baraja.getLength() === 40) {
            const set = this.jugador.service.repartir;
            this.jugador.repartir(set).then(() => this.emitter.emit('manoOn'));
          } else {
            this.jugador.recoger();
          }
          break;

        default: break;
      }
    };

    zone.name = 'mesa';
    this.zone = zone;
    // this.scene.zone['mesa' + this.indice] = zone;
  }

  full() {
    this.emitter.emit('mesaFull', this.jugador);
  }

}
