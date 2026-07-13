import Media from '../modules/media/media.model.js';
import { removeStoredFile } from '../services/storage.service.js';
export async function cleanupMedia() {
  const cutoff = new Date(Date.now() - 7 * 86400000);
  const items = await Media.find({ status: 'pending_delete', deletedAt: { $lt: cutoff } });
  for (const item of items) {
    await removeStoredFile(item.storagePath);
    await item.deleteOne();
  }
  return items.length;
}
