import { Card } from './card';

export interface Round {
    roundNumber: number;            // 1, 2 o 3
    plays: CardPlay[];              // Las cartas que se jugaron en esta ronda (máximo 1 por jugador activo)
    winnerPlayerId: string | null;  // Jugador que tiró la carta más alta
    winnerTeamId: string | null;    // Equipo ganador de la ronda (o 'parda' / empate)
    isParda: boolean;               // Si la ronda quedó empatada
}

export interface CardPlay {
    playerId: string;               // Jugador que tiró la carta
    card: Card;                     // Carta tirada
    timestamp: number;              // Tiempo de la jugada
}