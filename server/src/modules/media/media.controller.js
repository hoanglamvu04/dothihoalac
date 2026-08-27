import * as mediaService from './media.service.js';

export async function uploadMedia(req, res) {
  const media = await mediaService.uploadImage(
    req.user,
    req.file,
    {
      altText: req.body?.altText,
      folder: req.body?.folder || 'general',
    },
  );

  return res.status(201).json({
    success: true,
    message: 'Tải ảnh thành công.',
    data: media,
  });
}

export async function uploadDocument(req, res) {
  const media = await mediaService.uploadDocument(
    req.user,
    req.file,
    {
      folder:
        req.body?.folder ||
        'editorial-documents',
    },
  );

  return res.status(201).json({
    success: true,
    message: 'Tải tài liệu thành công.',
    data: media,
  });
}

export async function listOwnMedia(req, res) {
  const items = await mediaService.listOwn(
    req.user._id,
  );

  return res.json({
    success: true,
    data: items,
  });
}

export async function deleteMedia(req, res) {
  const media = await mediaService.remove(
    req.user._id,
    req.params.id,
  );

  return res.json({
    success: true,
    message: 'Đã xóa tệp.',
    data: media,
  });
}
