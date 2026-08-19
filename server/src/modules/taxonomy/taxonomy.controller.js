import * as s from './taxonomy.service.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';

export const bootstrap = async (req, res) => {
  const [categoriesData, areasData, tagsData] = await Promise.all([
    s.list('categories', {}),
    s.list('areas', {}),
    s.list('tags', {}),
  ]);

  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  return sendSuccess(res, {
    data: {
      categories: categoriesData,
      areas: areasData,
      tags: tagsData,
    },
  });
};

export const categories = async (req, res) =>
  sendSuccess(res, { data: await s.list('categories', req.query) });
export const tags = async (req, res) => sendSuccess(res, { data: await s.list('tags', req.query) });
export const areas = async (req, res) =>
  sendSuccess(res, { data: await s.list('areas', req.query) });
export function admin(type) {
  return {
    create: async (req, res) => sendCreated(res, await s.create(type, req.body)),
    update: async (req, res) =>
      sendSuccess(res, { data: await s.update(type, req.params.id, req.body) }),
    remove: async (req, res) => sendSuccess(res, { data: await s.deactivate(type, req.params.id) }),
  };
}
