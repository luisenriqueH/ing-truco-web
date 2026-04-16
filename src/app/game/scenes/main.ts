import { GameService } from 'src/app/services/game.service';

import { IngJuego } from "src/assets/models";
import { IngTruco } from 'src/app/models';

export class Main extends Phaser.Scene {

  juego: IngJuego.Regla.Juego;
  get screen() { return this.service.phaser.screen; }
  get isZoom(): boolean {
    if (!this.cameras) { return undefined };
    const camera = this.cameras.main;
    if (!camera) { return undefined };
    const zoomIn = camera.zoom > 1 || camera.midPoint.length() > 0;
    return zoomIn;
  }

  constructor(public service: GameService) {
    super('main');
  }
  preload() {
    console.log('preload');
    this.load.audioSprite('voces/miguel', 'assets/sounds/miguel/voces.json', 'assets/sounds/miguel/voces.mp3');
    this.load.image('phaser', 'assets/sprites/phaser.png');
    this.load.image('shadow', 'assets/sprites/shadow.png');
    this.load.svg('wood', 'assets/svg/wood.svg');
    this.load.atlas('signal', 'assets/atlas/signal.png', 'assets/atlas/signal.json');
    this.load.atlas('naipes', 'assets/atlas/' + this.service.naipes + '.png', 'assets/atlas/naipes.json');
  }
  create() {

    console.log('create', this.service.escala);
    const camera = this.cameras.main;
    camera.centerOn(0, 0);

    this.setBackground();
    this.setInput();

    // botones(this, speech);

    this.juego = new IngTruco.Regla.Juego(this.service);

    this.service.gameComponent.onCreate();

  }
  // update() { console.log( emitter.eventNames() ); }

  setBackground() {
    const mesa = this.add.sprite(0, 0, 'wood');
    mesa.setScale(this.service.escala);
    mesa.setDepth(-5);
    const shadow = this.add.sprite(0, 0, 'shadow');
    shadow.setScale(this.service.escala);
    shadow.setDepth(-1);
  }
  setInput() {
    const zoom = this.add.rectangle(0, 0, this.screen.w * 2, this.screen.h);
    zoom.setInteractive();
    zoom.setDepth(-1);

    let pointers: Phaser.Input.Pointer[] = [];
    this.input.addPointer(1);
    zoom.on('pointerdown', (pointer: Phaser.Input.Pointer, gameobject: any[]) => {
      pointers.push(pointer);
      // console.log(this.input.pointer1, this.input.pointer2, this.input.pointer3);
      if (pointers.length > 1) {
        this.zoomStart(
          (pointers[0].x + pointers[1].x) / 2,
          (pointers[0].y + pointers[1].y) / 2
        );
      }
    });
    zoom.on('pointermove', (pointer: Phaser.Input.Pointer, gameobject: any[]) => {
      // console.log(pointer.worldX, pointer.x);
      switch (pointers.length) {
        case 1:
          // const midPoint = this.cameras.main.midPoint;
          let delta = new Phaser.Math.Vector2(
            pointer.downX - pointer.x,
            pointer.downY - pointer.y
          );
          if (!this.axis) {
            this.dragStart(delta);
          } else {
            this.drag(delta);
          }
          break;
        case 2:
          const maxZoom = 3 * this.screen.w / 4;
          const start = new Phaser.Math.Vector2(
            pointers[0].downX - pointers[1].downX,
            pointers[0].downY - pointers[1].downY
          );
          const actual = new Phaser.Math.Vector2(
            pointers[0].x - pointers[1].x,
            pointers[0].y - pointers[1].y
          );
          const zoom = actual.length() - start.length();
          this.zoom(zoom / maxZoom);
          break;

        default:
          break;
      }
    });
    zoom.on('pointerup', (pointer: Phaser.Input.Pointer, gameobject: any[]) => {
      pointers.splice(pointers.indexOf(pointer), 1);
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer, gameobject: any[]) => {
      this.cameras.main.pan(0, 0, 200, 'Quad.easeIn');
      pointers = [];
      this.dragEnd();
      if (this.center) {
        wheelDelta = 0;
        this.zoomEnd();
      }
    });
    let wheelDelta = 0;
    zoom.on('wheel', (pointer: Phaser.Input.Pointer, deltaX: number, deltaY: number, deltaZ: number) => {
      const alfa = -deltaY / 2000;
      // console.log('wheel', pointer.worldX, pointer.worldY, deltaY, alfa);
      wheelDelta += alfa;
      if (wheelDelta > 0) {
        if (!this.center) { this.zoomStart(pointer.x, pointer.y); }
        this.zoom(wheelDelta);
      }
      if (wheelDelta < 0) {
        wheelDelta = 0;
        if (this.center) { this.zoomEnd(); }
      }
    });

    this.input.dragDistanceThreshold = 10;
    // this.input.dragTimeThreshold = 500;
    // this.input.topOnly = false;
  }

