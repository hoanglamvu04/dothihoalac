import { z } from 'zod';

import {
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
} from './project.model.js';

const oid = z.string().regex(/^[0-9a-fA-F]{24}$/);
const empty = z.object({}).passthrough();
const optionalDate = z.coerce.date().nullable().optional();
const nullableNumber = z.coerce.number().finite().nullable().optional();

const milestone = z.object({
  _id: oid.optional(),
  title: z.string().trim().min(1).max(220),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']).default('pending'),
  targetDate: optionalDate,
  completedAt: optionalDate,
  progressPercent: z.coerce.number().min(0).max(100).default(0),
  note: z.string().max(1200).optional().default(''),
});

const source = z.object({
  _id: oid.optional(),
  label: z.string().max(180).optional().default(''),
  url: z.string().trim().url().max(1600),
});

const projectBody = z.object({
  code: z.string().trim().max(60).optional(),
  name: z.string().trim().min(3).max(300),
  shortName: z.string().trim().max(180).optional(),
  slug: z.string().trim().max(320).optional(),

  projectType: z.enum(PROJECT_TYPES).default('other'),
  status: z.enum(PROJECT_STATUSES).default('proposed'),
  priority: z.enum(PROJECT_PRIORITIES).default('normal'),
  progressPercent: z.coerce.number().min(0).max(100).default(0),

  primaryAreaId: oid.nullable().optional(),
  areaIds: z.array(oid).max(30).optional(),
  locationText: z.string().max(700).optional(),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),

  investor: z.string().max(300).optional(),
  developer: z.string().max(300).optional(),
  managingAuthority: z.string().max(300).optional(),
  contractor: z.string().max(500).optional(),
  consultant: z.string().max(500).optional(),

  totalInvestmentVnd: nullableNumber,
  fundingSources: z.array(z.string().trim().min(1).max(220)).max(30).optional(),
  landAreaHa: z.coerce.number().min(0).nullable().optional(),
  lengthKm: z.coerce.number().min(0).nullable().optional(),
  scaleText: z.string().max(1800).optional(),

  approvalDecisionNo: z.string().max(180).optional(),
  approvalDecisionDate: optionalDate,
  startDate: optionalDate,
  expectedCompletionDate: optionalDate,
  completedAt: optionalDate,

  description: z.string().max(8000).optional(),
  objectives: z.string().max(5000).optional(),
  currentUpdate: z.string().max(3000).optional(),
  risks: z.string().max(3000).optional(),
  nextSteps: z.string().max(3000).optional(),

  milestones: z.array(milestone).max(60).optional(),
  sourceUrls: z.array(source).max(30).optional(),

  isFeatured: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(-100000).max(100000).optional(),
});

export const publicListSchema = z.object({
  body: empty,
  params: empty,
  query: z
    .object({
      page: z.string().optional(),
      limit: z.string().optional(),
      type: z.enum(PROJECT_TYPES).optional(),
      status: z.enum(PROJECT_STATUSES).optional(),
      area: z.string().optional(),
      featured: z.enum(['1', '0', 'true', 'false']).optional(),
      q: z.string().max(200).optional(),
    })
    .passthrough(),
});

export const publicSlugSchema = z.object({
  body: empty,
  params: z.object({ slug: z.string().trim().min(1).max(320) }),
  query: empty,
});

export const adminListSchema = z.object({
  body: empty,
  params: empty,
  query: z
    .object({
      page: z.string().optional(),
      limit: z.string().optional(),
      type: z.enum(PROJECT_TYPES).optional(),
      status: z.enum(PROJECT_STATUSES).optional(),
      priority: z.enum(PROJECT_PRIORITIES).optional(),
      area: z.string().optional(),
      visibility: z.enum(['public', 'private']).optional(),
      featured: z.enum(['1', '0', 'true', 'false']).optional(),
      progressMin: z.string().optional(),
      progressMax: z.string().optional(),
      sort: z.enum(['updated', 'name', 'progress', 'deadline', 'investment']).optional(),
      q: z.string().max(200).optional(),
    })
    .passthrough(),
});

export const createProjectSchema = z.object({
  body: projectBody,
  params: empty,
  query: empty,
});

export const updateProjectSchema = z.object({
  body: projectBody.partial(),
  params: z.object({ id: oid }),
  query: empty,
});

export const idSchema = z.object({
  body: empty,
  params: z.object({ id: oid }),
  query: empty,
});

export const addUpdateSchema = z.object({
  body: z.object({
    updateDate: optionalDate,
    title: z.string().trim().min(2).max(220),
    summary: z.string().max(3000).optional(),
    progressPercent: z.coerce.number().min(0).max(100).nullable().optional(),
    status: z.enum(PROJECT_STATUSES).nullable().optional(),
    sourceUrl: z.union([z.string().trim().url().max(1600), z.literal('')]).optional(),
  }),
  params: z.object({ id: oid }),
  query: empty,
});

export const deleteUpdateSchema = z.object({
  body: empty,
  params: z.object({ id: oid, updateId: oid }),
  query: empty,
});
