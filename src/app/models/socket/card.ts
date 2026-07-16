export type CardSuit = 'espadas' | 'bastos' | 'oros' | 'copas';

export interface Card {
    id: string;         // Identificador único (ej: "12-espadas")
    number: number;     // 1 al 12
    suit: CardSuit;     // Palo o pinta
    weight: number;     // Valor jerárquico de la carta para determinar cuál gana en la ronda
}