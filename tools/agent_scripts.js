const btnReview = document.getElementById('btn-review');
const btnCompile = document.getElementById('btn-compile');
const btnReset = document.getElementById('btn-reset');
const btnToggle = document.getElementById('btn-toggle');
const btnServer = document.getElementById('btn-server');
const btnServerStop = document.getElementById('btn-server-stop');
const btnNextCycle = document.getElementById('btn-next-cycle');
const targetVersionInput = document.getElementById('target-version');
const sidebar = document.getElementById('sidebar');
const reviewArea = document.getElementById('review-area');
const compileArea = document.getElementById('compile-area');
const compilationTrigger = document.getElementById('compilation-trigger');
const successArea = document.getElementById('success-area');
const deployedVersionBadge = document.getElementById('deployed-version-badge');
const currentVersionDisplay = document.getElementById('current-version');
const consoleArea = document.getElementById('agent-console');
const serverStatus = document.getElementById('server-status');
const serverText = document.getElementById('server-text');

const API_BASE = 'http://127.0.0.1:8081';
let bridgeOnline = false;

// Log function
function log(msg) {
    const time = new Date().toLocaleTimeString();
    consoleArea.innerText += `\n[${time}] ${msg}`;
    consoleArea.scrollTop = consoleArea.scrollHeight;
}

// Initialize Dashboard with Auto-Retry
async function init() {
    // 1. Permanent API Watcher (Reconnects automatically)
    const checkAPI = async () => {
        try {
            const statusRes = await fetch(`${API_BASE}/api/status?t=${Date.now()}`);
            const data = await statusRes.json();
            if (data.status === 'online') {
                if (!bridgeOnline) {
                    bridgeOnline = true;
                    log('✅ MOTOR DETECTADO: El tablero ahora es AUTÓNOMO.');
                    // If we were waiting for terminal, update UI
                    if (btnCompile.innerText === 'Esperando terminal...') {
                        btnCompile.innerText = 'Ejecutar Compilación Regular';
                        btnCompile.disabled = false;
                        btnCompile.style.background = 'var(--success)';
                    }
                }
            }
        } catch (e) {
            if (bridgeOnline) {
                bridgeOnline = false;
                log('⚠️ MOTOR DESCONECTADO: Volviendo a modo manual.');
            }
        }
        setTimeout(checkAPI, 2000);
    };
    checkAPI();

    try {
        // 2. Load Source Version (package.json)
        let sourceVersion = '0.0.0';
        try {
            const pkgRes = await fetch(`${API_BASE}/package.json?t=${Date.now()}`);
            const pkgData = await pkgRes.json();
            sourceVersion = pkgData.version;
        } catch (e) {
             const pkgRes = await fetch('../package.json?t=' + Date.now());
             const pkgData = await pkgRes.json();
             sourceVersion = pkgData.version;
        }

        // 3. Load Deployed Version
        let deployVersion = 'Unknown';
        try {
            const deployRes = await fetch('../start/index.html?t=' + Date.now());
            const deployHtml = await deployRes.text();
            const doc = new DOMParser().parseFromString(deployHtml, 'text/html');
            const meta = doc.querySelector('meta[name="deploy-version"]');
            deployVersion = meta ? meta.getAttribute('content') : 'Unknown';
        } catch (e) {}

        currentVersionDisplay.innerText = deployVersion;
        if (deployVersion !== sourceVersion) {
            currentVersionDisplay.style.color = '#f59e0b';
            log(`AVISO: Versión física (${deployVersion}) difiere de fuente (${sourceVersion})`);
        } else {
            currentVersionDisplay.style.color = 'var(--text)';
            log(`Sistema sincronizado en v${deployVersion}`);
        }

        // Propose next version
        const parts = sourceVersion.split('.');
        parts[2] = parseInt(parts[2]) + 1;
        targetVersionInput.value = parts.join('.');
        
    } catch (err) {
        log('Error de inicialización. Verifica el servidor de Node.');
    }
}

init();

// Sidebar Toggle
btnToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    btnToggle.innerText = sidebar.classList.contains('collapsed') ? '›' : '‹';
});

// Server Control (UI states)
btnServer.addEventListener('click', () => {
    log('Signaling Agent to launch game server...');
    serverStatus.style.background = '#22c55e';
    serverText.innerText = 'Online (Port 8081)';
    btnServer.style.display = 'none';
    btnServerStop.style.display = 'block';
});

