import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: { type: String, enum: ['image', 'video', 'document'], required: true, index: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true, min: 0 },
    storagePath: { type: String, required: true, unique: true },
    publicUrl: { type: String, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    duration: { type: Number, default: null },
    altText: { type: String, default: '', maxlength: 300 },
    status: {
      type: String,
      enum: ['active', 'blocked', 'pending_delete'],
      default: 'active',
      index: true,
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'media' },
);
export default getOrCreateModel('Media', schema, 'media');
