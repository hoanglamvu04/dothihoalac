import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    violationType: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    relatedTargetType: { type: String, default: '' },
    relatedTargetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    note: { type: String, default: '', maxlength: 3000 },
    expiresAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'userviolations' },
);
export default getOrCreateModel('UserViolation', schema, 'userviolations');
