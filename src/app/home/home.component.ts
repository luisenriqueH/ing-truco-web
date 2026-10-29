import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CreditService } from '../services/credit.service';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-home',
  template: `
    <div class="home-wrapper">
      <!-- Background Layer -->
      <div class="bg-overlay"></div>
      
      <!-- Top HUD -->
      <header class="hud-top">
        <div class="clients-dropdown-container glass-card" (click)="toggleClientsDropdown($event)">
          <div class="dropdown-header">
            🟢 {{ gameService.connectedClients.length }} En Línea
            <span class="chevron" [class.open]="showClientsDropdown">▼</span>
          </div>
          <div class="dropdown-list" *ngIf="showClientsDropdown" (click)="$event.stopPropagation()">
            <div class="dropdown-item heading">Clientes Conectados</div>
            <div class="dropdown-item" *ngFor="let client of gameService.connectedClients">
              <span class="client-dot" [class.me]="client.userId === gameService.userId"></span>
              <span class="client-name">{{ client.name }}</span>
              <span class="client-room-tag">{{ client.room }}</span>
            </div>
            <div class="dropdown-item empty" *ngIf="gameService.connectedClients.length === 0">
              No hay otros clientes conectados
            </div>
          </div>
        </div>

        <div class="coin-display glass-card">
          <img src="assets/models/coin.png" class="coin-icon" alt="coins">
          <span class="coin-amount">{{ coins }}</span>
          <button class="btn-modern btn-store" (click)="selectTab('tienda')">+</button>
        </div>
      </header>

      <!-- Main Controls -->
      <main class="main-content" [class.wide-layout]="activeTab === 'ia'">
        <div class="hero-section">
          <h1 class="game-title">TRUCO VENEZOLANO</h1>

          <!-- Tab Bar Navigation -->
          <div class="tabs-container" *ngIf="!inLobby">
            <button class="tab-btn" [class.active]="activeTab === 'jugar'" (click)="selectTab('jugar')">🎮 JUGAR</button>
            <button class="tab-btn" [class.active]="activeTab === 'ia'" (click)="selectTab('ia')">🧠 GIMNASIO IA</button>
            <button class="tab-btn" [class.active]="activeTab === 'tienda'" (click)="selectTab('tienda')">🪙 TIENDA</button>
          </div>

          <!-- JUGAR TAB -->
          <div class="tab-content-panel animate-fadeIn" *ngIf="activeTab === 'jugar' && !inLobby">
            <!-- Room Selector -->
            <div class="room-selector-container">
              <p class="deck-label">SELECCIONA TU SALA DE JUEGO</p>
              <div class="room-list">
                <div
                  *ngFor="let room of ['Sala 1', 'Sala 2', 'Sala 3']"
                  class="room-card"
                  [class.selected]="selectedRoom === room"
                  (click)="selectRoom(room)"
                >
                  <div class="room-card-header">
                    <span class="room-icon">🏫</span>
                    <span class="room-name">{{ room }}</span>
                  </div>
                  <div class="room-card-body">
                    <div class="room-stat">
                      <span class="stat-lbl">Jugadores:</span>
                      <span class="stat-val font-bold">{{ getPlayerCount(room) }}/4</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Deck Selector -->
            <div class="deck-selector">
              <p class="deck-label">ELIGE TU BARAJA</p>
              <div class="deck-list">
                <div
                  class="deck-card"
                  *ngFor="let deck of decks"
                  [class.selected]="selectedDeck === deck.key"
                  (click)="selectDeck(deck.key)"
                >
                  <div class="deck-preview"
                    [style.background-image]="'url(assets/atlas/' + deck.key + '.png)'"
                    [style.background-position]="deck.previewPos"
                  ></div>
                  <span class="deck-name">{{ deck.label }}</span>
                  <div class="deck-check" *ngIf="selectedDeck === deck.key">✓</div>
                </div>
              </div>
            </div>

            <div class="play-action">
              <button class="btn-modern start-btn" (click)="startGame()">JUGAR AHORA</button>
              <div class="cost-tag">Costo: {{ COST_TO_PLAY }} CR</div>
              
              <button class="btn-modern btn-sandbox" (click)="startSandbox()">PIZARRA TÁCTICA 🎴</button>
            </div>
          </div>

          <!-- LOBBY MESA (PASO PREVIO) -->
          <div class="tab-content-panel lobby-panel animate-fadeIn" *ngIf="inLobby">
            <h2 class="lobby-subtitle">🏫 Mesa de Juego: {{ selectedRoom }}</h2>
            <p class="lobby-waiting-text">👥 Conectados a la mesa. Puedes esperar por otros jugadores reales o iniciar con IAs de relleno.</p>

            <div class="lobby-table-container">
              <div class="lobby-table">
                <!-- Centro de la mesa con logo y efecto de pulso -->
                <div class="lobby-table-center">
                  <div class="table-logo">TRUCO</div>
                  <span class="pulse-ring"></span>
                </div>
                
                <!-- 4 Asientos (slots) -->
                <div class="lobby-seat" *ngFor="let seat of getLobbySeats(); let idx = index" [ngClass]="'seat-' + idx">
                  <!-- Luz indicadora de listo -->
                  <div class="ready-light" [class.ready]="seat.ready"></div>

                  <div class="seat-avatar" [style.background]="seat.avatarColor">
                    {{ seat.initials }}
                  </div>
                  <div class="seat-info">
                    <span class="seat-name">
                      {{ seat.name }}
                      <span *ngIf="seat.isHost" title="Host de la sala" style="margin-left: 4px; font-size: 0.85rem;">👑</span>
                    </span>
                    <span class="seat-badge" [class.human]="seat.isHuman" [class.ia]="!seat.isHuman">
                      {{ seat.isHuman ? 'HUMANO' : 'IA' }}
                    </span>
                    <span class="seat-style" *ngIf="!seat.isHuman">{{ seat.estilo }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="lobby-actions">
              <!-- Botón de Listo -->
              <button class="btn-modern btn-ready" [class.ready]="gameService.localPlayerReady" (click)="toggleReady()">
                {{ gameService.localPlayerReady ? '❌ CANCELAR LISTO' : '✅ ESTOY LISTO' }}
              </button>

              <!-- El Host ve el botón de iniciar partida (deshabilitado si hay humanos no listos) -->
              <button class="btn-modern start-btn" *ngIf="gameService.isHost" [disabled]="!allHumansReady()" (click)="confirmStartGame()">INICIAR PARTIDA</button>

              <!-- Los invitados ven un texto de espera -->
              <div class="waiting-host-msg" *ngIf="!gameService.isHost" style="color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; font-weight: 700;">
                ⏳ Esperando que el anfitrión inicie...
              </div>

              <button class="btn-modern btn-back" (click)="exitLobby()">VOLVER</button>
            </div>
          </div>

          <!-- GIMNASIO IA TAB -->
          <div class="tab-content-panel animate-fadeIn" *ngIf="activeTab === 'ia'">
            <div class="ias-grid">
              <div class="ia-character-card glass-card" *ngFor="let char of characters">
                <div class="ia-card-header">
                  <div class="ia-avatar" [style.background]="getCharacterGradient(char.nombre)">
                    {{ getInitials(char.nombre) }}
                  </div>
                  <div class="ia-identity">
                    <h3 class="ia-name">{{ char.nombre }}</h3>
                    <span class="ia-style">{{ char.estilo }}</span>
                  </div>
                </div>
                
                <!-- XP & Level progress -->
                <div class="ia-xp-section">
                  <div class="ia-xp-label">
                    <span>NIVEL {{ getLevel(char.xp) }}</span>
                    <span class="xp-val">{{ char.xp % 100 }}/100 XP</span>
                  </div>
                  <div class="ia-xp-bar-bg">
                    <div class="ia-xp-bar-fill" [style.width]="(char.xp % 100) + '%'"></div>
                  </div>
                </div>

                <!-- Match Stats -->
                <div class="ia-match-stats">
                  <span>Partidas: {{ char.partidasJugadas }}</span>
                  <span>Victorias: {{ char.partidasGanadas }}</span>
                </div>

                <!-- Character Stats Bars -->
                <div class="ia-stats-container">
                  <div class="ia-stat-row">
                    <span class="stat-label">Agresividad</span>
                    <div class="stat-bar-bg">
                      <div class="stat-bar-fill agresividad" [style.width]="(char.stats.agresividad * 100) + '%'"></div>
                    </div>
                    <span class="stat-value">{{ Math.round(char.stats.agresividad * 100) }}%</span>
                  </div>
                  <div class="ia-stat-row">
                    <span class="stat-label">Paciencia</span>
                    <div class="stat-bar-bg">
                      <div class="stat-bar-fill paciencia" [style.width]="(char.stats.paciencia * 100) + '%'"></div>
                    </div>
                    <span class="stat-value">{{ Math.round(char.stats.paciencia * 100) }}%</span>
                  </div>
                  <div class="ia-stat-row">
                    <span class="stat-label">Bluff</span>
                    <div class="stat-bar-bg">
                      <div class="stat-bar-fill bluff" [style.width]="(char.stats.bluff * 100) + '%'"></div>
                    </div>
                    <span class="stat-value">{{ Math.round(char.stats.bluff * 100) }}%</span>
                  </div>
                  <div class="ia-stat-row">
                    <span class="stat-label">Inteligencia</span>
                    <div class="stat-bar-bg">
                      <div class="stat-bar-fill inteligencia" [style.width]="(char.stats.inteligencia * 100) + '%'"></div>
                    </div>
                    <span class="stat-value">{{ Math.round(char.stats.inteligencia * 100) }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TIENDA TAB -->
          <div class="tab-content-panel store-tab-container animate-fadeIn" *ngIf="activeTab === 'tienda'">
            <div class="store-modal glass-card">
              <h2>TIENDA DE MONEDAS</h2>
              <div class="package-list">
                <div class="package-card" (click)="buy(10, '10CR')">
                  <span class="pkg-amt">10 CR</span>
                  <span class="pkg-price">$1.00</span>
                </div>
                <div class="package-card" (click)="buy(100, '100CR')">
                  <span class="pkg-amt">100 CR</span>
                  <span class="pkg-price">$5.00</span>
                </div>
                <div class="package-card" (click)="buy(1000, '1000CR')">
                  <span class="pkg-amt">1000 CR</span>
                  <span class="pkg-price">$20.00</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <!-- Footer Info -->
      <footer class="footer-info">
        <span>VERSIÓN 1.2.0 (BETA)</span>
      </footer>
    </div>
  `,
  styles: [`
    .home-wrapper {
      position: relative;
      width: 100vw;
      min-height: 100vh;
      background: url('assets/bg_home.png') center center / cover no-repeat;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding-top: 6.5rem;
      padding-bottom: 3.5rem;
      overflow-y: auto;
      overflow-x: hidden;
      box-sizing: border-box;
    }

    .bg-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%);
      z-index: 1;
      pointer-events: none;
    }

    .hud-top {
      position: fixed;
      top: 1.5rem;
      left: 2rem;
      right: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 20;
      pointer-events: none;
    }

    .hud-top > * {
      pointer-events: auto;
    }

    .clients-dropdown-container {
      position: relative;
      cursor: pointer;
      user-select: none;
      padding: 0.75rem 1.5rem;
      border-radius: 99px;
      font-weight: 700;
      color: #fff;
    }
    .dropdown-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .chevron {
      font-size: 0.75rem;
      transition: transform 0.2s;
      display: inline-block;
    }
    .chevron.open {
      transform: rotate(180deg);
    }
    .dropdown-list {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 10px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      width: 250px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      z-index: 100;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .dropdown-item {
      padding: 10px 15px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 10px;
      text-align: left;
    }
    .dropdown-item.heading {
      font-weight: 800;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.03);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .dropdown-item.empty {
      color: #64748b;
      font-style: italic;
    }
    .client-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
    }
    .client-dot.me {
      background: #3b82f6;
      box-shadow: 0 0 8px #3b82f6;
    }
    .client-name {
      flex: 1;
      text-align: left;
      font-weight: 600;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .client-room-tag {
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 800;
    }

    /* Room Selector Styles */
    .room-selector-container {
      margin-bottom: 0rem;
    }
    .room-list {
      display: flex;
      gap: 1.5rem;
      justify-content: flex-start;
      flex-wrap: nowrap;
      overflow-x: scroll;
      padding: 5px;
      margin: 0px 10px;
    }
    .room-card {
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 10px;
      min-width: 120px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      text-align: left;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
    }
    .room-card:hover {
      background: rgba(15, 23, 42, 0.8);
      border-color: rgba(251, 191, 36, 0.3);
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
    }
    .room-card.selected {
      background: rgba(59, 130, 246, 0.2);
      border-color: #3b82f6;
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
    }
    .room-card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 0.5rem;
    }
    .room-icon {
      font-size: 1.2rem;
    }
    .room-name {
      font-weight: 700;
      color: #fff;
      font-size: 1rem;
    }
    .room-card-body {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .room-stat {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.6);
    }
    .stat-val {
      color: #fff;
      font-weight: 600;
    }
    .font-bold {
      font-weight: 700;
    }
    .active-game {
      color: #10b981;
    }
    .score-val {
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 800;
    }

    .glass-card {
      color: #fff;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      padding: 1.5rem;
    }

    .coin-display {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1.5rem;
      border-radius: 99px;
    }

    .coin-icon { width: 32px; height: 32px; }
    .coin-amount { font-size: 1.5rem; font-weight: 800; color: #fbbf24; }

    .btn-store {
      width: 32px;
      height: 32px;
      padding: 0;
      border-radius: 50%;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .main-content {
      margin: auto 0;
      z-index: 5;
      text-align: center;
      width: 100%;
      max-width: 600px;
      transition: max-width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1);
    }
    .main-content.wide-layout {
      max-width: 1200px;
    }

    .hero-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .tab-content-panel {
      height: min(600px, calc(100vh - 400px));
      overflow-y: scroll;
      gap: 10px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    .game-title {
      font-size: 2rem;
      font-weight: 800;
      margin: 0rem;
      letter-spacing: 0.15em;
      text-shadow: 0 10px 20px rgba(0,0,0,0.5);
      background: linear-gradient(to bottom, #fff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* ── Tab Bar Navigation ── */
    .tabs-container {
      display: flex;
      justify-content: center;
      gap: 1rem;
      z-index: 10;
      position: relative;
    }
    .tab-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.6);
      padding: 0.75rem 1.75rem;
      border-radius: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.9rem;
      letter-spacing: 1px;
    }
    .tab-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      transform: translateY(-2px);
    }
    .tab-btn.active {
      background: rgba(251, 191, 36, 0.2);
      border-color: #fbbf24;
      color: #fbbf24;
      box-shadow: 0 0 15px rgba(251, 191, 36, 0.15);
    }

    .start-btn {
      font-size: 1rem;
      padding: 1rem 2rem;
      width: min(200px,40%);
    }

    .store-tab-container {
      max-width: 600px;
      margin: 0 auto;
    }
    .store-modal {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .store-modal h2 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: 1px;
    }

    .package-list {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }

    .package-card {
      background: rgba(255,255,255,0.05);
      padding: 1.5rem;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      cursor: pointer;
      border: 1px solid rgba(255,255,255,0.1);
      transition: all 0.2s;
    }

    .package-card:hover {
      background: rgba(255,255,255,0.15);
      transform: scale(1.05);
      border-color: #fbbf24;
    }

    .pkg-amt { font-size: 1.25rem; font-weight: 800; color: #fbbf24; }
    .pkg-price { font-size: 1rem; color: #10b981; font-weight: 600; }

    .footer-info {
      margin-top: 2rem;
      color: rgba(255,255,255,0.3);
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      z-index: 5;
    }

    .play-action {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-sandbox {
      font-size: 1.15rem;
      padding: 0.75rem 2rem;
      background: rgba(251, 191, 36, 0.1);
      border-color: rgba(251, 191, 36, 0.4);
      color: #fbbf24;
      margin-top: 1rem;
      box-shadow: 0 4px 15px rgba(251, 191, 36, 0.1);
    }
    .btn-sandbox:hover {
      background: rgba(251, 191, 36, 0.25);
      border-color: #fbbf24;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(251, 191, 36, 0.2);
    }
    .cost-tag {
      color: rgba(255,255,255,0.5);
      font-weight: 700;
      letter-spacing: 1px;
      font-size: 0.9rem;
      text-transform: uppercase;
    }

    /* ── Deck Selector ── */
    .deck-selector {
      margin: 0rem;
    }
    .deck-label {
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.25em;
      color: rgba(255,255,255,0.45);
      text-transform: uppercase;
      margin-bottom: 1.25rem;
    }
    .deck-list {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .deck-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .deck-card:hover {
      transform: translateY(-4px);
    }
    .deck-card.selected .deck-preview {
      border-color: #fbbf24;
      box-shadow: 0 0 0 3px rgba(251,191,36,0.5), 0 8px 24px rgba(0,0,0,0.6);
    }
    .deck-preview {
      width: 100px;
      height: 150px;
      border-radius: 8px;
      border: 2px solid rgba(255,255,255,0.15);
      background-size: 1300px auto;
      background-repeat: no-repeat;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      image-rendering: auto;
    }
    .deck-name {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,0.7);
      text-transform: uppercase;
    }
    .deck-check {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 22px;
      height: 22px;
      background: #fbbf24;
      border-radius: 50%;
      font-size: 0.7rem;
      font-weight: 900;
      color: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }

    /* ── IA Gym Dashboard ── */
    .ias-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
      gap: 1.5rem;
      padding: 0.5rem;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }
    .ias-grid::-webkit-scrollbar {
      width: 6px;
    }
    .ias-grid::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }
    .ia-character-card {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: all 0.3s ease;
    }
    .ia-character-card:hover {
      transform: translateY(-4px);
      border-color: rgba(251, 191, 36, 0.3);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
    }
    .ia-card-header {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .ia-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.2rem;
      color: #fff;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    .ia-identity {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
    }
    .ia-name {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
    }
    .ia-style {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }
    .ia-xp-section {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .ia-xp-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .ia-xp-label span:first-child {
      color: #fbbf24;
    }
    .ia-xp-label .xp-val {
      color: rgba(255, 255, 255, 0.6);
    }
    .ia-xp-bar-bg {
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 99px;
      overflow: hidden;
    }
    .ia-xp-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #fbbf24, #f59e0b);
      border-radius: 99px;
    }
    .ia-match-stats {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 600;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 0.5rem;
    }
    .ia-stats-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .ia-stat-row {
      display: grid;
      grid-template-columns: 80px 1fr 35px;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
    }
    .stat-label {
      color: rgba(255, 255, 255, 0.7);
      text-align: left;
      font-weight: 600;
    }
    .stat-bar-bg {
      height: 4px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 99px;
      overflow: hidden;
    }
    .stat-bar-fill {
      height: 100%;
      border-radius: 99px;
    }
    .stat-bar-fill.agresividad {
      background: linear-gradient(90deg, #ef4444, #b91c1c);
    }
    .stat-bar-fill.paciencia {
      background: linear-gradient(90deg, #10b981, #047857);
    }
    .stat-bar-fill.bluff {
      background: linear-gradient(90deg, #8b5cf6, #6d28d9);
    }
    .stat-bar-fill.inteligencia {
      background: linear-gradient(90deg, #06b6d4, #0891b2);
    }
    .stat-value {
      color: #fff;
      font-weight: 700;
      text-align: right;
    }

    /* Animations */
    .animate-fadeIn {
      animation: fadeIn 0.4s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Lobby Styles */
    .lobby-panel {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .lobby-subtitle {
      font-size: 2rem;
      line-height: 2rem;
      font-weight: 800;
      color: #fff;
      margin-bottom: 0.5rem;
      text-shadow: 0 4px 10px rgba(0,0,0,0.5);
    }
    .lobby-waiting-text {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.95rem;
      margin-bottom: 2rem;
      max-width: 600px;
    }
    .lobby-table-container {
      width: 100%;
      height: 350px;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 2rem;
      position: relative;
    }
    .lobby-table {
      width: min(80%,500px);
      height: 250px;
      background: radial-gradient(circle at center, #0f5132 0%, #082f1e 100%);
      border: 12px solid #5c3d2e;
      border-radius: 125px;
      position: relative;
      box-shadow: 0 20px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.6);
    }
    .lobby-table-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 120px;
      height: 60px;
      background: rgba(0, 0, 0, 0.2);
      border: 2px dashed rgba(255, 255, 255, 0.1);
      border-radius: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .table-logo {
      color: rgba(255, 255, 255, 0.15);
      font-weight: 900;
      font-size: 1.25rem;
      letter-spacing: 4px;
    }
    .lobby-seat {
      position: absolute;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 0.5rem 0.75rem;
      border-radius: 12px;
      min-width: 160px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      transition: all 0.3s ease;
    }
    .lobby-seat:hover {
      transform: translateX(-50%) scale(1.05);
      border-color: #fbbf24;
    }
    
    /* Seat Positioning around the oval table */
    .seat-0 {
      bottom: -40px;
      left: 50%;
      transform: translateX(-50%);
    }
    .seat-1 {
      right: -100px;
      top: 50%;
      transform: translateY(-50%);
    }
    .seat-2 {
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
    }
    .seat-3 {
      left: -100px;
      top: 50%;
      transform: translateY(-50%);
    }
    
    .seat-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.95rem;
      color: #fff;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    }
    .seat-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      font-size: 0.8rem;
    }
    .seat-name {
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .seat-badge {
      font-size: 0.65rem;
      font-weight: 900;
      padding: 1px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .seat-badge.human {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }
    .seat-badge.ia {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }
    .seat-style {
      font-size: 0.65rem;
      color: rgba(255,255,255,0.4);
      margin-top: 1px;
    }
    
    .lobby-actions {
      display: flex;
      gap: 1.5rem;
      margin-top: 1rem;
    }
    .btn-back {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.4);
      color: #f87171;
      width: min(100px,30%);
    }
    .btn-back:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: #ef4444;
      color: #fff;
      transform: translateY(-2px);
    }
    
    .pulse-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 30px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      animation: pulse 2s infinite;
      box-sizing: border-box;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    /* Ready styles */
    .ready-light {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 14px;
      height: 14px;
      background: #4b5563;
      border: 2px solid #0f172a;
      border-radius: 50%;
      transition: all 0.3s ease;
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
    }
    .ready-light.ready {
      background: #10b981;
      box-shadow: 0 0 12px #10b981;
    }
    .btn-ready {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.4);
      color: #34d399;
      width: min(100px,30%);
    }
    .btn-ready:hover {
      background: rgba(16, 185, 129, 0.25);
      border-color: #10b981;
      color: #fff;
    }
    .btn-ready.ready {
      background: #10b981;
      border-color: #10b981;
      color: #000;
    }
    .btn-ready.ready:hover {
      background: #059669;
      border-color: #059669;
      color: #fff;
    }
    .start-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  readonly COST_TO_PLAY = 2;
  coins: number = 0;
  activeTab: 'jugar' | 'ia' | 'tienda' = 'jugar';
  Math = Math;

  decks = [
    {
      key: 'naipes1',
      label: 'Clásica',
      previewPos: '0px 0px'
    },
    {
      key: 'naipes-animales-4',
      label: 'Animales',
      previewPos: '0px 0px'
    },
    {
      key: 'naipes-gemini-0',
      label: 'Medieval',
      previewPos: '0px 0px'
    }
  ];

  selectedDeck: string;
  selectedRoom: string = 'Sala 1';
  showClientsDropdown: boolean = false;
  characters: any[] = [];
  inLobby: boolean = false;

  constructor(
    private creditService: CreditService,
    private router: Router,
    private route: ActivatedRoute,
    public gameService: GameService,
    private ngZone: NgZone
  ) { }

  async ngOnInit() {
    this.coins = this.creditService.getCoins();
    this.selectedDeck = this.gameService.naipes;
    this.selectedRoom = this.gameService.currentRoom;

    // Verificar si venimos de terminar una partida para ir directo a la mesa/lobby de la sala
    this.route.queryParams.subscribe(params => {
      if (params && params['lobby'] === 'true') {
        if (params['room']) {
          this.selectRoom(params['room']);
        }
        console.log('[Home] Retornando a lobby de sala limpia tras finalizar partida:', this.selectedRoom);
        this.startGame();
      } else {
        // Connect to global lobby by default
        this.gameService.connectToLobby();
      }
    });

    // Close dropdown on click outside
    this.outsideClickHandler = () => {
      if (this.showClientsDropdown) {
        this.ngZone.run(() => {
          this.showClientsDropdown = false;
        });
      }
    };
    window.addEventListener('click', this.outsideClickHandler);

    // Load registered decks/skins dynamically
    await this.loadSkins();

    // Load persistent characters
    this.characters = await this.gameService.loadCharacters();
  }

  private outsideClickHandler: any;

  ngOnDestroy() {
    if (this.outsideClickHandler) {
      window.removeEventListener('click', this.outsideClickHandler);
    }
  }

  getPlayerCount(roomName: string): number {
    if (!this.gameService.connectedClients) return 0;
    return this.gameService.connectedClients.filter(c => c.room === roomName).length;
  }

  async loadSkins() {
    try {
      const response = await fetch('/assets/skins/registered.json');
      if (response.ok) {
        const skins = await response.json();
        if (Array.isArray(skins) && skins.length > 0) {
          this.decks = skins;
        }
      }
    } catch (e) {
      console.warn('Could not load skins from registered.json, using fallback.', e);
    }
  }

  selectDeck(key: string) {
    this.selectedDeck = key;
    this.gameService.naipes = key;
  }

  selectRoom(room: string) {
    this.selectedRoom = room;
    this.gameService.currentRoom = room;
    localStorage.setItem('truco_current_room', room);
    this.gameService.selectIAsForRoom();
  }

  toggleClientsDropdown(event: Event) {
    event.stopPropagation();
    this.showClientsDropdown = !this.showClientsDropdown;
  }

  selectTab(tab: 'jugar' | 'ia' | 'tienda') {
    this.activeTab = tab;
  }

  startGame() {
    this.inLobby = true;
    this.gameService.connectToEvents(this.gameService.data.userID);

    // Escuchar el inicio de partida del Host
    this.gameService.onWebhookEventCallback = (payload) => {
      this.ngZone.run(() => {
        if (payload.event === 'game_action' && payload.data) {
          if (payload.data.action === 'game_start') {
            console.log('[Lobby] El anfitrión inició la partida. Redireccionando a la mesa...');
            if (this.creditService.deductCoins(this.COST_TO_PLAY)) {
              this.router.navigate(['/game']);
            } else {
              alert('El anfitrión inició la partida, pero no tienes suficientes monedas.');
              this.exitLobby();
            }
          }
        }
      });
    };
  }

  confirmStartGame() {
    if (this.creditService.deductCoins(this.COST_TO_PLAY)) {
      // Emitir el inicio de la partida para arrastrar a los otros clientes
      this.gameService.sendRoomAction('game_start', {});
      this.router.navigate(['/game']);
    } else {
      alert('No tienes suficientes monedas para jugar.');
      this.inLobby = false;
      this.activeTab = 'tienda';
    }
  }

  exitLobby() {
    this.inLobby = false;
    this.gameService.sendRoomAction('client_disconnect', {});
    this.gameService.connectToLobby();
  }

  getLobbySeats(): any[] {
    const roomClients = this.gameService.connectedClients.filter(c => c.room === this.selectedRoom);
    roomClients.sort((a, b) => a.userId.localeCompare(b.userId));

    const seats = [];
    const selected = this.gameService.selectedIAs && this.gameService.selectedIAs.length >= 3 ? this.gameService.selectedIAs : this.characters.slice(0, 3);

    let iaPointer = 0;
    for (let i = 0; i < 4; i++) {
      if (roomClients[i]) {
        const isMe = roomClients[i].userId === this.gameService.userId;
        seats.push({
          name: roomClients[i].name + (isMe ? ' (Tú)' : ''),
          isHuman: true,
          userId: roomClients[i].userId,
          avatarColor: this.getCharacterGradient(roomClients[i].name),
          initials: this.getInitials(roomClients[i].name),
          ready: roomClients[i].ready || false,
          isHost: roomClients[i].userId === this.gameService.hostUserId
        });
      } else {
        const char = selected[iaPointer++ % selected.length] || { nombre: 'Invitado', estilo: 'IA' };
        seats.push({
          name: char.nombre,
          isHuman: false,
          userId: null,
          avatarColor: this.getCharacterGradient(char.nombre),
          initials: this.getInitials(char.nombre),
          estilo: char.estilo,
          ready: true // Las IAs siempre están listas
        });
      }
    }
    return seats;
  }

  toggleReady() {
    this.gameService.localPlayerReady = !this.gameService.localPlayerReady;

    // Actualizar nuestro propio estado en la lista local para respuesta visual inmediata
    const me = this.gameService.connectedClients.find(c => c.userId === this.gameService.userId);
    if (me) {
      me.ready = this.gameService.localPlayerReady;
    }

    this.gameService.sendRoomAction('player_ready', { ready: this.gameService.localPlayerReady });
  }

  allHumansReady(): boolean {
    const roomClients = this.gameService.connectedClients.filter(c => c.room === this.selectedRoom);
    if (roomClients.length === 0) return false;
    return roomClients.every(c => c.ready);
  }

  startSandbox() {
    this.router.navigate(['/sandbox']);
  }

  buy(amount: number, pkgId: any) {
    this.creditService.buyCoins(pkgId);
    this.coins = this.creditService.getCoins();
  }

  getLevel(xp: number): number {
    return Math.floor(xp / 100) + 1;
  }

  getInitials(name: string): string {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getCharacterGradient(name: string): string {
    const gradients = [
      'linear-gradient(135deg, #3b82f6, #1d4ed8)', // Blue
      'linear-gradient(135deg, #ec4899, #be185d)', // Pink/Rose
      'linear-gradient(135deg, #f59e0b, #d97706)', // Amber/Orange
      'linear-gradient(135deg, #10b981, #047857)', // Emerald
      'linear-gradient(135deg, #8b5cf6, #6d28d9)', // Purple
      'linear-gradient(135deg, #06b6d4, #0891b2)', // Cyan
      'linear-gradient(135deg, #f43f5e, #be123c)', // Rose/Red
      'linear-gradient(135deg, #64748b, #334155)'  // Slate
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
  }
}

