import Content from '../contents/content.model.js';
import User from '../users/user.model.js';
import Area from '../taxonomy/area.model.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import { escapeRegex } from '../../utils/escapeRegex.js';

export async function search(query) {
  const q = String(query.q || '').trim();
  const { page, limit, skip } = parsePagination(query);
  if (!q)
    return {
      items: [],
      users: [],
      areas: [],
      meta: buildPaginationMeta({ page, limit, total: 0 }),
    };
  const regex = new RegExp(escapeRegex(q), 'i');
  const filter = {
    status: 'published',
    deletedAt: null,
    $or: [{ title: regex }, { summary: regex }, { bodyText: regex }],
  };
  if (query.type && query.type !== 'all') filter.contentType = query.type;
  if (query.area) filter.primaryAreaId = query.area;
  const [items, total, users, areas] = await Promise.all([
    Content.find(filter)
      .populate('authorId', 'username displayName')
      .populate('primaryAreaId', 'name slug')
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Content.countDocuments(filter),
    query.type === 'all' || query.type === 'user'
      ? User.find({
          deletedAt: null,
          status: 'active',
          $or: [{ username: regex }, { displayName: regex }],
        })
          .select('username displayName emailVerifiedAt phoneVerifiedAt')
          .limit(10)
          .lean()
      : [],
    query.type === 'all' || query.type === 'area'
      ? Area.find({ isActive: true, name: regex }).limit(10).lean()
      : [],
  ]);
  return { items, users, areas, meta: buildPaginationMeta({ page, limit, total }) };
}
