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
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
      unique: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: ['sale', 'rent', 'transfer', 'wanted_buy', 'wanted_rent'],
      required: true,
      index: true,
    },
    propertyType: {
      type: String,
      enum: [
        'residential_land',
        'land_plot',
        'project_land',
        'service_land',
        'house',
        'townhouse',
        'villa',
        'apartment',
        'mini_apartment',
        'room',
        'whole_house',
        'commercial_space',
        'office',
        'warehouse',
        'farm',
      ],
      required: true,
      index: true,
    },
    ownerType: { type: String, enum: ['owner', 'broker', 'business'], required: true, index: true },
    price: { type: Number, min: 0, default: 0, index: true },
    priceUnit: {
      type: String,
      enum: ['total', 'per_m2', 'per_month', 'negotiable'],
      default: 'total',
    },
    isNegotiable: { type: Boolean, default: false },
    landArea: { type: Number, required: true, min: 0.1, index: true },
    usableArea: { type: Number, min: 0, default: null },
    bedrooms: { type: Number, min: 0, default: null },
    bathrooms: { type: Number, min: 0, default: null },
    frontage: { type: Number, min: 0, default: null },
    roadWidth: { type: Number, min: 0, default: null },
    direction: {
      type: String,
      enum: [
        'north',
        'south',
        'east',
        'west',
        'northeast',
        'northwest',
        'southeast',
        'southwest',
        'unknown',
      ],
      default: 'unknown',
    },
    legalStatus: {
      type: String,
      enum: [
        'red_book',
        'contract',
        'waiting_certificate',
        'shared_certificate',
        'other',
        'unknown',
      ],
      default: 'unknown',
      index: true,
    },
    addressText: { type: String, required: true, maxlength: 500 },
    location: { type: pointSchema, default: undefined },
    contactName: { type: String, required: true, maxlength: 100 },
    contactPhone: { type: String, required: true },
    contactEmail: { type: String, default: '' },
    featureIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PropertyFeature' }],
    expiresAt: { type: Date, required: true, index: true },
    soldAt: { type: Date, default: null },
    rentedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'propertylistings' },
);
schema.index({ transactionType: 1, propertyType: 1, price: 1, landArea: 1 });
schema.index({ location: '2dsphere' }, { sparse: true });
export default getOrCreateModel('PropertyListing', schema, 'propertylistings');
