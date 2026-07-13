import mongoose from 'mongoose';
import { NOTIFICATION_TYPE_VALUES } from '../../constants/notificationTypes.js';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    notificationType: { type: String, enum: NOTIFICATION_TYPE_VALUES, required: true },
    inAppEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: false },
    smsEnabled: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'notificationpreferences' },
);
schema.index({ userId: 1, notificationType: 1 }, { unique: true });
export default getOrCreateModel('NotificationPreference', schema, 'notificationpreferences');
