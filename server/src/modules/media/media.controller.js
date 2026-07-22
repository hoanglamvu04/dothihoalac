import {
  uploadImage,
  deleteCloudinaryAsset,
} from "../../services/storage.service.js";
import Media from "./media.model.js";

export const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ảnh",
      });
    }

    const uploaded = await uploadImage(req.file, {
      folder: req.body.folder || "general",
    });

    let media;

    try {
      media = await Media.create({
        ownerId: req.user._id,
        provider: uploaded.provider,
        publicId: uploaded.publicId,
        assetId: uploaded.assetId,
        url: uploaded.secureUrl,
        secureUrl: uploaded.secureUrl,
        resourceType: uploaded.resourceType,
        format: uploaded.format,
        width: uploaded.width,
        height: uploaded.height,
        fileSize: uploaded.bytes,
        originalFilename: uploaded.originalFilename,
        status: "active",
      });
    } catch (databaseError) {
      // Nếu Cloudinary upload thành công nhưng lưu DB thất bại,
      // xóa asset để tránh file rác.
      await deleteCloudinaryAsset({
        publicId: uploaded.publicId,
        resourceType: uploaded.resourceType,
      }).catch(() => null);

      throw databaseError;
    }

    return res.status(201).json({
      success: true,
      message: "Tải ảnh thành công",
      data: media,
    });
  } catch (error) {
    next(error);
  }
};