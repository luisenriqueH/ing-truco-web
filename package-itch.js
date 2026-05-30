const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, 'dist-itch');

// Helper to copy directory recursively
function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

async function buildItch() {
  console.log('--- Preparando compilación para Itch.io ---');
  
  // 1. Ejecutar npm run build para asegurar que la última versión del código está compilada
  console.log('Compilando el proyecto (npm run build)...');
  try {
    execSync('npm run build -- --once', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error al compilar:', error);
    process.exit(1);
  }

  // 2. Limpiar/Crear directorio de salida
  if (fs.existsSync(distDir)) {
    console.log('Limpiando directorio dist-itch existente...');
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir);

  // 3. Copiar archivos de /start a /dist-itch
  console.log('Copiando archivos compilados de /start...');
  copyFolderSync(path.join(__dirname, 'start'), distDir);

  // 4. Fusionar /assets (del root) a /dist-itch/assets
  console.log('Fusionando assets de la raíz...');
  copyFolderSync(path.join(__dirname, 'assets'), path.join(distDir, 'assets'));

  // 5. Crear archivo ZIP
  console.log('Creando archivo ZIP...');
  const zipPath = path.join(__dirname, 'dist-itch.zip');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  try {
    // Usar el comando nativo zip de macOS / Linux
    execSync(`zip -r ../dist-itch.zip .`, { cwd: distDir, stdio: 'inherit' });
    console.log(`\n¡Listo! Se ha creado:`);
    console.log(`- Carpeta: ${distDir}`);
    console.log(`- Archivo ZIP listo para Itch.io: ${zipPath}`);
  } catch (err) {
    console.error('Error al crear el ZIP:', err);
  }
}

buildItch();
