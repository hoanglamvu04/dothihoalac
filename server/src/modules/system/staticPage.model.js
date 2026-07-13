import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    slug: { type: String, required: true, lowercase: true, unique: true, index: true },
    body: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'published', 'hidden'], default: 'draft', index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'staticpages' },
);
export default getOrCreateModel('StaticPage', schema, 'staticpages');
