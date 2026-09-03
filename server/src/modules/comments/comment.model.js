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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    body: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    mediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    status: {
      type: String,
      enum: ['published', 'hidden', 'deleted', 'pending'],
      default: 'published',
      index: true,
    },
    reactionCount: { type: Number, default: 0, min: 0 },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'comments' },
);

// Mongoose hiện tại chạy document pre-validation theo kiểu sync/promise khi
// middleware không khai báo callback. Dùng invalidate() thay cho callback `next`
// để hỗ trợ bình luận chỉ có chữ, chỉ có media, hoặc cả hai mà không phụ thuộc
// vào chữ ký middleware cũ.
schema.pre('validate', function validateCommentContent() {
  if (this.status === 'deleted') return;

  if (!String(this.body || '').trim() && !this.mediaId) {
    this.invalidate(
      'body',
      'Bình luận cần có nội dung hoặc tệp đính kèm.',
    );
  }
});

schema.index({ contentId: 1, createdAt: -1 });
// Feed cộng đồng lấy hai bình luận gốc đã publish mới nhất cho nhiều content
// cùng lúc. Compound index này tránh quét reply/hidden/deleted trước khi sort.
schema.index({
  contentId: 1,
  parentId: 1,
  status: 1,
  deletedAt: 1,
  createdAt: -1,
});

export default getOrCreateModel('Comment', schema, 'comments');
