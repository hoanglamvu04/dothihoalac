import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';

const schema = new mongoose.Schema(
  {
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
      unique: true,
      index: true,
    },
    articleType: {
      type: String,
      enum: ['news', 'analysis', 'guide', 'interview', 'photo', 'sponsored'],
      default: 'news',
      index: true,
    },
    editorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sourceNote: { type: String, default: '', maxlength: 2000 },
    factCheckedAt: { type: Date, default: null },
    factCheckedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    originalPublishedAt: { type: Date, default: null },

    // DTHL Content Studio / Google Workspace metadata.
    contentSource: {
      type: String,
      enum: ['native', 'google-docs'],
      default: 'native',
      index: true,
    },
    documentCode: { type: String, default: '', index: true },
    googleDocId: { type: String, default: '', index: true },
    googleDocUrl: { type: String, default: '' },
    googleDocFileName: { type: String, default: '' },
    googleDocFolderId: { type: String, default: '' },
    googleDocYear: { type: Number, default: null, index: true },
    googleDocStatus: { type: String, default: '', index: true },
    googleDocLastOpenedAt: { type: Date, default: null },
    googleDocLastSyncedAt: { type: Date, default: null },
    googleDocError: { type: String, default: '' },
    googleDocImageMap: { type: mongoose.Schema.Types.Mixed, default: {} },
    googleDocImageCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'articles' },
);

export default getOrCreateModel('Article', schema, 'articles');
