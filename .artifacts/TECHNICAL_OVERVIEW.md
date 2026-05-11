# Technical Overview - Ing-Truco Phaser Integration

This document provides a technical breakdown of the Phaser 3 implementation for the Truco card game within the Angular container.

## Architecture Overview

The game logic is separated into a hierarchical model system located in `start/assets/models/`.

### Core Layers
1.  **Phaser Scene (`Main` class)**: 
    - Handles rendering, input (Pinch-to-zoom, Pan), and interaction zones.
    - Located in `assets/scenes/main.ts`.
2.  **Game Logic (`IngJuego.Regla.Juego`)**:
    - Manage the game state, player turns, and rule validation.
    - Uses a `GameService` (Angular) to bridge the Phaser scene with the application data.
3.  **Entity Models**:
    - `Carta` & `Baraja`: Handle card values, sprites, and shuffling.
    - `Jugador` & `Mano`: Manage individual player state, including cards held and AI behavior.

## Key Implementation Details

### Interactive Input System
The game implements a custom gesture system for mobile and desktop compatibility:
- **Pinch-to-zoom**: Uses multiple pointers to calculate distance deltas for zooming the game camera.
- **Panning**: Intuitive drag-to-pan logic with axis-locking to prevent accidental diagonal movement.
- **Interactive Rectangles**: Interaction is handled via `Phaser.GameObjects.Rectangle` zones that emit events to the logic layer.

### Asset Pipeline
- **Atlases**: Cards and UI elements are loaded via texture atlases (`naipes.json`) to minimize draw calls.
- **Audio Sprites**: Player voices are managed using audio sprites (e.g., `miguel/voces.json`), allowing efficient playback of various voice lines (Truco, Envido, etc.) from a single file.

### AI and Speech
The AI opponents interact with the game by "speaking" via the `hablar()` method in the `Juego` class. This triggers both a visual UI update and the corresponding audio line from the audio sprite.

## Event Communication
The project uses a `Phaser.Events.EventEmitter` instance shared via the `GameService` to decouple the game logic from the UI components. This allows the Angular UI and Phaser game to react to the same events (e.g., `hablar`, `point_scored`) seamlessly.

---
*For development tasks and roadmap, see [TODO.md](file:///Users/luisenrique/Documents/github/ingjuego/ing-truco-web/TODO.md).*
