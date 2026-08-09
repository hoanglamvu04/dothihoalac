const API_PATH = '/api/v1';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function normalizeUrl(value = '') {
  return String(value || '').trim().replace(/\/+$/, '');
}

function numberFromEnv(value, fallback, { min = 1, max = 65535 } = {}) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }

  return parsed;
}

const discoveredApiUrl = normalizeUrl(import.meta.env.VITE_DISCOVERED_API_URL);
const discoveredServerUrl = normalizeUrl(import.meta.env.VITE_DISCOVERED_SERVER_URL);
const envApiUrl = normalizeUrl(import.meta.env.VITE_API_URL);
const envServerUrl = normalizeUrl(import.meta.env.VITE_SERVER_URL);

function serverFromApiUrl(apiUrl) {
  if (!apiUrl) return '';

  try {
    const url = new URL(apiUrl);
    const pathname = url.pathname.replace(/\/+$/, '');

    if (pathname.endsWith(API_PATH)) {
      url.pathname = pathname.slice(0, -API_PATH.length) || '/';
    } else {
      url.pathname = '/';
    }

    url.search = '';
    url.hash = '';
    return normalizeUrl(url.toString());
  } catch {
    return '';
  }
}

const configuredApiUrl = discoveredApiUrl || envApiUrl;
const configuredServer =
  discoveredServerUrl || envServerUrl || serverFromApiUrl(configuredApiUrl);
const hasViteDiscoveredBackend = Boolean(discoveredApiUrl || discoveredServerUrl);

function configuredPortFallback() {
  if (!configuredServer) return 5000;

  try {
    const port = Number(new URL(configuredServer).port);
    return Number.isInteger(port) && port > 0 ? port : 5000;
  } catch {
    return 5000;
  }
}

const START_PORT = numberFromEnv(
  import.meta.env.VITE_API_START_PORT,
  configuredPortFallback(),
);
const PORT_SCAN_LIMIT = numberFromEnv(import.meta.env.VITE_API_PORT_SCAN_LIMIT, 20, {
  min: 1,
  max: 100,
});
const PROBE_TIMEOUT_MS = numberFromEnv(import.meta.env.VITE_API_PROBE_TIMEOUT_MS, 700, {
  min: 100,
  max: 10000,
});

let resolvedServerUrl = '';
let resolvedApiUrl = '';
let discoveryPromise = null;
let forceRuntimeDiscovery = false;

function isLocalHttpUrl(value) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function shouldAutoDiscover() {
  if (!import.meta.env.DEV) return false;
  if (forceRuntimeDiscovery) return true;
  if (hasViteDiscoveredBackend) return false;
  if (!configuredServer && !configuredApiUrl) return true;
  return isLocalHttpUrl(configuredServer || serverFromApiUrl(configuredApiUrl));
}

function getDiscoveryHost() {
  if (configuredServer) {
    try {
      const { hostname } = new URL(configuredServer);
      if (LOCAL_HOSTS.has(hostname)) return hostname;
    } catch {
      // Dùng hostname của frontend hoặc localhost.
    }
  }

  if (typeof window !== 'undefined' && LOCAL_HOSTS.has(window.location.hostname)) {
    return window.location.hostname;
  }

  return 'localhost';
}

async function probeServer(serverUrl) {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(`${serverUrl}${API_PATH}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) return false;

    const payload = await response.json();

    return (
      payload?.success === true &&
      payload?.data?.service === 'dothihoalac-api' &&
      payload?.data?.status === 'ok'
    );
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

async function discoverLocalBackend() {
  const host = getDiscoveryHost();
  const candidates = [];

  for (let offset = 0; offset < PORT_SCAN_LIMIT; offset += 1) {
    const port = START_PORT + offset;
    if (port > 65535) break;
    candidates.push(`http://${host}:${port}`);
  }

  const matches = await Promise.all(
    candidates.map(async (serverUrl) => ((await probeServer(serverUrl)) ? serverUrl : null)),
  );
  const winner = matches.find(Boolean);

  if (!winner) {
    const endPort = Math.min(65535, START_PORT + PORT_SCAN_LIMIT - 1);
    throw new Error(
      `Không tìm thấy DTHL API trong dải cổng ${START_PORT}-${endPort}. Hãy kiểm tra server đã chạy chưa.`,
    );
  }

  resolvedServerUrl = winner;
  resolvedApiUrl = `${winner}${API_PATH}`;
  forceRuntimeDiscovery = false;

  if (import.meta.env.VITE_DEBUG_API === 'true') {
    console.info(`[DTHL API] Backend: ${resolvedApiUrl}`);
  }

  return { serverUrl: resolvedServerUrl, apiUrl: resolvedApiUrl };
}

async function resolveBackend() {
  if (resolvedServerUrl && resolvedApiUrl) {
    return { serverUrl: resolvedServerUrl, apiUrl: resolvedApiUrl };
  }

  if (!shouldAutoDiscover()) {
    const serverUrl = configuredServer || serverFromApiUrl(configuredApiUrl);
    const apiUrl = configuredApiUrl || (serverUrl ? `${serverUrl}${API_PATH}` : '');

    if (!serverUrl || !apiUrl) {
      throw new Error('Thiếu cấu hình VITE_API_URL hoặc VITE_SERVER_URL.');
    }

    resolvedServerUrl = serverUrl;
    resolvedApiUrl = apiUrl;
    return { serverUrl, apiUrl };
  }

  return discoverLocalBackend();
}

function getDiscoveryPromise() {
  if (!discoveryPromise) {
    discoveryPromise = resolveBackend().catch((error) => {
      discoveryPromise = null;
      throw error;
    });
  }

  return discoveryPromise;
}

export async function resolveApiBaseUrl() {
  return (await getDiscoveryPromise()).apiUrl;
}

export function getResolvedServerBaseUrl() {
  if (resolvedServerUrl) return resolvedServerUrl;
  if (configuredServer) return configuredServer;
  return `http://${getDiscoveryHost()}:${START_PORT}`;
}

export function resetBackendDiscovery() {
  if (!import.meta.env.DEV) return;
  resolvedServerUrl = '';
  resolvedApiUrl = '';
  discoveryPromise = null;
  forceRuntimeDiscovery = true;
}
