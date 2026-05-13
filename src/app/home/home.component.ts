import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
        <div class="coin-display glass-card">
          <img src="assets/models/coin.png" class="coin-icon" alt="coins">
          <span class="coin-amount">{{ coins }}</span>
          <button class="btn-modern btn-store" (click)="toggleStore()">+</button>
        </div>
      </header>

      <!-- Main Controls -->
      <main class="main-content">
        <div class="hero-section" *ngIf="!showStore">
          <h1 class="game-title">TRUCO VENEZOLANO</h1>

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
          </div>
        </div>

        <!-- Store Modal -->
        <div class="store-modal glass-card" *ngIf="showStore">
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
          <button class="btn-modern btn-secondary" (click)="toggleStore()">CERRAR</button>
        </div>
      </main>

      <!-- Footer Info -->
      <footer class="footer-info">
        <span>VERSIÓN 1.1.0 (BETA)</span>
      </footer>
    </div>
  `,
  styles: [`
    .home-wrapper {
      position: relative;
      width: 100vw;
      height: 100vh;
      background: url('assets/bg_home.png') center center / cover no-repeat;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .bg-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%);
      z-index: 1;
    }

    .hud-top {
      position: absolute;
      top: 2rem;
      right: 2rem;
      z-index: 10;
    }

    .glass-card {
      color: #fff;
      background: rgba(20, 20, 20, 0.9);
      border-radius: 24px;
      border: 2px solid rgba(255, 215, 0, 0.1);
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
      z-index: 5;
      text-align: center;
      width: 100%;
      max-width: 600px;
    }

    .game-title {
      font-size: 4rem;
      font-weight: 800;
      margin-bottom: 3rem;
      letter-spacing: 0.2em;
      text-shadow: 0 10px 20px rgba(0,0,0,0.5);
      background: linear-gradient(to bottom, #fff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .start-btn {
      font-size: 2rem;
      padding: 1.5rem 4rem;
    }

    .store-modal {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      animation: fadeIn 0.3s ease-out;
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
      border-color: var(--primary);
    }

    .pkg-amt { font-size: 1.25rem; font-weight: 800; color: var(--primary); }
    .pkg-price { font-size: 1rem; color: #10b981; font-weight: 600; }

    .footer-info {
      position: absolute;
      bottom: 1.5rem;
      color: rgba(255,255,255,0.3);
      font-size: 0.75rem;
      letter-spacing: 0.1em;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .play-action {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
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
      margin-bottom: 2.5rem;
      animation: fadeIn 0.4s ease-out;
    }
    .deck-label {
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.25em;
      color: rgba(255,255,255,0.45);
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    .deck-list {
      display: flex;
      gap: 1.25rem;
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
      font-size: 0.65rem;
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
  `]
})
export class HomeComponent implements OnInit {
  readonly COST_TO_PLAY = 2;
  coins: number = 0;
  showStore: boolean = false;

  /** Available card decks — key matches atlas filename without extension */
  decks = [
    {
      key: 'naipes1',
      label: 'Clásica',
      // Show the first card (unodeoro) at offset 0,0 on a 1300px-wide sheet
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

  constructor(
    private creditService: CreditService,
    private router: Router,
    private gameService: GameService
  ) { }

  ngOnInit() {
    this.coins = this.creditService.getCoins();
    this.selectedDeck = this.gameService.naipes;
  }

  selectDeck(key: string) {
    this.selectedDeck = key;
    this.gameService.naipes = key;
  }

  startGame() {
    if (this.creditService.deductCoins(this.COST_TO_PLAY)) {
      this.router.navigate(['/game']);
    } else {
      alert('No tienes suficientes monedas para jugar.');
      this.showStore = true;
    }
  }
  startTest() {
    this.router.navigate(['/test']);
  }

  toggleStore() {
    this.showStore = !this.showStore;
  }

  buy(amount: number, pkgId: any) {
    this.creditService.buyCoins(pkgId);
  }
}
