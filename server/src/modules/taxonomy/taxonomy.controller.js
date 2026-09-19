import * as service from './taxonomy.service.js';
import Content from '../contents/content.model.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';

async function communityTaxonomyCounts() {
  const [result] = await Content.aggregate([
    {
      $match: {
        contentType: 'community',
        status: 'published',
        visibility: 'public',
        deletedAt: null,
      },
    },
    {
      $facet: {
        categories: [
          { $match: { primaryCategoryId: { $ne: null } } },
          {
            $group: {
              _id: '$primaryCategoryId',
              count: { $sum: 1 },
            },
          },
        ],
        areas: [
          { $match: { primaryAreaId: { $ne: null } } },
          {
            $group: {
              _id: '$primaryAreaId',
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  return {
    categories: new Map(
      (result?.categories || []).map((item) => [
        String(item._id),
        Number(item.count || 0),
      ]),
    ),
    areas: new Map(
      (result?.areas || []).map((item) => [
        String(item._id),
        Number(item.count || 0),
      ]),
    ),
  };
}

function withCommunityCounts(items = [], counts = new Map()) {
  return items.map((item) => ({
    ...item,
    communityCount: counts.get(String(item._id)) || 0,
  }));
}

export const bootstrap = async (req, res) => {
  const [categoriesData, areasData, tagsData, communityCounts] =
    await Promise.all([
      service.list('categories', {}),
      service.list('areas', {}),
      service.list('tags', {}),
      communityTaxonomyCounts(),
    ]);

  // Taxonomy thay đổi từ admin phải phản ánh ngay ở public UI. Client đã có
  // session cache riêng nên endpoint này chỉ cần revalidate thay vì giữ bản cũ 5-15 phút.
  res.set('Cache-Control', 'private, max-age=0, must-revalidate');

  return sendSuccess(res, {
    data: {
      categories: withCommunityCounts(
        categoriesData,
        communityCounts.categories,
      ),
      areas: withCommunityCounts(
        areasData,
        communityCounts.areas,
      ),
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
