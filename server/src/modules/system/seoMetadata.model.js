import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    targetType: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    metaTitle: { type: String, default: '', maxlength: 250 },
    metaDescription: { type: String, default: '', maxlength: 500 },
    canonicalUrl: { type: String, default: '' },
    robots: { type: String, default: 'index,follow' },
    ogImageMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
  },
  { timestamps: true, collection: 'seometadata' },
);
schema.index({ targetType: 1, targetId: 1 }, { unique: true });
export default getOrCreateModel('SeoMetadata', schema, 'seometadata');
