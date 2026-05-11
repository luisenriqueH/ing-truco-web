import { Main } from './main';
import { GameService } from '../../services/game.service';
import { IngJuego } from "../../../assets/models";

export class TestAIScene extends Main {
  constructor(service: GameService) {
    super(service, 'test_ai');
  }

  create() {
    super.create();
    console.log("%c --- MODO TEST IA ACTIVADO --- ", "background: #ff0000; color: #ffffff; font-weight: bold;");
    this.setupTestUI();
  }

  setupTestUI() {
    const { width, height } = this.scale;
    const buttonHeight = 40;
    
    const container = this.add.container(-width / 2 + 20, -height / 2 + 20);
    container.setDepth(1000);

    const title = this.add.text(0, 0, "DEBUG IA", { fontSize: '14px', fontStyle: 'bold', color: '#ff0000' });
    container.add(title);

    const buttons = [
      { text: 'REPARTIR 1 FLOR (Local)', action: () => this.scenarioOneFlor() },
      { text: 'REPARTIR 2 ENVIDOS', action: () => this.scenarioTwoEnvidos() },
      { text: 'ENVIDO Y FLOR', action: () => this.scenarioEnvidoAndFlor() },
      { text: 'REPARTIR 2 FLORES', action: () => this.scenarioTwoFlores() },
      { text: 'RESET & REPARTIR', action: () => this.juego.recogerTodo().then(() => this.juego.repartir()) }
    ];

    buttons.forEach((btn, i) => {
      const text = this.add.text(0, 30 + (i * buttonHeight), btn.text, {
        fontSize: '11px',
        backgroundColor: '#333',
        padding: { x: 8, y: 8 },
        color: '#fff',
        fixedWidth: 180
      });
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        text.setTint(0x00ff00);
        btn.action();
        setTimeout(() => text.clearTint(), 200);
      });
      container.add(text);
    });
  }

  async scenarioOneFlor() {
    await this.juego.recogerTodo();
    
    // 1. Establecer dealer a IA 3 (para que el local sea el 3ro en recibir)
    this.juego.dealer = this.juego.jugadores[3];
    this.juego.turno.set(1); // Inicia IA 1 (a la derecha del dealer)
    
    // 2. Definir secuencia exacta de cartas (índices del mazo)
    // 0-9: Oro, 10-19: Copa, 20-29: Espada, 30-39: Basto
    const sequence = [
      32, // 1: IA 1 - 3 de basto
      14, // 2: IA 2 - 5 de copa
      0,  // 3: Local - 1 de oro
      25, // 4: IA 3 - 6 de espada
      12, // 5: IA 1 - 3 de copa
      24, // 6: IA 2 - 5 de espada
      1,  // 7: Local - 2 de oro
      35, // 8: IA 3 - 6 de basto
      22, // 9: IA 1 - 3 de espada
      34, // 10: IA 2 - 5 de basto
      2,  // 11: Local - 3 de oro
      15, // 12: IA 3 - 6 de copa
      39  // 13: VIRA - 12 de basto
    ];

    // 3. Hackear temporalmente baraja.sacar para devolver esta secuencia
    const originalSacar = this.juego.baraja.sacar;
    let count = 0;
    this.juego.baraja.sacar = (i?: number) => {
      const idx = count < sequence.length ? sequence[count++] : undefined;
      return originalSacar.call(this.juego.baraja, idx);
    };

    // 4. Iniciar reparto
    await this.juego.repartir();
    
    // 5. Restaurar método original
    this.juego.baraja.sacar = originalSacar;

    console.log("Escenario: Reparto ordenado finalizado. Local tiene Flor de Oro.");
  }

  async scenarioTwoEnvidos() {
    await this.juego.recogerTodo();
    this.juego.dealer = this.juego.jugadores[0];
    
    // Envidos para IA 1 (Copa) e IA 2 (Espada)
    const sequence = [
      10, 20, 30, 0, // Ronda 1
      11, 21, 31, 1, // Ronda 2
      12, 22, 32, 2, // Ronda 3
      39             // VIRA
    ];

    const originalSacar = this.juego.baraja.sacar;
    let count = 0;
    this.juego.baraja.sacar = (i?: number) => {
      const idx = count < sequence.length ? sequence[count++] : undefined;
      return originalSacar.call(this.juego.baraja, idx);
    };

    await this.juego.repartir();
    this.juego.baraja.sacar = originalSacar;
  }

  async scenarioEnvidoAndFlor() {
    await this.juego.recogerTodo();
    this.juego.dealer = this.juego.jugadores[0];
    
    const sequence = [
      0, 10, 20, 30,
      1, 11, 21, 31,
      2, 12, 22, 32,
      39
    ];

    const originalSacar = this.juego.baraja.sacar;
    let count = 0;
    this.juego.baraja.sacar = (i?: number) => {
      const idx = count < sequence.length ? sequence[count++] : undefined;
      return originalSacar.call(this.juego.baraja, idx);
    };

    await this.juego.repartir();
    this.juego.baraja.sacar = originalSacar;
  }

  async scenarioTwoFlores() {
    await this.juego.recogerTodo();
    this.juego.dealer = this.juego.jugadores[0];
    
    const sequence = [
      0, 10, 20, 30,
      1, 11, 21, 31,
      2, 12, 22, 32,
      39
    ];

    const originalSacar = this.juego.baraja.sacar;
    let count = 0;
    this.juego.baraja.sacar = (i?: number) => {
      const idx = count < sequence.length ? sequence[count++] : undefined;
      return originalSacar.call(this.juego.baraja, idx);
    };

    await this.juego.repartir();
    this.juego.baraja.sacar = originalSacar;
  }
}
