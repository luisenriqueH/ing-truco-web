# Guía de Documentación del Proyecto

Este documento describe la función de los archivos de documentación presentes en el repositorio de **Ing-Truco**.

## Documentos de Control y Flujo

### 1. [TODO.md](file:///Users/luisenrique/Documents/github/ingjuego/ing-truco-web/TODO.md)
**Propósito**: Roadmap y lista de tareas pendientes.
*   Contiene las prioridades actuales (UX, Lógica, IA, Red).
*   Se actualiza al completar hitos técnicos.

### 2. [TECHNICAL_OVERVIEW.md](file:///Users/luisenrique/Documents/github/ingjuego/ing-truco-web/TECHNICAL_OVERVIEW.md)
**Propósito**: Descripción técnica de la arquitectura.
*   Explica la integración entre Angular (contenedor) y Phaser (motor).
*   Detalla el sistema de construcción unificado (`build.js`).

### 3. [game_flow.md](file:///Users/luisenrique/Documents/github/ingjuego/ing-truco-web/.artifacts/game_flow.md)
**Propósito**: Reglas y mecánicas de juego.
*   Define cómo se reparten las cartas, los turnos y los sistemas de puntos (Truco y Envido).
*   Es la referencia para implementar la lógica de validación.

### 4. [.agent/developer.md](file:///Users/luisenrique/Documents/github/ingjuego/ing-truco-web/.agent/developer.md)
**Propósito**: Protocolo operacional para la IA.
*   Define cómo debo actuar ante compilaciones, versiones y reportes de errores.

---

## Archivos de Configuración

*   **package.json**: Gestión de dependencias y scripts de ejecución (`build`, `dev`).
*   **build.js**: El "corazón" del flujo de desarrollo. Maneja la transpilación con esbuild, el servidor estático y el API de construcción.
*   **tsconfig.json**: Configuración de TypeScript (importante para el soporte de decoradores de Angular).

---

## Estructura de Carpetas Clave

### `src/` (Source)
El código vivo. Contiene la lógica en TypeScript. Los cambios aquí disparan una nueva compilación.

### `start/` (Distribution)
El código procesado. Contiene el `bundle.js` y el `index.html`. Es lo que el usuario final descarga al entrar a la web.

### `assets/` (Static Media)
Recursos no compilables: Imágenes, Atlas de cartas, Voces y Sonidos. Se mantiene en la raíz para optimizar la velocidad de carga y compilación.

---
> [!TIP]
> Si se añade una nueva funcionalidad mayor (como el sistema de puntos), se debe actualizar primero el `game_flow.md` y luego reflejar el cambio técnico en `TECHNICAL_OVERVIEW.md`.
