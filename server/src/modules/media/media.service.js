import Media from './media.model.js';
import { saveImageBuffer, removeStoredFile } from '../../services/storage.service.js';
import { env } from '../../config/env.js';
import ApiError from '../../utils/ApiError.js';
export async function uploadImage(user, file, altText = '') {
  if (!file) throw new ApiError(422, 'Chưa chọn ảnh.', 'IMAGE_REQUIRED');
  const saved = await saveImageBuffer(file.buffer, file.originalname, { ownerId: user._id });
  return Media.create({
    ownerId: user._id,
    fileName: saved.fileName,
    originalName: saved.originalName,
    fileType: 'image',
    mimeType: saved.mimeType,
    fileSize: saved.size,
    storagePath: saved.relativePath,
    publicUrl: `/uploads/${saved.relativePath}`,
    width: saved.width,
    height: saved.height,
    altText,
  });
}
export async function listOwn(userId) {
  return Media.find({ ownerId: userId, deletedAt: null }).sort({ createdAt: -1 }).lean();
}
export async function remove(userId, id) {
  const m = await Media.findOne({ _id: id, ownerId: userId, deletedAt: null });
  if (!m) throw new ApiError(404, 'Không tìm thấy tệp.', 'MEDIA_NOT_FOUND');
  m.status = 'pending_delete';
  m.deletedAt = new Date();
  await m.save();
  if (env.NODE_ENV === 'development') await removeStoredFile(m.storagePath);
  return m;
}
