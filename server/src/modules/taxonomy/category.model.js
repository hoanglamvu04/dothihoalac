import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    contentScope: {
      type: String,
      enum: ['all', 'article', 'community', 'property', 'job'],
      default: 'all',
      index: true,
    },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    description: { type: String, default: '', maxlength: 1000 },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'categories' },
);
schema.index({ slug: 1, contentScope: 1 }, { unique: true });
export default getOrCreateModel('Category', schema, 'categories');
