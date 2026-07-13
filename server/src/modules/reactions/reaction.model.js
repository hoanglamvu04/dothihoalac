import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['content', 'comment'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reactionType: {
      type: String,
      enum: ['like', 'interested', 'helpful', 'surprised', 'disagree'],
      required: true,
    },
  },
  { timestamps: true, collection: 'reactions' },
);
schema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
export default getOrCreateModel('Reaction', schema, 'reactions');
