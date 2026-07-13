import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: false, collection: 'userroles' },
);
schema.index({ userId: 1, roleId: 1 }, { unique: true });
export default getOrCreateModel('UserRole', schema, 'userroles');
