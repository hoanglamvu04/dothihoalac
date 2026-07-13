import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, lowercase: true, unique: true, index: true },
    usageCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'tags' },
);
export default getOrCreateModel('Tag', schema, 'tags');
