import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    leadType: {
      type: String,
      enum: [
        'architecture_design',
        'construction',
        'renovation',
        'cost_estimation',
        'homestay_search',
        'villa_booking',
        'event_booking',
        'advertising',
        'partnership',
      ],
      required: true,
      index: true,
    },
    sourceContentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', default: null },
    sourcePage: { type: String, default: '' },
    fullName: { type: String, required: true, maxlength: 100 },
    phone: { type: String, required: true, index: true },
    email: { type: String, default: '' },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', default: null },
    message: { type: String, default: '', maxlength: 5000 },
    budgetRange: { type: String, default: '', maxlength: 200 },
    expectedTime: { type: String, default: '', maxlength: 200 },
    assignedBrand: {
      type: String,
      enum: ['kientruchoalac', 'mely_space', 'media_space', 'xspace'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['new', 'contacting', 'qualified', 'quoted', 'won', 'lost', 'closed'],
      default: 'new',
      index: true,
    },
    consentAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'leadrequests' },
);
schema.index({ assignedBrand: 1, status: 1, createdAt: -1 });
export default getOrCreateModel('LeadRequest', schema, 'leadrequests');
