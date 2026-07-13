import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    deviceName: { type: String, default: 'Thiết bị không xác định', maxlength: 300 },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '', maxlength: 1000 },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: 'usersessions' },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default getOrCreateModel('UserSession', schema, 'usersessions');
