import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, unique: true },
    featureGroup: {
      type: String,
      enum: ['location', 'access', 'legal', 'utility', 'suitable_for', 'other'],
      default: 'other',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'propertyfeatures' },
);
export default getOrCreateModel('PropertyFeature', schema, 'propertyfeatures');
