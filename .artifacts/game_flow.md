# Flujo de Juego: Truco Venezolano

Este documento describe las tres etapas principales de una mano de Truco en Ing-Truco.

## Etapa 1: Repartir (El Mazo)
En esta fase se inicia la mano y se distribuye el azar.

*   **Rotación**: El mazo rota en sentido antihorario.
*   **Reparto**: Se entregan 3 cartas a cada jugador y se voltea la **Vira** (carta que define el palo del Perico y la Perica).
*   **Acción del Jugador**: Los jugadores deben "Tomar Mano" para ver sus cartas. Es el momento de evaluar si se tiene **Flor**.

## Etapa 2: Rondas (El Juego)
La fase de confrontación donde se buscan ganar 2 de 3 rondas.

*   **Cantos de Voz**: Durante esta etapa se pueden cantar:
    *   **Envido / Flor**: Deben cantarse antes de jugar la primera carta o en el primer turno de cada jugador.
    *   **Truco**: Se puede cantar en cualquier momento del turno.
*   **Jugada**: Cada jugador lanza una carta a la mesa. La carta de mayor valor según la jerarquía (incluyendo piezas) gana la ronda.

## Etapa 3: Puntaje (La Resolución)
Una vez terminadas las 3 rondas o si un equipo se retira, se procede a la contabilidad en el siguiente orden:

*   **Fase 1: Envido y Flor (Módulo Envido)**
    *   **Orquestación**: La resolución se ejecuta de manera asíncrona una vez que todos los jugadores han recogido y revelado sus 3 cartas (evento `manoFull`).
    *   **Prioridad de la Flor**: La Flor es considerada un Envido especial de 3 cartas y vence a cualquier Envido normal.
    *   **Resolución de Flores (si hubo cantos)**: 
        *   Se evalúa la validez de la Flor de cada jugador (considerando el Favor del Rey y comodines).
        *   Se utiliza un **Sistema de Diálogos Asíncrono** (UI HTML/CSS) para preguntar interactivamente a los jugadores si desean mostrar su Flor.
        *   Si solo un equipo tiene una Flor válida demostrada, suma **3 puntos** automáticamente.
        *   Si hay múltiples equipos con Flor, se comparan los puntajes y el ganador se lleva los puntos.
    *   **Resolución de Envido (si no hubo Flores)**: 
        *   Se evalúa secuencialmente a los jugadores. Si el Envido fue ACEPTADO, se pregunta si desean mostrar sus puntos para competir.
        *   Si NO se cantó, de todas formas se les da la opción de mostrar sus puntos, pero el sistema no asignará puntos extra a menos que haya habido un canto válido.
    *   **Actualización en Tiempo Real**: Los puntos ganados en esta fase se actualizan inmediatamente en el marcador (evento `puntosUpdated`) antes de pasar a la resolución de Truco.

*   **Fase 3: Truco**
    *   Se anotan los puntos (1, 2, 3 o 4 según el nivel de Truco) al ganador de la mano (quien ganó 2 de 3 rondas o por retiro del oponente).

*   **Contabilidad Final**: 
    *   Se actualiza el marcador global.
    *   El repartidor puede "Recoger" las cartas una vez finalizado el conteo.

---
> [!IMPORTANT]
> La fase de Puntaje es obligatoria antes de que el repartidor pueda "Recoger" las cartas para la siguiente mano.
