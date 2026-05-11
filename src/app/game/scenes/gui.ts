import { GameService } from '../../services/game.service';
import { IngJuego } from "../../../assets/models";

export class GUIScene extends Phaser.Scene {
  service: GameService;
  logPreview: HTMLElement;

  constructor() {
    super('gui');
  }

  init(data: { service: GameService }) {
    this.service = data.service;
  }

  preload() {
    this.load.svg('chat', 'assets/icons/chat.svg');
    this.load.svg('menu', 'assets/icons/menu.svg');
  }

  create() {
    this.crearUI_HTML();
  }

  crearUI_HTML() {
    // 1. Inyectar Estilos CSS
    const styleId = 'truco-ui-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
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
        
        .truco-btn-container > .truco-btn-container .truco-btn {
          min-width: 140px;
        }
        .truco-btn {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
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
        }
        .truco-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.5);
        }
        .truco-btn:active {
          transform: translateY(0);
        }
        .truco-btn.primary {
          background: rgba(74, 144, 226, 0.4);
        }
        .truco-btn.danger {
          background: rgba(226, 74, 74, 0.4);
        }
        .menu-icon-btn {
          width: 60px; height: 60px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
        }
        .hidden { display: none !important; }

        /* NUEVOS ESTILOS DEL MARCADOR */
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
          background: rgba(12, 12, 4, 0.85);
          border: 4px solid #333;
          border-radius: 20px;
          padding: 12px 28px;
          text-align: center;
          min-width: 20vw;
          box-shadow: 0 10px 40px rgba(0,0,0,0.6);
          border-bottom-width: 6px; /* Efecto de relieve */
        }
        .score-label {
          color: #999;
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
        }
        .bet-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          min-width: 15vw;
        }
        .bet-label {
          color: #bbb;
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
        }

        /* ESTILOS DEL LOG DE EVENTOS */
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
          background: rgba(12, 12, 4, 0.85);
          backdrop-filter: blur(10px);
          border: 2px solid #333;
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
          border-color: #555;
          transform: scale(1.05);
        }
        .log-top-row {
          display: flex;
          align-items: center;
          gap: 15px;
          pointer-events: none;
        }
        .log-preview {
          background: rgba(12, 12, 4, 0.75);
          backdrop-filter: blur(8px);
          border-left: 3px solid #ffaa00;
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
          color: #ffaa00;
          font-weight: 800;
        }

        /* DIÁLOGOS DE DECISIÓN */
        .decision-overlay {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.4);
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
          background: rgba(20, 20, 10, 0.95);
          border: 2px solid #444;
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
        .btn-si { background: #4a90e2; color: white; }
        .btn-no { background: #444; color: #aaa; }
        .btn-decision:hover { transform: translateY(-3px); filter: brightness(1.2); }
        .log-panel {
          margin-top: 10px;
          width: 280px;
          max-height: 350px;
          background: rgba(12, 12, 4, 0.9);
          backdrop-filter: blur(15px);
          border: 2px solid #333;
          border-radius: 16px;
          padding: 15px;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.7);
          scrollbar-width: thin;
          scrollbar-color: #444 transparent;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .log-panel::-webkit-scrollbar { width: 6px; }
        .log-panel::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        
        .log-item {
          border-left: 3px solid rgba(255,255,255,0.2);
          padding-left: 10px;
          animation: logAppear 0.3s ease-out;
        }
        .log-item.system { border-left-color: #ffcc00; }
        .log-item.player { border-left-color: #4a90e2; }
        
        .log-item-name {
          font-size: 11px;
          color: #888;
          font-weight: 900;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .log-item-text {
          font-size: 14px;
          color: #eee;
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
        }
        .card-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .log-content {
          flex: 1;
        }
      `;
      document.head.appendChild(style);
    }

    // 2. Crear Contenedor Principal
    const overlay = document.createElement('div');
    overlay.className = 'truco-overlay';
    document.body.appendChild(overlay);

    // 3. Menú de Cartas (Abajo Izquierda)
    const cardMenu = document.createElement('div');
    cardMenu.className = 'truco-btn-container bottom-left';
    overlay.appendChild(cardMenu);

    const cardBtnContainer = document.createElement('div');
    cardBtnContainer.className = 'truco-btn-container hidden';
    cardBtnContainer.style.bottom = '70px';
    cardMenu.appendChild(cardBtnContainer);

    const btnRepartir = document.createElement('button');
    btnRepartir.className = 'truco-btn primary';
    btnRepartir.innerText = 'Repartir';
    btnRepartir.onclick = () => {
      if (btnRepartir.innerText === 'REPARTIR') {
        this.service.juego.repartir(this.service.local);
      } else {
        this.service.juego.recogerTodo();
      }
      cardBtnContainer.classList.add('hidden');
    };
    cardBtnContainer.appendChild(btnRepartir);

    const btnTomar = document.createElement('button');
    btnTomar.className = 'truco-btn';
    btnTomar.innerText = 'Tomar Mano';
    btnTomar.onclick = () => {
      this.service.local.mano.cogerMano();
      cardBtnContainer.classList.add('hidden');
    };
    cardBtnContainer.appendChild(btnTomar);

    const btnContar = document.createElement('button');
    btnContar.className = 'truco-btn hidden';
    btnContar.innerText = 'Contar Puntos';
    btnContar.onclick = () => {
      this.service.juego.contarPuntos();
      cardBtnContainer.classList.add('hidden');
    };
    cardBtnContainer.appendChild(btnContar);

    const btnRecoger = document.createElement('button');
    btnRecoger.className = 'truco-btn hidden';
    btnRecoger.innerText = 'Recoger';
    btnRecoger.onclick = () => {
      this.service.juego.recogerTodo();
      cardBtnContainer.classList.add('hidden');
    };
    cardBtnContainer.appendChild(btnRecoger);

    const btnToggleCards = document.createElement('button');
    btnToggleCards.className = 'truco-btn primary menu-icon-btn';
    btnToggleCards.innerHTML = '🎴';
    btnToggleCards.onclick = () => {
      cardBtnContainer.classList.toggle('hidden');
      voiceBtnContainer.classList.add('hidden'); // Cerrar el otro
    };
    cardMenu.appendChild(btnToggleCards);

    // 4. Menú de Voces (Abajo Derecha)
    const voiceMenu = document.createElement('div');
    voiceMenu.className = 'truco-btn-container bottom-right';
    overlay.appendChild(voiceMenu);

    const voiceBtnContainer = document.createElement('div');
    voiceBtnContainer.className = 'truco-btn-container hidden';
    voiceBtnContainer.style.bottom = '70px';
    voiceMenu.appendChild(voiceBtnContainer);

    // Función para refrescar los botones según el estado del juego
    const updateVoiceButtons = () => {
      voiceBtnContainer.innerHTML = '';
      const t = this.service.juego.truco;
      const local = this.service.local;
      const equipoLocal = local.pareja.indice;

      // 1. Botones Estáticos
      ['flor', 'envido'].forEach(v => {
        const btn = document.createElement('button');
        btn.className = 'truco-btn';
        btn.innerText = v;
        btn.onclick = () => { local.hablar(v); voiceBtnContainer.classList.add('hidden'); };
        voiceBtnContainer.appendChild(btn);
      });

      // 2. BOTÓN DINÁMICO DE TRUCO
      let proximoNivel = 3;
      if (t.nivel === 3) proximoNivel = 6;
      else if (t.nivel === 6) proximoNivel = 9;
      else if (t.nivel === 9) proximoNivel = 12;

      const textoTruco = t.getNombreNivel(proximoNivel);
      
      // Solo mostrar si el nivel no es el máximo y tenemos la palabra (o nadie cantó)
      if (t.nivel < 12 && (t.equipoConLaPalabra === -1 || t.equipoConLaPalabra === equipoLocal)) {
        const btnT = document.createElement('button');
        btnT.className = `truco-btn btn-truco-${proximoNivel}`;
        btnT.innerText = textoTruco;
        btnT.onclick = () => { 
          local.hablar(textoTruco.toLowerCase()); 
          voiceBtnContainer.classList.add('hidden'); 
        };
        voiceBtnContainer.appendChild(btnT);
      }

      // 3. Respuestas (Solo si hay algo pendiente de responder por nuestro equipo)
      const trucoPendiente = t.esperandoRespuesta && t.equipoQueCanto !== equipoLocal;
      const envidoPendiente = this.service.juego.envidoEstado === 'CANTADO' && this.service.juego.equipoQueCantoEnvido !== equipoLocal;

      if (trucoPendiente || envidoPendiente) {
        ['quiero', 'no quiero'].forEach(v => {
          const btn = document.createElement('button');
          btn.className = 'truco-btn secondary'; // Clase secundaria para diferenciar
          btn.innerText = v;
          btn.onclick = () => { local.hablar(v); voiceBtnContainer.classList.add('hidden'); };
          voiceBtnContainer.appendChild(btn);
        });
      }
    };

    const btnToggleVoices = document.createElement('button');
    btnToggleVoices.className = 'truco-btn primary menu-icon-btn';
    btnToggleVoices.innerHTML = '💬';
    btnToggleVoices.onclick = () => {
      if (voiceBtnContainer.classList.contains('hidden')) {
        updateVoiceButtons(); // Actualizar antes de mostrar
      }
      voiceBtnContainer.classList.toggle('hidden');
      cardBtnContainer.classList.add('hidden');
    };
    voiceMenu.appendChild(btnToggleVoices);

    // 5. Encabezado del Marcador
    const header = document.createElement('div');
    header.className = 'truco-header';
    header.innerHTML = `
      <div class="score-box">
        <div class="score-label">NOSOTROS</div>
        <div class="score-value" id="score-nosotros">0 / 12</div>
      </div>
      <div class="bet-container">
        <div class="bet-label">APUESTA</div>
        <div class="bet-value" id="bet-status">1 | 0 - 0</div>
      </div>
      <div class="score-box">
        <div class="score-label">ELLOS</div>
        <div class="score-value" id="score-ellos">0 / 12</div>
      </div>
    `;
    overlay.appendChild(header);

    // 6. Log de Eventos Desplegable
    const logContainer = document.createElement('div');
    logContainer.className = 'log-container';
    overlay.appendChild(logContainer);

    const logTopRow = document.createElement('div');
    logTopRow.className = 'log-top-row';
    logContainer.appendChild(logTopRow);

    const logBtn = document.createElement('button');
    logBtn.className = 'log-toggle-btn';
    logBtn.innerHTML = '📜';
    logBtn.style.cursor = 'pointer';
    logBtn.onclick = () => logPanel.classList.toggle('hidden');
    logTopRow.appendChild(logBtn);

    const logPreview = document.createElement('div');
    logPreview.className = 'log-preview';
    this.logPreview = logPreview;
    logTopRow.appendChild(logPreview);

    const logPanel = document.createElement('div');
    logPanel.className = 'log-panel hidden';
    logContainer.appendChild(logPanel);

    // 7. Sincronización con eventos de Phaser
    this.service.phaser.emitter.on('manoFinished', () => {
      btnRepartir.classList.add('hidden');

      // Solo el repartidor actual puede iniciar el conteo de puntos
      if (this.service.juego.dealer === this.service.local) {
        btnContar.classList.remove('hidden');
        btnContar.classList.add('primary');
      }

      btnRecoger.classList.add('hidden');
    });

    this.service.phaser.emitter.on('puntosContados', () => {
      btnContar.classList.add('hidden');
      btnRecoger.classList.remove('hidden');
      btnRecoger.classList.add('danger');
    });

    this.service.phaser.emitter.on('repartoFinished', () => {
      btnRepartir.classList.remove('hidden');
      btnRepartir.innerText = 'REPARTIR';
      btnRepartir.classList.add('primary');
      btnContar.classList.add('hidden');
      btnRecoger.classList.add('hidden');
    });

    // Suscribir actualización del marcador HTML
    const updateHeader = () => this.actualizarMarcadorHTML();
    this.service.phaser.emitter.on('repartoFinished', () => updateHeader());
    this.service.phaser.emitter.on('puntosUpdated', () => updateHeader());
    this.service.phaser.emitter.on('rondaFinished', updateHeader);
    this.service.phaser.emitter.on('manoFinished', updateHeader);
    this.service.phaser.emitter.on('puntosContados', updateHeader);

    // 8. Escuchar Preguntas del Motor
    this.service.phaser.emitter.on('mostrarPregunta', (data: { texto: string, callback: (res: boolean) => void }) => {
      this.mostrarPreguntaHTML(data.texto, data.callback);
    });

    // Suscribir Log de eventos
    this.service.phaser.emitter.on('hablar', (data: any) => this.addLogHTML(data, logPanel));
    this.service.phaser.emitter.on('cardPlayed', (data: any) => this.addCardPlayLogHTML(data, logPanel));

    // Inicializar
    updateHeader();

    // --- MARCADOR SUPERIOR ---
    // new IngJuego.Marcador(this as any, this.scale.width / 2, 60 * this.service.escala);
    // new IngJuego.LogView(this as any, 20 * this.service.escala, 150 * this.service.escala);
  }

  addLogHTML(data: any, container: HTMLElement) {
    const item = document.createElement('div');
    const isPlayer = data.jugador !== undefined;
    item.className = `log-item ${isPlayer ? 'player' : 'system'}`;

    const name = data.jugador ? data.jugador.nombre : 'SISTEMA';
    item.innerHTML = `
      <div class="log-item-name">${name}</div>
      <div class="log-item-text">${data.texto}</div>
    `;

    if (this.logPreview) {
      this.logPreview.innerHTML = `<b>${name}:</b> ${data.texto}`;
      this.logPreview.classList.remove('visible');
      void this.logPreview.offsetWidth;
      this.logPreview.classList.add('visible');
    }

    if (container.firstChild) {
      container.insertBefore(item, container.firstChild);
    } else {
      container.appendChild(item);
    }

    if (container.children.length > 20) {
      container.removeChild(container.lastChild);
    }
  }

  mostrarPreguntaHTML(texto: string, callback: (res: boolean) => void) {
    const overlay = document.querySelector('.truco-overlay');
    if (!overlay) return;

    const div = document.createElement('div');
    div.className = 'decision-overlay';
    div.innerHTML = `
      <div class="decision-card">
        <div class="decision-text">${texto}</div>
        <div class="decision-btns">
          <button class="btn-decision btn-si" id="btn-preg-si">SÍ</button>
          <button class="btn-decision btn-no" id="btn-preg-no">NO</button>
        </div>
      </div>
    `;
    overlay.appendChild(div);

    const close = (res: boolean) => {
      div.remove();
      callback(res);
    };

    const btnSi = div.querySelector('#btn-preg-si') as HTMLElement;
    const btnNo = div.querySelector('#btn-preg-no') as HTMLElement;
    if (btnSi) btnSi.onclick = () => close(true);
    if (btnNo) btnNo.onclick = () => close(false);
  }

  addCardPlayLogHTML(data: { jugador: any, carta: any }, container: HTMLElement) {
    const { jugador, carta } = data;
    const item = document.createElement('div');
    item.className = 'log-item player card-play';

    const thumbContainer = document.createElement('div');
    thumbContainer.className = 'card-thumb-container';

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 100; canvas.height = 150;
      const ctx = canvas.getContext('2d');
      const frame = carta.frame;
      const source = frame.texture.source[0].image;
      ctx.drawImage(source, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, 100, 150);

      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/webp', 0.5);
      img.className = 'card-thumb';
      thumbContainer.appendChild(img);
      canvas.width = 0; canvas.height = 0;
    } catch (e) {
      thumbContainer.innerHTML = '🎴';
    }

    const content = document.createElement('div');
    content.className = 'log-content';
    const cardText = carta.tapada ? 'una carta' : `<b>${carta.numero} de ${carta.pinta}</b>`;
    const jNombre = typeof jugador === 'string' ? jugador : jugador.nombre;

    content.innerHTML = `
      <div class="log-item-name">${jNombre}</div>
      <div class="log-item-text">Juega ${cardText}</div>
    `;

    item.appendChild(thumbContainer);
    item.appendChild(content);

    if (this.logPreview) {
      this.logPreview.innerHTML = `<b>${jNombre}:</b> ${cardText.replace('<b>', '').replace('</b>', '')}`;
      this.logPreview.classList.remove('visible');
      void this.logPreview.offsetWidth;
      this.logPreview.classList.add('visible');
    }

    if (container.firstChild) {
      container.insertBefore(item, container.firstChild);
    } else {
      container.appendChild(item);
    }

    if (container.children.length > 20) {
      container.removeChild(container.lastChild);
    }
  }

  actualizarMarcadorHTML() {
    const juego = this.service.juego;
    if (!juego || !juego.partida) return;
    const partida = juego.partida;
    const mano = partida.manoActual;
    const p1 = partida.puntos[0];
    const p2 = partida.puntos[1];
    const valorMano = mano.truco ? mano.truco.valor : 1;
    const r1 = mano.rondasGanadas[0];
    const r2 = mano.rondasGanadas[1];

    const elNosotros = document.getElementById('score-nosotros');
    const elEllos = document.getElementById('score-ellos');
    const elBet = document.getElementById('bet-status');

    if (elNosotros) elNosotros.innerText = `${p1} / 12`;
    if (elEllos) elEllos.innerText = `${p2} / 12`;
    if (elBet) elBet.innerText = `${valorMano} | ${r1} - ${r2}`;
  }
}
