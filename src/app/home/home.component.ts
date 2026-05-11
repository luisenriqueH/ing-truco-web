import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CreditService } from '../services/credit.service';

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
          <button class="btn-modern start-btn" (click)="startGame()">JUGAR AHORA</button>
          <br>
          <button class="btn-modern btn-secondary" (click)="startTest()" style="margin-top: 1rem; font-size: 1rem; padding: 1rem 2rem;">MODO TEST (IA)</button>
        </div>

        <!-- Store Modal -->
        <div class="store-modal glass-card" *ngIf="showStore">
          <h2>TIENDA DE MONEDAS</h2>
          <div class="package-list">
            <div class="package-card" (click)="buy(10, 'pack_1')">
              <span class="pkg-amt">10 CR</span>
              <span class="pkg-price">$1.00</span>
            </div>
            <div class="package-card" (click)="buy(100, 'pack_2')">
              <span class="pkg-amt">100 CR</span>
              <span class="pkg-price">$5.00</span>
            </div>
            <div class="package-card" (click)="buy(1000, 'pack_3')">
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
  `]
})
export class HomeComponent implements OnInit {
  coins: number = 0;
  showStore: boolean = false;

  constructor(
    private creditService: CreditService,
    private router: Router
  ) {}

  ngOnInit() {
    this.coins = this.creditService.getCoins();
  }

  startGame() {
    this.router.navigate(['/game']);
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