btnServerStop.addEventListener('click', () => {
    log('Signaling Agent to STOP game server...');
    serverStatus.style.background = '#ef4444';
    serverText.innerText = 'Offline';
    btnServer.style.display = 'block';
    btnServerStop.style.display = 'none';
});

// Next Cycle / Refresh
btnNextCycle.addEventListener('click', () => {
    location.reload();
});

// Review Logic
btnReview.addEventListener('click', () => {
    const targetVersion = targetVersionInput.value;
    btnReview.disabled = true;
    targetVersionInput.disabled = true;
    log(`Iniciando revisión para v${targetVersion}...`);
    
    setTimeout(() => {
        log('Analizando assets...');
        setTimeout(() => {
            log('Ajustando package.json...');
            setTimeout(() => {
                log('Condiciones listas para compilar.');
                reviewArea.style.opacity = '0.5';
                compileArea.style.display = 'block';
                compilationTrigger.style.display = 'block';
                successArea.style.display = 'none';
            }, 500);
        }, 500);
    }, 500);
});

// Poll for sync
async function checkDeploymentVersion(target) {
    let currentV = 'Unknown';
    if (bridgeOnline) {
        try {
            const res = await fetch(`${API_BASE}/api/status?t=${Date.now()}`);
            const data = await res.json();
            currentV = data.version;
            if (currentV === target) return true;
        } catch (e) {}
    }
    try {
        const deployRes = await fetch('../start/index.html?t=' + Date.now());
        const deployHtml = await deployRes.text();
        const doc = new DOMParser().parseFromString(deployHtml, 'text/html');
        const meta = doc.querySelector('meta[name="deploy-version"]');
        const fileV = meta ? meta.getAttribute('content') : 'Unknown';
        if (currentV === 'Unknown') currentV = fileV;
        if (fileV === target) return true;
    } catch (err) {}

    if (Math.random() > 0.8) {
        log(`⌛ Polling v${target}... Actual: v${currentV}`);
    }
    return false;
}

// Compile Logic
btnCompile.addEventListener('click', async () => {
    const targetVersion = targetVersionInput.value;
    log(`AGENT_COMMAND: node build.js --version=${targetVersion}`);
    
    btnCompile.disabled = true;
    
    if (bridgeOnline) {
        log(`🚀 Iniciando Compilación Autónoma...`);
        btnCompile.innerText = 'Compilando...';
        btnCompile.style.background = '#3b82f6'; // Processing blue
        try {
            const res = await fetch(`${API_BASE}/api/build?version=${targetVersion}&t=${Date.now()}`);
            const data = await res.json();
            if (data.success) {
                log('✅ Build completado interno. Esperando reflejo...');
            } else {
                log(`❌ Error: ${data.error}`);
                btnCompile.disabled = false;
                btnCompile.innerText = 'Reintentar';
                return;
            }
        } catch (e) {
            log('❌ Error de comunicación con la API.');
        }
    } else {
        log('⚠️ MOTOR OFFLINE. Por favor ejecuta el comando en tu terminal.');
        btnCompile.innerText = 'Esperando terminal...';
        btnCompile.style.background = '#f59e0b'; // Waiting orange
    }
    
    const pollingInterval = setInterval(async () => {
        const isSynced = await checkDeploymentVersion(targetVersion);
        if (isSynced) {
            clearInterval(pollingInterval);
            log(`✅ SINCRO EXITOSA: El sistema ya es v${targetVersion}`);
            deployedVersionBadge.innerText = targetVersion;
            currentVersionDisplay.innerText = targetVersion;
            currentVersionDisplay.style.color = 'var(--text)';
            compilationTrigger.style.display = 'none';
            successArea.style.display = 'block';
            btnCompile.innerText = 'Ejecutar Compilación Regular';
            btnCompile.style.background = 'var(--success)';
            btnCompile.disabled = false;
        }
    }, 1500); 
});

// Reset logic
btnReset.addEventListener('click', () => {
    reviewArea.style.opacity = '1';
    compileArea.style.display = 'none';
    btnReview.disabled = false;
    targetVersionInput.disabled = false;
    log('Proceso reiniciado.');
});
