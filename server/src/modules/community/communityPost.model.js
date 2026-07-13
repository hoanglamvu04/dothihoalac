import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';
const schema = new mongoose.Schema(
  {
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
      unique: true,
      index: true,
    },
    postType: {
      type: String,
      enum: [
        'discussion',
        'question',
        'report',
        'sharing',
        'review',
        'support',
        'marketplace',
        'community_event',
      ],
      required: true,
      index: true,
    },
    questionStatus: {
      type: String,
      enum: ['open', 'answered', 'closed'],
      default: 'open',
      index: true,
    },
    acceptedCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    incidentStatus: {
      type: String,
      enum: ['new', 'verifying', 'forwarded', 'processing', 'resolved', 'insufficient_evidence'],
      default: 'new',
      index: true,
    },
    incidentTime: { type: Date, default: null },
    locationText: { type: String, default: '', maxlength: 500 },
    rating: { type: Number, min: 1, max: 5, default: null },
  },
  { timestamps: true, collection: 'communityposts' },
);
schema.index({ postType: 1, incidentStatus: 1 });
export default getOrCreateModel('CommunityPost', schema, 'communityposts');
