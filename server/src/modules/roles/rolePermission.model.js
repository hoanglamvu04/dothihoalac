import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    permissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Permission',
      required: true,
      index: true,
    },
  },
  { timestamps: false, collection: 'rolepermissions' },
);
schema.index({ roleId: 1, permissionId: 1 }, { unique: true });
export default getOrCreateModel('RolePermission', schema, 'rolepermissions');
