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

    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'passwordresetrequests',
  },
);

schema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

export default getOrCreateModel(
  'PasswordResetRequest',
  schema,
  'passwordresetrequests',
);