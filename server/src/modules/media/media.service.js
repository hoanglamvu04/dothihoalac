import mongoose from 'mongoose';

import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import ContentMedia from './contentMedia.model.js';
import Media from './media.model.js';

import {
  uploadImage as uploadImageToCloudinary,
  uploadDocument as uploadDocumentToCloudinary,
  deleteCloudinaryAsset,
} from '../../services/storage.service.js';
import ApiError from '../../utils/ApiError.js';

function normalizeText(value = '', maxLength = 300) {
  return String(value || '')
    .trim()
    .slice(0, maxLength);
}

function normalizeFolder(value = 'media') {
  return normalizeText(value || 'media', 80) || 'media';
}

export async function uploadImage(
  user,
  file,
  {
    altText = '',
    folder = 'media',
  } = {},
) {
  if (!user?._id) {
    throw new ApiError(
      401,
      'Bạn cần đăng nhập để tải ảnh.',
      'AUTH_REQUIRED',
    );
  }

  if (!file) {
    throw new ApiError(
      422,
      'Chưa chọn ảnh.',
      'IMAGE_REQUIRED',
    );
  }

  const uploaded = await uploadImageToCloudinary(file, {
    folder: normalizeFolder(folder),
    maxWidth: 2400,
    maxHeight: 2400,
  });

  try {
    return await Media.create({
      ownerId: user._id,
      provider: 'cloudinary',
      publicId: uploaded.publicId,
      assetId: uploaded.assetId,
      url: uploaded.secureUrl,
      secureUrl: uploaded.secureUrl,
      resourceType: uploaded.resourceType || 'image',
      originalFilename:
        uploaded.originalFilename || file.originalname,
      format: uploaded.format || 'webp',
      fileSize: uploaded.bytes || file.size,
      width: uploaded.width,
      height: uploaded.height,
      altText: normalizeText(altText, 300),
      status: 'active',
      deletedAt: null,
    });
  } catch (error) {
    /*
     * Cloudinary upload thành công nhưng MongoDB lưu thất bại:
     * xóa ảnh vừa tải để tránh file rác.
     */
    await deleteCloudinaryAsset({
      publicId: uploaded.publicId,
      resourceType:
        uploaded.resourceType || 'image',
    }).catch(() => null);

    throw error;
  }
}

export async function uploadDocument(
  user,
  file,
  {
    folder = 'editorial-documents',
  } = {},
) {
  if (!user?._id) {
    throw new ApiError(
      401,
      'Bạn cần đăng nhập để tải tài liệu.',
      'AUTH_REQUIRED',
    );
  }

  if (!file) {
    throw new ApiError(
      422,
      'Chưa chọn tài liệu.',
      'DOCUMENT_REQUIRED',
    );
  }

  const uploaded = await uploadDocumentToCloudinary(file, {
    folder: normalizeFolder(folder),
  });

  try {
    return await Media.create({
      ownerId: user._id,
      provider: 'cloudinary',
      publicId: uploaded.publicId,
      assetId: uploaded.assetId,
      url: uploaded.secureUrl,
      secureUrl: uploaded.secureUrl,
      resourceType: uploaded.resourceType || 'raw',
      originalFilename:
        uploaded.originalFilename || file.originalname,
      format:
        uploaded.format ||
        String(file.originalname || '')
          .split('.')
          .pop()
          ?.toLowerCase() ||
        null,
      fileSize: uploaded.bytes || file.size,
      altText: normalizeText(
        uploaded.originalFilename || file.originalname,
        300,
      ),
      status: 'active',
      deletedAt: null,
    });
  } catch (error) {
    await deleteCloudinaryAsset({
      publicId: uploaded.publicId,
      resourceType:
        uploaded.resourceType || 'raw',
    }).catch(() => null);

    throw error;
  }
}

export async function listOwn(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(
      401,
      'Bạn cần đăng nhập.',
      'AUTH_REQUIRED',
    );
  }

  return Media.find({
    ownerId: userId,
    status: 'active',
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function getMediaUsage(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(
      400,
      'Media ID không hợp lệ.',
      'INVALID_MEDIA_ID',
    );
  }

  const [thumbnailUsage, bodyUsage, relationUsage] =
    await Promise.all([
      Content.exists({
        thumbnailMediaId: id,
        deletedAt: null,
      }),
      ContentBody.exists({
        inlineMediaIds: id,
      }),
      ContentMedia.exists({
        mediaId: id,
      }),
    ]);

  return {
    usedAsThumbnail: Boolean(thumbnailUsage),
    usedInline: Boolean(bodyUsage || relationUsage),
    inUse: Boolean(
      thumbnailUsage || bodyUsage || relationUsage,
    ),
  };
}

export async function remove(userId, id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(
      400,
      'Media ID không hợp lệ.',
      'INVALID_MEDIA_ID',
    );
  }

  const media = await Media.findOne({
    _id: id,
    ownerId: userId,
    status: {
      $ne: 'deleted',
    },
    deletedAt: null,
  });

  if (!media) {
    throw new ApiError(
      404,
      'Không tìm thấy tệp.',
      'MEDIA_NOT_FOUND',
    );
  }

  const usage = await getMediaUsage(id);

  if (usage.inUse) {
    throw new ApiError(
      409,
      'Tệp đang được sử dụng trong nội dung nên chưa thể xóa.',
      'MEDIA_IN_USE',
      usage,
    );
  }

  media.status = 'pending_delete';
  media.deletedAt = new Date();
  await media.save();

  try {
    if (
      media.provider === 'cloudinary' &&
      media.publicId
    ) {
      const result = await deleteCloudinaryAsset({
        publicId: media.publicId,
        resourceType:
          media.resourceType || 'image',
      });

      if (
        result?.result &&
        !['ok', 'not found', 'not_found'].includes(
          result.result,
        )
      ) {
        throw new ApiError(
          502,
          'Không thể xóa tệp trên Cloudinary.',
          'CLOUDINARY_DELETE_FAILED',
        );
      }
    }

    media.status = 'deleted';
    await media.save();
  } catch (error) {
    media.status = 'active';
    media.deletedAt = null;
    await media.save().catch(() => null);
    throw error;
  }

  return media;
}
