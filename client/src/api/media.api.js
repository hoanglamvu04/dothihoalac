import { api, unwrap } from './http';
import { uploadImageFile } from '../utils/imageUpload';

export const mediaApi = {
  mine: async () => unwrap(await api.get('/media/mine')),

  uploadImage: async (file, altText = '', folder = 'general') =>
    uploadImageFile(file, { folder, altText }),

  uploadDocument: async (file) => {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('folder', 'editorial-documents');

    return unwrap(
      await api.post('/media/documents', formData),
    );
  },

  remove: async (id) =>
    unwrap(await api.delete(`/media/${id}`)),
};
