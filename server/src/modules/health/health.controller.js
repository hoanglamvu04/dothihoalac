import { getDatabaseState } from '../../config/database.js';
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
