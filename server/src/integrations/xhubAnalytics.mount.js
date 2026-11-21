import express from 'express';
import { rateLimit } from 'express-rate-limit';

import { createXHubAnalyticsBridge } from './xhub-express-bridge.mjs';

/**
 * Add-on route, isolated from /api/v1. Disabled unless a trusted operator
 * enables it AND provisions a valid site ID, token and approved public host.
 *
 * Never pass secrets to Vite or attempt to provision a source automatically.
 */
export function mountXHubAnalytics(app, config = {}, options = {}) {
  if (config.XHUB_WEB_ANALYTICS_ENABLED !== true) return false;

  let bridge;
  try {
    bridge = createXHubAnalyticsBridge({
      siteId: config.XHUB_WEB_ANALYTICS_SITE_ID,
      siteToken: config.XHUB_WEB_ANALYTICS_SITE_TOKEN,
      publicHost: config.XHUB_WEB_ANALYTICS_PUBLIC_HOST,
      baseUrl: 'https://hub.holaspace.vn',
      ...(options.send ? { send: options.send } : {}),
      ...(options.allowLocalhost ? { allowLocalhost: true } : {}),
    });
  } catch {
    // Misconfigured integration must not take down CMS, CRM or authentication.
    // Deliberately do NOT log the ID, token, host, or error details.
    options.onDisabled?.();
    return false;
  }

  const limiter = rateLimit({
    windowMs: 60_000,
    limit: options.rateLimit ?? 40,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Analytics request rate limited' },
  });

  // This 16 KB parser runs BEFORE the application's general 2 MB JSON parser.
  // A browser cannot upload an oversized analytics batch to this route.
  app.post(
    '/api/xhub-analytics',
    limiter,
    express.json({ limit: '16kb', strict: true }),
    bridge,
  );

  // Keep malformed JSON and oversized payload errors on this route private.
  app.use('/api/xhub-analytics', (error, _req, res, next) => {
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Analytics batch too large' });
    }
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid analytics JSON' });
    }
    return next(error);
  });

  return true;
}
