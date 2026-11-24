import { api, unwrap } from './http';

export const savedSearchApi = {
  list: async () => unwrap(await api.get('/saved-searches')),
  create: async (filters) => unwrap(await api.post('/saved-searches', filters)),
  setActive: async (id, isActive) => unwrap(await api.patch('/saved-searches/' + encodeURIComponent(id), { isActive })),
  remove: async (id) => unwrap(await api.delete('/saved-searches/' + encodeURIComponent(id))),
};
