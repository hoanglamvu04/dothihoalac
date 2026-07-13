import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    targetType: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    actionType: {
      type: String,
      enum: [
        'approve',
        'reject',
        'request_revision',
        'hide',
        'restore',
        'lock_comments',
        'delete',
        'warn_user',
        'restrict_user',
        'ban_user',
      ],
      required: true,
    },
    reasonCode: { type: String, default: '' },
    note: { type: String, default: '', maxlength: 3000 },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true, collection: 'moderationactions' },
);
export default getOrCreateModel('ModerationAction', schema, 'moderationactions');
