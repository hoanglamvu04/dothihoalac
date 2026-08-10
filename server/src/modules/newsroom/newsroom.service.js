import crypto from 'node:crypto';

import { env } from '../../config/env.js';
import { escapeRegex } from '../../utils/escapeRegex.js';
import * as articleService from '../articles/article.service.js';
import User from '../users/user.model.js';
import NewsroomStory from './newsroom.story.model.js';
import NewsroomTask from './newsroom.task.model.js';
import {
  runEditor,
  runFactCheck,
  runResearch,
  runScout,
  runWriter,
} from './newsroom.gemini.service.js';

const ACTIVE_TASK_STATUSES = ['queued', 'running'];
const PIPELINE_TASKS = [
  'RESEARCH',
  'EDITOR',
  'WRITE',
  'FACT_CHECK',
  'CREATE_PENDING_REVIEW',
];

function text(value = '', max = 5000) {
  return String(value || '').normalize('NFC').trim().slice(0, max);
}

function arrayOfText(values, maxItems = 50, maxLength = 1000) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => text(value, maxLength))
      .filter(Boolean),
  )].slice(0, maxItems);
}

function safeScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(10, Math.round(number)));
}

function safeDate(value) {
  const raw = text(value, 120);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeClusterKey(value, fallbackParts = []) {
  const raw = text(value || fallbackParts.filter(Boolean).join('-'), 500)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);

  if (raw.length >= 12) return raw;

  return `story-${crypto
    .createHash('sha1')
    .update(fallbackParts.join('|'))
    .digest('hex')
    .slice(0, 20)}`;
}

function createStoryCode(clusterKey) {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = crypto
    .createHash('sha1')
    .update(`${clusterKey}|${Date.now()}|${Math.random()}`)
    .digest('hex')
    .slice(0, 6)
    .toUpperCase();
  return `DTHL-AI-${stamp}-${suffix}`;
}

