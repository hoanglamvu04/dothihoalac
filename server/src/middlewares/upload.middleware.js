import multer from 'multer';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const imageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const documentMimeTypes = new Set([
  'application/pdf',
]);

const storage = multer.memoryStorage();

function imageFilter(_req, file, callback) {
  if (!imageMimeTypes.has(file.mimetype)) {
    return callback(
      new ApiError(
        415,
        'Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF hoặc AVIF.',
        'UNSUPPORTED_IMAGE_TYPE',
      ),
    );
  }

  return callback(null, true);
}

function genericFilter(_req, file, callback) {
  const allowedMimeTypes = new Set([
    ...imageMimeTypes,
    ...documentMimeTypes,
  ]);

  if (!allowedMimeTypes.has(file.mimetype)) {
    return callback(
      new ApiError(
        415,
        'Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF, AVIF hoặc tài liệu PDF.',
        'UNSUPPORTED_FILE_TYPE',
      ),
    );
  }

  return callback(null, true);
}

const maxImageSize =
  Number(env.MAX_IMAGE_SIZE_MB || 10) * 1024 * 1024;

const maxFileSize =
  Number(env.MAX_VIDEO_SIZE_MB || 100) * 1024 * 1024;

const maxImagesPerContent =
  Number(env.MAX_IMAGES_PER_CONTENT || 20);

export const uploadSingleImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: maxImageSize,
    files: 1,
  },
}).single('image');

export const uploadMultipleImages = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: maxImageSize,
    files: maxImagesPerContent,
  },
}).array('images', maxImagesPerContent);

export const uploadSingleFile = multer({
  storage,
  fileFilter: genericFilter,
  limits: {
    fileSize: maxFileSize,
    files: 1,
  },
}).single('file');