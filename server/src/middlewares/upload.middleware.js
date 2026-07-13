import multer from 'multer';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const documentMimeTypes = new Set(['application/pdf']);

const storage = multer.memoryStorage();

function imageFilter(_req, file, callback) {
  if (!imageMimeTypes.has(file.mimetype)) {
    return callback(
      new ApiError(415, 'Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.', 'UNSUPPORTED_IMAGE_TYPE'),
    );
  }
  return callback(null, true);
}

function genericFilter(_req, file, callback) {
  if (![...imageMimeTypes, ...documentMimeTypes].includes(file.mimetype)) {
    return callback(new ApiError(415, 'Định dạng tệp không được hỗ trợ.', 'UNSUPPORTED_FILE_TYPE'));
  }
  return callback(null, true);
}

export const uploadSingleImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: env.MAX_IMAGE_SIZE_MB * 1024 * 1024 },
}).single('image');
export const uploadMultipleImages = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: env.MAX_IMAGE_SIZE_MB * 1024 * 1024, files: 20 },
}).array('images', 20);
export const uploadSingleFile = multer({
  storage,
  fileFilter: genericFilter,
  limits: { fileSize: env.MAX_VIDEO_SIZE_MB * 1024 * 1024 },
}).single('file');
