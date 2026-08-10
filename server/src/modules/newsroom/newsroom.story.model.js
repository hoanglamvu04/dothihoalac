import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';

const sourceSchema = new mongoose.Schema(
  {
    url: { type: String, default: '', maxlength: 4000 },
    title: { type: String, default: '', maxlength: 500 },
    publisher: { type: String, default: '', maxlength: 220 },
    publishedAt: { type: Date, default: null },
    accessedAt: { type: Date, default: Date.now },
    sourceType: { type: String, default: 'web', maxlength: 40 },
    trustScore: { type: Number, min: 0, max: 10, default: null },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    storyCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 80,
    },
    clusterKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 240,
    },
    headline: { type: String, required: true, maxlength: 500 },
    eventSummary: { type: String, default: '', maxlength: 3000 },
    whyItMatters: { type: String, default: '', maxlength: 3000 },
    location: { type: String, default: '', maxlength: 300 },
    eventStartedAt: { type: Date, default: null, index: true },
    eventEndedAt: { type: Date, default: null },
    latestSourcePublishedAt: { type: Date, default: null, index: true },
    discoveredAt: { type: Date, default: Date.now, index: true },

    people: { type: [String], default: [] },
    organizations: { type: [String], default: [] },
    numbers: { type: [String], default: [] },
    possibleAngles: { type: [String], default: [] },
    sources: { type: [sourceSchema], default: [] },

    freshnessScore: { type: Number, min: 0, max: 10, default: 0, index: true },
    importanceScore: { type: Number, min: 0, max: 10, default: 0, index: true },
    recommendation: {
      type: String,
      enum: ['WRITE_NOW', 'MONITOR', 'IGNORE'],
      default: 'MONITOR',
      index: true,
    },
    editorDecision: {
      type: String,
      enum: ['', 'WRITE', 'MONITOR', 'IGNORE'],
      default: '',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'discovered',
        'researching',
        'researched',
        'monitor',
        'ignored',
        'writing',
        'drafted',
        'fact_check',
        'needs_revision',
        'pending_review',
        'published',
        'error',
      ],
      default: 'discovered',
      index: true,
    },

    researchPacket: { type: mongoose.Schema.Types.Mixed, default: null },
    articleBrief: { type: mongoose.Schema.Types.Mixed, default: null },
    draft: { type: mongoose.Schema.Types.Mixed, default: null },
    factCheck: { type: mongoose.Schema.Types.Mixed, default: null },

    cmsContentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      default: null,
      index: true,
    },
    cmsStatus: { type: String, default: '', maxlength: 40 },
    lastError: { type: String, default: '', maxlength: 5000 },
    lastProcessedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'newsroom_stories',
  },
);

schema.index({ status: 1, importanceScore: -1, freshnessScore: -1, createdAt: -1 });
schema.index({ 'sources.url': 1 });

export default getOrCreateModel(
  'NewsroomStory',
  schema,
  'newsroom_stories',
);
