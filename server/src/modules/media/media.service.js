import Media from './media.model.js';
import {
  uploadImage as uploadImageToCloudinary,
  deleteCloudinaryAsset,
} from '../../services/storage.service.js';
import ApiError from '../../utils/ApiError.js';

export async function uploadImage(
  user,
  file,
  altText = '',
) {
  if (!file) {
    throw new ApiError(
      422,
      'Chưa chọn ảnh.',
      'IMAGE_REQUIRED',
    );
  }

  const uploaded = await uploadImageToCloudinary(file, {
    folder: 'media',
    maxWidth: 2000,
    maxHeight: 2000,
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

      altText: String(altText || '').trim(),

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

export async function listOwn(userId) {
  return Media.find({
    ownerId: userId,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function remove(userId, id) {
  const media = await Media.findOne({
    _id: id,
    ownerId: userId,
    deletedAt: null,
  });

  if (!media) {
    throw new ApiError(
      404,
      'Không tìm thấy tệp.',
      'MEDIA_NOT_FOUND',
    );
  }

  /*
   * Xóa asset khỏi Cloudinary trước.
   */
  if (
    media.provider === 'cloudinary' &&
    media.publicId
  ) {
    const result = await deleteCloudinaryAsset({
      publicId: media.publicId,
      resourceType:
        media.resourceType || 'image',
    });

    /*
     * Cloudinary có thể trả:
     * deleted, not found hoặc các trạng thái khác.
     */
    if (
      result?.result &&
      !['ok', 'not found'].includes(result.result)
    ) {
      throw new ApiError(
        502,
        'Không thể xóa ảnh trên Cloudinary.',
        'CLOUDINARY_DELETE_FAILED',
      );
    }
  }

  media.status = 'deleted';
  media.deletedAt = new Date();

  await media.save();

  return media;
}