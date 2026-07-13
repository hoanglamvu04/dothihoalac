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
    mediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: true, index: true },
    mediaRole: {
      type: String,
      enum: ['thumbnail', 'gallery', 'inline', 'document', 'video'],
      default: 'gallery',
    },
    displayOrder: { type: Number, default: 0 },
    caption: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true, collection: 'contentmedia' },
);
schema.index({ contentId: 1, mediaId: 1, mediaRole: 1 }, { unique: true });
export default getOrCreateModel('ContentMedia', schema, 'contentmedia');
