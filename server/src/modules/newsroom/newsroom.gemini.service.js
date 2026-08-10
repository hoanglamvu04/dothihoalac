import { env } from '../../config/env.js';
import {
  DEFAULT_SCOUT_QUERIES,
  editorPrompt,
  factCheckGroundedPrompt,
  factCheckNormalizePrompt,
  researchNormalizePrompt,
  researcherPrompt,
  scoutNormalizePrompt,
  scoutSearchPrompt,
  writerPrompt,
} from './newsroom.prompts.js';

const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';

const scoutSchema = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          event_title: { type: 'string' },
          event_started_at: { type: 'string' },
          source_published_at: { type: 'string' },
          location: { type: 'string' },
          summary_3_lines: { type: 'string' },
          why_it_matters: { type: 'string' },
          people: { type: 'array', items: { type: 'string' } },
          organizations: { type: 'array', items: { type: 'string' } },
          numbers: { type: 'array', items: { type: 'string' } },
          possible_angles: { type: 'array', items: { type: 'string' } },
          source_urls: { type: 'array', items: { type: 'string' } },
          source_titles: { type: 'array', items: { type: 'string' } },
          freshness_score: { type: 'integer' },
          importance_score: { type: 'integer' },
          recommendation: {
            type: 'string',
            enum: ['WRITE_NOW', 'MONITOR', 'IGNORE'],
          },
          cluster_key: { type: 'string' },
        },
        required: [
          'event_title',
          'event_started_at',
          'source_published_at',
          'location',
          'summary_3_lines',
          'why_it_matters',
          'people',
          'organizations',
          'numbers',
          'possible_angles',
          'source_urls',
          'source_titles',
          'freshness_score',
          'importance_score',
          'recommendation',
          'cluster_key',
        ],
      },
    },
  },
  required: ['candidates'],
};

const researchSchema = {
  type: 'object',
  properties: {
    ARTICLE_ID: { type: 'string' },
    EVENT: { type: 'string' },
    TIME: { type: 'string' },
    LOCATION: { type: 'string' },
    SUMMARY_3_LINES: { type: 'string' },
    WHY_IT_MATTERS: { type: 'string' },
    FACTS: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fact: { type: 'string' },
          source_urls: { type: 'array', items: { type: 'string' } },
        },
        required: ['fact', 'source_urls'],
      },
    },
    NUMBERS: { type: 'array', items: { type: 'string' } },
    PEOPLE: { type: 'array', items: { type: 'string' } },
    ORGANIZATIONS: { type: 'array', items: { type: 'string' } },
    SOURCES: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          title: { type: 'string' },
          publisher: { type: 'string' },
          published_at: { type: 'string' },
        },
        required: ['url', 'title', 'publisher', 'published_at'],
      },
    },
    CONFLICTS: { type: 'array', items: { type: 'string' } },
    UNKNOWN: { type: 'array', items: { type: 'string' } },
    POSSIBLE_ANGLES: { type: 'array', items: { type: 'string' } },
    FRESHNESS_SCORE: { type: 'integer' },
    IMPORTANCE_SCORE: { type: 'integer' },
    RECOMMENDATION: {
      type: 'string',
      enum: ['WRITE_NOW', 'MONITOR', 'IGNORE'],
    },
  },
  required: [
    'ARTICLE_ID',
    'EVENT',
    'TIME',
    'LOCATION',
    'SUMMARY_3_LINES',
    'WHY_IT_MATTERS',
    'FACTS',
    'NUMBERS',
    'PEOPLE',
    'ORGANIZATIONS',
    'SOURCES',
    'CONFLICTS',
    'UNKNOWN',
    'POSSIBLE_ANGLES',
    'FRESHNESS_SCORE',
    'IMPORTANCE_SCORE',
    'RECOMMENDATION',
  ],
};

