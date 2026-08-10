import mongoose from 'mongoose';

import { getOrCreateModel } from '../../utils/modelHelpers.js';

const statsSchema = new mongoose.Schema(
  {
    totalItems: { type: Number, min: 0, default: 0 },
    newItems: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    type: {
      type: String,
      required: true,
      enum: ['rss', 'web', 'facebook'],
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    includePath: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    facebookPageId: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    intervalMinutes: {
      type: Number,
      min: 5,
      max: 1440,
      default: 15,
    },
    status: {
      type: String,
      enum: ['idle', 'checking', 'ok', 'error'],
      default: 'idle',
      index: true,
    },
    lastCheckedAt: { type: Date, default: null },
    lastSuccessAt: { type: Date, default: null },
    nextCheckAt: { type: Date, default: Date.now, index: true },
    lastItemAt: { type: Date, default: null },
    lastError: { type: String, default: '', maxlength: 2000 },
    httpEtag: { type: String, default: '', maxlength: 500 },
    httpLastModified: { type: String, default: '', maxlength: 500 },
    stats: {
      type: statsSchema,
      default: () => ({ totalItems: 0, newItems: 0 }),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'source_watch_sources',
  },
);

schema.index({ enabled: 1, nextCheckAt: 1 });
schema.index({ createdAt: -1 });

export default getOrCreateModel(
  'SourceWatchSource',
  schema,
  'source_watch_sources',
);
