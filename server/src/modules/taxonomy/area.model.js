import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, lowercase: true, unique: true, index: true },
    areaType: {
      type: String,
      enum: ['district', 'commune', 'village', 'urban_area', 'project', 'functional_zone'],
      required: true,
      index: true,
    },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', default: null, index: true },
    description: { type: String, default: '', maxlength: 3000 },
    location: { type: pointSchema, default: undefined },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'areas' },
);
schema.index({ location: '2dsphere' }, { sparse: true });
export default getOrCreateModel('Area', schema, 'areas');