const editorSchema = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['IGNORE', 'MONITOR', 'WRITE'] },
    reason: { type: 'string' },
    brief: {
      type: 'object',
      properties: {
        ARTICLE_ID: { type: 'string' },
        CATEGORY: { type: 'string' },
        PRIORITY: { type: 'string' },
        TARGET_READER: { type: 'string' },
        MAIN_TOPIC: { type: 'string' },
        NEWS_ANGLE: { type: 'string' },
        KEY_FACTS: { type: 'array', items: { type: 'string' } },
        BACKGROUND: { type: 'array', items: { type: 'string' } },
        IMPORTANT_NAMES: { type: 'array', items: { type: 'string' } },
        NUMBERS: { type: 'array', items: { type: 'string' } },
        DATES: { type: 'array', items: { type: 'string' } },
        LOCATION: { type: 'string' },
        SOURCES: { type: 'array', items: { type: 'string' } },
        HEADLINE_DIRECTION: { type: 'string' },
        ARTICLE_STRUCTURE: { type: 'array', items: { type: 'string' } },
        FACTS_THAT_MUST_NOT_BE_CHANGED: { type: 'array', items: { type: 'string' } },
        UNKNOWN_OR_UNCONFIRMED: { type: 'array', items: { type: 'string' } },
        STATUS: { type: 'string' },
      },
      required: [
        'ARTICLE_ID',
        'CATEGORY',
        'PRIORITY',
        'TARGET_READER',
        'MAIN_TOPIC',
        'NEWS_ANGLE',
        'KEY_FACTS',
        'BACKGROUND',
        'IMPORTANT_NAMES',
        'NUMBERS',
        'DATES',
        'LOCATION',
        'SOURCES',
        'HEADLINE_DIRECTION',
        'ARTICLE_STRUCTURE',
        'FACTS_THAT_MUST_NOT_BE_CHANGED',
        'UNKNOWN_OR_UNCONFIRMED',
        'STATUS',
      ],
    },
  },
  required: ['decision', 'reason', 'brief'],
};

const writerSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    sapo: { type: 'string' },
    body_html: { type: 'string' },
    seo_title: { type: 'string' },
    meta_description: { type: 'string' },
    excerpt: { type: 'string' },
    keywords: { type: 'array', items: { type: 'string' } },
    featured_image_brief: { type: 'string' },
    image_alt: { type: 'string' },
    source_references: { type: 'array', items: { type: 'string' } },
    facts_needing_recheck: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'title',
    'sapo',
    'body_html',
    'seo_title',
    'meta_description',
    'excerpt',
    'keywords',
    'featured_image_brief',
    'image_alt',
    'source_references',
    'facts_needing_recheck',
  ],
};

const factCheckSchema = {
  type: 'object',
  properties: {
    FACT_SCORE: { type: 'integer' },
    ORIGINALITY_SCORE: { type: 'integer' },
    EDITORIAL_SCORE: { type: 'integer' },
    ERRORS: { type: 'array', items: { type: 'string' } },
    REQUIRED_FIXES: { type: 'array', items: { type: 'string' } },
    STATUS: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
  },
  required: [
    'FACT_SCORE',
    'ORIGINALITY_SCORE',
    'EDITORIAL_SCORE',
    'ERRORS',
    'REQUIRED_FIXES',
    'STATUS',
  ],
};

function ensureConfigured() {
  if (!env.NEWSROOM_AI_ENABLED) {
    throw new Error('NEWSROOM_AI_DISABLED');
  }
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
}

function modelUrl(model) {
  return `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`;
}

function responseText(data) {
  return (data?.candidates?.[0]?.content?.parts || [])
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
}

