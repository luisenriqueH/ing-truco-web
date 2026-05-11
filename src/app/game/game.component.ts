import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-game',
  template: `
    <div class="game-container">
      <div id="game-canvas"></div>
      <button class="exit-btn btn-modern" (click)="exit()">SALIR</button>
    </div>
  `,
  styles: [`
    .game-container {
      width: 100vw;
      height: 100vh;
      background: #000;
      position: relative;
    }
    #game-canvas {
      width: 100%;
      height: 100%;
    }
    .exit-btn {
      position: absolute;
      top: 1rem;
      left: 1rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      opacity: 0.6;
      z-index: 100;
    }
    .exit-btn:hover { opacity: 1; }
  `]
})
export class GameComponent implements AfterViewInit, OnDestroy {
  constructor(private gameService: GameService, private router: Router) {}

  ngAfterViewInit() {
    this.gameService.testMode = this.router.url.includes('/test');
    console.log('Test Mode:', this.gameService.testMode);
    this.gameService.initGame('game-canvas');
  }

  ngOnDestroy() {
    this.gameService.destroyGame();
  }

  exit() {
    window.location.href = '/#/home';
    window.location.reload(); // Hard refresh to clean up Phaser state
  }
}
