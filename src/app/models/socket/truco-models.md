# Modelo de Estado de Juego - Truco (Baraja Española)

Este modelo de estado define la estructura de datos ideal para manejar una partida del juego de cartas **Truco** (y juegos de baraja española similares) con soporte para equipos y apuestas acumulativas de puntos.

---

## 1. Definición de Estructuras Básicas

### Carta (Card)
Representa una carta de la baraja española.
```typescript
type CardSuit = 'espadas' | 'bastos' | 'oros' | 'copas';

interface Card {
  id: string;         // Identificador único (ej: "12-espadas")
  number: number;     // 1 al 12
  suit: CardSuit;     // Palo o pinta
  weight: number;     // Valor jerárquico de la carta para determinar cuál gana en la ronda
}
```

### Jugador (Player)
Representa un participante en la mesa.
```typescript
interface Player {
  id: string;         // ID único del jugador
  name: string;       // Nombre visible
  avatar?: string;    // URL de avatar
  tag?: string;       // Tag de registro
  isOnline: boolean;  // Estado de conexión
}
```

### Equipo (Team)
Agrupa a los jugadores en parejas o grupos.
```typescript
interface Team {
  id: string;         // "team_1" o "team_2"
  name: string;       // Nombre del equipo
  players: string[];  // IDs de los jugadores del equipo
  score: number;      // Puntos acumulados en la partida (ej: de 0 a 12 o configurable)
}
```

---

## 2. Modelo de Estado de la Partida (Game State)

Esta es la estructura completa del objeto JSON que sincroniza el juego.

```typescript
interface TrucoGameState {
  // 1. Configuración de la Mesa / Partida
  gameId: string;
  roomSlug: string;
  maxPoints: number;              // Límite de puntos de la partida (Configurable de la mesa, ej: 12)
  teams: Team[];                  // Los 2 equipos (2 vs 2, total 4 jugadores)
  players: Player[];              // Detalles de los 4 jugadores
  status: 'waiting_players' | 'dealing' | 'playing' | 'hand_finished' | 'game_finished';
  winnerTeamId: string | null;    // ID del equipo ganador de la partida
  
  // 2. Control de Turnos y Roles
  dealerPlayerId: string;         // Jugador que reparte (el "pie")
  currentPlayerId: string;        // Jugador que tiene el turno activo para jugar carta o apostar
  firstPlayerOfHandId: string;    // Jugador que inicia la mano (el "mano")
  firstPlayerOfRoundId: string;   // Jugador que inicia la ronda activa

  // 3. Estado de las Cartas y Manos
  deck: Card[];                   // Mazo de 48 cartas (o 40 si se juegan sin 8s y 9s)
  playerHands: {
    [playerId: string]: Card[];   // Cartas que tiene cada jugador en su mano (máximo 3)
  };

  // 4. Estado de la Mano Activa
  currentHand: {
    handNumber: number;           // Contador de manos jugadas en la partida
    pointsAtStake: number;        // Puntos base/apuestas acumuladas en disputa en esta mano (mínimo 1 o 2)
    rounds: Round[];              // Historial de las 3 rondas de la mano activa
    wonRoundsByTeam: {
      [teamId: string]: number;   // Cuántas rondas lleva ganadas cada equipo en esta mano (max 3)
    };
    handWinnerTeamId: string | null; // Equipo que ganó la mano y sumará los pointsAtStake
  };

  // 5. Historial de Apuestas de la Mano Activa
  bettingState: {
    truco: {
      currentLevel: 'none' | 'truco' | 'retruco' | 'vale_cuatro'; // Valor actual del Truco
      value: number;              // Puntos en disputa por la apuesta (1, 2, 3 o 4)
      challengedByPlayerId: string | null; // Quién cantó la última apuesta
      pendingResponseFromTeamId: string | null; // Equipo que debe responder (Quiero / No Quiero / Envido)
    };
    envido?: { // (Opcional según reglas) Apuesta de puntos de flor/envido
      value: number;
      isClosed: boolean;
      winnerPlayerId: string | null;
    };
  };
}

interface Round {
  roundNumber: number;            // 1, 2 o 3
  plays: CardPlay[];              // Las cartas que se jugaron en esta ronda (máximo 1 por jugador activo)
  winnerPlayerId: string | null;  // Jugador que tiró la carta más alta
  winnerTeamId: string | null;    // Equipo ganador de la ronda (o 'parda' / empate)
  isParda: boolean;               // Si la ronda quedó empatada
}

interface CardPlay {
  playerId: string;               // Jugador que tiró la carta
  card: Card;                     // Carta tirada
  timestamp: number;              // Tiempo de la jugada
}
```

---

## 3. Flujo Lógico y Ciclo de Vida del Estado

1. **Inicio de Partida (`waiting_players`):**
   * Se registran los 4 jugadores y se dividen en 2 parejas (`teams`).
   * Se define `maxPoints` (ej: 12).
2. **Reparto (`dealing`):**
   * Se mezcla el `deck` (48 cartas).
   * Se reparten 3 cartas a cada jugador en `playerHands`.
   * El estado cambia a `playing`.
3. **Desarrollo de la Mano (`playing`):**
   * Se juegan hasta 3 rondas (`Round`).
   * En cada turno, el jugador correspondiente a `currentPlayerId` tira una carta de su `playerHands` registrando una nueva `CardPlay` en la ronda.
   * Cualquier jugador puede cantar un reto de la apuesta (`bettingState.truco`), cambiando `pendingResponseFromTeamId` y paralizando las cartas hasta que se responda.
4. **Cierre de la Mano (`hand_finished`):**
   * Cuando un equipo gana 2 de las 3 rondas (o resuelve empates / pardas), se le asigna la victoria.
   * Los puntos acumulados en `currentHand.pointsAtStake` se suman al `score` del equipo ganador en `teams`.
   * Si ningún equipo llega a `maxPoints`, el rol del `dealerPlayerId` pasa al siguiente jugador a la derecha, se limpia la mano activa y se vuelve a repartir.
5. **Fin del Juego (`game_finished`):**
   * Cuando un equipo alcanza o supera `maxPoints` (ej: 12 puntos), se define el `winnerTeamId` y se finaliza la partida.
