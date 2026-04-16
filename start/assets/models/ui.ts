import { Main } from 'src/assets/scenes/main';
import { IObjeto } from './cartas/objeto';

export { Zone };

class Zone extends Phaser.GameObjects.Rectangle {

  click: () => void = () => {};
  hold: () => void = () => {};
  dragstart: (pointer: Phaser.Input.Pointer) => void = (pointer) => {};
  holdstart: (pointer: Phaser.Input.Pointer) => void = (pointer) => {};
  drag: (pointer: Phaser.Input.Pointer) => void = (pointer) => {};
  dragend: (pointer: Phaser.Input.Pointer, dropped: boolean) => void = (pointer, dropped) => {};

  dropenter: (pointer: Phaser.Input.Pointer, dropZone: Zone) => void = (pointer, dropZone) => {};
  drop: (pointer: Phaser.Input.Pointer, dropZone: Zone) => void = (pointer, dropZone) => {};
  dropexit: (pointer: Phaser.Input.Pointer, dropZone: Zone) => void = (pointer, dropZone) => {};

  dropped: (item: IObjeto) => void = (item) => {};

  // uis: Phaser.GameObjects.Rectangle;

  get humano() { return this.scene.juego.jugadores[0]; }
  constructor(public scene: Main, x: number, y: number, width?: number, height?: number, fillColor?: number, fillAlpha?: number) {
    super(scene, x, y, width, height, fillColor, fillAlpha);
    // this.ui = scene.add.rectangle(x, y, width, height, fillColor, fillAlpha);
    this.inputZone();
    this.setDepth(-1);
    this.scene.children.add(this);
  }
  inputZone() {
    this.setInteractive(false);
    this.disableInteractive();
    this.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // console.log('up');
      const down = new Phaser.Math.Vector2(pointer.downX, pointer.downY);
      const up = new Phaser.Math.Vector2(pointer.upX, pointer.upY);
      const deltaTime = pointer.upTime - pointer.downTime;
      const delta = down.clone().subtract(up);
      if (delta.length() < 10) {
        if (deltaTime < 500) { this.click(); }
        else if (deltaTime < 2000) { this.hold(); }
      }
    });
    this.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      const deltaTime = pointer.moveTime - pointer.downTime;
      if (deltaTime < 500) { this.dragstart(pointer); }
      else { this.holdstart(pointer); }
    });
    this.on('drag', (pointer: Phaser.Input.Pointer) => this.drag(pointer));
    this.on('dragend', (pointer: Phaser.Input.Pointer, x: number, y: number, dropped: boolean) => this.dragend(pointer, dropped));

    this.on('dragenter', (pointer: Phaser.Input.Pointer, dropZone: Zone) => dropZone.dropenter(pointer, dropZone));
    this.on('drop', (pointer: Phaser.Input.Pointer, dropZone: Zone) => this.drop(pointer, dropZone));
    this.on('dragleave', (pointer: Phaser.Input.Pointer, dropZone: Zone) => dropZone.dropexit(pointer, dropZone));
  }

  setInteractive(dropZone: boolean) {
    super.setInteractive(undefined, undefined, dropZone);
    this.setVisible(true);
    return this;
  }
  disableInteractive() {
    super.disableInteractive();
    this.setVisible(false);
    return this;
  }
  setVisible(value: boolean) {
    super.setVisible(value);
    // this.ui.setVisible(value);
    return this;
  }
  setDraggable(drag: boolean) {
    this.scene.input.setDraggable(this, drag);
  }
  update(x: number, y: number, rotation: number, scale?: number, depth?: number) {
    this.scene.children.bringToTop(this);
    this.setPosition(x, y);
    this.setRotation(rotation);
    this.setScale(scale);
    this.setDepth(depth - 1);
    // this.ui.setDepth(depth);
  }

}

class Boton extends Phaser.GameObjects.Rectangle {
  text: Phaser.GameObjects.Text;
  click: () => void = () => console.log('click');
  constructor(public scene: Main, x: number, y: number, text: string) {
    super(scene, x, y, 200, 100, 0xaaaaaa);
    this.text = scene.add.text(x, y, text, {
      fontSize: 25
    });
    const dx = x - this.text.width / 2;
    const dy = y - this.text.height / 2;
    // this.setSize(this.text.width + 10, this.text.height + 10);
    this.displayWidth = this.text.width + 10;
    this.displayHeight = this.text.height + 10;
    // this.setPosition(dx, dy);
    this.text.setPosition(dx, dy);
    this.setInteractive();
    this.on('pointerdown', () => this.click());

    this.click = () => {
      // console.log(scene.juego.jugadores[0].mesa, scene.juego.jugadores[0].mano);
    }

    scene.children.add(this);
    scene.children.moveUp(this.text);
  }
  destroy(): void {
    this.text.destroy();
    super.destroy();
  }
  setVisible(value: boolean): this {
    this.text.setVisible(value);
    super.setVisible(value);
    return this;
  }
}

class Globe extends Phaser.GameObjects.Image {
  text: Phaser.GameObjects.Text;
  constructor(public scene: Main, x: number, y: number, frame: string, text: string) {
    super(scene, x, y, 'globes');
    this.text = new Phaser.GameObjects.Text(scene, x, y, text, {
      fontSize: '20px',
      color: '0x000000'
    });
    switch (frame) {
      case 'top':
        frame = 'bottom';
        this.setFlip(true, true);
        break;
      case 'left':
        frame = 'right';
        this.setFlip(true, true);
        break;

      default:
        break;
    }
    this.setFrame(frame);

    const dx = x - this.text.width / 2;
    const dy = y - this.text.height / 2;
    this.text.setPosition(dx, dy);

    this.setDepth(200);
    scene.children.add(this);
    scene.children.add(this.text);
  }
  destroy(): void {
    this.text.destroy();
    super.destroy();
  }
  setAlpha(value: number): this {
    this.text.setAlpha(value);
    super.setAlpha(value);
    return this;
  }
  setDepth(value: number): this {
    this.text.setDepth(value);
    super.setDepth(value);
    return this;
  }
  setVisible(value: boolean): this {
    this.text.setVisible(value);
    super.setVisible(value);
    return this;
  }
}
