import mongoose from 'mongoose';
import { NOTIFICATION_TYPE_VALUES } from '../../constants/notificationTypes.js';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notificationType: { type: String, enum: NOTIFICATION_TYPE_VALUES, required: true, index: true },
    targetType: { type: String, default: '' },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, default: '', maxlength: 1000 },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'notifications' },
);
schema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
export default getOrCreateModel('Notification', schema, 'notifications');
