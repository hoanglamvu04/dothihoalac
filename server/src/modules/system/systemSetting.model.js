import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    settingKey: { type: String, required: true, unique: true, index: true },
    settingValue: { type: mongoose.Schema.Types.Mixed, default: null },
    valueType: { type: String, enum: ['string', 'number', 'boolean', 'json'], default: 'string' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'systemsettings' },
);
export default getOrCreateModel('SystemSetting', schema, 'systemsettings');
