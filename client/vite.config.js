import net from 'node:net';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const CLIENT_START_PORT = 5173;
const CLIENT_PORT_SCAN_LIMIT = 20;
const PORT_PROBE_TIMEOUT_MS = 250;
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

export default defineConfig(async ({ command }) => {
  const port = command === 'serve' ? await findAvailablePort(CLIENT_START_PORT) : CLIENT_START_PORT;

  return {
    plugins: [react()],
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
