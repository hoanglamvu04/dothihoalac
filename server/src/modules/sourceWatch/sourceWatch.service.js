import SourceWatchItem from './sourceWatch.item.model.js';
import SourceWatchSource from './sourceWatch.source.model.js';
import {
  assertPublicHttpUrl,
  fetchArticleSnapshot,
  fetchSourceCandidates,
  fingerprintFor,
} from './sourceWatch.fetcher.js';

function text(value = '', max = 4000) {
  return String(value || '').normalize('NFC').trim().slice(0, max);
}

function number(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function normalizeType(value) {
  const type = text(value, 30).toLowerCase();
  if (!['rss', 'web', 'facebook'].includes(type)) {
    throw new Error('SOURCE_TYPE_INVALID');
  }
  return type;
}

async function normalizedSourcePayload(payload = {}, { partial = false } = {}) {
  const next = {};

  if (!partial || payload.name !== undefined) {
    const name = text(payload.name, 160);
    if (!name) throw new Error('SOURCE_NAME_REQUIRED');
    next.name = name;
  }

  if (!partial || payload.type !== undefined) {
    next.type = normalizeType(payload.type);
  }

  if (!partial || payload.url !== undefined) {
    const rawUrl = text(payload.url, 3000);
    if (!rawUrl) throw new Error('SOURCE_URL_REQUIRED');
    const url = await assertPublicHttpUrl(rawUrl);
    next.url = url.toString();
  }

  if (payload.includePath !== undefined) {
    next.includePath = text(payload.includePath, 500);
  }

  if (payload.facebookPageId !== undefined) {
    next.facebookPageId = text(payload.facebookPageId, 120);
  }

  if (payload.enabled !== undefined) {
    next.enabled = Boolean(payload.enabled);
  }

  if (!partial || payload.intervalMinutes !== undefined) {
    next.intervalMinutes = number(payload.intervalMinutes, 15, 5, 1440);
  }

  return next;
}

function nextCheckDate(source, base = Date.now()) {
  return new Date(base + number(source.intervalMinutes, 15, 5, 1440) * 60 * 1000);
}

export async function overview() {
  const [totalSources, activeSources, newItems, lastItem, checkingSources] = await Promise.all([
    SourceWatchSource.countDocuments(),
    SourceWatchSource.countDocuments({ enabled: true }),
    SourceWatchItem.countDocuments({ status: 'new' }),
    SourceWatchItem.findOne().sort({ discoveredAt: -1 }).select('discoveredAt title').lean(),
    SourceWatchSource.countDocuments({ status: 'checking' }),
  ]);

  return {
    totalSources,
    activeSources,
    newItems,
    checkingSources,
    lastItem,
    facebookConfigured: Boolean(text(process.env.FACEBOOK_GRAPH_ACCESS_TOKEN, 10)),
    workerEnabled: String(process.env.SOURCE_WATCH_ENABLED || 'true').toLowerCase() !== 'false',
  };
}

export async function listSources() {
  return SourceWatchSource.find()
    .sort({ enabled: -1, createdAt: -1 })
    .lean();
}

export async function createSource(userId, payload) {
  const data = await normalizedSourcePayload(payload);
  const source = await SourceWatchSource.create({
    ...data,
    createdBy: userId || null,
    nextCheckAt: new Date(),
  });
  return source.toObject();
}

export async function updateSource(id, payload) {
  const source = await SourceWatchSource.findById(id);
  if (!source) throw new Error('SOURCE_NOT_FOUND');

  const data = await normalizedSourcePayload(payload, { partial: true });
  Object.assign(source, data);
  if (payload.enabled === true && !source.nextCheckAt) {
    source.nextCheckAt = new Date();
  }
  await source.save();
  return source.toObject();
}

export async function listItems(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 40));
  const filter = {};

  if (query.status && ['baseline', 'new', 'reviewed', 'ignored'].includes(query.status)) {
    filter.status = query.status;
  }
  if (query.sourceId) filter.sourceId = query.sourceId;

  const [items, total] = await Promise.all([
    SourceWatchItem.find(filter)
      .populate('sourceId', 'name type url')
      .sort({ publishedAt: -1, discoveredAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SourceWatchItem.countDocuments(filter),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function updateItemStatus(id, status) {
  if (!['new', 'reviewed', 'ignored'].includes(status)) {
    throw new Error('SOURCE_ITEM_STATUS_INVALID');
  }

  const before = await SourceWatchItem.findById(id).select('sourceId status').lean();
  if (!before) throw new Error('SOURCE_ITEM_NOT_FOUND');

  const item = await SourceWatchItem.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true },
  ).lean();

  if (before.status === 'new' && status !== 'new') {
    await SourceWatchSource.findByIdAndUpdate(before.sourceId, {
      $inc: { 'stats.newItems': -1 },
    });
  } else if (before.status !== 'new' && status === 'new') {
    await SourceWatchSource.findByIdAndUpdate(before.sourceId, {
      $inc: { 'stats.newItems': 1 },
    });
  }

  return item;
}

async function enrichWebCandidate(source, candidate) {
  if (source.type !== 'web') return candidate;
  try {
    const snapshot = await fetchArticleSnapshot(candidate.url);
    if (!snapshot) return candidate;
    return {
      ...candidate,
      ...snapshot,
      externalId: candidate.externalId || snapshot.url,
    };
  } catch {
    return candidate;
  }
}

async function saveCandidate(source, candidate, baseline) {
  const fingerprint = fingerprintFor(source, candidate);
  const existing = await SourceWatchItem.exists({
    sourceId: source._id,
    fingerprint,
  });
  if (existing) return { created: false, item: null };

  const enriched = await enrichWebCandidate(source, candidate);
  try {
    const item = await SourceWatchItem.create({
      sourceId: source._id,
      fingerprint,
      externalId: text(enriched.externalId, 1000),
      url: text(enriched.url, 4000),
      title: text(enriched.title, 1000),
      excerpt: text(enriched.excerpt, 4000),
      contentText: text(enriched.contentText, 30000),
      contentHtml: String(enriched.contentHtml || '').normalize('NFC').slice(0, 80000),
      mediaUrls: [...new Set(
        (Array.isArray(enriched.mediaUrls) ? enriched.mediaUrls : [])
          .map((url) => text(url, 4000))
          .filter(Boolean),
      )].slice(0, 20),
      author: text(enriched.author, 300),
      publishedAt: enriched.publishedAt || null,
      discoveredAt: new Date(),
      status: baseline ? 'baseline' : 'new',
      sourceMeta: {
        sourceType: source.type,
      },
    });
    return { created: true, item };
  } catch (error) {
    if (error?.code === 11000) return { created: false, item: null };
    throw error;
  }
}

export async function checkSource(id) {
  const source = await SourceWatchSource.findById(id);
  if (!source) throw new Error('SOURCE_NOT_FOUND');
  if (source.status === 'checking') {
    return { source: source.toObject(), created: 0, alreadyChecking: true };
  }

  source.status = 'checking';
  source.lastCheckedAt = new Date();
  source.lastError = '';
  await source.save();

  const baseline = !source.lastSuccessAt;
  let created = 0;
  let newestAt = source.lastItemAt || null;

  try {
    const fetched = await fetchSourceCandidates(source.toObject());

    for (const candidate of fetched.items) {
      if (!candidate?.url) continue;
      const result = await saveCandidate(source, candidate, baseline);
      if (!result.created) continue;
      created += 1;
      const itemDate = result.item?.publishedAt || result.item?.discoveredAt;
      if (itemDate && (!newestAt || itemDate > newestAt)) newestAt = itemDate;
    }

    source.status = 'ok';
    source.lastSuccessAt = new Date();
    source.nextCheckAt = nextCheckDate(source);
    source.lastError = '';
    source.httpEtag = text(fetched.etag, 500);
    source.httpLastModified = text(fetched.lastModified, 500);
    if (newestAt) source.lastItemAt = newestAt;
    source.stats.totalItems = Number(source.stats?.totalItems || 0) + created;
    if (!baseline) {
      source.stats.newItems = Number(source.stats?.newItems || 0) + created;
    }
    await source.save();

    return {
      source: source.toObject(),
      created,
      baseline,
      notModified: Boolean(fetched.notModified),
    };
  } catch (error) {
    source.status = 'error';
    source.lastError = text(error?.message || error, 2000);
    source.nextCheckAt = nextCheckDate(source);
    await source.save();
    throw error;
  }
}

export async function runDueSources(limit = 3) {
  const now = new Date();
  const sources = await SourceWatchSource.find({
    enabled: true,
    status: { $ne: 'checking' },
    $or: [
      { nextCheckAt: null },
      { nextCheckAt: { $lte: now } },
    ],
  })
    .sort({ nextCheckAt: 1, createdAt: 1 })
    .limit(Math.max(1, Math.min(10, limit)))
    .select('_id')
    .lean();

  const results = [];
  for (const source of sources) {
    try {
      results.push(await checkSource(source._id));
    } catch (error) {
      results.push({ sourceId: String(source._id), error: text(error?.message || error, 500) });
    }
  }
  return results;
}
