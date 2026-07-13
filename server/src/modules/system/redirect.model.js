import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    oldPath: { type: String, required: true, unique: true },
    newPath: { type: String, required: true },
    redirectType: { type: Number, enum: [301, 302], default: 301 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'redirects' },
);
export default getOrCreateModel('Redirect', schema, 'redirects');
