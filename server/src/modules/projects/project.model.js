import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';

export const PROJECT_TYPES = [
  'transport',
  'urban',
  'education',
  'technology',
  'industrial',
  'housing',
  'public',
  'environment',
  'other',
];

export const PROJECT_STATUSES = [
  'proposed',
  'planning',
  'approved',
  'preparing',
  'tendering',
  'construction',
  'paused',
  'completed',
  'cancelled',
];

export const PROJECT_PRIORITIES = [
  'low',
  'normal',
  'high',
  'critical',
];

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 220 },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'delayed', 'cancelled'],
      default: 'pending',
    },
    targetDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    progressPercent: { type: Number, min: 0, max: 100, default: 0 },
    note: { type: String, trim: true, maxlength: 1200, default: '' },
  },
  { timestamps: true },
);

const updateSchema = new mongoose.Schema(
  {
    updateDate: { type: Date, default: Date.now, index: true },
    title: { type: String, required: true, trim: true, maxlength: 220 },
    summary: { type: String, trim: true, maxlength: 3000, default: '' },
    progressPercent: { type: Number, min: 0, max: 100, default: null },
    status: { type: String, enum: PROJECT_STATUSES, default: null },
    sourceUrl: { type: String, trim: true, maxlength: 1600, default: '' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

const sourceSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 180, default: '' },
    url: { type: String, trim: true, maxlength: 1600, required: true },
  },
  { _id: true },
);

const schema = new mongoose.Schema(
  {
    code: { type: String, trim: true, uppercase: true, maxlength: 60, index: true },
    name: { type: String, required: true, trim: true, maxlength: 300, index: true },
    shortName: { type: String, trim: true, maxlength: 180, default: '' },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 320, index: true },

    projectType: { type: String, enum: PROJECT_TYPES, default: 'other', index: true },
    status: { type: String, enum: PROJECT_STATUSES, default: 'proposed', index: true },
    priority: { type: String, enum: PROJECT_PRIORITIES, default: 'normal', index: true },
    progressPercent: { type: Number, min: 0, max: 100, default: 0, index: true },

    primaryAreaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Area',
      default: null,
      index: true,
    },
    areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Area' }],
    locationText: { type: String, trim: true, maxlength: 700, default: '' },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },

    investor: { type: String, trim: true, maxlength: 300, default: '' },
    developer: { type: String, trim: true, maxlength: 300, default: '' },
    managingAuthority: { type: String, trim: true, maxlength: 300, default: '' },
    contractor: { type: String, trim: true, maxlength: 500, default: '' },
    consultant: { type: String, trim: true, maxlength: 500, default: '' },

    totalInvestmentVnd: { type: Number, min: 0, default: null },
    fundingSources: [{ type: String, trim: true, maxlength: 220 }],
    landAreaHa: { type: Number, min: 0, default: null },
    lengthKm: { type: Number, min: 0, default: null },
    scaleText: { type: String, trim: true, maxlength: 1800, default: '' },

    approvalDecisionNo: { type: String, trim: true, maxlength: 180, default: '' },
    approvalDecisionDate: { type: Date, default: null },
    startDate: { type: Date, default: null },
    expectedCompletionDate: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },

    description: { type: String, trim: true, maxlength: 8000, default: '' },
    objectives: { type: String, trim: true, maxlength: 5000, default: '' },
    currentUpdate: { type: String, trim: true, maxlength: 3000, default: '' },
    risks: { type: String, trim: true, maxlength: 3000, default: '' },
    nextSteps: { type: String, trim: true, maxlength: 3000, default: '' },

    milestones: { type: [milestoneSchema], default: () => [] },
    updates: { type: [updateSchema], default: () => [] },
    sourceUrls: { type: [sourceSchema], default: () => [] },

    isFeatured: { type: Boolean, default: false, index: true },
    isPublic: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    collection: 'projects',
  },
);

schema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);

schema.index(
  { code: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null, code: { $type: 'string' } },
  },
);

schema.index({ isPublic: 1, isFeatured: -1, status: 1, updatedAt: -1 });
schema.index({ name: 'text', shortName: 'text', investor: 'text', locationText: 'text' });

export default getOrCreateModel('Project', schema, 'projects');
