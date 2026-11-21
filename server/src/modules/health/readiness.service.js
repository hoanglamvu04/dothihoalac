import mongoose from 'mongoose';

import { getDatabaseState } from '../../config/database.js';

const DEFAULT_TIMEOUT_MS = 2500;

/**
 * Readiness must validate that MongoDB accepts commands, not only that the
 * Node process is alive. The timeout is bounded even when driver selection
 * takes longer than the application can tolerate.
 */
export async function checkDatabaseReadiness({
  databaseState = getDatabaseState(),
  ping = async (signal) => {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection not available');
    const result = await db.admin().command(
      { ping: 1 },
      { maxTimeMS: DEFAULT_TIMEOUT_MS, signal },
    );
    if (result?.ok !== 1) throw new Error('MongoDB ping not acknowledged');
  },
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (databaseState !== 'connected') {
    return { status: 'degraded', database: databaseState };
  }

  const controller = new AbortController();
  let timeoutId;

  const deadline = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      resolve(false);
    }, timeoutMs);
  });

  // Handle rejection inside the promise, so a late rejection after the
  // deadline does not turn into an unhandled rejection.
  const probe = Promise.resolve()
    .then(() => ping(controller.signal))
    .then(() => true, () => false);

  let ok;
  try {
    ok = await Promise.race([probe, deadline]);
  } finally {
    clearTimeout(timeoutId);
    controller.abort();
  }

  return {
    status: ok ? 'ok' : 'degraded',
    database: ok ? 'connected' : 'unavailable',
  };
}
