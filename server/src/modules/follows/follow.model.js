import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    followerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: {
      type: String,
      enum: ['user', 'area', 'category', 'tag', 'content'],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  },
  { timestamps: true, collection: 'follows' },
);
schema.index({ followerId: 1, targetType: 1, targetId: 1 }, { unique: true });
export default getOrCreateModel('Follow', schema, 'follows');