function normalizeSourceUrl(value) {
  const url = text(value, 4000);
  if (!/^https?:\/\//i.test(url)) return '';
  return url;
}

function mergeSources(...groups) {
  const result = [];
  const seen = new Set();

  for (const group of groups) {
    for (const source of Array.isArray(group) ? group : []) {
      const url = normalizeSourceUrl(source?.url || source);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      result.push({
        url,
        title: text(source?.title, 500),
        publisher: text(source?.publisher, 220),
        publishedAt: safeDate(source?.publishedAt || source?.published_at),
        accessedAt: new Date(),
        sourceType: text(source?.sourceType || 'web', 40),
        trustScore: Number.isFinite(Number(source?.trustScore))
          ? safeScore(source.trustScore)
          : null,
      });
    }
  }

  return result.slice(0, 30);
}

function candidateSources(candidate = {}) {
  const urls = Array.isArray(candidate.source_urls) ? candidate.source_urls : [];
  const titles = Array.isArray(candidate.source_titles) ? candidate.source_titles : [];
  return urls.map((url, index) => ({
    url,
    title: titles[index] || '',
    publishedAt: candidate.source_published_at || null,
    sourceType: 'web',
  }));
}

async function enqueueTask(type, {
  storyId = null,
  requestedBy = null,
  payload = {},
  runAt = new Date(),
  maxAttempts = 3,
  allowDuplicate = false,
} = {}) {
  if (!allowDuplicate) {
    const filter = {
      type,
      status: { $in: ACTIVE_TASK_STATUSES },
      ...(storyId ? { storyId } : { storyId: null }),
    };
    const existing = await NewsroomTask.findOne(filter).lean();
    if (existing) return existing;
  }

  return NewsroomTask.create({
    type,
    storyId,
    status: 'queued',
    runAt,
    maxAttempts,
    requestedBy: requestedBy || null,
    payload,
  });
}

export async function triggerScout(userId = null) {
  if (!env.NEWSROOM_AI_ENABLED) {
    throw new Error('NEWSROOM_AI_DISABLED');
  }
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return enqueueTask('SCOUT', { requestedBy: userId });
}

async function findStoryForCandidate(candidate) {
  const urls = candidateSources(candidate)
    .map((item) => normalizeSourceUrl(item.url))
    .filter(Boolean);

  if (urls.length) {
    const bySource = await NewsroomStory.findOne({
      'sources.url': { $in: urls },
    });
    if (bySource) return bySource;
  }

  const eventDate = safeDate(candidate.event_started_at);
  const clusterKey = normalizeClusterKey(candidate.cluster_key, [
    candidate.event_title,
    eventDate?.toISOString().slice(0, 10) || '',
    candidate.location,
  ]);

  return NewsroomStory.findOne({ clusterKey });
}

async function upsertCandidate(candidate) {
  const headline = text(candidate.event_title, 500);
  if (!headline) return null;

  const eventStartedAt = safeDate(candidate.event_started_at);
  const sourcePublishedAt = safeDate(candidate.source_published_at);
  const clusterKey = normalizeClusterKey(candidate.cluster_key, [
    headline,
    eventStartedAt?.toISOString().slice(0, 10) || '',
    candidate.location,
  ]);

  let story = await findStoryForCandidate({ ...candidate, cluster_key: clusterKey });
  const incomingSources = candidateSources(candidate);

  if (!story) {
    story = new NewsroomStory({
      storyCode: createStoryCode(clusterKey),
      clusterKey,
      headline,
      eventSummary: text(candidate.summary_3_lines, 3000),
      whyItMatters: text(candidate.why_it_matters, 3000),
      location: text(candidate.location, 300),
      eventStartedAt,
      latestSourcePublishedAt: sourcePublishedAt,
      people: arrayOfText(candidate.people, 30, 240),
      organizations: arrayOfText(candidate.organizations, 30, 300),
      numbers: arrayOfText(candidate.numbers, 40, 300),
      possibleAngles: arrayOfText(candidate.possible_angles, 20, 500),
      sources: mergeSources(incomingSources),
      freshnessScore: safeScore(candidate.freshness_score),
      importanceScore: safeScore(candidate.importance_score),
      recommendation: ['WRITE_NOW', 'MONITOR', 'IGNORE'].includes(candidate.recommendation)
        ? candidate.recommendation
        : 'MONITOR',
      status: candidate.recommendation === 'IGNORE' ? 'ignored' : 'discovered',
    });
    await story.save();
    return story;
  }

  story.sources = mergeSources(story.sources, incomingSources);
  story.headline = story.headline || headline;
  story.eventSummary = text(candidate.summary_3_lines, 3000) || story.eventSummary;
  story.whyItMatters = text(candidate.why_it_matters, 3000) || story.whyItMatters;
  story.location = text(candidate.location, 300) || story.location;
  story.eventStartedAt = story.eventStartedAt || eventStartedAt;
  if (
    sourcePublishedAt &&
    (!story.latestSourcePublishedAt || sourcePublishedAt > story.latestSourcePublishedAt)
  ) {
    story.latestSourcePublishedAt = sourcePublishedAt;
  }
  story.people = arrayOfText([...(story.people || []), ...(candidate.people || [])], 30, 240);
  story.organizations = arrayOfText([...(story.organizations || []), ...(candidate.organizations || [])], 30, 300);
  story.numbers = arrayOfText([...(story.numbers || []), ...(candidate.numbers || [])], 40, 300);
  story.possibleAngles = arrayOfText([...(story.possibleAngles || []), ...(candidate.possible_angles || [])], 20, 500);
  story.freshnessScore = Math.max(story.freshnessScore || 0, safeScore(candidate.freshness_score));
  story.importanceScore = Math.max(story.importanceScore || 0, safeScore(candidate.importance_score));
  if (story.status === 'discovered') {
    story.recommendation = ['WRITE_NOW', 'MONITOR', 'IGNORE'].includes(candidate.recommendation)
      ? candidate.recommendation
      : story.recommendation;
  }
  await story.save();
  return story;
}

async function handleScout(task) {
  const result = await runScout();
  const stories = [];

  for (const candidate of result.candidates) {
    const story = await upsertCandidate(candidate);
    if (story) stories.push(story);
  }

  const eligible = stories
    .filter((story) =>
      story.status === 'discovered' &&
      story.recommendation !== 'IGNORE' &&
      story.freshnessScore + story.importanceScore >= env.NEWSROOM_MIN_SCOUT_SCORE,
    )
    .sort((a, b) =>
      (b.freshnessScore + b.importanceScore) -
      (a.freshnessScore + a.importanceScore),
    )
    .slice(0, env.NEWSROOM_MAX_RESEARCH_PER_RUN);

  for (const story of eligible) {
    await enqueueTask('RESEARCH', {
      storyId: story._id,
      requestedBy: task.requestedBy,
    });
  }

  return {
    result: {
      candidates: result.candidates.length,
      stories: stories.length,
      researchQueued: eligible.length,
    },
    model: result.model,
    usage: result.usage,
  };
}

async function loadStory(task) {
  if (!task.storyId) throw new Error('NEWSROOM_STORY_ID_REQUIRED');
  const story = await NewsroomStory.findById(task.storyId);
  if (!story) throw new Error('NEWSROOM_STORY_NOT_FOUND');
  return story;
}

async function handleResearch(task) {
  const story = await loadStory(task);
  story.status = 'researching';
  story.lastError = '';
  await story.save();

  const result = await runResearch(story.toObject());
  story.researchPacket = result.packet;
  story.sources = mergeSources(story.sources, result.groundingSources);
  story.status = 'researched';
  story.lastProcessedAt = new Date();
  await story.save();

  await enqueueTask('EDITOR', {
    storyId: story._id,
    requestedBy: task.requestedBy,
  });

  return {
    result: { storyCode: story.storyCode, status: story.status },
    model: result.model,
    usage: result.usage,
  };
}

async function handleEditor(task) {
  const story = await loadStory(task);
  if (!story.researchPacket) throw new Error('NEWSROOM_RESEARCH_PACKET_REQUIRED');

  const result = await runEditor(story.toObject());
  story.editorDecision = result.decision;
  story.articleBrief = result.brief || null;
  story.lastProcessedAt = new Date();

  if (result.decision === 'IGNORE') {
    story.status = 'ignored';
  } else if (result.decision === 'MONITOR') {
    story.status = 'monitor';
  } else {
    story.status = 'writing';
    await enqueueTask('WRITE', {
      storyId: story._id,
      requestedBy: task.requestedBy,
    });
  }

  await story.save();

  return {
    result: { decision: result.decision, reason: result.reason },
    model: result.model,
    usage: result.usage,
  };
}

async function handleWriter(task) {
  const story = await loadStory(task);
  if (!story.researchPacket || !story.articleBrief) {
    throw new Error('NEWSROOM_BRIEF_REQUIRED');
  }

  story.status = 'writing';
  await story.save();

  const result = await runWriter(story.toObject());
  story.draft = result.draft;
  story.status = 'drafted';
  story.lastProcessedAt = new Date();
  await story.save();

  await enqueueTask('FACT_CHECK', {
    storyId: story._id,
    requestedBy: task.requestedBy,
  });

  return {
    result: { title: result.draft?.title || story.headline },
    model: result.model,
    usage: result.usage,
  };
}

function isApprovedFactCheck(check) {
  return (
    check?.STATUS === 'APPROVED' &&
    Number(check?.FACT_SCORE || 0) >= env.NEWSROOM_MIN_FACT_SCORE &&
    Number(check?.ORIGINALITY_SCORE || 0) >= env.NEWSROOM_MIN_ORIGINALITY_SCORE &&
    Number(check?.EDITORIAL_SCORE || 0) >= env.NEWSROOM_MIN_EDITORIAL_SCORE
  );
}

async function handleFactCheck(task) {
  const story = await loadStory(task);
  if (!story.draft) throw new Error('NEWSROOM_DRAFT_REQUIRED');

  story.status = 'fact_check';
  await story.save();

  const result = await runFactCheck(story.toObject());
  story.factCheck = result.check;
  story.sources = mergeSources(story.sources, result.groundingSources);
  story.lastProcessedAt = new Date();

  if (isApprovedFactCheck(result.check)) {
    story.status = 'pending_review';
    await enqueueTask('CREATE_PENDING_REVIEW', {
      storyId: story._id,
      requestedBy: task.requestedBy,
    });
  } else {
    story.status = 'needs_revision';
  }

  await story.save();

  return {
    result: result.check,
    model: result.model,
    usage: result.usage,
  };
}

async function resolveAuthor(userId) {
  if (userId) {
    const requested = await User.findById(userId).select('_id').lean();
    if (requested) return requested;
  }
  return User.findOne({ email: env.ADMIN_EMAIL }).select('_id').lean();
}

function sourceNoteForStory(story) {
  const lines = (story.sources || [])
    .slice(0, 12)
    .map((source) => `${source.title || source.publisher || 'Nguồn'}: ${source.url}`)
    .filter(Boolean);
  return text(`NEWSROOM AI ${story.storyCode}\n${lines.join('\n')}`, 1900);
}

async function handleCreatePendingReview(task) {
  const story = await loadStory(task);
  if (story.cmsContentId) {
    return { result: { contentId: String(story.cmsContentId), reused: true } };
  }
  if (!story.draft || !isApprovedFactCheck(story.factCheck)) {
    throw new Error('NEWSROOM_ARTICLE_NOT_APPROVED');
  }

  const author = await resolveAuthor(task.requestedBy);
  if (!author?._id) throw new Error('NEWSROOM_ADMIN_USER_NOT_FOUND');

  const created = await articleService.adminCreate(author._id, {
    title: text(story.draft.title, 250),
    summary: text(story.draft.sapo || story.draft.excerpt, 1000),
    bodyHtml: String(story.draft.body_html || '').normalize('NFC'),
    status: 'pending_review',
    visibility: 'public',
    allowComments: true,
    articleType: 'news',
    sourceNote: sourceNoteForStory(story),
    factCheckedAt: new Date(),
    factCheckedBy: author._id,
  });

  story.cmsContentId = created._id;
  story.cmsStatus = 'pending_review';
  story.status = 'pending_review';
  story.lastProcessedAt = new Date();
  await story.save();

  return {
    result: {
      contentId: String(created._id),
      status: 'pending_review',
    },
  };
}

export async function executeTask(task) {
  switch (task.type) {
    case 'SCOUT':
      return handleScout(task);
    case 'RESEARCH':
      return handleResearch(task);
    case 'EDITOR':
      return handleEditor(task);
    case 'WRITE':
      return handleWriter(task);
    case 'FACT_CHECK':
      return handleFactCheck(task);
    case 'CREATE_PENDING_REVIEW':
      return handleCreatePendingReview(task);
    default:
      throw new Error(`NEWSROOM_TASK_UNSUPPORTED: ${task.type}`);
  }
}

export async function listStories(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.decision) filter.editorDecision = query.decision;

  const keyword = text(query.q, 200);
  if (keyword) {
    const regex = new RegExp(escapeRegex(keyword), 'i');
    filter.$or = [
      { headline: regex },
      { eventSummary: regex },
      { location: regex },
      { storyCode: regex },
    ];
  }

  const [items, total] = await Promise.all([
    NewsroomStory.find(filter)
      .sort({ createdAt: -1, importanceScore: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    NewsroomStory.countDocuments(filter),
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

export async function storyDetail(id) {
  const story = await NewsroomStory.findById(id).lean();
  if (!story) throw new Error('NEWSROOM_STORY_NOT_FOUND');
  const tasks = await NewsroomTask.find({ storyId: story._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  return { ...story, tasks };
}

export async function overview() {
  const [statusCounts, queued, running, lastScout] = await Promise.all([
    NewsroomStory.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    NewsroomTask.countDocuments({ status: 'queued' }),
    NewsroomTask.countDocuments({ status: 'running' }),
    NewsroomTask.findOne({ type: 'SCOUT', status: 'completed' })
      .sort({ finishedAt: -1 })
      .select('finishedAt result')
      .lean(),
  ]);

  return {
    enabled: env.NEWSROOM_AI_ENABLED,
    geminiConfigured: Boolean(env.GEMINI_API_KEY),
    workerIntervalSeconds: env.NEWSROOM_WORKER_INTERVAL_SECONDS,
    scoutIntervalMinutes: env.NEWSROOM_SCOUT_INTERVAL_MINUTES,
    models: {
      scout: env.GEMINI_SCOUT_MODEL,
      research: env.GEMINI_RESEARCH_MODEL,
      editor: env.GEMINI_EDITOR_MODEL,
      writer: env.GEMINI_WRITER_MODEL,
      factCheck: env.GEMINI_FACTCHECK_MODEL,
    },
    statusCounts: Object.fromEntries(statusCounts.map((item) => [item._id, item.count])),
    tasks: { queued, running },
    lastScout,
  };
}

export async function enqueueStoryPipeline(id, userId = null) {
  const story = await NewsroomStory.findById(id);
  if (!story) throw new Error('NEWSROOM_STORY_NOT_FOUND');

  let type = 'RESEARCH';
  if (story.researchPacket && !story.articleBrief) type = 'EDITOR';
  else if (story.articleBrief && !story.draft) type = 'WRITE';
  else if (story.draft && !isApprovedFactCheck(story.factCheck)) type = 'FACT_CHECK';
  else if (isApprovedFactCheck(story.factCheck) && !story.cmsContentId) type = 'CREATE_PENDING_REVIEW';
  else if (story.cmsContentId) {
    return { alreadyReady: true, contentId: String(story.cmsContentId) };
  }

  if (!PIPELINE_TASKS.includes(type)) throw new Error('NEWSROOM_PIPELINE_INVALID_STAGE');

  if (['ignored', 'monitor', 'needs_revision', 'error'].includes(story.status)) {
    story.status = type === 'RESEARCH' ? 'discovered' : story.status;
    story.lastError = '';
    await story.save();
  }

  const task = await enqueueTask(type, {
    storyId: story._id,
    requestedBy: userId,
  });

  return { task };
}

export async function claimNextTask() {
  return NewsroomTask.findOneAndUpdate(
    {
      status: 'queued',
      runAt: { $lte: new Date() },
    },
    {
      $set: { status: 'running', lockedAt: new Date(), error: '' },
      $inc: { attempts: 1 },
    },
    {
      sort: { runAt: 1, createdAt: 1 },
      new: true,
    },
  );
}

export async function completeTask(task, execution = {}) {
  task.status = 'completed';
  task.finishedAt = new Date();
  task.result = execution.result || null;
  task.usage = execution.usage || null;
  task.model = execution.model || '';
  task.error = '';
  await task.save();
}

export async function failTask(task, error) {
  const message = text(error?.message || error, 5000);
  const canRetry = task.attempts < task.maxAttempts;

  task.error = message;
  task.lockedAt = null;

  if (canRetry) {
    task.status = 'queued';
    task.runAt = new Date(Date.now() + Math.min(15 * 60 * 1000, 30_000 * 2 ** Math.max(0, task.attempts - 1)));
  } else {
    task.status = 'failed';
    task.finishedAt = new Date();
    if (task.storyId) {
      await NewsroomStory.findByIdAndUpdate(task.storyId, {
        $set: { status: 'error', lastError: message, lastProcessedAt: new Date() },
      }).catch(() => null);
    }
  }

  await task.save();
}

export async function recoverStaleTasks() {
  const staleBefore = new Date(Date.now() - env.NEWSROOM_TASK_LOCK_MINUTES * 60 * 1000);
  await NewsroomTask.updateMany(
    { status: 'running', lockedAt: { $lt: staleBefore } },
    { $set: { status: 'queued', lockedAt: null, runAt: new Date(), error: 'Recovered stale task lock.' } },
  );
}

export async function enqueueScheduledScoutIfDue() {
  if (!env.NEWSROOM_AI_ENABLED || !env.GEMINI_API_KEY) return null;

  const active = await NewsroomTask.exists({
    type: 'SCOUT',
    status: { $in: ACTIVE_TASK_STATUSES },
  });
  if (active) return null;

  const last = await NewsroomTask.findOne({
    type: 'SCOUT',
    status: 'completed',
  })
    .sort({ finishedAt: -1 })
    .select('finishedAt')
    .lean();

  const intervalMs = env.NEWSROOM_SCOUT_INTERVAL_MINUTES * 60 * 1000;
  if (last?.finishedAt && Date.now() - new Date(last.finishedAt).getTime() < intervalMs) {
    return null;
  }

  return enqueueTask('SCOUT');
}
