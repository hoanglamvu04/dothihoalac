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
    bodyHtml: {
      type: String,
      default: '',
    },
    bodyText: {
      type: String,
      default: '',
    },
    readingTime: {
      type: Number,
      default: 1,
      min: 1,
    },
    wordCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    inlineMediaIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
  },
  {
    timestamps: true,
    collection: 'contentbodies',
  },
);

schema.index({ inlineMediaIds: 1 });

export default getOrCreateModel(
  'ContentBody',
  schema,
  'contentbodies',
);
