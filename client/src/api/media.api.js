import { api, unwrap } from './http';

export const mediaApi = {
  mine: async () => unwrap(await api.get('/media/mine')),

  uploadImage: async (file, altText = '') => {
    const formData = new FormData();

    formData.append('image', file);
    formData.append('altText', altText);

    return unwrap(
      await api.post('/media/images', formData),
    );
  },

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
