
import { Juego } from '../reglas/juego';
import { IJugador } from './jugador';

export { Equipo };

class Equipo {

  puntos: number = 0;
  get juego(): Juego { return this.jugador[0].juego as Juego; }
  get otro(): Equipo { return undefined; }

  constructor(public jugador: IJugador[], public indice: number) {
    jugador.forEach((item) => item.pareja = this);
  }

  humano(): boolean {
    let bool = false;
    this.jugador.forEach((item) => {
      switch (item.tipo) {
        case 'humano':
          bool = true;
          break;

        default: break;
      }
    });
    return bool;
  }

}
