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
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const documentExtensions = new Set([
  'pdf',
  'doc',
  'docx',
]);

const storage = multer.memoryStorage();

function fileExtension(filename = '') {
  const match = String(filename || '')
    .trim()
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/);

  return match?.[1] || '';
}

function isDocumentFile(file) {
  if (documentMimeTypes.has(file?.mimetype)) {
    return true;
  }

  const extension = fileExtension(file?.originalname);
  const mimeType = String(file?.mimetype || '').trim().toLowerCase();

  return (
    documentExtensions.has(extension) &&
    (!mimeType || mimeType === 'application/octet-stream')
  );
}

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

function documentFilter(_req, file, callback) {
  if (!isDocumentFile(file)) {
    return callback(
      new ApiError(
        415,
        'Chỉ hỗ trợ tài liệu PDF, DOC hoặc DOCX.',
        'UNSUPPORTED_DOCUMENT_TYPE',
      ),
    );
  }

  return callback(null, true);
}

function genericFilter(_req, file, callback) {
  const allowed =
    imageMimeTypes.has(file.mimetype) ||
    isDocumentFile(file);

  if (!allowed) {
    return callback(
      new ApiError(
        415,
        'Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF, AVIF hoặc tài liệu PDF, DOC, DOCX.',
        'UNSUPPORTED_FILE_TYPE',
      ),
    );
  }

  return callback(null, true);
}

const maxImageSize =
  Number(env.MAX_IMAGE_SIZE_MB || 10) * 1024 * 1024;

const maxDocumentSize =
  Number(env.MAX_DOCUMENT_SIZE_MB || 25) * 1024 * 1024;

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

export const uploadSingleDocument = multer({
  storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: maxDocumentSize,
    files: 1,
  },
}).single('file');

export const uploadSingleFile = multer({
  storage,
  fileFilter: genericFilter,
  limits: {
    fileSize: maxFileSize,
    files: 1,
  },
}).single('file');
