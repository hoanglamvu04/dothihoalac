import net from 'node:net';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const CLIENT_START_PORT = 5173;
const CLIENT_PORT_SCAN_LIMIT = 20;
const API_START_PORT = 5000;
const API_PORT_SCAN_LIMIT = 20;
const PORT_PROBE_TIMEOUT_MS = 250;
const API_PROBE_TIMEOUT_MS = 450;
const LOCAL_PROBE_HOSTS = ['127.0.0.1', '::1'];

function canConnectToPort(port, host) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    let settled = false;

    const finish = (inUse) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(inUse);
    };

    socket.setTimeout(PORT_PROBE_TIMEOUT_MS);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function isLocalPortInUse(port) {
  const results = await Promise.all(
    LOCAL_PROBE_HOSTS.map((host) => canConnectToPort(port, host)),
  );

  return results.some(Boolean);
}

async function findAvailablePort(startPort, attempts = CLIENT_PORT_SCAN_LIMIT) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = startPort + offset;

    if (port > 65535) break;

    if (!(await isLocalPortInUse(port))) {
      if (port !== startPort) {
        console.info(`[DTHL CLIENT] Port ${startPort} đang bận, dùng port ${port}.`);
      }
      return port;
    }
  }

  const endPort = Math.min(65535, startPort + attempts - 1);
  throw new Error(`Không tìm thấy cổng frontend trống trong dải ${startPort}-${endPort}.`);
}

async function probeDthlApiPort(port) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`, {
      method: 'GET',
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

async function findDthlBackendPort() {
  const ports = [];

  for (let offset = 0; offset < API_PORT_SCAN_LIMIT; offset += 1) {
    const port = API_START_PORT + offset;
    if (port > 65535) break;
    ports.push(port);
  }

  const matches = await Promise.all(
    ports.map(async (port) => ((await probeDthlApiPort(port)) ? port : null)),
  );

  return matches.find(Boolean) || null;
}

export default defineConfig(async ({ command }) => {
  const [port, backendPort] = await Promise.all([
    command === 'serve'
      ? findAvailablePort(CLIENT_START_PORT)
      : Promise.resolve(CLIENT_START_PORT),
    command === 'serve'
      ? findDthlBackendPort()
      : Promise.resolve(null),
  ]);

  if (backendPort) {
    console.info(
      `[DTHL CLIENT] Backend local được phát hiện ở port ${backendPort}. Trình duyệt sẽ dùng hostname hiện tại để kết nối API.`,
    );
  } else if (command === 'serve') {
    console.warn(
      `[DTHL CLIENT] Chưa thấy DTHL API trong dải ${API_START_PORT}-${API_START_PORT + API_PORT_SCAN_LIMIT - 1}. Frontend sẽ dùng runtime discovery khi có request.`,
    );
  }

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_DISCOVERED_API_PORT': JSON.stringify(
        backendPort ? String(backendPort) : '',
      ),
    },
    server: {
      port,
      strictPort: false,
      host: true,
    },
    preview: {
      port: 4173,
      strictPort: false,
      host: true,
    },
  };
});
