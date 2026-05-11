import { IJugador } from "./jugadores/jugador";
import { Equipo } from "./jugadores/equipo";

export {
  DataObjeto,
  DataCarta,
  DataBaraja,
  DataJugador,
  DataJuego,
  LogItem,
  Punto,
  IOption
}

interface LogItem { jugador?: IJugador, texto: string, style?: any };
interface Punto { pareja: Equipo, puntos: number, juego: string };

interface IOption { id: string, value: string | number, text: string};

interface DataObjeto {
  x: number; y: number; z: number;
  angulo: number,
  activa: boolean;
}
interface DataCarta extends DataObjeto {
  numero: string; pinta: string;
  nombre: string; tapada: boolean;
  valor?: { truco: number; envido: number; }
}
interface DataBaraja extends DataObjeto {
  cartas: DataCarta[];
}
interface DataJugador {
  mano: DataCarta[];
  mesa: DataCarta[];
}
interface DataJuego {
  baraja: DataBaraja;
  jugadores: DataJugador[];
}
