export interface Player {
    id: string;         // ID único del jugador
    name: string;       // Nombre visible
    avatar?: string;    // URL de avatar
    tag?: string;       // Tag de registro
    isOnline: boolean;  // Estado de conexión
}