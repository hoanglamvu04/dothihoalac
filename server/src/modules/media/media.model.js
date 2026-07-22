import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ['local', 'cloudinary'],
      default: 'cloudinary',
      index: true,
    },

    publicId: {
      type: String,
      trim: true,
      default: null,
    },

    assetId: {
      type: String,
      trim: true,
      default: null,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    secureUrl: {
      type: String,
      trim: true,
      default: null,
    },

    resourceType: {
      type: String,
      enum: ['image', 'video', 'raw'],
      default: 'image',
    },

    originalFilename: {
      type: String,
      trim: true,
      default: '',
    },

    format: {
      type: String,
      trim: true,
      default: null,
    },

    fileSize: {
      type: Number,
      min: 0,
      default: 0,
    },

    width: {
      type: Number,
      min: 0,
      default: null,
    },

    height: {
      type: Number,
      min: 0,
      default: null,
    },

    duration: {
      type: Number,
      min: 0,
      default: null,
    },

    altText: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },

    status: {
      type: String,
      enum: [
        'active',
        'pending_delete',
        'deleted',
        'blocked',
      ],
      default: 'active',
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

mediaSchema.index(
  { publicId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      publicId: {
        $type: 'string',
      },
    },
  },
);

const Media = mongoose.model(
  'Media',
  mediaSchema,
);

export default Media;