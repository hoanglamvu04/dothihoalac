import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: '' },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    oldData: { type: mongoose.Schema.Types.Mixed, default: null },
    newData: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true, collection: 'adminactivitylogs' },
);
schema.index({ createdAt: -1 });
export default getOrCreateModel('AdminActivityLog', schema, 'adminactivitylogs');
