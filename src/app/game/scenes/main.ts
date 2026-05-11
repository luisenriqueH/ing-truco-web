import { GameService } from '../../services/game.service';
import { IngJuego } from "../../../assets/models";

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

  constructor(public service: GameService, key: string = 'main') {
    super(key);
  }

  init(data: { service: GameService }) {
    if (data && data.service) {
      this.service = data.service;
    }
  }
  preload() {
    console.log('preload');
    this.load.audioSprite('voces/miguel', 'assets/sounds/miguel/voces.json', 'assets/sounds/miguel/voces.mp3');
    this.load.image('phaser', 'assets/sprites/phaser.png');
    this.load.image('shadow', 'assets/sprites/shadow.png');
    this.load.svg('wood', 'assets/svg/wood.svg');
    this.load.atlas('signal', 'assets/atlas/signal.png', 'assets/atlas/signal.json');
    this.load.atlas('naipes', 'assets/atlas/' + (this.service?.naipes || 'naipes') + '.png', 'assets/atlas/naipes.json');
  }
  create() {
    if (!this.service) {
      console.warn('Main scene started without service, waiting for re-start...');
      return;
    }
    this.service.main = this;
    console.log('create', this.service.escala);
    const camera = this.cameras.main;
    camera.centerOn(0, 0);

    this.scale.on('resize', this.onResize, this);
    this.onResize();

    this.juego = new IngJuego.Regla.Juego(this.service);
    this.service.juego = this.juego;
  }

  onResize() {
    const { width, height } = this.scale;
    this.service.phaser.screen.w = width;
    this.service.phaser.screen.h = height;

    const baseWidth = 800;
    const baseHeight = 600;
    this.service.escala = Math.min(width / baseWidth, height / baseHeight);

    this.cameras.main.setViewport(0, 0, width, height);
    this.cameras.main.centerOn(0, 0);

    if (this.uiCamera) {
      this.uiCamera.setViewport(0, 0, width, height);
    }

    this.scale.updateBounds();

    this.setBackground();
    this.setInput();

    if (this.juego) {
      this.juego.jugadores.forEach(j => j.render());
    }
  }

  mesa: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Sprite;
  setBackground() {
    if (!this.mesa) {
      this.mesa = this.add.sprite(0, 0, 'wood');
      this.mesa.setDepth(-5);
    }
    this.mesa.setScale(this.service.escala);

    if (!this.shadow) {
      this.shadow = this.add.sprite(0, 0, 'shadow');
      this.shadow.setDepth(-1);
    }
    this.shadow.setScale(this.service.escala);
  }

  zoomRect: Phaser.GameObjects.Rectangle;
  setInput() {
    if (!this.zoomRect) {
      this.zoomRect = this.add.rectangle(0, 0, this.screen.w * 2, this.screen.h);
      this.zoomRect.setInteractive();
      this.zoomRect.setDepth(-1);
      this.setupInputEvents(this.zoomRect);
    } else {
      this.zoomRect.setSize(this.screen.w * 2, this.screen.h);
    }
  }

  setupInputEvents(zoom: Phaser.GameObjects.Rectangle) {

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
          // Scale delta by camera zoom to maintain 1:1 movement
          delta.x /= this.cameras.main.zoom;
          delta.y /= this.cameras.main.zoom;
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
