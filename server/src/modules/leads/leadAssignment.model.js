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
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
  },
  { timestamps: false, collection: 'leadassignments' },
);
export default getOrCreateModel('LeadAssignment', schema, 'leadassignments');
