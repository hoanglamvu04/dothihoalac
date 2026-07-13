import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
      unique: true,
      index: true,
    },
    articleType: {
      type: String,
      enum: ['news', 'analysis', 'guide', 'interview', 'photo', 'sponsored'],
      default: 'news',
      index: true,
    },
    editorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sourceNote: { type: String, default: '', maxlength: 2000 },
    factCheckedAt: { type: Date, default: null },
    factCheckedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    originalPublishedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'articles' },
);
export default getOrCreateModel('Article', schema, 'articles');
