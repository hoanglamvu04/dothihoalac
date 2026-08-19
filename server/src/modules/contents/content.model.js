import mongoose from 'mongoose';
import { CONTENT_TYPE_VALUES } from '../../constants/contentTypes.js';
import { CONTENT_STATUS_VALUES } from '../../constants/contentStatus.js';
import { getOrCreateModel } from '../../utils/modelHelpers.js';

const schema = new mongoose.Schema(
  {
    contentType: { type: String, enum: CONTENT_TYPE_VALUES, required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 250 },
    slug: { type: String, required: true, lowercase: true, unique: true, index: true },
    summary: { type: String, default: '', trim: true, maxlength: 1000 },
    bodyText: { type: String, default: '', select: false },
    thumbnailMediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
    primaryCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    primaryAreaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Area',
      default: null,
      index: true,
    },
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    tagIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
    areaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Area' }],
    status: { type: String, enum: CONTENT_STATUS_VALUES, default: 'draft', index: true },
    visibility: {
      type: String,
      enum: ['public', 'members', 'private'],
      default: 'public',
      index: true,
    },
    allowComments: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isSponsored: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null, index: true },
    scheduledAt: { type: Date, default: null, index: true },
    viewCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    reactionCount: { type: Number, default: 0, min: 0 },
    bookmarkCount: { type: Number, default: 0, min: 0 },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: 'contents' },
);

schema.index({ status: 1, publishedAt: -1 });
schema.index({ contentType: 1, primaryCategoryId: 1, publishedAt: -1 });
schema.index({ contentType: 1, primaryAreaId: 1, publishedAt: -1 });

// Feed công khai luôn lọc theo cùng bộ trạng thái trước khi sort. Compound
// index này tránh scan nhiều document nháp/private/deleted khi dữ liệu lớn dần.
schema.index({
  contentType: 1,
  status: 1,
  visibility: 1,
  deletedAt: 1,
  publishedAt: -1,
  _id: -1,
});
schema.index({
  contentType: 1,
  status: 1,
  visibility: 1,
  deletedAt: 1,
  viewCount: -1,
  publishedAt: -1,
});

schema.index(
  { title: 'text', summary: 'text', bodyText: 'text' },
  { weights: { title: 10, summary: 5, bodyText: 1 }, name: 'content_text_search' },
);

export default getOrCreateModel('Content', schema, 'contents');
