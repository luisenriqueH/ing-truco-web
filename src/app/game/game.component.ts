import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../services/game.service';

interface LogItem {
  id: number;
  nombre: string;
  texto: string;
  isPlayer: boolean;
  isCardPlay?: boolean;
  cardText?: string;
  cardThumb?: string;
}

@Component({
  selector: 'app-game',
  template: `
    <div class="game-container">
      <div id="game-canvas"></div>
      
      <!-- Overlay GUI Angular -->
      <div class="truco-overlay">
        
        <!-- Marcador Superior -->
        <div class="truco-header">
          <div class="score-box">
            <div class="score-label">NOSOTROS</div>
            <div class="score-value">{{ scoreNosotros }}</div>
          </div>
          <div class="bet-container">
            <div class="bet-label">APUESTA</div>
            <div class="bet-value">{{ betStatus }}</div>
          </div>
          <div class="score-box">
            <div class="score-label">ELLOS</div>
            <div class="score-value">{{ scoreEllos }}</div>
          </div>
        </div>

        <!-- Log de Eventos Desplegable -->
        <div class="log-container">
          <div class="log-top-row">
            <button class="log-toggle-btn" (click)="toggleLogPanel()">📜</button>
            <div class="log-preview" [class.visible]="logPreviewVisible" *ngIf="logPreviewText">
              <b>{{ logPreviewName }}:</b> {{ logPreviewText }}
            </div>
          </div>
          <div class="log-panel" [class.hidden]="!showLogPanel">
            <div class="log-item" *ngFor="let item of logs" [class.player]="item.isPlayer" [class.system]="!item.isPlayer" [class.card-play]="item.isCardPlay">
              <ng-container *ngIf="item.isCardPlay">
                <div class="card-thumb-container">
                  <img *ngIf="item.cardThumb" [src]="item.cardThumb" class="card-thumb" alt="card">
                  <span *ngIf="!item.cardThumb">🎴</span>
                </div>
                <div class="log-content">
                  <div class="log-item-name">{{ item.nombre }}</div>
                  <div class="log-item-text">Juega <span [innerHTML]="item.cardText"></span></div>
                </div>
              </ng-container>
              <ng-container *ngIf="!item.isCardPlay">
                <div class="log-item-name">{{ item.nombre }}</div>
                <div class="log-item-text">{{ item.texto }}</div>
              </ng-container>
            </div>
          </div>
        </div>

        <!-- Menú de Cartas (Abajo Izquierda) -->
        <div class="truco-btn-container bottom-left">
          <div class="truco-btn-container-inner" [class.hidden]="!showCardMenu">
            <button *ngIf="showRepartirBtn" class="truco-btn primary" (click)="clickRepartir()">{{ textRepartirBtn }}</button>
            <button *ngIf="canTakeHand" class="truco-btn" (click)="clickTomar()">Tomar Mano</button>
            <button *ngIf="showContarBtn" class="truco-btn primary" (click)="clickContar()">Contar Puntos</button>
            <button *ngIf="showRecogerBtn" class="truco-btn danger" (click)="clickRecoger()">Recoger</button>
            <label class="auto-dealer-toggle">
              <input type="checkbox" [checked]="gameService.autoDealer" (change)="toggleAutoDealer($event)">
              <span>Auto Dealer</span>
            </label>
          </div>
          <button class="truco-btn primary menu-icon-btn" (click)="toggleCardMenu()">🎴</button>
        </div>

        <!-- Menú de Voces (Abajo Derecha) -->
        <div class="truco-btn-container bottom-right">
          <div class="truco-btn-container-inner" [class.hidden]="!showVoiceMenu">
            <button *ngFor="let opt of voiceOptions" class="truco-btn" [class.secondary]="opt.isResponse" (click)="clickVoice(opt.key)">
              {{ opt.label }}
            </button>
          </div>
          <button class="truco-btn primary menu-icon-btn" (click)="toggleVoiceMenu()">💬</button>
        </div>

        <!-- Diálogos de Decisión -->
        <div class="decision-overlay" *ngIf="activeQuestion">
          <div class="decision-card">
            <div class="decision-text">{{ activeQuestion.texto }}</div>
            <div class="decision-btns">
              <button class="btn-decision btn-si" (click)="answerQuestion(true)">SÍ</button>
              <button class="btn-decision btn-no" (click)="answerQuestion(false)">NO</button>
            </div>
          </div>
        </div>

        <!-- Game Over Overlay -->
        <div class="game-over-overlay" *ngIf="gameOverData">
          <div class="game-over-card">
            <div class="game-over-title">{{ gameOverData.titulo }}</div>
            <div class="game-over-subtitle">{{ gameOverData.subtitulo }}</div>
            
            <div class="final-score-container">
              <div class="final-score-item" [class.winner]="gameOverData.esNosotrosGanador">
                <div class="final-score-label">NOSOTROS</div>
                <div class="final-score-value">{{ gameOverData.puntos[0] }}</div>
              </div>
              <div class="final-score-item" [class.winner]="!gameOverData.esNosotrosGanador">
                <div class="final-score-label">ELLOS</div>
                <div class="final-score-value">{{ gameOverData.puntos[1] }}</div>
              </div>
            </div>

            <button class="btn-home" (click)="volverAlInicio()">VOLVER AL INICIO</button>
          </div>
        </div>

      </div>

      <button class="exit-btn btn-modern" (click)="exit()">SALIR</button>
      <button class="sound-btn" (click)="toggleMute()">
        {{ gameService.isMuted ? '🔇' : '🔊' }}
      </button>
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
      z-index: 1000;
    }
    .exit-btn:hover { opacity: 1; }

    .sound-btn {
      position: absolute;
      top: 1rem;
      right: 1rem;
      padding: 0.5rem;
      font-size: 1.5rem;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 50%;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.7;
      z-index: 1000;
      transition: all 0.2s ease;
      color: white;
      pointer-events: auto;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }
    .sound-btn:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.05);
      border-color: rgba(255, 255, 255, 0.3);
    }
    .sound-btn:active {
      transform: scale(0.95);
    }

    /* Estilos del overlay */
    .truco-overlay {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none;
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      z-index: 100;
    }
    .truco-btn-container {
      position: absolute;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: auto;
    }
    .bottom-left { bottom: 20px; left: 20px; }
    .bottom-right { bottom: 20px; right: 20px; align-items: flex-end; }
    
    .truco-btn-container-inner {
      display: flex;
      flex-direction: column;
      gap: 10px;
      position: absolute;
      bottom: 70px;
      min-width: 140px;
    }
    .bottom-left .truco-btn-container-inner { left: 0; }
    .bottom-right .truco-btn-container-inner { right: 0; align-items: flex-end; }

    .truco-btn {
      background: rgba(20, 20, 20, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: white;
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: bold;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      text-align: center;
      letter-spacing: 1px;
      min-width: 140px;
    }
    .truco-btn:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.4);
    }
    .truco-btn:active {
      transform: translateY(0);
    }
    .truco-btn.primary {
      background: rgba(59, 130, 246, 0.6);
      border-color: rgba(59, 130, 246, 0.4);
    }
    .truco-btn.primary:hover {
      background: rgba(59, 130, 246, 0.85);
      border-color: rgba(59, 130, 246, 0.6);
    }
    .truco-btn.danger {
      background: rgba(239, 68, 68, 0.6);
      border-color: rgba(239, 68, 68, 0.4);
    }
    .truco-btn.danger:hover {
      background: rgba(239, 68, 68, 0.85);
      border-color: rgba(239, 68, 68, 0.6);
    }
    .truco-btn.secondary {
      background: rgba(107, 114, 128, 0.6);
      border-color: rgba(107, 114, 128, 0.4);
    }
    .menu-icon-btn {
      width: 60px; height: 60px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px;
      min-width: 60px;
    }
    .hidden { display: none !important; }

    /* Marcador superior */
    .truco-header {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 5vw;
      pointer-events: none;
      z-index: 100;
      font-size: calc(min(2vw, 12px));
    }
    .score-box {
      background: rgba(15, 23, 42, 0.9);
      border: 2px solid rgba(255, 215, 0, 0.2);
      border-radius: 20px;
      padding: 12px 28px;
      text-align: center;
      min-width: 20vw;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
      border-bottom-width: 4px;
    }
    .score-label {
      color: #94a3b8;
      font-weight: 900;
      letter-spacing: 2.5px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .score-value {
      color: #fff;
      font-weight: 800;
      font-family: 'Segoe UI', Roboto, sans-serif;
      line-height: 1;
      font-size: 1.5rem;
    }
    .bet-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      min-width: 15vw;
    }
    .bet-label {
      color: #94a3b8;
      font-weight: 900;
      letter-spacing: 2px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .bet-value {
      color: #fff;
      font-weight: 700;
      background: rgba(255,255,255,0.05);
      padding: 4px 15px;
      border-radius: 10px;
      font-size: 1.25rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* Log de eventos */
    .log-container {
      position: absolute;
      top: 100px;
      left: 20px;
      z-index: 110;
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .log-toggle-btn {
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255,255,255,0.1);
      color: white;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5);
      transition: all 0.2s ease;
      pointer-events: all;
    }
    .log-toggle-btn:hover {
      border-color: rgba(255,255,255,0.3);
      transform: scale(1.05);
    }
    .log-top-row {
      display: flex;
      align-items: center;
      gap: 15px;
      pointer-events: none;
    }
    .log-preview {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      border-left: 3px solid #fbbf24;
      padding: 8px 18px;
      border-radius: 12px;
      color: white;
      font-size: 14px;
      max-width: 280px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0;
      transform: translateX(-10px);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: auto;
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    }
    .log-preview.visible {
      opacity: 1;
      transform: translateX(0);
    }
    .log-preview b {
      color: #fbbf24;
      font-weight: 800;
    }
    .log-panel {
      margin-top: 10px;
      width: 280px;
      max-height: 350px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(15px);
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 15px;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0,0,0,0.7);
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.2) transparent;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .log-panel::-webkit-scrollbar { width: 6px; }
    .log-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
    
    .log-item {
      border-left: 3px solid rgba(255,255,255,0.2);
      padding-left: 10px;
      animation: logAppear 0.3s ease-out;
    }
    .log-item.system { border-left-color: #fbbf24; }
    .log-item.player { border-left-color: #3b82f6; }
    
    .log-item-name {
      font-size: 11px;
      color: #64748b;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .log-item-text {
      font-size: 14px;
      color: #e2e8f0;
      line-height: 1.4;
    }
    
    @keyframes logAppear {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .log-item.card-play {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
      padding: 8px;
    }
    .card-thumb-container {
      width: 35px;
      height: 52px;
      flex-shrink: 0;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.2);
      background: #000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .card-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .log-content {
      flex: 1;
    }

    /* Diálogos de Decisión */
    .decision-overlay {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 500;
      pointer-events: auto;
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .decision-card {
      background: rgba(15, 23, 42, 0.95);
      border: 2px solid rgba(255, 215, 0, 0.2);
      border-radius: 24px;
      padding: 40px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.8);
      transform: scale(0.9);
      animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    @keyframes scaleUp { from { transform: scale(0.8); } to { transform: scale(1); } }

    .decision-text {
      color: white;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 30px;
      line-height: 1.4;
    }
    .decision-btns {
      display: flex;
      gap: 20px;
      justify-content: center;
    }
    .btn-decision {
      padding: 12px 30px;
      border-radius: 12px;
      font-weight: 800;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      min-width: 100px;
    }
    .btn-si { background: #3b82f6; color: white; }
    .btn-no { background: #475569; color: #cbd5e1; }
    .btn-decision:hover { transform: translateY(-3px); filter: brightness(1.2); }

    /* Game Over */
    .game-over-overlay {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(15px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.5s ease;
      pointer-events: auto;
    }
    .game-over-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
      border: 2px solid rgba(255, 215, 0, 0.3);
      border-radius: 32px;
      padding: 60px;
      text-align: center;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 30px 100px rgba(0,0,0,0.9), inset 0 0 20px rgba(255,255,255,0.05);
      transform: scale(0.9);
      animation: gameOverScaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    @keyframes gameOverScaleUp { 
      from { transform: scale(0.7); opacity: 0; } 
      to { transform: scale(1); opacity: 1; } 
    }
    .game-over-title {
      color: #fbbf24;
      font-size: 42px;
      font-weight: 900;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 4px;
      text-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
    }
    .game-over-subtitle {
      color: #e2e8f0;
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 40px;
    }
    .final-score-container {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-bottom: 50px;
    }
    .final-score-item {
      background: rgba(255,255,255,0.05);
      padding: 20px 30px;
      border-radius: 20px;
      min-width: 120px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .final-score-item.winner {
      background: rgba(59, 130, 246, 0.2);
      border-color: rgba(59, 130, 246, 0.4);
      box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
    }
    .final-score-label {
      color: #94a3b8;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .final-score-value {
      color: white;
      font-size: 36px;
      font-weight: 800;
    }
    .btn-home {
      background: #fbbf24;
      color: #000;
      padding: 18px 40px;
      border-radius: 16px;
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.3s;
      border: none;
      box-shadow: 0 10px 30px rgba(251, 191, 36, 0.3);
      width: 100%;
    }
    .btn-home:hover {
      transform: translateY(-5px);
      background: #fcd34d;
      box-shadow: 0 15px 40px rgba(251, 191, 36, 0.4);
    }

    /* Auto Dealer Checkbox Style */
    .auto-dealer-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #94a3b8;
      padding: 10px 16px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
      user-select: none;
      min-width: 140px;
      box-sizing: border-box;
      margin-top: 5px;
    }
    .auto-dealer-toggle:hover {
      background: rgba(255, 255, 255, 0.15);
      color: white;
      border-color: rgba(255, 255, 255, 0.25);
    }
    .auto-dealer-toggle input[type="checkbox"] {
      cursor: pointer;
      accent-color: #3b82f6;
      width: 16px;
      height: 16px;
      margin: 0;
    }
  `]
})
export class GameComponent implements AfterViewInit, OnDestroy {
  // Scoreboard
  scoreNosotros = '0 / 12';
  scoreEllos = '0 / 12';
  betStatus = '1 | 0 - 0';

