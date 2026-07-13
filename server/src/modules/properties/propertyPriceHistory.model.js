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
    oldPrice: { type: Number, required: true, min: 0 },
    newPrice: { type: Number, required: true, min: 0 },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: 'propertypricehistories' },
);
schema.index({ contentId: 1, changedAt: -1 });
export default getOrCreateModel('PropertyPriceHistory', schema, 'propertypricehistories');
