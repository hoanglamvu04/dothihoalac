import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  query: { type: String, default: '', maxlength: 100 },
  queryNormalized: { type: String, default: '', maxlength: 100 },
  contentType: {
    type: String,
    enum: ['all', 'article', 'community', 'property', 'job'],
    default: 'all',
  },
  areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', default: null },
  areaName: { type: String, default: '', maxlength: 120 },
  areaSlug: { type: String, default: '', maxlength: 150 },
  isActive: { type: Boolean, default: true },
  lastScannedAt: { type: Date, default: Date.now },
  lastScannedContentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  // Scheduling fairness only; independent from the content delivery cursor.
  // select:false prevents this operational field from appearing in user APIs.
  lastScanAttemptAt: { type: Date, default: null, select: false },
  // Cross-process best-effort scan lease. Expiry recovers from worker crashes.
  scanLeaseToken: { type: String, default: null, select: false },
  scanLeaseUntil: { type: Date, default: null, select: false },
}, { timestamps: true, collection: 'savedsearches' });

schema.index(
  { userId: 1, queryNormalized: 1, contentType: 1, areaId: 1 },
  { unique: true, name: 'saved_search_per_user_unique' },
);
schema.index({ isActive: 1, lastScannedAt: 1, _id: 1 });
schema.index(
  { isActive: 1, lastScanAttemptAt: 1, _id: 1 },
  { name: 'saved_search_fair_scan_order' },
);
export default getOrCreateModel('SavedSearch', schema, 'savedsearches');
