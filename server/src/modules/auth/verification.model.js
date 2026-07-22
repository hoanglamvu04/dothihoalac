import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ['email', 'phone'],
      required: true,
      index: true,
    },

    target: {
      type: String,
      required: true,
    },

    codeHash: {
      type: String,
      required: true,
    },

    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'verificationrequests',
  },
);

schema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

schema.index({
  userId: 1,
  type: 1,
  createdAt: -1,
});

export default getOrCreateModel(
  'VerificationRequest',
  schema,
  'verificationrequests',
);