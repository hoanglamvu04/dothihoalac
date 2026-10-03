import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';

const schema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ['frontend', 'backend'],
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ['error', 'fatal'],
      default: 'error',
      index: true,
    },
    fingerprint: {
      type: String,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    stack: {
      type: String,
      default: '',
      maxlength: 12000,
    },
    route: {
      type: String,
      default: '',
      maxlength: 1000,
      index: true,
    },
    requestId: {
      type: String,
      default: '',
      maxlength: 200,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    userAgent: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    occurrences: {
      type: Number,
      default: 1,
      min: 1,
    },
    firstSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
      index: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true, collection: 'system_error_events' },
);

schema.index({ resolvedAt: 1, lastSeenAt: -1 });
schema.index({ source: 1, lastSeenAt: -1 });
schema.index({ fingerprint: 1, resolvedAt: 1 });

export default getOrCreateModel(
  'SystemErrorEvent',
  schema,
  'system_error_events',
);
