import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
      index: true,
    },
    sourceName: { type: String, required: true, trim: true },
    sourceUrl: { type: String, default: '' },
    sourceType: {
      type: String,
      enum: ['official', 'press', 'document', 'interview', 'other'],
      default: 'other',
    },
    accessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'articlesources' },
);
export default getOrCreateModel('ArticleSource', schema, 'articlesources');
