import Category from './category.model.js';
import Tag from './tag.model.js';
import Area from './area.model.js';
import { createUniqueSlug } from '../../services/slug.service.js';
import ApiError from '../../utils/ApiError.js';

const map = { categories: Category, tags: Tag, areas: Area };

function modelFor(type) {
  const Model = map[type];
  if (!Model) {
    throw new ApiError(400, 'Loại dữ liệu phân loại không hợp lệ.', 'INVALID_TAXONOMY_TYPE');
  }
  return Model;
}

function publicFilter(type, q = {}) {
  const filter = { isActive: true };
  if (q.scope && type === 'categories') {
    filter.contentScope = { $in: ['all', q.scope] };
  }
  if (q.parentId) filter.parentId = q.parentId;
  return filter;
}

function adminFilter(type, q = {}) {
  const filter = {};
  if (q.active === 'true') filter.isActive = true;
  if (q.active === 'false') filter.isActive = false;
  if (q.scope && type === 'categories') filter.contentScope = q.scope;
  if (q.areaType && type === 'areas') filter.areaType = q.areaType;
  if (q.parentId) filter.parentId = q.parentId;

  const term = String(q.q || '').trim();
  if (term) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { slug: { $regex: escaped, $options: 'i' } },
    ];
  }

  return filter;
}

function sortFor(type) {
  if (type === 'categories') return { displayOrder: 1, name: 1 };
  if (type === 'tags') return { usageCount: -1, name: 1 };
  return { name: 1 };
}

function filterEffectiveHierarchy(items) {
  const byId = new Map(items.map((item) => [String(item._id), item]));
  const memo = new Map();

  const isVisible = (item, stack = new Set()) => {
    const id = String(item._id);
    if (memo.has(id)) return memo.get(id);
    if (!item.parentId) {
      memo.set(id, true);
      return true;
    }

    const parentId = String(item.parentId);
    if (stack.has(parentId)) {
      memo.set(id, false);
      return false;
    }

    const parent = byId.get(parentId);
    if (!parent) {
      memo.set(id, false);
      return false;
    }

    const nextStack = new Set(stack);
    nextStack.add(id);
    const visible = isVisible(parent, nextStack);
    memo.set(id, visible);
    return visible;
  };

  return items.filter((item) => isVisible(item));
}

export async function list(type, q = {}) {
  const Model = modelFor(type);
  const items = await Model.find(publicFilter(type, q))
    .sort(sortFor(type))
    .lean();

  // Nếu một danh mục/khu vực cha đã tắt thì toàn bộ nhánh con cũng phải biến mất
  // khỏi public taxonomy, kể cả bản ghi con vẫn còn isActive=true.
  if (type !== 'tags' && !q.parentId) {
    return filterEffectiveHierarchy(items);
  }

  return items;
}

export async function listAdmin(type, q = {}) {
  const Model = modelFor(type);
  let query = Model.find(adminFilter(type, q)).sort(sortFor(type));

  if (type === 'categories') {
    query = query.populate('parentId', 'name slug contentScope isActive');
  } else if (type === 'areas') {
    query = query.populate('parentId', 'name slug areaType isActive');
  }

  return query.lean();
}

export async function create(type, data) {
  const Model = modelFor(type);
  const slug = await createUniqueSlug(Model, data.name);

  if (data.parentId && String(data.parentId) === String(data.id)) {
    throw new ApiError(422, 'Không thể tự làm cha của chính nó.', 'INVALID_PARENT');
  }

  return Model.create({ ...data, slug });
}

export async function update(type, id, data) {
  const Model = modelFor(type);
  const item = await Model.findById(id);

  if (!item) {
    throw new ApiError(404, 'Không tìm thấy dữ liệu phân loại.', 'TAXONOMY_NOT_FOUND');
  }

  if (data.parentId && String(data.parentId) === String(id)) {
    throw new ApiError(422, 'Không thể tự làm cha của chính nó.', 'INVALID_PARENT');
  }

  if (data.name && data.name !== item.name) {
    item.name = data.name;
    item.slug = await createUniqueSlug(Model, data.name, { excludeId: id });
  }

  for (const key of Object.keys(data)) {
    if (key !== 'name') item[key] = data[key];
  }

  await item.save();
  return item;
}

export async function deactivate(type, id) {
  const Model = modelFor(type);
  const item = await Model.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true },
  );

  if (!item) {
    throw new ApiError(404, 'Không tìm thấy dữ liệu phân loại.', 'TAXONOMY_NOT_FOUND');
  }

  return item;
}
