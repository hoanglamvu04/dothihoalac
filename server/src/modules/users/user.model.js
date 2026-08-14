import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getOrCreateModel } from '../../utils/modelHelpers.js';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    phone: { type: String, trim: true },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
      minlength: 4,
      maxlength: 30,
    },
    displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    passwordHash: { type: String, required: true, select: false },
    status: {
      type: String,
      enum: ['active', 'restricted', 'suspended', 'banned', 'pending'],
      default: 'active',
      index: true,
    },
    emailVerifiedAt: { type: Date, default: null },
    phoneVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: 'users' },
);

userSchema.virtual('profile', {
  ref: 'UserProfile',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});

userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};
userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};
userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});
userSchema.set('toObject', { virtuals: true });

export default getOrCreateModel('User', userSchema, 'users');
