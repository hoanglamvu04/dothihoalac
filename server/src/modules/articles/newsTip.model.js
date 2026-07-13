import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 250 },
    description: { type: String, required: true, maxlength: 10000 },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', default: null },
    eventTime: { type: Date, default: null },
    source: { type: String, default: '', maxlength: 1000 },
    mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }],
    contactName: { type: String, default: '', maxlength: 100 },
    contactPhone: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    allowContact: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['new', 'reviewing', 'used', 'rejected'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: true, collection: 'newstips' },
);
export default getOrCreateModel('NewsTip', schema, 'newstips');
