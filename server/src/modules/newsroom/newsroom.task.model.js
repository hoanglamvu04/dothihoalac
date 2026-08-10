import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';

const schema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'SCOUT',
        'RESEARCH',
        'EDITOR',
        'WRITE',
        'FACT_CHECK',
        'CREATE_PENDING_REVIEW',
      ],
      index: true,
    },
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NewsroomStory',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
      default: 'queued',
      index: true,
    },
    attempts: { type: Number, min: 0, default: 0 },
    maxAttempts: { type: Number, min: 1, max: 10, default: 3 },
    runAt: { type: Date, default: Date.now, index: true },
    lockedAt: { type: Date, default: null, index: true },
    finishedAt: { type: Date, default: null },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    usage: { type: mongoose.Schema.Types.Mixed, default: null },
    model: { type: String, default: '', maxlength: 120 },
    error: { type: String, default: '', maxlength: 5000 },
  },
  {
    timestamps: true,
    collection: 'newsroom_tasks',
  },
);

schema.index({ status: 1, runAt: 1, createdAt: 1 });
schema.index({ storyId: 1, type: 1, status: 1 });

export default getOrCreateModel(
  'NewsroomTask',
  schema,
  'newsroom_tasks',
);
