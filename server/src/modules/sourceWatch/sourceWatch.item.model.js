import mongoose from 'mongoose';

import { getOrCreateModel } from '../../utils/modelHelpers.js';

const schema = new mongoose.Schema(
  {
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SourceWatchSource',
      required: true,
      index: true,
    },
    fingerprint: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },
    externalId: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1000,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    title: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1000,
    },
    excerpt: {
      type: String,
      trim: true,
      default: '',
      maxlength: 4000,
    },
    contentText: {
      type: String,
      default: '',
      maxlength: 30000,
    },
    contentHtml: {
      type: String,
      default: '',
      maxlength: 80000,
    },
    mediaUrls: {
      type: [String],
      default: [],
    },
    author: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300,
    },
    publishedAt: { type: Date, default: null, index: true },
    discoveredAt: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['baseline', 'new', 'reviewed', 'ignored'],
      default: 'new',
      index: true,
    },
    sourceMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    collection: 'source_watch_items',
  },
);

schema.index({ sourceId: 1, fingerprint: 1 }, { unique: true });
schema.index({ status: 1, discoveredAt: -1 });
schema.index({ sourceId: 1, discoveredAt: -1 });

export default getOrCreateModel(
  'SourceWatchItem',
  schema,
  'source_watch_items',
);
