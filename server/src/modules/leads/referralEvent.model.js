import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    brand: {
      type: String,
      enum: ['kientruchoalac', 'mely_space', 'media_space', 'xspace'],
      required: true,
      index: true,
    },
    sourceContentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', default: null },
    sourcePage: { type: String, default: '' },
    destinationUrl: { type: String, required: true },
    eventType: {
      type: String,
      enum: ['click', 'form_open', 'form_submit', 'phone_reveal'],
      default: 'click',
    },
  },
  { timestamps: true, collection: 'referralevents' },
);
export default getOrCreateModel('ReferralEvent', schema, 'referralevents');
