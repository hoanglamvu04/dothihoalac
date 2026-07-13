import mongoose from 'mongoose';
import { REPORT_REASON_VALUES } from '../../constants/reportReasons.js';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: {
      type: String,
      enum: ['content', 'comment', 'user', 'property', 'job'],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, enum: REPORT_REASON_VALUES, required: true },
    description: { type: String, default: '', maxlength: 3000 },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'resolved', 'rejected', 'duplicate'],
      default: 'pending',
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, default: '', maxlength: 3000 },
  },
  { timestamps: true, collection: 'reports' },
);
schema.index({ status: 1, createdAt: -1 });
schema.index({ reporterId: 1, targetType: 1, targetId: 1, status: 1 });
export default getOrCreateModel('Report', schema, 'reports');