  center: Phaser.Math.Vector2;
  zoomStart(x: number, y: number) {
    this.center = this.cameras.main.getWorldPoint(x, y);
  }
  zoom(delta: number) {
    if (delta >= 0 && delta <= 1) {
      const alfa = 1 - delta;
      const beta = 1 - (alfa * alfa * alfa * alfa);
      // const beta = delta;
      this.cameras.main.zoom = 1 + (delta * 4);
      this.cameras.main.centerOn(this.center.x * beta, this.center.y * beta);
    }
  }
  zoomEnd() {
    console.log('end');
    this.center = undefined;
    this.cameras.main.zoomTo(1, 200);
  }

  axis: Phaser.Math.Vector2;
  dragStart(delta: Phaser.Math.Vector2) {
    if (Math.abs(delta.x) > Math.abs(delta.y)) { this.axis = new Phaser.Math.Vector2(1, 0); }
    else { this.axis = new Phaser.Math.Vector2(0, 1); }
  }
  drag(delta: Phaser.Math.Vector2) {
    delta = this.axis.clone().setLength(delta.dot(this.axis) * 2);
    const maxSide = { x: 3 * this.screen.h / 4, y: 3 * this.screen.h / 4 };
    if (!this.center) {
      const dx = maxSide.x - (this.screen.w / 2);
      const dy = maxSide.y - (this.screen.h / 2);
      const dz = this.service.escala * 150;

      if (dx > 0) {
        const signo = Math.sign(delta.x);
        if (Math.abs(delta.x) > dx) {
          delta.x = signo * dx;
        }
      } else { delta.x = 0; }

      if (dy > 0) {
        const signo = Math.sign(delta.y);
        if (Math.abs(delta.y) > dy) {
          delta.y = signo * dy;
        }
      } else { delta.y = 0; }

      this.ver(dx, dy, dz, delta);

      this.cameras.main.centerOn(delta.x, delta.y);
    }
  }
  dragEnd() {
    const ver = (i: number) => this.service.local.ver(i, false);
    this.axis = undefined;
    if (this.viendo.x !== 0) {
      ver(this.viendo.x);
      this.viendo.x = 0;
    }
    if (this.viendo.y !== 0) {
      ver(this.viendo.y - 1);
      this.viendo.y = 0;
    }
  }
  viendo: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  ver(dx: number, dy: number, dz: number, delta: Phaser.Math.Vector2) {
    const ver = (i: number, yes: boolean) => {
      this.service.local.ver(i, yes);
    };
    if (dx > 0) {
      const signo = Math.sign(delta.x);

      if (Math.abs(delta.x) > (dx - dz)) {
        if (this.viendo.x === 0) {
          ver(signo, true);
          this.viendo.x = signo;
        }
      } else {
        if (this.viendo.x !== 0) {
          ver(this.viendo.x, false);
          this.viendo.x = 0;
        }
      }

    }
    if (dy > 0) {
      const signo = Math.sign(delta.y);

      if (Math.abs(delta.y) > (dy - dz)) {
        if (this.viendo.y === 0) {
          ver(signo - 1, true);
          this.viendo.y = signo;
        }
      } else {
        if (this.viendo.y !== 0) {
          ver(this.viendo.y - 1, false);
          this.viendo.y = 0;
        }
      }

    } else { delta.y = 0; }
  }

}

function botones(scene: Phaser.Scene, speech: Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound) {
  new boton(scene, 0, -180, 'flor', speech);
  new boton(scene, 0, -160, 'envido', speech);
  new boton(scene, 0, -140, 'flor envido', speech);
  new boton(scene, 0, -120, 'truco', speech);
  new boton(scene, 0, -100, 'retruco', speech);
  new boton(scene, 0, -80, 'vale 9', speech);
  new boton(scene, 0, -60, 'vale juego', speech);
  new boton(scene, 0, 60, '3', speech);
  new boton(scene, 0, 80, '4', speech);
  new boton(scene, 0, 100, '5', speech);
  new boton(scene, 0, 120, '6', speech);
  new boton(scene, 0, 140, '7', speech);
  new boton(scene, 0, 160, '8', speech);
  new boton(scene, 0, 180, '9', speech);
  new boton(scene, 0, 200, '10', speech);
  new boton(scene, 0, 220, 'flor truco', speech);
  new boton(scene, 0, 240, 'quiero', speech);
  new boton(scene, 0, 260, 'flor quiero', speech);
  new boton(scene, 0, 280, 'no quiero', speech);
  new boton(scene, 0, 300, 'flor no quiero', speech);
}

class boton extends Phaser.GameObjects.Text {
  constructor(scene: Phaser.Scene, x: number, y: number, text: string, private speech: Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound) {
    super(scene, x, y, text, undefined);
    this.setInteractive()
    this.on('pointerdown', () => { this.play(text); });
    scene.children.add(this);
  }
  play(texto: string) {
    switch (texto) {
      case 'flor envido':
        this.speech.play('flor ');
        this.speech.once('complete', () => { this.speech.play('envido'); });
        break;
      case 'flor truco':
        this.speech.play('flor ');
        this.speech.once('complete', () => { this.speech.play('truco'); });
        break;
      case 'flor quiero':
        this.speech.play('flor ');
        this.speech.once('complete', () => { this.speech.play('quiero'); });
        break;
      case 'flor no quiero':
        this.speech.play('flor ');
        this.speech.once('complete', () => { this.speech.play('no quiero'); });
        break;

      default: this.speech.play(texto); break;
    }
  }
}
