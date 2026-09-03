import * as service from './taxonomy.service.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';

export const bootstrap = async (req, res) => {
  const [categoriesData, areasData, tagsData] = await Promise.all([
    service.list('categories', {}),
    service.list('areas', {}),
    service.list('tags', {}),
  ]);

  // Taxonomy thay đổi từ admin phải phản ánh ngay ở public UI. Client đã có
  // session cache riêng nên endpoint này chỉ cần revalidate thay vì giữ bản cũ 5-15 phút.
  res.set('Cache-Control', 'private, max-age=0, must-revalidate');

  return sendSuccess(res, {
    data: {
      categories: categoriesData,
      areas: areasData,
      tags: tagsData,
    },
  });
};

export const categories = async (req, res) =>
  sendSuccess(res, { data: await service.list('categories', req.query) });

export const tags = async (req, res) =>
  sendSuccess(res, { data: await service.list('tags', req.query) });

export const areas = async (req, res) =>
  sendSuccess(res, { data: await service.list('areas', req.query) });

export function admin(type) {
  return {
    list: async (req, res) =>
      sendSuccess(res, { data: await service.listAdmin(type, req.query) }),
    create: async (req, res) =>
      sendCreated(res, await service.create(type, req.body)),
    update: async (req, res) =>
      sendSuccess(res, {
        data: await service.update(type, req.params.id, req.body),
      }),
    remove: async (req, res) =>
      sendSuccess(res, {
        data: await service.deactivate(type, req.params.id),
      }),
  };
}
