import mongoose from 'mongoose';

import Area from '../taxonomy/area.model.js';
import Project from './project.model.js';
import ApiError from '../../utils/ApiError.js';
import { escapeRegex } from '../../utils/escapeRegex.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import { writeAuditLog } from '../../services/audit.service.js';

const ACTIVE_STATUSES = [
  'proposed',
  'planning',
  'approved',
  'preparing',
  'tendering',
  'construction',
  'paused',
];

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSlug(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 300);
}

function asBoolean(value) {
  return ['1', 'true', true].includes(value);
}

function uniqueStrings(values = []) {
  return [...new Set((values || []).map(cleanText).filter(Boolean))];
}

function uniqueIds(values = []) {
  return [...new Set((values || []).filter(Boolean).map(String))];
}

function numericFilter(value, min, max) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(Math.max(number, min), max);
}

async function resolveAreaId(value) {
  const normalized = cleanText(value);
  if (!normalized) return null;

  if (mongoose.isValidObjectId(normalized)) {
    const exists = await Area.exists({ _id: normalized, isActive: true });
    return exists ? normalized : null;
  }

  const item = await Area.findOne({ slug: normalized.toLowerCase(), isActive: true })
    .select('_id')
    .lean();
  return item?._id || null;
}

async function makeUniqueSlug(value, excludeId = null) {
  const base = normalizeSlug(value) || `du-an-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (
    await Project.exists({
      slug: candidate,
      deletedAt: null,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function makeUniqueCode(value, excludeId = null) {
  const requested = cleanText(value).toUpperCase().replace(/\s+/g, '-');
  let base = requested;

  if (!base) {
    const year = new Date().getFullYear();
    const count = await Project.countDocuments({});
    base = `DTHL-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  let candidate = base.slice(0, 54);
  let suffix = 2;

  while (
    await Project.exists({
      code: candidate,
      deletedAt: null,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    candidate = `${base.slice(0, 48)}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function publicShape(project) {
  if (!project) return project;

  const plain = typeof project.toObject === 'function' ? project.toObject() : project;
  const {
    risks,
    createdBy,
    updatedBy,
    deletedAt,
    ...safe
  } = plain;

  return {
    ...safe,
    updates: (safe.updates || []).map(({ createdBy: _createdBy, ...update }) => update),
  };
}

function applyBody(project, data = {}) {
  const textFields = [
    'name',
    'shortName',
    'locationText',
    'investor',
    'developer',
    'managingAuthority',
    'contractor',
    'consultant',
    'scaleText',
    'approvalDecisionNo',
    'description',
    'objectives',
    'currentUpdate',
    'risks',
    'nextSteps',
  ];

  textFields.forEach((field) => {
    if (data[field] !== undefined) project[field] = cleanText(data[field]);
  });

  const directFields = [
    'projectType',
    'status',
    'priority',
    'progressPercent',
    'primaryAreaId',
    'latitude',
    'longitude',
    'totalInvestmentVnd',
    'landAreaHa',
    'lengthKm',
    'approvalDecisionDate',
    'startDate',
    'expectedCompletionDate',
    'completedAt',
    'isFeatured',
    'isPublic',
    'sortOrder',
  ];

  directFields.forEach((field) => {
    if (data[field] !== undefined) project[field] = data[field];
  });

  if (data.areaIds !== undefined) project.areaIds = uniqueIds(data.areaIds);
  if (data.fundingSources !== undefined) project.fundingSources = uniqueStrings(data.fundingSources);

  if (data.milestones !== undefined) {
    project.milestones = (data.milestones || []).map((item) => ({
      ...item,
      title: cleanText(item.title),
      note: cleanText(item.note),
    }));
  }

  if (data.sourceUrls !== undefined) {
    project.sourceUrls = (data.sourceUrls || []).map((item) => ({
      ...item,
      label: cleanText(item.label),
      url: cleanText(item.url),
    }));
  }

  if (project.status === 'completed') {
    project.progressPercent = 100;
    project.completedAt = project.completedAt || new Date();
  } else if (data.status !== undefined && data.completedAt === undefined) {
    project.completedAt = null;
  }
}

async function getAdminSummary() {
  const now = new Date();
  const base = { deletedAt: null };

  const [
    total,
    active,
    construction,
    completed,
    delayed,
    featured,
    publicCount,
    investment,
  ] = await Promise.all([
    Project.countDocuments(base),
    Project.countDocuments({ ...base, status: { $in: ACTIVE_STATUSES } }),
    Project.countDocuments({ ...base, status: 'construction' }),
    Project.countDocuments({ ...base, status: 'completed' }),
    Project.countDocuments({
      ...base,
      expectedCompletionDate: { $lt: now },
      status: { $nin: ['completed', 'cancelled'] },
    }),
    Project.countDocuments({ ...base, isFeatured: true }),
    Project.countDocuments({ ...base, isPublic: true }),
    Project.aggregate([
      { $match: { deletedAt: null, totalInvestmentVnd: { $ne: null } } },
      { $group: { _id: null, total: { $sum: '$totalInvestmentVnd' } } },
    ]),
  ]);

  return {
    total,
    active,
    construction,
    completed,
    delayed,
    featured,
    public: publicCount,
    totalInvestmentVnd: investment[0]?.total || 0,
  };
}

export async function listPublic(query = {}) {
  const { page, limit, skip } = parsePagination(query, { limit: 6 });
  const filter = { deletedAt: null, isPublic: true };

  if (query.type) filter.projectType = query.type;
  if (query.status) filter.status = query.status;
  if (query.featured !== undefined) filter.isFeatured = asBoolean(query.featured);

  if (query.area) {
    const areaId = await resolveAreaId(query.area);
    if (!areaId) {
      return { items: [], meta: buildPaginationMeta({ page, limit, total: 0 }) };
    }
    filter.$or = [{ primaryAreaId: areaId }, { areaIds: areaId }];
  }

  if (query.q) {
    const regex = new RegExp(escapeRegex(cleanText(query.q)), 'i');
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ name: regex }, { shortName: regex }, { investor: regex }, { locationText: regex }] },
    ];
  }

  const [items, total] = await Promise.all([
    Project.find(filter)
      .sort({ isFeatured: -1, sortOrder: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('primaryAreaId', 'name slug areaType')
      .populate('areaIds', 'name slug areaType')
      .lean(),
    Project.countDocuments(filter),
  ]);

  return {
    items: items.map(publicShape),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

export async function publicDetail(slug) {
  const item = await Project.findOne({
    slug: normalizeSlug(slug),
    deletedAt: null,
    isPublic: true,
  })
    .populate('primaryAreaId', 'name slug areaType')
    .populate('areaIds', 'name slug areaType')
    .lean();

  if (!item) throw new ApiError(404, 'Không tìm thấy dự án.', 'PROJECT_NOT_FOUND');
  return publicShape(item);
}

export async function adminList(query = {}) {
  const { page, limit, skip } = parsePagination(query, { limit: 25 });
  const filter = { deletedAt: null };

  if (query.type) filter.projectType = query.type;
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.visibility) filter.isPublic = query.visibility === 'public';
  if (query.featured !== undefined) filter.isFeatured = asBoolean(query.featured);

  const progressMin = numericFilter(query.progressMin, 0, 100);
  const progressMax = numericFilter(query.progressMax, 0, 100);
  if (progressMin !== null || progressMax !== null) {
    filter.progressPercent = {};
    if (progressMin !== null) filter.progressPercent.$gte = progressMin;
    if (progressMax !== null) filter.progressPercent.$lte = progressMax;
  }

  if (query.area) {
    const areaId = await resolveAreaId(query.area);
    if (areaId) filter.$or = [{ primaryAreaId: areaId }, { areaIds: areaId }];
    else return {
      items: [],
      meta: {
        ...buildPaginationMeta({ page, limit, total: 0 }),
        summary: await getAdminSummary(),
      },
    };
  }

  if (query.q) {
    const regex = new RegExp(escapeRegex(cleanText(query.q)), 'i');
    const searchClause = {
      $or: [
        { name: regex },
        { shortName: regex },
        { code: regex },
        { investor: regex },
        { developer: regex },
        { managingAuthority: regex },
        { locationText: regex },
      ],
    };

    if (filter.$or) {
      const areaClause = { $or: filter.$or };
      delete filter.$or;
      filter.$and = [areaClause, searchClause];
    } else {
      filter.$or = searchClause.$or;
    }
  }

  const sortMap = {
    name: { name: 1 },
    progress: { progressPercent: -1, updatedAt: -1 },
    deadline: { expectedCompletionDate: 1, updatedAt: -1 },
    investment: { totalInvestmentVnd: -1, updatedAt: -1 },
    updated: { updatedAt: -1 },
  };

  const [items, total, summary] = await Promise.all([
    Project.find(filter)
      .sort(sortMap[query.sort] || sortMap.updated)
      .skip(skip)
      .limit(limit)
      .populate('primaryAreaId', 'name slug areaType')
      .lean(),
    Project.countDocuments(filter),
    getAdminSummary(),
  ]);

  return {
    items,
    meta: {
      ...buildPaginationMeta({ page, limit, total }),
      summary,
    },
  };
}

export async function adminDetail(id) {
  const item = await Project.findOne({ _id: id, deletedAt: null })
    .populate('primaryAreaId', 'name slug areaType')
    .populate('areaIds', 'name slug areaType')
    .populate('createdBy', 'username displayName email')
    .populate('updatedBy', 'username displayName email')
    .populate('updates.createdBy', 'username displayName')
    .lean();

  if (!item) throw new ApiError(404, 'Không tìm thấy dự án.', 'PROJECT_NOT_FOUND');
  return item;
}

export async function create(admin, data, ipAddress) {
  const project = new Project({
    ...data,
    code: await makeUniqueCode(data.code),
    slug: await makeUniqueSlug(data.slug || data.name),
    createdBy: admin?._id || null,
    updatedBy: admin?._id || null,
  });

  applyBody(project, data);
  await project.save();

  await writeAuditLog({
    adminId: admin?._id,
    action: 'project.create',
    targetType: 'project',
    targetId: project._id,
    oldData: null,
    newData: { name: project.name, code: project.code, status: project.status },
    ipAddress,
  });

  return adminDetail(project._id);
}

export async function update(admin, id, data, ipAddress) {
  const project = await Project.findOne({ _id: id, deletedAt: null });
  if (!project) throw new ApiError(404, 'Không tìm thấy dự án.', 'PROJECT_NOT_FOUND');

  const oldData = {
    name: project.name,
    status: project.status,
    progressPercent: project.progressPercent,
    expectedCompletionDate: project.expectedCompletionDate,
    isPublic: project.isPublic,
    isFeatured: project.isFeatured,
  };

  if (data.slug !== undefined || (data.name !== undefined && !project.slug)) {
    project.slug = await makeUniqueSlug(data.slug || data.name || project.name, project._id);
  }

  if (data.code !== undefined) {
    project.code = await makeUniqueCode(data.code, project._id);
  }

  applyBody(project, data);
  project.updatedBy = admin?._id || null;
  await project.save();

  await writeAuditLog({
    adminId: admin?._id,
    action: 'project.update',
    targetType: 'project',
    targetId: project._id,
    oldData,
    newData: {
      name: project.name,
      status: project.status,
      progressPercent: project.progressPercent,
      expectedCompletionDate: project.expectedCompletionDate,
      isPublic: project.isPublic,
      isFeatured: project.isFeatured,
    },
    ipAddress,
  });

  return adminDetail(project._id);
}

export async function addUpdate(admin, id, data, ipAddress) {
  const project = await Project.findOne({ _id: id, deletedAt: null });
  if (!project) throw new ApiError(404, 'Không tìm thấy dự án.', 'PROJECT_NOT_FOUND');

  const oldData = {
    status: project.status,
    progressPercent: project.progressPercent,
    currentUpdate: project.currentUpdate,
  };

  project.updates.unshift({
    updateDate: data.updateDate || new Date(),
    title: cleanText(data.title),
    summary: cleanText(data.summary),
    progressPercent: data.progressPercent ?? null,
    status: data.status ?? null,
    sourceUrl: cleanText(data.sourceUrl),
    createdBy: admin?._id || null,
  });

  if (data.summary) project.currentUpdate = cleanText(data.summary);
  if (data.progressPercent !== undefined && data.progressPercent !== null) {
    project.progressPercent = data.progressPercent;
  }
  if (data.status) project.status = data.status;
  if (project.status === 'completed') {
    project.progressPercent = 100;
    project.completedAt = project.completedAt || new Date();
  }

  project.updatedBy = admin?._id || null;
  await project.save();

  await writeAuditLog({
    adminId: admin?._id,
    action: 'project.progress_update',
    targetType: 'project',
    targetId: project._id,
    oldData,
    newData: {
      status: project.status,
      progressPercent: project.progressPercent,
      currentUpdate: project.currentUpdate,
      updateTitle: data.title,
    },
    ipAddress,
  });

  return adminDetail(project._id);
}

export async function deleteUpdate(admin, id, updateId, ipAddress) {
  const project = await Project.findOne({ _id: id, deletedAt: null });
  if (!project) throw new ApiError(404, 'Không tìm thấy dự án.', 'PROJECT_NOT_FOUND');

  const update = project.updates.id(updateId);
  if (!update) throw new ApiError(404, 'Không tìm thấy bản cập nhật.', 'PROJECT_UPDATE_NOT_FOUND');

  const deletedTitle = update.title;
  update.deleteOne();
  project.updatedBy = admin?._id || null;
  await project.save();

  await writeAuditLog({
    adminId: admin?._id,
    action: 'project.progress_update_delete',
    targetType: 'project',
    targetId: project._id,
    oldData: { updateId, title: deletedTitle },
    newData: null,
    ipAddress,
  });

  return adminDetail(project._id);
}

export async function remove(admin, id, ipAddress) {
  const project = await Project.findOne({ _id: id, deletedAt: null });
  if (!project) throw new ApiError(404, 'Không tìm thấy dự án.', 'PROJECT_NOT_FOUND');

  project.deletedAt = new Date();
  project.updatedBy = admin?._id || null;
  await project.save();

  await writeAuditLog({
    adminId: admin?._id,
    action: 'project.delete',
    targetType: 'project',
    targetId: project._id,
    oldData: { name: project.name, code: project.code, status: project.status },
    newData: { deletedAt: project.deletedAt },
    ipAddress,
  });

  return { _id: project._id, deleted: true };
}

export async function dashboardSummary() {
  return getAdminSummary();
}
