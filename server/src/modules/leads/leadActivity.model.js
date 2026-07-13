import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeadRequest',
      required: true,
      index: true,
    },
    activityType: { type: String, required: true },
    note: { type: String, default: '', maxlength: 3000 },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'leadactivities' },
);
export default getOrCreateModel('LeadActivity', schema, 'leadactivities');
