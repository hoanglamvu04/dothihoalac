// WA-005: consented local metrics only, never legacy GA4/CRM.
// Stored fields are deliberately limited to a hash for idempotency,
// a metric name, a Vietnam calendar day and retention metadata.
import { createHash } from 'node:crypto';
import mongoose from 'mongoose';

export const PULL_METRIC_NAMES = Object.freeze({
  page_view: 'pageViews',
  contact_click: 'contactClicks',
  lead_submitted: 'leadSubmissions',
});

const metricNames = Object.keys(PULL_METRIC_NAMES);
const schema = new mongoose.Schema({
  eventHash: { type: String, required: true, unique: true },
  name: { type: String, enum: metricNames, required: true },
  day: { type: String, required: true, match: /^\d{4}-\d\d-\d\d$/ },
  consent: { type: Boolean, required: true, immutable: true },
  receivedAt: { type: Date, required: true, immutable: true },
}, { collection: 'xhub_consented_metric_events', versionKey: false });
schema.index({ consent: 1, day: 1, name: 1 });
schema.index({ receivedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
const ConsentedMetricEvent = mongoose.models.XHubConsentedMetricEvent ||
  mongoose.model('XHubConsentedMetricEvent', schema);

const vnFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric',
  month: '2-digit', day: '2-digit',
});

export function vietnamCalendarDay(value = new Date()) {
  const parts = Object.fromEntries(
    vnFormatter.formatToParts(new Date(value))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return parts.year + '-' + parts.month + '-' + parts.day;
}

function ensureConnected() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Consented analytics source unavailable');
  }
}

// The caller MUST have validated WA-001 schema, same-origin and consent:true.
// Do not store the UUID, sessionId, path, form, attribution, IP or user headers.
export async function recordConsentedMetricEvents(events, {
  model = ConsentedMetricEvent,
  isReady = ensureConnected,
} = {}) {
  isReady();
  const eligible = events.filter((event) =>
    event.consent === true &&
    Object.prototype.hasOwnProperty.call(PULL_METRIC_NAMES, event.name));
  if (!eligible.length) return 0;

  await model.init();
  const receivedAt = new Date();
  const operations = eligible.map((event) => ({
    updateOne: {
      filter: {
        eventHash: createHash('sha256')
          .update(event.eventId.toLowerCase()).digest('hex'),
      },
      update: {
        $setOnInsert: {
          name: event.name,
          day: vietnamCalendarDay(event.occurredAt),
          consent: true,
          receivedAt,
        },
      },
      upsert: true,
    },
  }));
  const outcome = await model.bulkWrite(operations, { ordered: false });
  return outcome.upsertedCount || 0;
}

export async function readConsentedMetricDays({ startDay, endDay }, {
  model = ConsentedMetricEvent,
  isReady = ensureConnected,
} = {}) {
  isReady();
  // Never read raw session data or GA4. Return only counts by date and name.
  return model.aggregate([
    { $match: {
      consent: true,
      day: { $gte: startDay, $lte: endDay },
      name: { $in: metricNames },
    } },
    { $group: {
      _id: { day: '$day', name: '$name' },
      count: { $sum: 1 },
    } },
    { $project: {
      _id: 0, day: '$_id.day', name: '$_id.name', count: 1,
    } },
  ]).exec();
}
