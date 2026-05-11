const esbuild = require('esbuild');
const { esbuildDecorators } = require('esbuild-plugin-ts-decorators');
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

const isWatch = process.argv.includes('--watch');
const isServe = process.argv.includes('--serve');

const pkgPath = 'package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Parse --version=X.X.X argument
function getArgVersion() {
  const versionArg = process.argv.find(arg => arg.startsWith('--version='));
  return versionArg ? versionArg.split('=')[1] : pkg.version;
}

let currentVersion = getArgVersion();

const config = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'start/main.bundle.js',
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
  const PORT = 8081;
  const mimeTypes = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
    '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf', '.eot': 'application/vnd.ms-fontobject', '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
  };

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
