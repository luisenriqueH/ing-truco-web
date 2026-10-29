const esbuild = require('esbuild');
const { esbuildDecorators } = require('esbuild-plugin-ts-decorators');
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

const isWatch = process.argv.includes('--watch');
const isServe = process.argv.includes('--serve');

const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Parse --version=X.X.X argument
function getArgVersion() {
  const versionArg = process.argv.find(arg => arg.startsWith('--version='));
  return versionArg ? versionArg.split('=')[1] : pkg.version;
}

let currentVersion = getArgVersion();

const config = {
  entryPoints: [path.join(__dirname, 'src/main.ts')],
  bundle: true,
  outfile: path.join(__dirname, 'start/main.bundle.js'),
  minify: !isServe && !isWatch,
  sourcemap: isServe || isWatch,
  platform: 'browser',
  target: ['es2015'],
  plugins: [
    esbuildDecorators({
      tsconfig: path.join(__dirname, 'tsconfig.json')
    }),
  ],
  define: {
    'process.env.NODE_ENV': (isServe || isWatch) ? '"development"' : '"production"',
    'process.env.APP_VERSION': `"${currentVersion}"`
  },
  loader: {
    '.ts': 'ts',
    '.js': 'js',
  },
};

async function updateIndexHtml(v) {
  const indexPath = path.join(__dirname, 'start/index.html');
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');
    const metaTag = `<meta name="deploy-version" content="${v}">`;
    if (html.includes('name="deploy-version"')) {
      html = html.replace(/<meta name="deploy-version" content="[^"]*">/, metaTag);
    } else {
      html = html.replace('<head>', `<head>\n    ${metaTag}`);
    }
    fs.writeFileSync(indexPath, html);
    console.log(`Updated start/index.html with version ${v}`);
  }
}

