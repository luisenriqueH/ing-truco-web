import { Card } from './card';
import { Player } from './player';
import { Team } from './team';
import { Round } from './round';

export interface TrucoGameState {
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
    // Contenedor para conservar el snapshot original del cliente para máxima fidelidad
    raw?: any;
}

export function serializeToTrucoGameState(rawSnapshot: any, roomSlug: string, playerNames: string[]): TrucoGameState {
    return {
        gameId: 'truco',
        roomSlug: roomSlug,
        maxPoints: 30,
        teams: [
            {
                id: 'team_0',
                name: 'Nosotros',
                players: ['0', '2'],
                score: rawSnapshot.puntos ? rawSnapshot.puntos[0] || 0 : 0
            },
            {
                id: 'team_1',
                name: 'Ellos',
                players: ['1', '3'],
                score: rawSnapshot.puntos ? rawSnapshot.puntos[1] || 0 : 0
            }
        ],
        players: (rawSnapshot.jugadoresCartas || []).map((jc: any) => {
            const idx = jc.indice;
            return {
                id: String(idx),
                name: playerNames[idx] || `Jugador ${idx}`,
                isOnline: true
            };
        }),
        status: rawSnapshot.faseActual === 'reparto' ? 'dealing' : 'playing',
        winnerTeamId: null,
        dealerPlayerId: String(rawSnapshot.dealerIndex || 0),
        currentPlayerId: String(rawSnapshot.turnoActual || 0),
        firstPlayerOfHandId: String((rawSnapshot.dealerIndex + 1) % 4),
        firstPlayerOfRoundId: String(rawSnapshot.turnoActual || 0),
        deck: [],
        playerHands: {},
        currentHand: {
            handNumber: rawSnapshot.manoEnCurso ? 1 : 0,
            pointsAtStake: rawSnapshot.envidoPuntos || 1,
            rounds: [],
            wonRoundsByTeam: {
                'team_0': rawSnapshot.rondasGanadas ? rawSnapshot.rondasGanadas[0] || 0 : 0,
                'team_1': rawSnapshot.rondasGanadas ? rawSnapshot.rondasGanadas[1] || 0 : 0
            },
            handWinnerTeamId: null
        },
        bettingState: {
            truco: {
                currentLevel: rawSnapshot.trucoNivel || 'none',
                value: 1,
                challengedByPlayerId: null,
                pendingResponseFromTeamId: null
            }
        },
        raw: rawSnapshot
    };
}

export function deserializeFromTrucoGameState(state: any): any {
    if (!state) return null;
    if (state.raw) {
        return state.raw;
    }
    return state;
}