  // Toggle Menus
  showCardMenu = false;
  showVoiceMenu = false;
  showLogPanel = false;

  // Card Buttons
  showRepartirBtn = true;
  textRepartirBtn = 'Repartir';
  showContarBtn = false;
  showRecogerBtn = false;

  get canTakeHand(): boolean {
    const juego = this.gameService.juego;
    const local = this.gameService.local;
    if (!juego || !local || !local.mano || !local.mesa) return false;
    return juego.manoEnCurso && local.mano.cartas.length === 0 && local.mesa.cartas.length > 0;
  }

  autoDealerTimeout: any = null;

  // Voice/Cantos options
  voiceOptions: { key: string, label: string, isResponse: boolean }[] = [];

  // Logs
  logs: LogItem[] = [];
  logPreviewName = '';
  logPreviewText = '';
  logPreviewVisible = false;

  // Active question overlay
  activeQuestion: { texto: string, callback: (res: boolean) => void } | null = null;

  // Game over overlay
  gameOverData: { ganador: number, puntos: number[], esNosotrosGanador: boolean, titulo: string, subtitulo: string } | null = null;

  constructor(
    public gameService: GameService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit() {
    this.gameService.testMode = this.router.url.includes('/test');
    console.log('Test Mode:', this.gameService.testMode);
    this.gameService.initGame('game-canvas');
    this.setupGuiSubscriptions();
  }

  ngOnDestroy() {
    this.clearAutoDealerTimeout();
    this.gameService.destroyGame();
  }

  exit() {
    window.location.href = '/#/home';
    window.location.reload();
  }

  toggleLogPanel() {
    this.showLogPanel = !this.showLogPanel;
  }

  toggleCardMenu() {
    this.showCardMenu = !this.showCardMenu;
    this.showVoiceMenu = false;
  }

  toggleVoiceMenu() {
    if (!this.showVoiceMenu) {
      this.updateVoiceOptions();
    }
    this.showVoiceMenu = !this.showVoiceMenu;
    this.showCardMenu = false;
  }

  updateVoiceOptions() {
    const options = [];
    const juego = this.gameService.juego;
    if (!juego) return;
    const t = juego.truco;
    const local = this.gameService.local;
    if (!local || !local.pareja) return;
    const equipoLocal = local.pareja.indice;

    // 1. Static options
    options.push({ key: 'flor', label: 'Flor', isResponse: false });
    options.push({ key: 'envido', label: 'Envido', isResponse: false });

    // 2. Dynamic Truco level button
    let proximoNivel = 3;
    if (t.nivel === 3) proximoNivel = 6;
    else if (t.nivel === 6) proximoNivel = 9;
    else if (t.nivel === 9) proximoNivel = 12;

    const textoTruco = t.getNombreNivel(proximoNivel);
    if (t.nivel < 12 && (t.equipoConLaPalabra === -1 || t.equipoConLaPalabra === equipoLocal)) {
      options.push({ key: textoTruco.toLowerCase(), label: textoTruco, isResponse: false });
    }

    // 3. Response buttons
    const trucoPendiente = t.esperandoRespuesta && t.equipoQueCanto !== equipoLocal;
    const envidoPendiente = juego.envidoEstado === 'CANTADO' && juego.equipoQueCantoEnvido !== equipoLocal;

    if (trucoPendiente || envidoPendiente) {
      options.push({ key: 'quiero', label: 'Quiero', isResponse: true });
      options.push({ key: 'no quiero', label: 'No Quiero', isResponse: true });
    }

    this.voiceOptions = options;
  }

  clickVoice(key: string) {
    this.gameService.local.hablar(key);
    this.showVoiceMenu = false;
  }

  clickRepartir() {
    this.clearAutoDealerTimeout();
    if (this.textRepartirBtn === 'REPARTIR') {
      this.gameService.juego.repartir(this.gameService.local);
    } else {
      this.gameService.juego.recogerTodo();
    }
    this.showCardMenu = false;
  }

  clickTomar() {
    this.clearAutoDealerTimeout();
    this.gameService.local.mano.cogerMano();
    this.showCardMenu = false;
  }

  clickContar() {
    this.clearAutoDealerTimeout();
    this.gameService.juego.contarPuntos();
    this.showCardMenu = false;
  }

  clickRecoger() {
    this.clearAutoDealerTimeout();
    this.gameService.juego.recogerTodo();
    this.showCardMenu = false;
  }

  actualizarMarcador() {
    const juego = this.gameService.juego;
    if (!juego || !juego.partida) return;
    const partida = juego.partida;
    const mano = partida.manoActual;
    const p1 = partida.puntos[0];
    const p2 = partida.puntos[1];
    const valorMano = mano.truco ? mano.truco.valor : 1;
    const r1 = mano.rondasGanadas[0];
    const r2 = mano.rondasGanadas[1];

    this.scoreNosotros = `${p1} / 12`;
    this.scoreEllos = `${p2} / 12`;
    this.betStatus = `${valorMano} | ${r1} - ${r2}`;
  }

  setupGuiSubscriptions() {
    const emitter = this.gameService.phaser.emitter;
    if (!emitter) return;

    // Events affecting card buttons
    emitter.on('manoFinished', () => {
      this.ngZone.run(() => {
        this.showRepartirBtn = false;
        if (this.gameService.juego.dealer === this.gameService.local) {
          const p = this.gameService.juego.partida;
          if (p.puntos[0] < p.limite && p.puntos[1] < p.limite) {
            this.showContarBtn = true;
          }
        }
        this.showRecogerBtn = false;
        this.cdr.detectChanges();
        this.checkAndTriggerAutoDealerAction();
      });
    });

    emitter.on('puntosContados', () => {
      this.ngZone.run(() => {
        this.showContarBtn = false;
        this.showRecogerBtn = true;
        this.actualizarMarcador();
        this.cdr.detectChanges();
        this.checkAndTriggerAutoDealerAction();
      });
    });

    emitter.on('repartoFinished', () => {
      this.ngZone.run(() => {
        this.showRepartirBtn = true;
        this.textRepartirBtn = 'REPARTIR';
        this.showContarBtn = false;
        this.showRecogerBtn = false;
        this.actualizarMarcador();
        this.cdr.detectChanges();
        this.checkAndTriggerAutoDealerAction();
      });
    });

    // Scoreboard updates
    const updateHeader = () => {
      this.ngZone.run(() => {
        this.actualizarMarcador();
        this.cdr.detectChanges();
      });
    };

    emitter.on('puntosUpdated', updateHeader);
    emitter.on('rondaFinished', updateHeader);
    emitter.on('puntosContados', updateHeader);

    // Decision Prompts
    emitter.on('mostrarPregunta', (data: { texto: string, callback: (res: boolean) => void }) => {
      this.ngZone.run(() => {
        this.activeQuestion = data;
        this.cdr.detectChanges();
      });
    });

    // Auto Dealer Initialization
    emitter.on('juegoInicializado', () => {
      this.ngZone.run(() => {
        this.checkAndTriggerAutoDealerAction();
      });
    });

    // Log updates
    emitter.on('hablar', (data: any) => {
      this.ngZone.run(() => {
        const isPlayer = data.jugador !== undefined;
        const name = data.jugador ? data.jugador.nombre : 'SISTEMA';
        
        const item: LogItem = {
          id: Date.now() + Math.random(),
          nombre: name,
          texto: data.texto,
          isPlayer
        };

        this.logs.unshift(item);
        if (this.logs.length > 20) {
          this.logs.pop();
        }

        this.logPreviewName = name;
        this.logPreviewText = data.texto;
        this.logPreviewVisible = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.logPreviewVisible = true;
          this.cdr.detectChanges();
        }, 50);
      });
    });

