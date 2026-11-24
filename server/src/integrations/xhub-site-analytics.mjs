import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { createXHubAnalyticsBridge } from './xhub-express-bridge.mjs';
import { validateXHubSiteBatch } from './xhub-site-event-validation.mjs';
import { recordConsentedMetricEvents } from './xhub-consented-metrics.mjs';

/**
 * Strictly opt-in public endpoint. The website backend owns the bearer token
 * and NEVER exposes it to React or returns it in an error.
 */
export function createXHubSiteAnalyticsRouter({
  enabled = false,
  mode = 'push',
  storeBatch = recordConsentedMetricEvents,
  siteId = '',
  siteToken = '',
  publicHost = '',
  send,
  limit = 30,
  windowMs = 60000,
} = {}) {
  const router = Router();
  if (!enabled) return router; // No route when the operator has not approved it.

  let bridge = null;
  try {
    if (mode === 'push') bridge = createXHubAnalyticsBridge({
      siteId,
      siteToken,
      publicHost,
      ...(send ? { send } : {}),
    });
  } catch {
    // Misconfigured secrets must not prevent the website from booting or
    // accidentally enable an unauthenticated forwarding endpoint.
  }

  const limiter = rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many analytics requests',
    },
  });

  // Dedicated 16 KB parser executes BEFORE the website's general 2 MB parser.
  router.post('/', limiter, express.json({ limit: '16kb', strict: true }), async (req, res) => {
    res.set('Cache-Control', 'no-store');

    if (!['push', 'local'].includes(mode) ||
      !/^[a-z0-9.-]{3,253}$/.test(publicHost) ||
      (mode === 'push' && !bridge)) {
      return res.status(503).json({ error: 'Analytics source not configured' });
    }

    const expectedOrigin = 'https://' + publicHost;
    const origin = req.get('Origin');
    const fetchSite = req.get('Sec-Fetch-Site');
    if (origin !== expectedOrigin ||
      (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none')) {
      return res.status(403).json({ error: 'Analytics origin not allowed' });
    }

    // Server-side privacy signals also override any untrusted consent flag.
    if (req.get('DNT') === '1' || req.get('Sec-GPC') === '1') {
      return res.status(403).json({ error: 'Privacy preference denies tracking' });
    }

    if (!req.is('application/json')) {
      return res.status(400).json({ error: 'JSON body required' });
    }

    const safeBody = validateXHubSiteBatch(req.body);
    if (!safeBody) {
      return res.status(400).json({ error: 'Invalid analytics event batch' });
    }

    // Forward ONLY the allowlisted copy. Do not copy req.ip, req.user, raw
    // referrer, cookies, Authorization, custom fields or original input.
    if (mode === 'local') {
      try {
        await storeBatch(safeBody.events);
        return res.status(202).json({ accepted: true });
      } catch {
        return res.status(503).json({ error: 'Consented analytics source unavailable' });
      }
    }
    req.body = safeBody;
    return bridge(req, res);
  });

  return router;
}
