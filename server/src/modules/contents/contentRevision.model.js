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
    revisionNumber: { type: Number, required: true, min: 1 },
    title: { type: String, required: true },
    summary: { type: String, default: '' },
    bodyHtml: { type: String, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changeNote: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true, collection: 'contentrevisions' },
);
schema.index({ contentId: 1, revisionNumber: 1 }, { unique: true });
export default getOrCreateModel('ContentRevision', schema, 'contentrevisions');
