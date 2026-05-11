
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
    const area = this.jugador.service.area * this.service.escala;
    const distancia = (2 - 2 / 4) * area;
    const fromCenter = new Phaser.Math.Vector2(0, distancia);
    let size = new Phaser.Math.Vector2(4 * area / 3, 4 * area / 3);

    let spot = this.jugador.setAngle(fromCenter.clone());
    
    if (!this.zone) {
      const zone = new Zone(this.jugador.main, spot.x, spot.y, size.x, size.y, 0xffffff, 0.2);
      zone.setRotation(this.jugador.rotation);
      zone.name = 'mesa'; // IMPORTANTE: Para que soltar() sepa qué hacer
      zone.setInteractive(false);
      zone.setVisible(false);
      zone.dropped = (item: IObjeto) => {
        const jugador = item.enMano || this.jugador;
        if (!jugador) return;

        // Regla de Oro: Solo se puede soltar en la mesa si es el turno del jugador
        // EXCEPCIÓN: Durante el reparto (onJuego = true), permitimos que caigan sin chequear turno
        if (!this.jugador.juego.onJuego && this.jugador.juego.turnoActual !== jugador.indice) {
          console.log(`Jugada bloqueada: No es el turno de ${jugador.nombre}`);
          if (item.tipo === 'carta') {
            (item as ICarta).dragend(false); // Devolver la carta a la mano
          }
          return;
        }

        switch (item.tipo) {
          case 'carta':
            const carta = item as ICarta;
            // Si la carta ya se está moviendo automáticamente (IA), no volvemos a llamar a soltar
            if (carta.isAuto) {
              this.jugador.mesaDrop(carta);
              return;
            }

            const dx = (carta.x - zone.x) / 4;
            const dy = (carta.y - zone.y) / 4;
            const dr = carta.rotation - zone.rotation;
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
    } else {
      this.zone.setPosition(spot.x, spot.y);
      this.zone.setSize(size.x, size.y);
      this.zone.setRotation(this.jugador.rotation);
    }
  }

  full() {
    this.emitter.emit('mesaFull', this.jugador);
  }

}
