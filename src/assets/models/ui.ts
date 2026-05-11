import { IObjeto } from './cartas/objeto';
import { LogItem } from './data';

export interface ISceneUI extends Phaser.Scene {
  service: any;
  juego?: any;
}

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

  get humano() { return (this.scene as any).juego?.jugadores[0]; }
  constructor(public scene: ISceneUI, x: number, y: number, width?: number, height?: number, fillColor?: number, fillAlpha?: number) {
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
  constructor(public scene: ISceneUI, x: number, y: number, text: string) {
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
  constructor(public scene: ISceneUI, x: number, y: number, frame: string, text: string) {
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

class VoiceButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private enabled: boolean = true;
  
  setEnabled(value: boolean) {
    this.enabled = value;
    this.setAlpha(value ? 1 : 0.5);
    this.setInteractive(value);
    return this;
  }

  setText(text: string) {
    this.label.setText(text.toUpperCase());
    return this;
  }

  constructor(scene: ISceneUI, x: number, y: number, text: string, callback: () => void) {
    super(scene, x, y);

    const width = 120;
    const height = 40;

    this.bg = scene.add.graphics();
    this.drawBg(0x333333, 0.8);
    this.add(this.bg);

    this.label = scene.add.text(0, 0, text.toUpperCase(), {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.label.setOrigin(0.5, 0.5);
    this.add(this.label);

    this.setSize(width, height);
    this.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);

    this.on('pointerover', () => this.drawBg(0x555555, 1));
    this.on('pointerout', () => this.drawBg(0x333333, 0.8));
    this.on('pointerdown', () => {
      this.setScale(0.95);
      callback();
    });
    this.on('pointerup', () => this.setScale(1));

    this.setScrollFactor(0);
    scene.children.add(this);
  }

  private drawBg(color: number, alpha: number) {
    const width = 120;
    const height = 40;
    this.bg.clear();
    this.bg.fillStyle(color, alpha);
    this.bg.lineStyle(2, 0xffffff, 0.3);
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    this.bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
  }
}

class Marcador extends Phaser.GameObjects.Container {
  private nosotrosBox: Phaser.GameObjects.Graphics;
  private ellosBox: Phaser.GameObjects.Graphics;
  private nosotrosText: Phaser.GameObjects.Text;
  private ellosText: Phaser.GameObjects.Text;
  private nosotrosLabel: Phaser.GameObjects.Text;
  private ellosLabel: Phaser.GameObjects.Text;
  
  private apuestaLabel: Phaser.GameObjects.Text;
  private apuestaValue: Phaser.GameObjects.Text;

  constructor(scene: ISceneUI, x: number, y: number) {
    super(scene, x, y);

    const w = 120;
    const h = 80;
    const spacing = 160;

    // --- NOSOTROS ---
    this.nosotrosBox = scene.add.graphics();
    this.drawBox(this.nosotrosBox, -spacing, 0, w, h, 0x332211); // Color café oscuro como la imagen
    this.add(this.nosotrosBox);

    this.nosotrosLabel = scene.add.text(-spacing, -20, 'NOSOTROS', { fontSize: '14px', color: '#aaaaaa', fontStyle: 'bold' }).setOrigin(0.5);
    this.add(this.nosotrosLabel);

    this.nosotrosText = scene.add.text(-spacing, 10, '0 / 12', { fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add(this.nosotrosText);

    // --- ELLOS ---
    this.ellosBox = scene.add.graphics();
    this.drawBox(this.ellosBox, spacing, 0, w, h, 0x332211);
    this.add(this.ellosBox);

    this.ellosLabel = scene.add.text(spacing, -20, 'ELLOS', { fontSize: '14px', color: '#aaaaaa', fontStyle: 'bold' }).setOrigin(0.5);
    this.add(this.ellosLabel);

    this.ellosText = scene.add.text(spacing, 10, '0 / 12', { fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add(this.ellosText);

    // --- APUESTA (CENTRO) ---
    this.apuestaLabel = scene.add.text(0, -10, 'APUESTA', { fontSize: '16px', color: '#aaaaaa', fontStyle: 'bold' }).setOrigin(0.5);
    this.add(this.apuestaLabel);

    this.apuestaValue = scene.add.text(0, 15, '1 | 0 - 0', { fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add(this.apuestaValue);

    this.setScrollFactor(0);
    this.setDepth(2000);
    scene.children.add(this);

    this.actualizar();
    
    // Escuchar cambios
    scene.service.phaser.emitter.on('repartoFinished', () => this.actualizar());
    scene.service.phaser.emitter.on('rondaFinished', () => this.actualizar());
    scene.service.phaser.emitter.on('manoFinished', () => this.actualizar());
  }

  private drawBox(graphics: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number) {
    graphics.clear();
    graphics.fillStyle(0x000000, 0.6); // Fondo negro transparente
    graphics.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    graphics.lineStyle(4, 0x555555, 0.8); // Borde gris grueso
    graphics.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    
    // Overlay de color (el fondo café de la imagen)
    graphics.fillStyle(color, 0.3);
    graphics.fillRoundedRect(x - w / 2 + 5, y - h / 2 + 5, w - 10, h - 10, 5);
  }

  actualizar() {
    const juego = (this.scene as any).service.juego;
    if (!juego || !juego.partida) return;
    
    const partida = juego.partida;
    const mano = partida.manoActual;

    // Puntos globales (0-12 malas, 12-24 buenas)
    const p1 = partida.puntos[0];
    const p2 = partida.puntos[1];
    
    this.nosotrosText.setText(`${p1} / 12`);
    this.ellosText.setText(`${p2} / 12`);

    // Valor de la mano (Apuesta) y Rondas (0-0)
    const valorMano = 1; // Por ahora 1, luego integraremos Truco
    const r1 = mano.rondasGanadas[0];
    const r2 = mano.rondasGanadas[1];
    
    this.apuestaValue.setText(`${valorMano} | ${r1} - ${r2}`);
  }
}

class LogView extends Phaser.GameObjects.Container {
  private messages: Phaser.GameObjects.Container[] = [];
  private maxMessages = 5;
  private spacing = 60;

  constructor(scene: ISceneUI, x: number, y: number) {
    super(scene, x, y);
    scene.service.phaser.emitter.on('hablar', (data: LogItem) => this.addMessage(data));
    scene.children.add(this);
    this.setScrollFactor(0);
    this.setDepth(3000);
  }

  addMessage(data: LogItem) {
    const scale = (this.scene as any).service.escala;
    const w = 240 * scale;
    const h = 55 * scale;
    
    const container = this.scene.add.container(0, 0);
    const bg = this.scene.add.graphics();
    
    // Estilo similar a la imagen (oscuro, semi-transparente)
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(0, 0, w, h, 8 * scale);
    bg.lineStyle(2, 0xffffff, 0.1);
    bg.strokeRoundedRect(0, 0, w, h, 8 * scale);
    container.add(bg);

    const name = data.jugador ? data.jugador.nombre.toUpperCase() : 'SISTEMA';
    const nameText = this.scene.add.text(12 * scale, 8 * scale, name, { 
      fontSize: (11 * scale) + 'px', 
      color: '#aaaaaa', 
      fontStyle: 'bold',
      fontFamily: 'Arial'
    });
    
    const msgText = this.scene.add.text(12 * scale, 24 * scale, data.texto, { 
      fontSize: (16 * scale) + 'px', 
      color: '#ffffff',
      fontFamily: 'Arial',
      wordWrap: { width: w - 24 * scale }
    });
    
    container.add(nameText);
    container.add(msgText);

    // Animación de entrada
    container.setAlpha(0);
    container.setX(-20 * scale);
    
    this.messages.push(container);
    this.add(container);

    this.scene.tweens.add({
      targets: container,
      x: 0,
      alpha: 1,
      duration: 400,
      ease: 'Power2'
    });

    if (this.messages.length > this.maxMessages) {
      const old = this.messages.shift();
      this.scene.tweens.add({
        targets: old,
        alpha: 0,
        x: -w / 2,
        duration: 300,
        onComplete: () => old.destroy()
      });
    }

    this.updatePositions();
  }

  updatePositions() {
    const scale = (this.scene as any).service.escala;
    this.messages.forEach((m, i) => {
      // Los más nuevos aparecen abajo
      const targetY = i * this.spacing * scale;
      this.scene.tweens.add({
        targets: m,
        y: targetY,
        duration: 300,
        ease: 'Cubic.easeOut'
      });
    });
  }
}

class DropdownMenu extends Phaser.GameObjects.Container {
  private icon: Phaser.GameObjects.Image;
  private menuContainer: Phaser.GameObjects.Container;
  private isOpen: boolean = false;

  constructor(scene: ISceneUI, x: number, y: number, iconKey: string, iconFrame: string | null, actions: { label: string, callback: () => void }[]) {
    super(scene, x, y);

    // Icono disparador
    this.icon = iconFrame ? scene.add.image(0, 0, iconKey, iconFrame) : scene.add.image(0, 0, iconKey);
    this.icon.setDisplaySize(50 * scene.service.escala, 50 * scene.service.escala);
    this.add(this.icon);

    // Hit area
    const hitSize = 60 * scene.service.escala;
    this.setSize(hitSize, hitSize);
    this.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-hitSize / 2, -hitSize / 2, hitSize, hitSize),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true
    });
    
    this.on('pointerover', () => this.icon.setTint(0xccffcc));
    this.on('pointerout', () => this.icon.clearTint());
    this.on('pointerdown', () => this.toggle());

    this.menuContainer = scene.add.container(0, 0);
    this.menuContainer.setVisible(false);
    this.add(this.menuContainer);

    this.updateActions(actions);

    this.setDepth(3000);
    scene.children.add(this);
  }

  updateActions(actions: { label: string, callback: () => void }[]) {
    this.menuContainer.removeAll(true);
    const spacing = 50 * (this.scene as any).service.escala;
    actions.forEach((action, i) => {
      const btn = new VoiceButton(this.scene as any, 0, -(i + 1) * spacing, action.label, () => {
        action.callback();
        this.toggle();
      });
      this.menuContainer.add(btn);
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.menuContainer.setVisible(true);
      this.menuContainer.y = 20;
      this.menuContainer.alpha = 0;
      this.scene.tweens.add({
        targets: this.menuContainer,
        y: 0,
        alpha: 1,
        duration: 200,
        ease: 'Back.easeOut'
      });
    } else {
      this.scene.tweens.add({
        targets: this.menuContainer,
        y: 20,
        alpha: 0,
        duration: 200,
        ease: 'Cubic.easeIn',
        onComplete: () => this.menuContainer.setVisible(false)
      });
    }
  }
}

class VoiceMenu extends DropdownMenu {
  constructor(scene: ISceneUI, x: number, y: number, texts: string[]) {
    const actions = texts.map(text => ({
      label: text,
      callback: () => scene.service.local.play(text)
    }));
    super(scene, x, y, 'chat', null, actions);
  }
}

export { Zone, VoiceButton, Marcador, LogView, VoiceMenu, DropdownMenu };
