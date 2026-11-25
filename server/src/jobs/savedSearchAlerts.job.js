import { randomUUID } from 'node:crypto';
import Content from '../modules/contents/content.model.js';
import SavedSearch from '../modules/savedSearches/savedSearch.model.js';
import Notification from '../modules/notifications/notification.model.js';
import { verifyDiscoveryIndexes } from '../modules/savedSearches/discoveryReadiness.js';
import { vietnameseSearchRegex } from '../utils/vietnameseSearch.js';
import { createNotification } from '../services/notification.service.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { logger } from '../config/logger.js';

const PATH_BY_TYPE = {
  article: 'tin-tuc',
  community: 'cong-dong',
  property: 'bat-dong-san',
  job: 'viec-lam',
};
const BATCH_SIZE = 16;
const SEARCHES_PER_RUN = 80;
const LEASE_MS = 120_000;
let running = false;

export function buildSavedSearchContentFilter(search, now = new Date()) {
  const since = new Date(search.lastScannedAt || search.createdAt || now);
  const cursorId = search.lastScannedContentId || null;
  const timeCondition = cursorId ? {
    $or: [
      { publishedAt: { $gt: since, $lte: now } },
      { publishedAt: since, _id: { $gt: cursorId } },
    ],
  } : { publishedAt: { $gt: since, $lte: now } };

  const and = [timeCondition];
  const keyword = vietnameseSearchRegex(search.queryNormalized);
  if (keyword) and.push({ $or: [{ title: keyword }, { summary: keyword }] });

  return {
    status: 'published',
    visibility: 'public',
    deletedAt: null,
    ...(search.contentType !== 'all' ? { contentType: search.contentType } : {}),
    ...(search.areaId ? { primaryAreaId: search.areaId } : {}),
    $and: and,
  };
}

// Atomic cross-worker claim. The scan-attempt clock is deliberately independent
// of the published-content cursor: an oversized backlog must not monopolize the
// first 80 subscriptions on every five-minute scheduler tick.
export async function claimNextSavedSearch(runStartedAt = new Date()) {
  const now = new Date();
  const token = randomUUID();
  return SavedSearch.findOneAndUpdate(
    {
      isActive: true,
      $and: [
        { $or: [{ scanLeaseUntil: null }, { scanLeaseUntil: { $lte: now } }] },
        // This comparison excludes documents already claimed in THIS run.
        // A missing field is treated as null for pre-existing subscriptions.
        { $or: [
          { lastScanAttemptAt: null },
          { lastScanAttemptAt: { $lt: runStartedAt } },
        ] },
      ],
    },
    {
      $set: {
        lastScanAttemptAt: now,
        scanLeaseToken: token,
        scanLeaseUntil: new Date(now.getTime() + LEASE_MS),
      },
    },
    { new: true, sort: { lastScanAttemptAt: 1, _id: 1 } },
  ).select('+scanLeaseToken +scanLeaseUntil').lean();
}

async function leaseStillActive(search) {
  return Boolean(await SavedSearch.exists({
    _id: search._id,
    userId: search.userId,
    isActive: true,
    scanLeaseToken: search.scanLeaseToken,
    scanLeaseUntil: { $gt: new Date() },
  }));
}

async function releaseLease(search) {
  // Never release a newer worker's lease if an old worker has timed out.
  await SavedSearch.updateOne(
    { _id: search._id, scanLeaseToken: search.scanLeaseToken },
    { $set: { scanLeaseUntil: null, scanLeaseToken: null } },
  );
}

export async function sendSavedSearchAlerts() {
  // In-process guard + DB lease: concurrent PM2 instances must not scan the
  // same subscription simultaneously. Unique notification index is a fallback.
  if (running) return 0;
  running = true;
  let processed = 0;
  try {
    // Fail closed: an absent unique index can turn retry/upsert into duplicate
    // notifications. Verify physical MongoDB indexes before scanning anything.
    let indexChecks;
    try {
      const [savedIndexes, notificationIndexes] = await Promise.all([
        SavedSearch.collection.indexes(),
        Notification.collection.indexes(),
      ]);
      indexChecks = verifyDiscoveryIndexes(savedIndexes, notificationIndexes);
    } catch (error) {
      logger.warn({ errorName: error?.name }, 'Saved search alerts paused: cannot verify MongoDB indexes');
      return 0;
    }
    if (!indexChecks.pass) {
      logger.warn(indexChecks, 'Saved search alerts paused: required MongoDB indexes are missing or malformed');
      return 0;
    }
    const runStartedAt = new Date();
    for (let claimed = 0; claimed < SEARCHES_PER_RUN; claimed += 1) {
      let search = null;
      try {
        // Never select the same subscription twice in one run. Concurrent
        // PM2 workers atomically claim different unlocked subscriptions.
        search = await claimNextSavedSearch(runStartedAt);
        if (!search) break;

        const now = new Date();
        const matches = await Content.find(buildSavedSearchContentFilter(search, now))
          .select('_id title slug contentType publishedAt')
          .sort({ publishedAt: 1, _id: 1 })
          .limit(BATCH_SIZE)
          .lean();

        let completed = true;
        for (const content of matches) {
          // Pause/delete/reset immediately invalidates the lease. Re-check
          // before each send so the scan stops without advancing its cursor.
          if (!await leaseStillActive(search)) {
            completed = false;
            break;
          }

          const section = PATH_BY_TYPE[content.contentType];
          if (!section || !content.slug) continue;
          await createNotification({
            recipientId: search.userId,
            notificationType: NOTIFICATION_TYPES.SAVED_SEARCH_MATCH,
            targetType: 'content',
            targetId: content._id,
            title: 'Có nội dung mới phù hợp với tìm kiếm đã lưu',
            message: String(content.title || '').slice(0, 250),
            payload: { url: '/' + section + '/' + encodeURIComponent(content.slug) },
            // Idempotent across overlapping filters and expired leases.
            dedupeKey: 'saved-search-match:' + content._id,
          });
          processed += 1;
        }

        if (!completed) continue;
        const hasMore = matches.length === BATCH_SIZE;
        const last = matches[matches.length - 1];
        // Cursor changes only if the same worker still owns an active lease.
        // A pause/resume clears the token and starts a fresh cursor at resume.
        await SavedSearch.updateOne(
          {
            _id: search._id,
            userId: search.userId,
            isActive: true,
            scanLeaseToken: search.scanLeaseToken,
            scanLeaseUntil: { $gt: new Date() },
          },
          {
            $set: {
              lastScannedAt: hasMore ? last.publishedAt : now,
              lastScannedContentId: hasMore ? last._id : null,
              scanLeaseToken: null,
              scanLeaseUntil: null,
            },
          },
        );
      } catch (error) {
        logger.warn({ errorName: error?.name, savedSearchId: search?._id }, 'Saved search alert check failed');
        // Do not perform 80 failing DB claims if the DB is unavailable.
        if (!search) throw error;
        // The content cursor is unchanged on failure; a later run retries.
      } finally {
        if (search) {
          try {
            await releaseLease(search);
          } catch (error) {
            logger.warn({ errorName: error?.name, savedSearchId: search._id }, 'Saved search scan lease release failed');
            // Lease expires automatically after LEASE_MS.
          }
        }
      }
    }
    return processed; // Attempted sends (including idempotent retries), not a delivery metric.
  } finally {
    running = false;
  }
}
