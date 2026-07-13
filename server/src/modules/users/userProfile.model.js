import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    fullName: { type: String, trim: true, maxlength: 100, default: '' },
    avatarMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    coverMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    bio: { type: String, trim: true, maxlength: 500, default: '' },
    occupation: { type: String, trim: true, maxlength: 100, default: '' },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', default: null },
    website: { type: String, trim: true, maxlength: 300, default: '' },
    publicProfile: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'userprofiles' },
);
export default getOrCreateModel('UserProfile', schema, 'userprofiles');
