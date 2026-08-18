import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';

export const USER_ACTIVITY_TYPES = Object.freeze({
  SEARCH: 'search',
});

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      enum: Object.values(USER_ACTIVITY_TYPES),
      required: true,
      index: true,
    },
    query: {
      type: String,
      default: '',
      trim: true,
      maxlength: 180,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'user_activities',
  },
);

schema.index({ userId: 1, activityType: 1, occurredAt: -1 });

export default getOrCreateModel(
  'UserActivity',
  schema,
  'user_activities',
);
