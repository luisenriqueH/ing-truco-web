import * as Cartas from './cartas';
import * as Reglas from './reglas/juego';
import * as Jugadores from './jugadores';
import * as UI from './ui';
import * as Datos from './data'

namespace IngJuego {

  export type IBaraja = Cartas.IBaraja;
  export type IObjeto = Cartas.IObjeto;

  export const Carta = Cartas.Carta;
  export const Baraja = Cartas.Baraja;

  export type IJugador = Jugadores.IJugador;
  export namespace Jugador {
    export const Jugador = Jugadores.Jugador;
    export const Equipo = Jugadores.Equipo;
    export const Mano = Jugadores.Mano;
    export type Mesa = Jugadores.Mesa;
  }

  export namespace Regla {
    export type Juego = Reglas.Juego;
    export const Juego = Reglas.Juego;
  }

  export namespace Data {
    export type Juego = Datos.DataJuego;
    export type Carta = Datos.DataCarta;
    export type Baraja = Datos.DataBaraja;
    export type Jugador = Datos.DataJugador;
    export type LogItem = Datos.LogItem;
    export type Punto = Datos.Punto;
    export type IOption = Datos.IOption;
  }

  export const Zone = UI.Zone;
  export const VoiceButton = UI.VoiceButton;
  export const Marcador = UI.Marcador;
  export const LogView = UI.LogView;
  export const VoiceMenu = UI.VoiceMenu;
  export const DropdownMenu = UI.DropdownMenu;

}

export { IngJuego };
