
export interface Team {
    id: string;         // "team_1" o "team_2"
    name: string;       // Nombre del equipo
    players: string[];  // IDs de los jugadores del equipo
    score: number;      // Puntos acumulados en la partida (ej: de 0 a 12 o configurable)
}