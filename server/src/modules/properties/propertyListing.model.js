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
        'house',
        'villa_townhouse',
        'street_house',
        'shophouse',
        'project_land',
        'land',
        'farm_resort',
        'condotel',
        'warehouse',
        'other_property',
        'residential_land',
        'land_plot',
        'service_land',
        'townhouse',
        'villa',
        'apartment',
        'mini_apartment',
        'room',
        'whole_house',
        'commercial_space',
        'office',
        'farm',
      ],
      required: true,
      index: true,
    },
    ownerType: {
      type: String,
      enum: ['owner', 'broker', 'business'],
      required: true,
      index: true,
    },
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
    galleryMediaIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    listingTier: {
      type: String,
      enum: ['diamond', 'gold', 'silver', 'standard'],
      default: 'standard',
      index: true,
    },
    listingPriority: {
      type: Number,
      min: 0,
      default: 0,
      index: true,
    },
    listingDurationDays: {
      type: Number,
      enum: [15, 30, 60],
      default: 15,
    },
    listingStartAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: { type: Date, required: true, index: true },
    soldAt: { type: Date, default: null },
    rentedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'propertylistings' },
);

schema.index({ transactionType: 1, propertyType: 1, price: 1, landArea: 1 });
schema.index({ listingPriority: -1, createdAt: -1 });
schema.index({ expiresAt: 1, soldAt: 1, rentedAt: 1, listingPriority: -1, createdAt: -1 });
// List mặc định luôn lọc soldAt/rentedAt bằng null rồi sort theo priority/date.
// Đặt các equality field trước sort giúp Mongo giữ thứ tự index, còn expiresAt
// là range filter đặt sau để tránh làm mất lợi thế sort của compound index.
schema.index({ soldAt: 1, rentedAt: 1, listingPriority: -1, createdAt: -1, expiresAt: 1 });
schema.index({ location: '2dsphere' }, { sparse: true });

export default getOrCreateModel('PropertyListing', schema, 'propertylistings');
