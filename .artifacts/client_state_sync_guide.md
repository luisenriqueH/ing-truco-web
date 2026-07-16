# Guía de Integración: Sincronización de Estado en Tiempo Real (Koningo)

Este documento describe cómo integrar una aplicación cliente (Web, iOS, Android, etc.) con el servidor de sincronización de estados en tiempo real (**Koningo Real-Time State Broker**).

---

## 1. Arquitectura General

El servidor funciona como un **intermediario de estados (state broker) basado en salas (rooms) y en caché de memoria**. Es agnóstico a la estructura interna del estado de cada juego.

```mermaid
sequenceDiagram
    participant Cliente as App / Cliente (Socket.io)
    participant Server as Servidor Node.js
    participant Backend as Backend / Admin (REST API)

    Cliente->>Server: 1. Conexión Socket.io con query (game, room, user)
    Note over Server: El cliente se une a la sala "game:room"
    Server-->>Cliente: 2. Evento 'state' inmediato (Estado actual + online_users)
    
    Backend->>Server: 3. POST /api/state (Actualiza estado para sala)
    Note over Server: Server actualiza la caché e integra la lista de usuarios activos
    Server->>Cliente: 4. Transmite evento 'state' a todos los clientes en la sala
```

---

## 2. Conexión de Clientes (Socket.io)

El servidor utiliza **Socket.io** para mantener conexiones bidireccionales y en tiempo real. 

### Detalles de Conexión
* **Protocolo:** WS / WSS (WebSocket) o HTTP Polling (Socket.io se encarga de la negociación automáticamente).
* **Ruta (Path):** `/socket.io` (o `/node/socket.io` si el tráfico pasa por un proxy reescrito).
* **Parámetros de Query (Requeridos):**
  * `game` (string): Identificador único del juego (ej. `clash`, `quiniela`).
  * `room` (string): Identificador de la sala o partida (ej. `prod-1497`).
  * `user` (string, opcional): Nombre de usuario/identificador único del jugador para la lista de conectados.

### Eventos que Recibe el Cliente

#### Evento: `state`
Cada vez que un cliente se conecta, se desconecta o cuando el backend actualiza el estado mediante la API HTTP, el servidor emite el evento `'state'` a todos los clientes suscritos a esa sala.

**Ejemplo de Payload recibido:**
```json
{
  "status": "playing",
  "board": {
    "cells": [1, 0, 2]
  },
  "scores": {
    "player1": 120,
    "player2": 95
  },
  "online_users": ["Luis", "Carlos", "Anonymous"]
}
```

*Nota: La propiedad `online_users` siempre es inyectada automáticamente por el servidor basándose en los parámetros `user` de los sockets conectados actualmente a la sala.*

---

## 3. Actualización de Estado (REST API)

Cualquier servicio autorizado (por ejemplo, el Backend de WordPress o la propia app si cuenta con el Token correspondiente) puede modificar el estado de una sala enviando una petición HTTP.

* **Método:** `POST`
* **Ruta:** `/api/state` (o `/node/api/state`)
* **Headers:**
  * `Content-Type: application/json`
  * `Authorization: Bearer <AUTH_TOKEN>` (Token de seguridad configurado en el servidor)

### Payload del Body (JSON)
```json
{
  "game": "clash",
  "room": "prod-1497",
  "state": {
    "mi_propiedad_1": "valor",
    "mi_propiedad_2": 123
  }
}
```

### Respuestas del Servidor
* **`200 OK` (Éxito):**
  ```json
  { "success": true, "cached": true }
  ```
* **`401 Unauthorized` (Token inválido o ausente):**
  ```json
  { "success": false, "error": "Unauthorized" }
  ```
* **`400 Bad Request` (Payload malformado o faltan datos):**
  ```json
  { "success": false, "error": "Missing game, room, or state" }
  ```

---

## 4. Ejemplos de Implementación Código

### Cliente JavaScript (Web / React Native)
Para conectar un cliente web o móvil híbrido utilizando el SDK oficial `socket.io-client`:

```javascript
import { io } from "socket.io-client";

const SERVER_URL = "https://tu-servidor-juegos.com"; // O local: http://localhost:3001
const PATH = "/socket.io"; // Cambiar a "/node/socket.io" si es necesario

const socket = io(SERVER_URL, {
  path: PATH,
  query: {
    game: "clash",
    room: "prod-1497",
    user: "Maria" // Nombre visible del jugador
  },
  transports: ["websocket"] // Forzar WebSocket directo para mayor eficiencia
});

// Escuchar actualizaciones de estado
socket.on("state", (state) => {
  console.log("Nuevo estado recibido:", state);
  // Aquí actualizas la interfaz de tu aplicación
});

socket.on("connect", () => {
  console.log("Conectado con éxito al State Broker.");
});

socket.on("disconnect", (reason) => {
  console.warn("Desconectado del servidor:", reason);
});
```

### Petición HTTP para Actualizar Estado (cURL)
```bash
curl -X POST https://tu-servidor-juegos.com/api/state \
  -H "Authorization: Bearer koningo-secure-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "game": "clash",
    "room": "prod-1497",
    "state": {
      "status": "playing",
      "turn": "Maria",
      "timer": 30
    }
  }'
```

---

## 5. Buenas Prácticas y Consejos para Clientes

1. **Gestión de Desconexiones:** Las apps móviles pueden perder conectividad fácilmente. Diseña la interfaz para manejar estados de reconexión de Socket.io y no asumas que la conexión es 100% permanente.
2. **Recepción del Estado Inicial:** Al conectarte, Socket.io enviará inmediatamente el último estado guardado en caché. Si la sala es nueva o no tiene estado en caché aún, recibirás un objeto inicial conteniendo únicamente `{ success: true, online_users: [...] }`.
3. **Control de Flujo:** No utilices este servidor para transmitir inputs brutos de alta frecuencia (como coordenadas de movimiento de puntero/joystick en milisegundos). Está diseñado para sincronizar **estados discretos de juego** (turnos, puntajes, configuraciones de tableros, etc.).
