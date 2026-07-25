// Bismillah Ar-Rahman Ar-Raheem.
// Dev orchestrator: starts the Astro backend (port 4321) and Vite frontend
// (port 3000) together so the sandbox `bun run dev` brings up the full stack.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const procs = [];

function spawnProc(name, command, cwd) {
  const p = spawn(command, { cwd, stdio: 'inherit', shell: true });
  procs.push({ name, p });
  p.on('error', (err) => console.error(`[${name}] failed to start:`, err));
  p.on('exit', (code, signal) => {
    console.log(`[${name}] exited (code=${code}, signal=${signal})`);
  });
  return p;
}

console.log('[dev] starting Astro backend on :4321 ...');
spawnProc('api', 'bun run dev', path.join(root, 'apps/backend'));

// Give the backend a brief head start, then launch the frontend.
setTimeout(() => {
  console.log('[dev] starting Vite frontend on :3000 ...');
  spawnProc('web', 'bun x vite', root);
}, 1500);

function shutdown() {
  console.log('\n[dev] shutting down...');
  for (const { name, p } of procs) {
    try {
      p.kill('SIGTERM');
    } catch {}
  }
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
