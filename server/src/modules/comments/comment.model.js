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
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: 5000 },
    status: {
      type: String,
      enum: ['published', 'hidden', 'deleted', 'pending'],
      default: 'published',
      index: true,
    },
    reactionCount: { type: Number, default: 0, min: 0 },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'comments' },
);
schema.index({ contentId: 1, createdAt: -1 });
export default getOrCreateModel('Comment', schema, 'comments');