async function runBuild(v) {
  if (v && v !== pkg.version) {
    pkg.version = v;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Updated package.json to version ${v}`);
    config.define['process.env.APP_VERSION'] = `"${v}"`;
  }
  await esbuild.build(config);
  await updateIndexHtml(v || currentVersion);
  console.log('Build complete!');
}

async function startServer() {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const mimeTypes = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
    '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf', '.eot': 'application/vnd.ms-fontobject', '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
  };

  const clients = new Map(); // userId -> { res, userId, name, room }
  const roomStates = new Map(); // room -> snapshot

  function broadcastClientList() {
    const list = Array.from(clients.values()).map(c => ({
      userId: c.userId,
      name: c.name,
      room: c.room
    }));
    const message = JSON.stringify({ event: 'clients_list', clients: list });
    for (const client of clients.values()) {
      try {
        client.res.write(`data: ${message}\n\n`);
      } catch (err) {
        console.error(`Failed to send to client ${client.userId}:`, err);
      }
    }
  }

  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let filePath = parsedUrl.pathname;

    // API Routes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (filePath === '/api/connect' && req.method === 'GET') {
      const userId = parsedUrl.query.userId || Math.random().toString(36).substr(2, 9);
      const name = parsedUrl.query.name || 'Anonymous';
      const room = parsedUrl.query.room || 'Sala 1';

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Keep connection alive with a periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          res.write(': heartbeat\n\n');
        } catch (e) {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Send initial connection confirmation
      res.write(`data: ${JSON.stringify({ event: 'connected', userId, name, room })}\n\n`);

      if (roomStates.has(room)) {
        console.log(`[STATE] Pushing last saved state of ${room} to new client ${name}`);
        res.write(`data: ${JSON.stringify({ event: 'game_action', data: { action: 'gameStateSnapshot', targetUserId: userId, snapshot: roomStates.get(room) } })}\n\n`);
      }

      const clientInfo = { res, userId, name, room };
      clients.set(userId, clientInfo);
      console.log(`[SSE] Client connected: ${name} (${userId}) in ${room}`);

      broadcastClientList();

      req.on('close', () => {
        clearInterval(heartbeatInterval);
        clients.delete(userId);
        console.log(`[SSE] Client disconnected: ${name} (${userId})`);
        
        // Limpiar el estado de la sala si queda vacía
        const roomClients = Array.from(clients.values()).filter(c => c.room === room);
        if (roomClients.length === 0) {
          roomStates.delete(room);
          console.log(`[STATE] Room ${room} is empty. Cleared game state.`);
        }
        
        broadcastClientList();
      });
      return;
    }

    if (filePath === '/api/clients' && req.method === 'GET') {
      const list = Array.from(clients.values()).map(c => ({
        userId: c.userId,
        name: c.name,
        room: c.room
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
      return;
    }

    if (filePath === '/api/rooms' && req.method === 'GET') {
      // Build a map of player counts per room from connected clients
      const playerCounts = {};
      for (const client of clients.values()) {
        playerCounts[client.room] = (playerCounts[client.room] || 0) + 1;
      }

      // Merge room game states with live player counts
      const data = {};
      // Include all known rooms (from states and from connected clients)
      const allRooms = new Set([...roomStates.keys(), ...Object.keys(playerCounts)]);
      for (const room of allRooms) {
        const state = roomStates.get(room);
        data[room] = {
          playerCount: playerCounts[room] || 0,
          active: state ? state.manoEnCurso : false,
          puntos: state ? state.puntos : null
        };
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (filePath === '/api/webhook' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          const targetType = payload.targetType || 'all'; // 'client', 'room', or 'all'
          const targetId = payload.targetId;
          const eventName = payload.eventName || 'webhook_event';
          const data = payload.data || {};

          if (eventName === 'game_action' && data.action === 'updateGameState') {
            roomStates.set(targetId, data.snapshot);
            console.log(`[STATE] Room ${targetId} game state updated.`);
          }

          let sentCount = 0;
          const message = JSON.stringify({ event: eventName, data });

          for (const client of clients.values()) {
            let matches = false;
            if (targetType === 'all') {
              matches = true;
            } else if (targetType === 'client' && client.userId === targetId) {
              matches = true;
            } else if (targetType === 'room' && client.room === targetId) {
              matches = true;
            }

            if (matches) {
              try {
                client.res.write(`data: ${message}\n\n`);
                sentCount++;
              } catch (e) {
                console.error(`Error sending message to ${client.userId}:`, e);
              }
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, sentCount }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    if (filePath === '/api/build') {
      const v = parsedUrl.query.version;
      console.log(`[API] Build Request received for v${v}`);
      try {
        await runBuild(v);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, version: v }));
      } catch (err) {
        console.error(`[API] Build Error: ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    if (filePath === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'online', version: pkg.version }));
      return;
    }

    if (filePath === '/api/characters' && req.method === 'GET') {
      const dirPath = path.join(__dirname, 'assets/characters');
      try {
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        const files = fs.readdirSync(dirPath);
        const characters = [];
        for (const file of files) {
          if (file.endsWith('.json')) {
            const data = fs.readFileSync(path.join(dirPath, file), 'utf8');
            characters.push(JSON.parse(data));
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(characters));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (filePath === '/api/characters/save' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const charData = JSON.parse(body);
          if (!charData.nombre) {
            throw new Error('Nombre del personaje es requerido');
          }
          const normName = charData.nombre.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/ñ/g, 'n')
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/__+/g, '_');
          const fileName = `${normName}.json`;
          const dirPath = path.join(__dirname, 'assets/characters');
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }
          fs.writeFileSync(path.join(dirPath, fileName), JSON.stringify(charData, null, 2));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, file: fileName }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Static Routes
    if (filePath === '/dashboard') {
      filePath = '/tools/dashboard.html';
    } else if (filePath === '/' || filePath === '') {
      filePath = '/start/index.html';
    } else if (filePath.startsWith('/tools/')) {
      // Allow as is
    } else {
      // Check if file exists in root FIRST (for package.json, etc)
      const rootPath = path.join(__dirname, filePath);
      if (fs.existsSync(rootPath) && fs.lstatSync(rootPath).isFile()) {
        // Use rootPath later
      } else if (!filePath.startsWith('/start/')) {
        filePath = '/start' + filePath;
      }
    }

    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isFile()) {
      const ext = path.extname(fullPath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(fullPath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`----------------------------------------`);
    console.log(`  ING-TRUCO UNIFIED DEV TOOL`);
    console.log(`  Game: http://localhost:${PORT}`);
    console.log(`  Dash: http://localhost:${PORT}/dashboard`);
    console.log(`  API:  http://127.0.0.1:${PORT}/api/status`);
    console.log(`----------------------------------------`);
  });
}

async function main() {
  const isOnce = process.argv.includes('--once');
  const isWatch = process.argv.includes('--watch');

  if (isWatch) {
    const context = await esbuild.context(config);
    await context.watch();
    console.log('Watching for changes...');
    await startServer(); // Keep server alive even in watch mode
  } else {
    // Standard execution
    await runBuild(currentVersion);

    if (isOnce) {
      console.log('Build complete (once mode).');
      process.exit(0);
    } else {
      await startServer();
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
