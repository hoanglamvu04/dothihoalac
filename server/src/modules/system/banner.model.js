import mongoose from 'mongoose';
import { getOrCreateModel } from '../../utils/modelHelpers.js';

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    headline: { type: String, trim: true, default: '', maxlength: 240 },
    description: { type: String, trim: true, default: '', maxlength: 1200 },
    ctaLabel: { type: String, trim: true, default: '', maxlength: 80 },
    creativeType: {
      type: String,
      enum: ['image', 'text', 'image_text'],
      default: 'image',
      index: true,
    },
    imageMediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    targetUrl: { type: String, trim: true, default: '', maxlength: 2000 },

    /*
     * slotKey là tên vị trí quảng cáo do frontend đăng ký, ví dụ:
     * community_left_primary, home_before_community, site_below_header.
     * Không dùng enum để có thể bổ sung vị trí mới mà không migration DB.
     */
    slotKey: { type: String, trim: true, default: '', maxlength: 100, index: true },

    /* position được giữ lại để tương thích dữ liệu banner cũ. */
    position: { type: String, trim: true, default: '', index: true },

    device: {
      type: String,
      enum: ['all', 'desktop', 'mobile'],
      default: 'all',
      index: true,
    },
    startAt: { type: Date, default: null, index: true },
    endAt: { type: Date, default: null, index: true },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },
    priority: { type: Number, default: 0, index: true },

    impressionCount: { type: Number, default: 0, min: 0 },
    clickCount: { type: Number, default: 0, min: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: 'banners' },
);

schema.index({ slotKey: 1, isActive: 1, priority: -1, displayOrder: 1 });
schema.index({ deletedAt: 1, updatedAt: -1 });

export default getOrCreateModel('Banner', schema, 'banners');
