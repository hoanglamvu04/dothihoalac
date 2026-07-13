import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    contactType: {
      type: String,
      enum: ['reveal_phone', 'call', 'send_request', 'open_chat', 'copy_phone'],
      required: true,
    },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true, collection: 'propertycontacts' },
);
schema.index({ contentId: 1, createdAt: -1 });
export default getOrCreateModel('PropertyContact', schema, 'propertycontacts');
