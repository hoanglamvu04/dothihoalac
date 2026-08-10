import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const API_START_PORT = 5000;
const API_SCAN_LIMIT = 20;
const PROBE_TIMEOUT_MS = 450;
const BACKEND_START_TIMEOUT_MS = 30000;
const children = new Set();
let shuttingDown = false;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function probeBackend(port) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) return false;
    const payload = await response.json().catch(() => null);

    return (
      payload?.success === true &&
      payload?.data?.service === 'dothihoalac-api' &&
      payload?.data?.status === 'ok'
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function findBackend() {
  const probes = [];

  for (let offset = 0; offset < API_SCAN_LIMIT; offset += 1) {
    const port = API_START_PORT + offset;
    probes.push(probeBackend(port).then((healthy) => (healthy ? port : null)));
  }

  const matches = await Promise.all(probes);
  return matches.find(Boolean) || null;
}

function startService(label, directory) {
  console.info(`[DTHL DEV] Khởi động ${label}...`);

  const child = spawn(npmCommand, ['run', 'dev'], {
    cwd: path.join(rootDir, directory),
    stdio: 'inherit',
    env: process.env,
  });

  children.add(child);

  child.once('error', (error) => {
    if (shuttingDown) return;
    console.error(`[DTHL DEV] Không khởi động được ${label}:`, error.message);
    shutdown(1);
  });

  child.once('exit', (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;

    const detail = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[DTHL DEV] ${label} đã dừng (${detail}).`);
    shutdown(code && code !== 0 ? code : 0);
  });

  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (child.exitCode === null && !child.killed) {
      child.kill();
    }
  }

  setTimeout(() => process.exit(exitCode), 250).unref();
}

async function waitForBackend() {
  const deadline = Date.now() + BACKEND_START_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const port = await findBackend();
    if (port) return port;
    await delay(350);
  }

  throw new Error(
    `Server chưa sẵn sàng trong ${Math.round(BACKEND_START_TIMEOUT_MS / 1000)} giây. ` +
      `Kiểm tra log server ở phía trên.`,
  );
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

try {
  let backendPort = await findBackend();

  if (backendPort) {
    console.info(`[DTHL DEV] Backend đã chạy tại http://localhost:${backendPort}/api/v1.`);
  } else {
    startService('server', 'server');
    backendPort = await waitForBackend();
    console.info(`[DTHL DEV] Backend sẵn sàng tại http://localhost:${backendPort}/api/v1.`);
  }

  startService('client', 'client');
} catch (error) {
  console.error(`[DTHL DEV] ${error.message}`);
  shutdown(1);
}
