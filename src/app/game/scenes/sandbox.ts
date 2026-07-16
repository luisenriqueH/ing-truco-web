import { Main } from './main';
import { GameService } from '../../services/game.service';
import * as Phaser from 'phaser';

export class SandboxScene extends Main {
  cards: Phaser.GameObjects.Sprite[] = [];

  constructor(service: GameService) {
    super(service, 'sandbox');
  }

  create() {
    if (!this.service) {
      console.warn('Sandbox scene started without service');
      return;
    }
    this.service.main = this;
    const camera = this.cameras.main;
    camera.centerOn(0, 0);

    this.scale.on('resize', this.onResize, this);
    this.onResize();

    this.sound.mute = this.service.isMuted;

    this.setupSandbox();
  }

  onResize() {
    super.onResize();
    if (this.cards) {
      this.cards.forEach(card => {
        card.setScale(this.service.escala);
      });
    }
  }

  setupSandbox() {
    this.cards = [];
    const numeros = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'diez', 'once', 'doce'];
    const pintas = ['oro', 'copa', 'espada', 'basto'];

    let depth = 0;
    for (const pinta of pintas) {
      for (const numero of numeros) {
        const frameName = `${numero}de${pinta}`;
        const card = this.add.sprite(0, 0, 'naipes', 'reverso');
        card.setData('numero', numero);
        card.setData('pinta', pinta);
        card.setData('frameID', frameName);
        card.setData('faceUp', false);

        card.setScale(this.service.escala);
        card.setDepth(depth++);

        card.setInteractive({ draggable: true });

        this.cards.push(card);
      }
    }

    this.setupInputHandlers();
    this.reagrupar();
  }

  setupInputHandlers() {
    let lastClickTime = 0;
    let lastClickedCard: Phaser.GameObjects.Sprite | null = null;

    let holdTimer: Phaser.Time.TimerEvent | null = null;
    let isHolding = false;
    let isDoubleClick = false;
    let draggedCards: Phaser.GameObjects.Sprite[] = [];

    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) => {
      if (!this.cards.includes(gameObject)) return;

      const now = this.time.now;

      if (now - lastClickTime < 300 && lastClickedCard === gameObject) {
        isDoubleClick = true;
        const existingTimer = gameObject.getData('clickTimer');
        if (existingTimer) {
          existingTimer.destroy();
          gameObject.setData('clickTimer', null);
        }
      } else {
        isDoubleClick = false;
      }

      lastClickTime = now;
      lastClickedCard = gameObject;
      isHolding = false;

      if (holdTimer) {
        holdTimer.destroy();
      }

      holdTimer = this.time.delayedCall(350, () => {
        const dist = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.x, pointer.y);
        if (dist < 10) {
          isHolding = true;
          const pile = this.getPile(gameObject);
          this.tweens.add({
            targets: pile,
            scale: this.service.escala * 1.08,
            duration: 120,
            yoyo: true,
            repeat: 0
          });
        }
      });
    });

    this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) => {
      if (!this.cards.includes(gameObject)) return;

      if (holdTimer) {
        holdTimer.destroy();
        holdTimer = null;
      }

      const pile = this.getPile(gameObject);

      if (isDoubleClick) {
        const halfCount = Math.ceil(pile.length / 2);
        draggedCards = pile.slice(pile.length - halfCount);
      } else if (isHolding) {
        draggedCards = pile;
      } else {
        draggedCards = [gameObject];
      }

      draggedCards.forEach((card, idx) => {
        card.setData('dragOffsetX', card.x - pointer.worldX);
        card.setData('dragOffsetY', card.y - pointer.worldY);
        card.setDepth(1000 + idx);
      });
    });

    this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) => {
      if (!this.cards.includes(gameObject)) return;

      draggedCards.forEach(card => {
        card.x = pointer.worldX + card.getData('dragOffsetX');
        card.y = pointer.worldY + card.getData('dragOffsetY');
      });
    });

    this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) => {
      if (!this.cards.includes(gameObject)) return;

      draggedCards.forEach(card => {
        const index = this.cards.indexOf(card);
        if (index > -1) {
          this.cards.splice(index, 1);
        }
      });
      this.cards.push(...draggedCards);

      this.refreshDepths();

      draggedCards.forEach(card => {
        card.setScale(this.service.escala);
      });

      draggedCards = [];
      isHolding = false;
      isDoubleClick = false;
    });

    this.input.on('gameobjectup', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) => {
      if (!this.cards.includes(gameObject)) return;

      if (holdTimer) {
        holdTimer.destroy();
        holdTimer = null;
      }

      const elapsed = this.time.now - pointer.downTime;
      const distance = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.x, pointer.y);

      if (elapsed < 300 && distance < 10) {
        if (!isDoubleClick) {
          const timer = this.time.delayedCall(200, () => {
            this.flipCard(gameObject);
            gameObject.setData('clickTimer', null);
          });
          gameObject.setData('clickTimer', timer);
        }
      }
    });
  }

  getPile(clickedCard: Phaser.GameObjects.Sprite): Phaser.GameObjects.Sprite[] {
    const threshold = 35;
    const pile = this.cards.filter(card =>
      Phaser.Math.Distance.Between(card.x, card.y, clickedCard.x, clickedCard.y) < threshold
    );
    pile.sort((a, b) => a.depth - b.depth);
    return pile;
  }

  refreshDepths() {
    this.cards.forEach((card, index) => {
      card.setDepth(index);
    });
  }

  flipCard(card: Phaser.GameObjects.Sprite) {
    const faceUp = !card.getData('faceUp');
    card.setData('faceUp', faceUp);
    if (faceUp) {
      card.setFrame(card.getData('frameID'));
    } else {
      card.setFrame('reverso');
    }
  }

  barajar() {
    Phaser.Utils.Array.Shuffle(this.cards);
    this.reagrupar();
  }

  voltearTodo() {
    const firstFaceUp = this.cards[0]?.getData('faceUp') || false;
    const targetFaceUp = !firstFaceUp;

    this.cards.forEach((card, index) => {
      this.time.delayedCall(index * 15, () => {
        card.setData('faceUp', targetFaceUp);
        if (targetFaceUp) {
          card.setFrame(card.getData('frameID'));
        } else {
          card.setFrame('reverso');
        }
      });
    });
  }

  reagrupar() {
    this.cards.forEach((card, index) => {
      this.tweens.add({
        targets: card,
        x: -index * 0.25,
        y: -index * 0.25,
        angle: 0,
        duration: 300,
        delay: index * 10,
        ease: 'Quad.easeOut',
        onComplete: () => {
          card.setScale(this.service.escala);
        }
      });
    });
    this.refreshDepths();
  }
}
