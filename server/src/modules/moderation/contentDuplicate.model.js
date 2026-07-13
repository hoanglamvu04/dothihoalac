import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    matchedContentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    similarityScore: { type: Number, min: 0, max: 1, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'dismissed'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'contentduplicates' },
);
schema.index({ contentId: 1, matchedContentId: 1 }, { unique: true });
export default getOrCreateModel('ContentDuplicate', schema, 'contentduplicates');
