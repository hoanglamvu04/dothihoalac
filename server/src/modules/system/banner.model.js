import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    imageMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: true },
    targetUrl: { type: String, default: '' },
    position: {
      type: String,
      enum: ['home_top', 'home_sidebar', 'article_inline', 'community_sidebar', 'property_sidebar'],
      required: true,
      index: true,
    },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'banners' },
);
export default getOrCreateModel('Banner', schema, 'banners');
