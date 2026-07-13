import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, unique: true, index: true },
    description: { type: String, default: '' },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'roles' },
);
export default getOrCreateModel('Role', schema, 'roles');
