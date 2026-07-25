import Content from '../modules/contents/content.model.js';
import ContentBody from '../modules/contents/contentBody.model.js';
import ContentMedia from '../modules/media/contentMedia.model.js';
import Media from '../modules/media/media.model.js';
import { deleteCloudinaryAsset } from '../services/storage.service.js';

export async function cleanupMedia() {
  const cutoff = new Date(
    Date.now() - 7 * 86400000,
  );

  const items = await Media.find({
    status: 'pending_delete',
    deletedAt: {
      $lt: cutoff,
    },
  });

  if (!items.length) {
    return 0;
  }

  const mediaIds = items.map((item) => item._id);

  const [thumbnailRefs, bodyRefs, relationRefs] =
    await Promise.all([
      Content.find({
        thumbnailMediaId: {
          $in: mediaIds,
        },
        deletedAt: null,
      })
        .select('thumbnailMediaId')
        .lean(),
      ContentBody.find({
        inlineMediaIds: {
          $in: mediaIds,
        },
      })
        .select('inlineMediaIds')
        .lean(),
      ContentMedia.find({
        mediaId: {
          $in: mediaIds,
        },
      })
        .select('mediaId')
        .lean(),
    ]);

  const usedIds = new Set();

  for (const content of thumbnailRefs) {
    if (content.thumbnailMediaId) {
      usedIds.add(String(content.thumbnailMediaId));
    }
  }

  for (const body of bodyRefs) {
    for (const mediaId of body.inlineMediaIds || []) {
      usedIds.add(String(mediaId));
    }
  }

  for (const relation of relationRefs) {
    if (relation.mediaId) {
      usedIds.add(String(relation.mediaId));
    }
  }

  let deletedCount = 0;

  for (const item of items) {
    if (usedIds.has(String(item._id))) {
      item.status = 'active';
      item.deletedAt = null;
      await item.save();
      continue;
    }

    if (
      item.provider === 'cloudinary' &&
      item.publicId
    ) {
      await deleteCloudinaryAsset({
        publicId: item.publicId,
        resourceType:
          item.resourceType || 'image',
      }).catch(() => null);
    }

    await item.deleteOne();
    deletedCount += 1;
  }

  return deletedCount;
}
