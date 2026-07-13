import Category from './category.model.js';
import Tag from './tag.model.js';
import Area from './area.model.js';
import { createUniqueSlug } from '../../services/slug.service.js';
import ApiError from '../../utils/ApiError.js';
const map = { categories: Category, tags: Tag, areas: Area };
export async function list(type, q = {}) {
  const M = map[type];
  const f = { isActive: true };
  if (q.scope && type === 'categories') f.contentScope = { $in: ['all', q.scope] };
  if (q.parentId) f.parentId = q.parentId;
  return M.find(f)
    .sort(type === 'categories' ? { displayOrder: 1, name: 1 } : { name: 1 })
    .lean();
}
export async function create(type, d) {
  const M = map[type];
  const slug = await createUniqueSlug(M, d.name);
  if (d.parentId && String(d.parentId) === String(d.id))
    throw new ApiError(422, 'Không thể tự làm cha của chính nó.', 'INVALID_PARENT');
  return M.create({ ...d, slug });
}
export async function update(type, id, d) {
  const M = map[type];
  const item = await M.findById(id);
  if (!item) throw new ApiError(404, 'Không tìm thấy dữ liệu phân loại.', 'TAXONOMY_NOT_FOUND');
  if (d.name && d.name !== item.name) {
    item.name = d.name;
    item.slug = await createUniqueSlug(M, d.name, { excludeId: id });
  }
  for (const k of Object.keys(d)) if (k !== 'name') item[k] = d[k];
  await item.save();
  return item;
}
export async function deactivate(type, id) {
  const M = map[type];
  const item = await M.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!item) throw new ApiError(404, 'Không tìm thấy dữ liệu phân loại.', 'TAXONOMY_NOT_FOUND');
  return item;
}
