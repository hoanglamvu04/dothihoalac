import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    oldUsername: { type: String, required: true, lowercase: true },
    newUsername: { type: String, required: true, lowercase: true },
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: 'usernamehistories' },
);
schema.index({ userId: 1, changedAt: -1 });
export default getOrCreateModel('UsernameHistory', schema, 'usernamehistories');
