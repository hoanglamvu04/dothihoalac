import { getDatabaseState } from '../../config/database.js';
import { checkDatabaseReadiness } from './readiness.service.js';
import { env } from '../../config/env.js';
import { sendSuccess } from '../../utils/apiResponse.js';
export async function health(_req, res) {
  return sendSuccess(res, {
    data: {
      service: 'dothihoalac-api',
      status: 'ok',
      environment: env.NODE_ENV,
      database: getDatabaseState(),
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Readiness is deliberately stricter than /health (liveness). A proxy or
 * deployment must never mark a disconnected MongoDB service healthy.
 */
export async function readiness(_req, res) {
  res.set('Cache-Control', 'no-store');
  const result = await checkDatabaseReadiness();
  const data = {
    service: 'dothihoalac-api',
    ...result,
    timestamp: new Date().toISOString(),
  };

  if (result.status !== 'ok') {
    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable',
      data,
    });
  }
  return sendSuccess(res, { data });
}
