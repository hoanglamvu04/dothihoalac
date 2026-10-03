import { resolveApiBaseUrl } from '../api/runtime';

let initialized = false;
let sending = false;

function serializeReason(reason) {
  if (reason instanceof Error) {
    return {
      message: reason.message,
      stack: reason.stack || '',
    };
  }

  if (
    reason &&
    typeof reason === 'object'
  ) {
    return {
      message:
        reason.message ||
        JSON.stringify(reason),
      stack: reason.stack || '',
    };
  }

  return {
    message: String(reason || 'Unknown client error'),
    stack: '',
  };
}

export async function reportClientError(
  error,
  metadata = {},
) {
  if (sending) return;

  const normalized = serializeReason(error);

  try {
    sending = true;
    const base = await resolveApiBaseUrl();

    await fetch(
      `${base}/system/client-errors`,
      {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          message: normalized.message,
          stack: normalized.stack,
          route:
            window.location.pathname +
            window.location.search,
          url: window.location.href,
          userAgent:
            navigator.userAgent,
          viewport:
            `${window.innerWidth}x${window.innerHeight}`,
          metadata,
        }),
      },
    );
  } catch {
    // Telemetry must never break the app.
  } finally {
    sending = false;
  }
}

export function initializeClientTelemetry() {
  if (
    initialized ||
    typeof window === 'undefined'
  ) {
    return;
  }

  initialized = true;

  window.addEventListener('error', (event) => {
    void reportClientError(
      event.error ||
        new Error(event.message || 'Window error'),
      {
        kind: 'window.error',
        filename: event.filename || '',
        line: event.lineno || 0,
        column: event.colno || 0,
      },
    );
  });

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      void reportClientError(
        event.reason,
        {
          kind: 'unhandledrejection',
        },
      );
    },
  );
}
