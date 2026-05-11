import { GameService } from 'src/app/services/game.service';

import { Jugador, IJugador } from '../jugadores/jugador';
import { Baraja, IBaraja } from '../cartas/baraja';
import { LogItem } from '../data';

export { Juego };

class Juego {

  baraja: IBaraja;
  jugadores: IJugador[];
  dealer: IJugador;
  onJuego: boolean = false;

  get scene() { return this.service.main; }

  randomNames(size: number): string[] {
    const userID = this.service.data.userID;
    const filter = (nombre: string) => {
      names = names.filter((item) => item !== nombre);
    };
    const random = () => {
      const nombre = names[Math.floor(Math.random() * names.length)]
      filter(nombre); return nombre;
    };
    let names = [
      'Luis', 'Andrea', 'Felipe', 'Miguel',
      'Alex', 'Jesus', 'Ana', 'Jose',
      'Enrique', 'Angel', 'Sofia', 'Julia',
      'Pedro', 'Rafael', 'Maria', 'Maya'
    ];
    if (names.includes(userID)) { filter(userID); }

    const nombres = [];
    if (!this.service.data.PC) {
      nombres.push(userID);
      size--;
    }
    for (let i = 0; i < size; i++) {
      nombres.push(random());
    }
    return nombres;
  }

  // <= mano
  // <= barajaFull
  // <= anotar
  constructor(protected service: GameService) {
    this.render();
  }

  render() {
    const nombres = this.randomNames(4);
    const baraja = new Baraja(this.service, 0, 0);
    const jugadores = [
      new Jugador(this.service, nombres[0], 1),
      new Jugador(this.service, nombres[1], 1),
      new Jugador(this.service, nombres[2], 2),
      new Jugador(this.service, nombres[3], 3)
    ];
    this.baraja = baraja;
    this.jugadores = jugadores;
    this.service.data.juego = { baraja, jugadores };
  }
  start() {
    this.jugadores.forEach((item) => item.mano.setEvents());
  }
  hablar(datos: LogItem): Promise<void> {
    this.service.phaser.emitter.emit('hablar', datos);
    const then = () => {
    }
    return new Promise((resolve) => {
      const t = 1;
      setTimeout(() => {
        then();
        resolve();
      }, t * 1000);
    });
  }

}