    emitter.on('cardPlayed', (data: any) => {
      this.ngZone.run(() => {
        const { jugador, carta } = data;
        const jNombre = typeof jugador === 'string' ? jugador : jugador.nombre;
        const isPlayer = jugador && jugador.tipo === 'humano';
        const cardText = carta.tapada ? 'una carta' : `<b>${carta.numero} de ${carta.pinta}</b>`;
        
        let cardThumb = '';
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 150;
          const ctx = canvas.getContext('2d');
          const frame = carta.frame;
          const source = frame.texture.source[0].image;
          if (ctx && source) {
            ctx.drawImage(source, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, 100, 150);
            cardThumb = canvas.toDataURL('image/webp', 0.5);
          }
          canvas.width = 0;
          canvas.height = 0;
        } catch (e) {
          console.error('Error generating card thumbnail', e);
        }

        const item: LogItem = {
          id: Date.now() + Math.random(),
          nombre: jNombre,
          texto: `Juega ${carta.tapada ? 'una carta' : ''}`,
          isPlayer,
          isCardPlay: true,
          cardText,
          cardThumb
        };

        this.logs.unshift(item);
        if (this.logs.length > 20) {
          this.logs.pop();
        }

        this.logPreviewName = jNombre;
        this.logPreviewText = `Juega ${carta.tapada ? 'una carta' : cardText.replace(/<\/?b>/g, '')}`;
        this.logPreviewVisible = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.logPreviewVisible = true;
          this.cdr.detectChanges();
        }, 50);
      });
    });

    // Game Over
    emitter.on('gameOver', (data: { ganador: number, puntos: number[] }) => {
      this.ngZone.run(() => {
        const REWARD_AMOUNT = 5;
        const esNosotrosGanador = data.ganador === 0;
        if (esNosotrosGanador) {
          this.gameService.credit.addCoins(REWARD_AMOUNT);
        }
        this.gameOverData = {
          ganador: data.ganador,
          puntos: data.puntos,
          esNosotrosGanador,
          titulo: esNosotrosGanador ? '¡VICTORIA!' : 'FIN DEL JUEGO',
          subtitulo: esNosotrosGanador ? `¡Han ganado la partida! (+${REWARD_AMOUNT} CR)` : 'El otro equipo ha ganado.'
        };
        this.cdr.detectChanges();
      });
    });
  }

  answerQuestion(res: boolean) {
    if (this.activeQuestion) {
      const cb = this.activeQuestion.callback;
      this.activeQuestion = null;
      cb(res);
    }
  }

  toggleMute() {
    this.gameService.isMuted = !this.gameService.isMuted;
    localStorage.setItem('truco_muted', String(this.gameService.isMuted));
    if (this.gameService.main?.sound) {
      this.gameService.main.sound.mute = this.gameService.isMuted;
    }
  }

  volverAlInicio() {
    window.location.href = '/#/home';
    window.location.reload();
  }

  toggleAutoDealer(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    this.gameService.autoDealer = checkbox.checked;
    localStorage.setItem('truco_auto_dealer', String(this.gameService.autoDealer));
    
    if (this.gameService.autoDealer) {
      this.checkAndTriggerAutoDealerAction();
    } else {
      this.clearAutoDealerTimeout();
    }
  }

  clearAutoDealerTimeout() {
    if (this.autoDealerTimeout) {
      clearTimeout(this.autoDealerTimeout);
      this.autoDealerTimeout = null;
    }
  }

  checkAndTriggerAutoDealerAction() {
    this.clearAutoDealerTimeout();

    if (!this.gameService.autoDealer) {
      return;
    }

    const juego = this.gameService.juego;
    if (!juego) return;

    const localPlayer = this.gameService.local;

    // 1. "Tomar Mano" (any player, dealer or not)
    if (this.canTakeHand) {
      this.autoDealerTimeout = setTimeout(() => {
        this.ngZone.run(() => {
          if (this.canTakeHand && this.gameService.autoDealer) {
            console.log('[Auto Dealer] Auto-picking hand...');
            this.clickTomar();
          }
        });
      }, 1500);
      return;
    }

    // 2. Dealer actions (only if player is the dealer)
    const isDealer = !juego.dealer || juego.dealer === localPlayer;
    if (!isDealer) return;

    // If the hand is in progress, the dealer has no dealer-specific actions to auto-trigger.
    if (juego.manoEnCurso) {
      return;
    }

    if (this.showContarBtn) {
      this.autoDealerTimeout = setTimeout(() => {
        this.ngZone.run(() => {
          if (this.showContarBtn && this.gameService.autoDealer) {
            console.log('[Auto Dealer] Auto-counting points...');
            this.clickContar();
          }
        });
      }, 2000);
    } else if (this.showRecogerBtn) {
      this.autoDealerTimeout = setTimeout(() => {
        this.ngZone.run(() => {
          if (this.showRecogerBtn && this.gameService.autoDealer) {
            console.log('[Auto Dealer] Auto-collecting cards...');
            this.clickRecoger();
          }
        });
      }, 1500);
    } else if (this.showRepartirBtn) {
      this.autoDealerTimeout = setTimeout(() => {
        this.ngZone.run(() => {
          if (this.showRepartirBtn && this.gameService.autoDealer) {
            console.log('[Auto Dealer] Auto-dealing / Auto-collecting deck...');
            this.clickRepartir();
          }
        });
      }, 1500);
    }
  }
}
