import { Injectable, NgZone } from '@angular/core';
import { IngJuego } from '../../assets/models';
import * as Phaser from 'phaser';
import { Main } from '../game/scenes/main';
import { TestAIScene } from '../game/scenes/test_ai';
import { SandboxScene } from '../game/scenes/sandbox';
import { IJugador } from '../models/jugadores';
import { CreditService } from './credit.service';
import { io, Socket } from 'socket.io-client';
import { serializeToTrucoGameState, deserializeFromTrucoGameState } from '../models/socket/trucoGameState';


export const DEFAULT_CHARACTERS = [
  {
    nombre: "Don Juan",
    estilo: "Estratega y calmado",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.4, paciencia: 0.8, bluff: 0.3, inteligencia: 0.8 }
  },
  {
    nombre: "Doña María",
    estilo: "Calculadora y lenta",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.2, paciencia: 0.9, bluff: 0.2, inteligencia: 0.9 }
  },
  {
    nombre: "El Catire",
    estilo: "Arriesgado",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.7, paciencia: 0.3, bluff: 0.8, inteligencia: 0.5 }
  },
  {
    nombre: "El Chamo",
    estilo: "Equilibrado",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.5, paciencia: 0.5, bluff: 0.4, inteligencia: 0.6 }
  },
  {
    nombre: "El General",
    estilo: "Autoritario",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.8, paciencia: 0.4, bluff: 0.5, inteligencia: 0.7 }
  },
  {
    nombre: "El Gocho",
    estilo: "Paciente y analítico",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.3, paciencia: 0.9, bluff: 0.2, inteligencia: 0.8 }
  },
  {
    nombre: "La Catira",
    estilo: "Impulsiva y rápida",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.9, paciencia: 0.2, bluff: 0.6, inteligencia: 0.4 }
  },
  {
    nombre: "La Flaca",
    estilo: "Muy impaciente",
    partidasJugadas: 0,
    partidasGanadas: 0,
    xp: 0,
    stats: { agresividad: 0.8, paciencia: 0.1, bluff: 0.7, inteligencia: 0.3 }
  }
];

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private game: Phaser.Game | undefined;

  public isMuted: boolean = localStorage.getItem('truco_muted') === 'true';
  public autoDealer: boolean = localStorage.getItem('truco_auto_dealer') === 'true';
  public naipes: string = 'naipes-gemini-0';//'naipes1';
  public escala: number = 1;
  public area: number = 100;
  public main: Main;
  local: IJugador;
  juego: any; // Instancia real de la lógica de juego
  vira: any;

  public testMode: boolean = false;
  public sandboxMode: boolean = false;
  public data: any = {
    userID: 'Player',
    PC: false,
    juego: null
  };

  public phaser: any = {
    screen: { w: 800, h: 600 },
    emitter: null
  };

  public characters: any[] = [];
  public selectedIAs: any[] = [];

  // Webhook, Socket.io and Rooms management
  public userId: string = localStorage.getItem('truco_user_id') || Math.random().toString(36).substr(2, 9);
  public currentRoom: string = localStorage.getItem('truco_current_room') || 'Sala 1';
  public connectedClients: any[] = [];
  public socket: Socket | null = null;
  public onWebhookEventCallback: ((event: any) => void) | null = null;
  public initialSnapshot: any = null;
  public myIndexInRoom: number = 0; // Index of this client in the room's sorted client list
  public localPlayerReady: boolean = false;
  public isHost: boolean = false;
  public hostUserId: string | null = null;

  constructor(public credit: CreditService, private ngZone: NgZone) {
    if (!localStorage.getItem('truco_user_id')) {
      localStorage.setItem('truco_user_id', this.userId);
    }
  }

  connectToEvents(userName: string) {
    this.disconnectEvents();
    this.localPlayerReady = false;
    this.isHost = false;
    this.hostUserId = null;

    const serverUrl = 'https://koningo.com';
    const socketPath = '/node/socket.io';
    const roomName = `ing-truco-${this.currentRoom}`;
    const userQuery = `${this.userId}:${userName}`;

    console.log('[Socket.io] Connecting to:', serverUrl, 'path:', socketPath, 'room:', roomName, 'user:', userQuery);

    this.socket = io(serverUrl, {
      path: socketPath,
      query: {
        game: 'truco',
        room: roomName,
        user: userQuery
      },
      transports: ['polling', 'websocket']
    });

    this.socket.on('connect', () => {
      console.log('[Socket.io] Connected successfully to state broker.');
      // Forzar broadcast enviando una acción para actualizar el estado en el broker
      this.sendRoomAction('client_connect', { userName });
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket.io] Disconnected from server:', reason);
    });

    // Escuchar el estado general y la lista de conectados
    this.socket.on('state', (state: any) => {
      this.ngZone.run(() => {
        console.log('[Socket.io] Received state update:', state);
        // Primero procesar acciones de presencia incrustadas en el evento 'state'
        if (state && state.event === 'game_action' && state.data) {
          const data = state.data;
          if (data && data.action === 'player_ready') {
            const client = this.connectedClients.find(c => c.userId === data.userId);
            if (client) {
              client.ready = data.ready;
              console.log('[Socket.io] Updated client ready state from state payload:', client);
            }
          }
        }

        if (state && Array.isArray(state.online_users)) {
          // El primer usuario conectado en la lista histórica es el Host
          const hostUserString = state.online_users[0];
          this.hostUserId = hostUserString ? hostUserString.split(':')[0] : null;
          this.isHost = (this.userId === this.hostUserId);
          console.log('[Socket.io] Host resolved:', this.hostUserId, 'IsMeHost:', this.isHost);

          // Parsear los usuarios de la sala conservando el estado de ready previo
          this.connectedClients = state.online_users.map((u: string) => {
            const parts = u.split(':');
            const uid = parts[0];
            const name = parts[1] || 'Anonymous';
            const existing = this.connectedClients.find(c => c.userId === uid);
            return {
              userId: uid,
              name: name,
              room: this.currentRoom,
              ready: existing ? existing.ready : (uid === this.userId ? this.localPlayerReady : false)
            };
          });
          console.log('[Socket.io] Parsed online clients:', this.connectedClients);
        }

        // Si el estado contiene datos de una acción directa del juego
        if (state && state.event === 'game_action' && state.data) {
          // Ignorar acciones enviadas por nosotros mismos
          if (state.data.userId === this.userId) return;

          if (this.onWebhookEventCallback) {
            this.onWebhookEventCallback(state);
          }
        }

        // Si el estado es directamente un snapshot
        if (state && state.snapshot) {
          let snapshotToApply = state.snapshot;
          if (snapshotToApply && snapshotToApply.gameId === 'truco') {
            console.log('[Socket.io] 🔵 Recibiendo estado (TrucoGameState):', snapshotToApply);
            snapshotToApply = deserializeFromTrucoGameState(snapshotToApply);
          }
          console.log('[Socket.io] 🔵 Aplicando estado en el juego:', snapshotToApply);
          if (this.juego && this.main && this.main.sys && this.main.sys.isActive()) {
            this.juego.aplicarSnapshotEstado(snapshotToApply);
          } else {
            console.log('[Socket.io] Phaser scene not ready/active. Caching snapshot as initialSnapshot.');
            this.initialSnapshot = snapshotToApply;
          }
        }
      });
    });

    // Adicionalmente escuchar eventos de acción directa si el broker los retransmite directamente
    this.socket.on('game_action', (data: any) => {
      this.ngZone.run(() => {
        console.log('[Socket.io] Direct game_action event:', data);
        if (data && data.userId === this.userId) return;

        // Si es una acción de presencia de otro cliente, actualizar la lista local en tiempo real
        if (data && data.action === 'client_connect') {
          const alreadyExists = this.connectedClients.some(c => c.userId === data.userId);
          if (!alreadyExists) {
            this.connectedClients.push({
              userId: data.userId,
              name: data.userName || 'Player',
              room: this.currentRoom,
              ready: data.ready || false
            });
            console.log('[Socket.io] Added client on client_connect event:', this.connectedClients);
          }
          // Si nosotros ya estamos listos, avisar al nuevo para que actualice nuestro estado en su pantalla
          if (this.localPlayerReady) {
            this.sendRoomAction('player_ready', { ready: true });
          }
        } else if (data && data.action === 'client_disconnect') {
          this.connectedClients = this.connectedClients.filter(c => c.userId !== data.userId);
          console.log('[Socket.io] Removed client on client_disconnect event:', this.connectedClients);
        } else if (data && data.action === 'player_ready') {
          const client = this.connectedClients.find(c => c.userId === data.userId);
          if (client) {
            client.ready = data.ready;
            console.log('[Socket.io] Updated client ready state:', client);
          }
        }

        if (this.onWebhookEventCallback) {
          this.ngZone.run(() => {
            this.onWebhookEventCallback!({ event: 'game_action', data });
          });
        }
      });
    });
  }

  disconnectEvents() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  connectToLobby() {
    this.disconnectEvents();
    this.localPlayerReady = false;

    const serverUrl = 'https://koningo.com';
    const socketPath = '/node/socket.io';
    const roomName = 'ing-truco-global-lobby'; // Global room
    const userQuery = `${this.userId}:LobbyGuest`;

    console.log('[Socket.io] Connecting to global lobby:', roomName);

    this.socket = io(serverUrl, {
      path: socketPath,
      query: {
        game: 'truco',
        room: roomName,
        user: userQuery
      },
      transports: ['polling', 'websocket']
    });

    this.socket.on('connect', () => {
      console.log('[Socket.io] Connected successfully to global lobby.');
      // Forzar broadcast del lobby enviando un ping de estado por socket
      if (this.socket) {
        this.socket.emit('state', { event: 'lobby_ping', timestamp: Date.now() });
      }
    });

    this.socket.on('state', (state: any) => {
      this.ngZone.run(() => {
        if (state && Array.isArray(state.online_users)) {
          this.connectedClients = state.online_users.map((u: string) => {
            const parts = u.split(':');
            const uid = parts[0];
            const name = parts[1] || 'Anonymous';
            return { userId: uid, name: name, room: 'Lobby' };
          });
        }
      });
    });
  }

  async sendRoomAction(actionName: string, payloadData: any) {
    try {
      const roomName = `ing-truco-${this.currentRoom}`;
      const actionPayload = {
        action: actionName,
        userId: this.userId,
        ...payloadData
      };

      console.log('[Socket.io] Sending room action:', actionName, actionPayload);

      let snapshot = payloadData.snapshot;
      if (!snapshot && this.juego && this.juego.manoEnCurso) {
        const rawSnapshot = this.juego.obtenerSnapshotEstado();
        const playerNames = this.connectedClients.map(c => c.name);
        snapshot = serializeToTrucoGameState(rawSnapshot, roomName, playerNames);
      }

      const statePayload = {
        event: 'game_action',
        data: actionPayload,
        snapshot: snapshot
      };

      // 1. Emitir evento por Socket.io a otros clientes directamente
      if (this.socket) {
        console.log('[Socket.io] 🟢 Sincronizando estado (Enviado):', statePayload);
        //this.socket.emit('game_action', actionPayload);
        //this.socket.emit('message', { event: 'game_action', data: actionPayload });
        // Sincronizar el estado directamente a través de WebSockets
        this.socket.emit('state', statePayload);
      }

    } catch (e) {
      console.error('Error sending room action:', e);
    }
  }

  async loadCharacters(): Promise<any[]> {
    try {
      const response = await fetch('/api/characters');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          this.characters = data;
          localStorage.setItem('truco_characters', JSON.stringify(data));
          this.selectIAsForRoom();
          return data;
        }
      }
    } catch (e) {
      console.warn('API /api/characters failed, trying localStorage...', e);
    }

    const localData = localStorage.getItem('truco_characters');
    if (localData) {
      try {
        this.characters = JSON.parse(localData);
        this.selectIAsForRoom();
        return this.characters;
      } catch (e) {
        console.error('Error parsing localStorage characters', e);
      }
    }

    // Default fallback
    this.characters = JSON.parse(JSON.stringify(DEFAULT_CHARACTERS));
    localStorage.setItem('truco_characters', JSON.stringify(this.characters));
    this.selectIAsForRoom();
    return this.characters;
  }

  selectIAsForRoom() {
    if (!this.characters || this.characters.length === 0) {
      this.selectedIAs = [];
      return;
    }
    const sortedPool = [...this.characters].sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.selectedIAs = [];

    let hash = 0;
    const roomStr = this.currentRoom || 'Sala 1';
    for (let i = 0; i < roomStr.length; i++) {
      hash = roomStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    for (let i = 0; i < 3; i++) {
      if (sortedPool.length === 0) break;
      const idx = (hash + i) % sortedPool.length;
      this.selectedIAs.push(sortedPool.splice(idx, 1)[0]);
    }
    console.log('[GameService] Deterministic IAs selected for room:', this.currentRoom, this.selectedIAs);
  }

  async saveCharacter(character: any): Promise<boolean> {
    const idx = this.characters.findIndex(c => c.nombre === character.nombre);
    if (idx !== -1) {
      this.characters[idx] = character;
    }
    localStorage.setItem('truco_characters', JSON.stringify(this.characters));

    try {
      const response = await fetch('/api/characters/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(character)
      });
      if (response.ok) {
        console.log(`Character ${character.nombre} saved to server.`);
        return true;
      }
    } catch (e) {
      console.warn(`Could not save character ${character.nombre} to server (local environment fallback)`, e);
    }
    return false;
  }

  async initGame(containerId: string) {
    this.phaser.emitter = new Phaser.Events.EventEmitter();

    // Cargar personajes y seleccionar 3 de forma determinista por sala para sincronización
    if (!this.characters || this.characters.length === 0) {
      await this.loadCharacters();
    }
    this.selectIAsForRoom();

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerId,
      transparent: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: []
    };

    if (this.game) {
      this.game.destroy(true);
    }
    this.game = new Phaser.Game(config);
    this.game.events.once('ready', () => {
      this.game.scene.add('main', Main, false);
      this.game.scene.add('test_ai', TestAIScene, false);
      this.game.scene.add('sandbox', SandboxScene, false);

      const startScene = this.sandboxMode ? 'sandbox' : (this.testMode ? 'test_ai' : 'main');
      console.log('Starting scene:', startScene);

      this.game.scene.start(startScene, { service: this });
    });
  }

  destroyGame() {
    if (this.game) {
      this.game.destroy(true);
      this.game = undefined;
    }
  }

  archiveMatch(matchData: any) {
    try {
      const historyStr = localStorage.getItem('truco_historial') || '[]';
      const history = JSON.parse(historyStr);
      history.unshift({
        id: `match_${Date.now()}`,
        timestamp: new Date().toISOString(),
        room: this.currentRoom,
        ...matchData
      });
      // Mantener los últimos 30 registros
      if (history.length > 30) history.pop();
      localStorage.setItem('truco_historial', JSON.stringify(history));
      console.log('[GameService] Partida archivada con éxito en historial local.');
    } catch (e) {
      console.warn('[GameService] No se pudo archivar la partida:', e);
    }
  }

  cleanUpGameState() {
    this.destroyGame();
    this.juego = null;
    this.main = undefined as any;
    this.local = undefined as any;
    this.vira = undefined as any;
    this.initialSnapshot = null;
    this.localPlayerReady = false;
    this.onWebhookEventCallback = null;
    console.log('[GameService] Estado del juego limpiado por completo.');
  }
}
