const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (_) {
    // noop
  }
}

function removeIfExists(targetPath) {
  try {
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log(`[dev:clean] eliminado: ${targetPath}`);
    }
  } catch (_) {
    // noop
  }
}

console.log('[dev:clean] cerrando procesos Node...');
run('taskkill /F /IM node.exe /T');

console.log('[dev:clean] limpiando cache de Vite...');
removeIfExists(path.join(process.cwd(), 'frontend', 'node_modules', '.vite'));

console.log('[dev:clean] listo.');

