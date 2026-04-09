const { spawn } = require('child_process');

function run(name, command) {
  const child = spawn(command, {
    cwd: process.cwd(),
    env: process.env,
    shell: true,
    windowsHide: false,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  child.stdout.on('data', (buf) => process.stdout.write(`[${name}] ${buf}`));
  child.stderr.on('data', (buf) => process.stderr.write(`[${name}] ${buf}`));

  child.on('exit', (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.log(`[${name}] finalizado con ${reason}`);
  });

  return child;
}

const backend = run('backend', 'npm run start');
const frontend = run('frontend', 'npm run frontend:dev');

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\n[dev:stable] cerrando procesos...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  setTimeout(() => {
    backend.kill('SIGTERM');
    frontend.kill('SIGTERM');
    process.exit(0);
  }, 1200);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

let closed = false;
const onAnyExit = () => {
  if (closed) return;
  closed = true;
  shutdown();
};
backend.on('exit', onAnyExit);
frontend.on('exit', onAnyExit);
