// WA-005: independent, read-only, server-to-server pull contract.
// Never serve this response from GA4 or non-consented legacy metrics.
import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import {
  PULL_METRIC_NAMES,
  readConsentedMetricDays,
  vietnamCalendarDay,
} from './xhub-consented-metrics.mjs';

const KEY_FORMAT = /^[0-9a-fA-F]{64}$/;
const VALID_DAYS = new Set(['7', '30', '90']);
const SITE_CODE = 'dothihoalac';
const SITE_HOST = 'dothihoalac.vn';
const KEYS = Object.values(PULL_METRIC_NAMES);
const emptyCounts = () => Object.fromEntries(KEYS.map((key) => [key, 0]));

export function verifyPullKey(input, stored) {
  if (!KEY_FORMAT.test(stored || '')) return false;
  // Normalize both operands to exactly 32 bytes even for malformed input.
  const candidate = Buffer.from(
    KEY_FORMAT.test(input || '') ? input : '0'.repeat(64), 'hex');
  const actual = Buffer.from(stored, 'hex');
  const equal = timingSafeEqual(candidate, actual);
  return KEY_FORMAT.test(input || '') && equal;
}

function firstDay(today, days) {
  const [year, month, day] = today.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - days + 1))
    .toISOString().slice(0, 10);
}

export function buildPullSummary({ days, rows, generatedAt = new Date() }) {
  const timestamp = new Date(generatedAt);
  if (!Number.isFinite(timestamp.getTime()) || ![7, 30, 90].includes(days) ||
    !Array.isArray(rows)) throw new TypeError('Invalid aggregation input');
  const today = vietnamCalendarDay(timestamp);
  const start = firstDay(today, days);
  const perDay = new Map();
  for (const entry of rows) {
    if (!entry || typeof entry.day !== 'string' ||
      !/^\d{4}-\d\d-\d\d$/.test(entry.day) ||
      entry.day < start || entry.day > today ||
      !Object.prototype.hasOwnProperty.call(PULL_METRIC_NAMES, entry.name) ||
      !Number.isSafeInteger(entry.count) || entry.count < 0) {
      // Ignore unrelated dates, never incorporate unknown dimensions.
      if (entry?.day < start || entry?.day > today) continue;
      throw new TypeError('Invalid metric aggregate');
    }
    const totals = perDay.get(entry.day) || emptyCounts();
    const key = PULL_METRIC_NAMES[entry.name];
    if (!Number.isSafeInteger(totals[key] + entry.count)) {
      throw new RangeError('Invalid metric count');
    }
    totals[key] += entry.count;
    perDay.set(entry.day, totals);
  }
  const daily = [...perDay].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, counts]) => ({ day, ...counts }));
  const metrics = emptyCounts();
  for (const day of daily) {
    for (const key of KEYS) {
      if (!Number.isSafeInteger(metrics[key] + day[key])) {
        throw new RangeError('Invalid metric total');
      }
      metrics[key] += day[key];
    }
  }
  return {
    schemaVersion: 1,
    siteCode: SITE_CODE,
    siteHost: SITE_HOST,
    period: { days, timezone: 'Asia/Ho_Chi_Minh' },
    generatedAt: timestamp.toISOString(),
    privacy: { consent: 'explicit_opt_in', granularity: 'aggregate_only' },
    metrics,
    daily,
  };
}

export function createXHubPullAnalyticsRouter({
  enabled = false,
  sourceReady = false,
  key = '',
  readDaily = readConsentedMetricDays,
  now = () => new Date(),
  limit = 60,
} = {}) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });
  router.use(rateLimit({
    windowMs: 60000, limit,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Analytics read request rate limited' },
  }));
  router.use((req, res, next) => {
    // This router is mounted BEFORE general CORS middleware.
    // Reject browser fetch, preflight and any method except a server GET.
    if (req.get('Origin') || req.get('Sec-Fetch-Site') ||
      req.get('Access-Control-Request-Method') || req.method === 'OPTIONS') {
      return res.status(403).json({ error: 'Browser access denied' });
    }
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    next();
  });
  router.get('/', async (req, res) => {
    if (!enabled || !KEY_FORMAT.test(key)) {
      return res.status(503).json({ error: 'Analytics read source not configured' });
    }
    if (!verifyPullKey(req.get('X-XHub-Analytics-Key'), key)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const queryKeys = Object.keys(req.query || {});
    const daysText = req.query?.days;
    if (queryKeys.length !== 1 || queryKeys[0] !== 'days' ||
      typeof daysText !== 'string' || !VALID_DAYS.has(daysText)) {
      return res.status(400).json({ error: 'days must be 7, 30 or 90' });
    }
    if (!sourceReady) {
      return res.status(503).json({ error: 'Consented analytics source unavailable' });
    }
    try {
      const generatedAt = new Date(now());
      const today = vietnamCalendarDay(generatedAt);
      const days = Number(daysText);
      const rows = await readDaily({
        startDay: firstDay(today, days),
        endDay: today,
      });
      return res.status(200).json(buildPullSummary({ days, rows, generatedAt }));
    } catch {
      return res.status(503).json({ error: 'Consented analytics source unavailable' });
    }
  });
  return router;
}
