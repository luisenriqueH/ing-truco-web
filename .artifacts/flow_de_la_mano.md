# Flujo de la Mano (Truco Venezolano)

Este documento establece el ciclo de vida de una mano en el motor de juego, con especial énfasis en la transición entre el juego de cartas y la recolección de las mismas.

## 1. Fase de Reparto (Dealing)
*   El **Repartidor (Dealer)** distribuye 3 cartas a cada jugador.
*   Se revela la **Vira** (carta que define las piezas: Perico y Perica).
*   Los jugadores recogen sus cartas (las IAs lo hacen automáticamente).

## 2. Fase de Rondas (Gameplay)
*   Se juegan un máximo de 3 rondas.
*   Los jugadores pueden cantar **Envido** o **Flor** durante su primer turno.
*   Los jugadores pueden cantar **Truco** en cualquier momento de su turno.
*   La mano termina cuando un equipo gana 2 rondas (o por resolución de "parda").

## 3. Fase de Conteo (Scoring) - *¡Nuevo Flujo Event-Driven!*
Una vez finalizada la última ronda necesaria:

1.  **Evento `manoFinished`**: El motor detecta el fin de la mano y emite este evento.
2.  **Reacción del Repartidor**:
    *   **Local**: Se activa el botón "Contar Puntos". El jugador debe presionarlo manualmente.
    *   **IA**: Decide cuánto tiempo esperar (según su razonamiento) antes de iniciar el conteo automáticamente.
3.  **Evento `contarPuntosStarted`**: Al iniciarse el conteo (por acción del dealer), se emite este nuevo evento.
4.  **Recogida y Sincronización (Todos los jugadores)**:
    *   Al recibir `contarPuntosStarted`, TODOS los jugadores inician la recogida de sus cartas jugadas desde la mesa.
    *   Se implementa una "parada de seguridad" (espera activa del evento interno `manoFull`). Los jugadores no avanzan hasta tener exactamente 3 cartas en su colección.
5.  **Revelación de Cartas**: 
    *   Una vez confirmadas las 3 cartas, se colocan boca arriba en la mesa para validación visual.
6.  **Resolución de Envido/Flor**: 
    *   Se evalúan las Flores cantadas y los Envidos usando una **Interfaz de Decisión Personalizada** (HTML/CSS asíncrono, reemplazando a `window.confirm`).
    *   Los jugadores deciden secuencialmente si muestran sus puntos para competir.
7.  **Resolución de Truco**: Se asignan los puntos de la mano al equipo ganador de las rondas.
7.  **Evento `puntosContados`**: Indica que el proceso ha terminado y habilita la recolección final.

## 4. Fase de Recoger (Collection)
Esta fase es **manual** para el repartidor actual:

1.  **Evento `puntosContados`**: Habilita el botón "Recoger" solo para el repartidor.
2.  **Acción**: El repartidor presiona el botón.
3.  **Limpieza y Rotación**: Todas las cartas regresan al mazo y el dealer rota a la derecha.
4.  **Nueva Mano**: Se procede a un nuevo reparto (`repartoFinished`).

---

### Nota sobre "Aquí está mi Flor"
El canto de la Flor es un acto informativo y de validación de puntos. **No debe activar automáticamente la recogida de cartas**. La recogida es el acto final que cierra el ciclo de la mano y prepara la siguiente.
