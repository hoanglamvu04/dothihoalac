import crypto from 'node:crypto';
import path from 'node:path';
import { Readable } from 'node:stream';

import cloudinary from '../config/cloudinary.js';

const ROOT_FOLDER =
  process.env.CLOUDINARY_FOLDER?.trim() || 'dothihoalac';

function sanitizeFolderPart(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function removeExtension(filename = '') {
  return path.parse(filename).name || 'media';
}

function safeExtension(filename = '') {
  const extension = path.extname(filename).toLowerCase();

  return /^\.[a-z0-9]{1,8}$/.test(extension)
    ? extension
    : '';
}

function createPublicId(originalName = 'media') {
  const filenameWithoutExtension =
    removeExtension(originalName);

  const safeName =
    sanitizeFolderPart(filenameWithoutExtension) || 'media';

  return `${safeName}-${crypto.randomUUID()}`;
}

function createRawPublicId(originalName = 'document') {
  return `${createPublicId(originalName)}${safeExtension(originalName)}`;
}

function buildTargetFolder(folder = 'general') {
  const safeFolder =
    sanitizeFolderPart(folder) || 'general';

  return `${ROOT_FOLDER}/${safeFolder}`;
}

function uploadBuffer({
  buffer,
  folder,
  publicId,
  resourceType = 'image',
  format,
  transformation,
}) {
  return new Promise((resolve, reject) => {
    if (!buffer) {
      reject(
        new Error('Không tìm thấy buffer của tệp tải lên.'),
      );
      return;
    }

    const uploadOptions = {
      folder,
      public_id: publicId,
      resource_type: resourceType,
      overwrite: false,
      unique_filename: false,
      use_filename: false,
    };

    if (format) {
      uploadOptions.format = format;
    }

    if (transformation) {
      uploadOptions.transformation = transformation;
    }

    const uploadStream =
      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result?.public_id || !result?.secure_url) {
            reject(
              new Error(
                'Cloudinary không trả về đầy đủ thông tin tệp.',
              ),
            );
            return;
          }

          resolve(result);
        },
      );

    Readable.from(buffer).pipe(uploadStream);
  });
}

export async function uploadImage(
  file,
  {
    folder = 'general',
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 'auto:good',
  } = {},
) {
  if (!file?.buffer) {
    throw new Error(
      'Không tìm thấy dữ liệu ảnh để tải lên.',
    );
  }

  const result = await uploadBuffer({
    buffer: file.buffer,
    folder: buildTargetFolder(folder),
    publicId: createPublicId(file.originalname),
    resourceType: 'image',

    // Ép ảnh lưu trên Cloudinary thành WebP.
    format: 'webp',

    transformation: [
      {
        width: maxWidth,
        height: maxHeight,
        crop: 'limit',
      },
      {
        quality,
      },
    ],
  });

  return {
    provider: 'cloudinary',

    publicId: result.public_id,
    assetId: result.asset_id,

    url: result.secure_url,
    secureUrl: result.secure_url,

    resourceType: result.resource_type,
    format: result.format,

    width: result.width,
    height: result.height,
    bytes: result.bytes,

    originalFilename: file.originalname,
    originalMimeType: file.mimetype,
  };
}

export async function uploadMultipleImages(
  files,
  options = {},
) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error(
      'Không có ảnh nào được gửi lên.',
    );
  }

  return Promise.all(
    files.map((file) => uploadImage(file, options)),
  );
}

export async function uploadDocument(
  file,
  {
    folder = 'documents',
  } = {},
) {
  if (!file?.buffer) {
    throw new Error(
      'Không tìm thấy dữ liệu tài liệu để tải lên.',
    );
  }

  const result = await uploadBuffer({
    buffer: file.buffer,
    folder: buildTargetFolder(folder),
    publicId: createRawPublicId(file.originalname),
    resourceType: 'raw',
  });

  return {
    provider: 'cloudinary',

    publicId: result.public_id,
    assetId: result.asset_id,

    url: result.secure_url,
    secureUrl: result.secure_url,

    resourceType: result.resource_type || 'raw',
    format:
      result.format ||
      safeExtension(file.originalname).replace(/^\./, '') ||
      null,

    bytes: result.bytes,

    originalFilename: file.originalname,
    originalMimeType: file.mimetype,
  };
}

export async function uploadVideo(
  file,
  {
    folder = 'videos',
  } = {},
) {
  if (!file?.buffer) {
    throw new Error(
      'Không tìm thấy dữ liệu video để tải lên.',
    );
  }

  const result = await uploadBuffer({
    buffer: file.buffer,
    folder: buildTargetFolder(folder),
    publicId: createPublicId(file.originalname),
    resourceType: 'video',
  });

  return {
    provider: 'cloudinary',

    publicId: result.public_id,
    assetId: result.asset_id,

    url: result.secure_url,
    secureUrl: result.secure_url,

    resourceType: result.resource_type,
    format: result.format,

    width: result.width,
    height: result.height,
    duration: result.duration,
    bytes: result.bytes,

    originalFilename: file.originalname,
    originalMimeType: file.mimetype,
  };
}

export async function deleteCloudinaryAsset({
  publicId,
  resourceType = 'image',
} = {}) {
  if (!publicId) {
    return {
      result: 'not_found',
    };
  }

  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}

/**
 * Hàm tương thích với các controller/service cũ đang import
 * removeStoredFile.
 *
 * Hỗ trợ:
 * removeStoredFile('dothihoalac/articles/abc')
 *
 * removeStoredFile({
 *   publicId: 'dothihoalac/articles/abc',
 *   resourceType: 'image'
 * })
 *
 * removeStoredFile({
 *   public_id: 'dothihoalac/articles/abc',
 *   resource_type: 'image'
 * })
 */
export async function removeStoredFile(
  fileOrPublicId,
  resourceType = 'image',
) {
  if (!fileOrPublicId) {
    return {
      result: 'not_found',
    };
  }

  if (typeof fileOrPublicId === 'string') {
    return deleteCloudinaryAsset({
      publicId: fileOrPublicId,
      resourceType,
    });
  }

  const publicId =
    fileOrPublicId.publicId ||
    fileOrPublicId.public_id;

  const resolvedResourceType =
    fileOrPublicId.resourceType ||
    fileOrPublicId.resource_type ||
    resourceType;

  if (!publicId) {
    return {
      result: 'not_found',
    };
  }

  return deleteCloudinaryAsset({
    publicId,
    resourceType: resolvedResourceType,
  });
}
