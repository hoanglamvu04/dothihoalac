import Media from '../modules/media/media.model.js';
import { deleteCloudinaryAsset } from '../services/storage.service.js';

export async function cleanupMedia() {
  const cutoff = new Date(Date.now() - 7 * 86400000);
  const items = await Media.find({ status: 'pending_delete', deletedAt: { $lt: cutoff } });

  for (const item of items) {
    if (item.provider === 'cloudinary' && item.publicId) {
      await deleteCloudinaryAsset({
        publicId: item.publicId,
        resourceType: item.resourceType || 'image',
      }).catch(() => null);
    }
    await item.deleteOne();
  }
  return items.length;
}