function cleanJsonText(value = '') {
  return String(value)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseStructured(text, label) {
  try {
    return JSON.parse(cleanJsonText(text));
  } catch (error) {
    throw new Error(`${label}_INVALID_JSON: ${error.message}`);
  }
}

function groundingSources(data) {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const items = [];
  const seen = new Set();

  for (const chunk of chunks) {
    const web = chunk?.web;
    const url = String(web?.uri || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    items.push({
      url,
      title: String(web?.title || '').trim(),
    });
  }

  return items;
}

async function requestGemini({
  model,
  prompt,
  tools = [],
  responseSchema = null,
  timeoutMs = 90000,
}) {
  ensureConfigured();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  };

  if (tools.length) {
    payload.tools = tools;
  }

  if (responseSchema) {
    payload.generationConfig = {
      response_mime_type: 'application/json',
      response_schema: responseSchema,
      temperature: 0.15,
    };
  }

  try {
    const response = await fetch(modelUrl(model), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        data?.error?.message ||
        `Gemini API HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.code = data?.error?.status || 'GEMINI_API_ERROR';
      throw error;
    }

    const text = responseText(data);
    if (!text) {
      throw new Error('Gemini API không trả về nội dung.');
    }

    return {
      text,
      data,
      model,
      usage: data?.usageMetadata || null,
      sources: groundingSources(data),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function structured({ model, prompt, schema }) {
  const result = await requestGemini({
    model,
    prompt,
    responseSchema: schema,
  });

  return {
    ...result,
    value: parseStructured(result.text, 'GEMINI_STRUCTURED_OUTPUT'),
  };
}

function sourceLines(items = []) {
  return items
    .map((item) => `- ${item.title || 'Nguồn'}: ${item.url}`)
    .join('\n');
}

function uniqueUrls(story) {
  return [...new Set(
    (story?.sources || [])
      .map((item) => String(item?.url || '').trim())
      .filter((url) => /^https?:\/\//i.test(url)),
  )].slice(0, 8);
}

function scoutQueries() {
  const configured = String(env.NEWSROOM_SCOUT_QUERIES || '')
    .split('||')
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_SCOUT_QUERIES;
}

export async function runScout() {
  const reports = [];
  const allSources = [];
  const usage = [];

  for (const query of scoutQueries()) {
    const result = await requestGemini({
      model: env.GEMINI_SCOUT_MODEL,
      prompt: scoutSearchPrompt(query, env.NEWSROOM_SCOUT_ITEMS_PER_QUERY),
      tools: [{ google_search: {} }],
      timeoutMs: env.NEWSROOM_GEMINI_TIMEOUT_MS,
    });

    reports.push(`TRUY VẤN: ${query}\n${result.text}`);
    allSources.push(...result.sources);
    usage.push(result.usage);
  }

  const uniqueSources = [];
  const seen = new Set();
  for (const source of allSources) {
    if (!source.url || seen.has(source.url)) continue;
    seen.add(source.url);
    uniqueSources.push(source);
  }

  const normalized = await structured({
    model: env.GEMINI_EDITOR_MODEL,
    prompt: scoutNormalizePrompt({
      reports: reports.join('\n\n---\n\n'),
      sources: sourceLines(uniqueSources),
      maxCandidates: env.NEWSROOM_MAX_CANDIDATES_PER_RUN,
    }),
    schema: scoutSchema,
  });

  return {
    candidates: Array.isArray(normalized.value?.candidates)
      ? normalized.value.candidates
      : [],
    groundingSources: uniqueSources,
    model: `${env.GEMINI_SCOUT_MODEL} + ${env.GEMINI_EDITOR_MODEL}`,
    usage: [...usage, normalized.usage],
  };
}

export async function runResearch(story) {
  const urls = uniqueUrls(story);
  const tools = [{ google_search: {} }];
  if (urls.length) tools.push({ url_context: {} });

  let grounded;
  try {
    grounded = await requestGemini({
      model: env.GEMINI_RESEARCH_MODEL,
      prompt: researcherPrompt(story, urls),
      tools,
      timeoutMs: env.NEWSROOM_GEMINI_TIMEOUT_MS,
    });
  } catch (error) {
    if (!urls.length) throw error;
    grounded = await requestGemini({
      model: env.GEMINI_RESEARCH_MODEL,
      prompt: researcherPrompt(story, []),
      tools: [{ google_search: {} }],
      timeoutMs: env.NEWSROOM_GEMINI_TIMEOUT_MS,
    });
  }

  const normalized = await structured({
    model: env.GEMINI_EDITOR_MODEL,
    prompt: researchNormalizePrompt({
      story,
      groundedText: grounded.text,
      groundingSources: sourceLines(grounded.sources),
    }),
    schema: researchSchema,
  });

  return {
    packet: normalized.value,
    groundingSources: grounded.sources,
    model: `${env.GEMINI_RESEARCH_MODEL} + ${env.GEMINI_EDITOR_MODEL}`,
    usage: [grounded.usage, normalized.usage],
  };
}

export async function runEditor(story) {
  const result = await structured({
    model: env.GEMINI_EDITOR_MODEL,
    prompt: editorPrompt(story),
    schema: editorSchema,
  });

  return {
    ...result.value,
    model: result.model,
    usage: result.usage,
  };
}

export async function runWriter(story) {
  const result = await structured({
    model: env.GEMINI_WRITER_MODEL,
    prompt: writerPrompt(story),
    schema: writerSchema,
  });

  return {
    draft: result.value,
    model: result.model,
    usage: result.usage,
  };
}

export async function runFactCheck(story) {
  const urls = uniqueUrls(story);
  const tools = [{ google_search: {} }];
  if (urls.length) tools.push({ url_context: {} });

  let grounded;
  try {
    grounded = await requestGemini({
      model: env.GEMINI_FACTCHECK_MODEL,
      prompt: factCheckGroundedPrompt(story, urls),
      tools,
      timeoutMs: env.NEWSROOM_GEMINI_TIMEOUT_MS,
    });
  } catch (error) {
    if (!urls.length) throw error;
    grounded = await requestGemini({
      model: env.GEMINI_FACTCHECK_MODEL,
      prompt: factCheckGroundedPrompt(story, []),
      tools: [{ google_search: {} }],
      timeoutMs: env.NEWSROOM_GEMINI_TIMEOUT_MS,
    });
  }

  const normalized = await structured({
    model: env.GEMINI_EDITOR_MODEL,
    prompt: factCheckNormalizePrompt({
      story,
      groundedText: grounded.text,
      groundingSources: sourceLines(grounded.sources),
    }),
    schema: factCheckSchema,
  });

  return {
    check: normalized.value,
    groundingSources: grounded.sources,
    model: `${env.GEMINI_FACTCHECK_MODEL} + ${env.GEMINI_EDITOR_MODEL}`,
    usage: [grounded.usage, normalized.usage],
  };
}
