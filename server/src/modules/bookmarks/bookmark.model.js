import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
      index: true,
    },
  },
  { timestamps: true, collection: 'bookmarks' },
);
schema.index({ userId: 1, contentId: 1 }, { unique: true });
export default getOrCreateModel('Bookmark', schema, 'bookmarks');
