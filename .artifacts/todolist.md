# Lista de Tareas - ing-truco-web

- [x] Tarea inicial: Analizar estructura del proyecto.
    - [x] Identificar las tecnologías principales utilizadas (Angular, Phaser).
    - [x] Mapear la función de los directorios clave (`src`, `assets`, `node_modules`, `.artifacts`).
    - [x] Comprender el proceso de compilación y desarrollo (`node build.js`).
    - [x] Revisar el archivo `package.json` para dependencias y scripts.

### Funcionalidad Multijugador (Sprint 1)

- [ ] **Diseño y Desarrollo de la Sala de Lobby:**
    - [ ] Diseñar la interfaz de usuario (UI/UX) para la sala de lobby donde los jugadores puedan ver partidas existentes y crear nuevas.
    - [ ] Implementar la lógica de backend para gestionar las salas de lobby (creación, unión, listado de jugadores en espera).
    - [ ] Desarrollar la comunicación en tiempo real para actualizar la lista de partidas y jugadores en el lobby.
- [ ] **Creación de Partidas:**
    - [ ] Implementar la funcionalidad para que un jugador pueda crear una nueva partida.
    - [ ] Añadir la opción al crear partida para incluir jugadores controlados por IA.
    - [ ] Desarrollar la lógica para asignar jugadores a las partidas creadas (humanos y/o IA).
- [ ] **Preparación del Estado del Juego (GameState):**
    - [ ] Definir la estructura de datos del `GameState` que representará el estado completo de una partida de Truco.
    - [ ] Identificar todos los elementos clave del juego que deben ser parte del `GameState` (jugadores, cartas, turnos, puntajes, fases de la ronda, etc.).
    - [ ] Establecer cómo el `GameState` será serializado y deserializado para su transmisión entre el servidor y los clientes.
- [ ] **Integración con API Socket (Fase posterior):**
    - [ ] **Nota:** Esta tarea se abordará una vez que el diseño del `GameState` y la funcionalidad básica de lobby y creación de partidas estén más definidos.
    - [ ] Investigar y seleccionar la tecnología de Socket API a utilizar (ej. Socket.IO, WebSockets nativos).
    - [ ] Diseñar los mensajes y eventos de comunicación para la interacción del juego a través del Socket API.
    - [ ] Implementar la conexión inicial y el manejo de eventos básicos con el Socket API.
