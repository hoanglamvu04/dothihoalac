import { z } from 'zod';

const oid = z.string().regex(/^[0-9a-fA-F]{24}$/);
const empty = z.object({}).passthrough();

const bodyBase = z.object({
  title: z.string().min(5).max(250),
  summary: z.string().max(1000).optional(),
  bodyHtml: z.string().min(1),
  jobType: z.enum([
    'full_time',
    'part_time',
    'internship',
    'temporary',
    'student',
    'construction',
    'service',
  ]),
  companyName: z.string().min(2).max(200),
  salaryMin: z.number().min(0).nullable().optional(),
  salaryMax: z.number().min(0).nullable().optional(),
  salaryUnit: z.enum(['month', 'hour', 'day', 'project', 'negotiable']).optional(),
  experienceLevel: z
    .enum(['none', 'under_1_year', '1_3_years', '3_5_years', 'over_5_years'])
    .optional(),
  workLocation: z.string().min(3).max(500),
  applicationMethod: z.string().max(2000).optional(),
  contactEmail: z.union([z.email(), z.literal('')]).optional(),
  contactPhone: z.string().max(20).optional(),
  deadline: z.coerce.date(),
  positionsCount: z.number().int().min(1).optional(),
  primaryAreaId: oid.nullable().optional(),
  categoryIds: z.array(oid).optional(),
  tagIds: z.array(oid).optional(),
  thumbnailMediaId: oid.nullable().optional(),
});

const salaryRangeValid = (value) =>
  value.salaryMin == null || value.salaryMax == null || value.salaryMin <= value.salaryMax;

export const createSchema = z.object({
  body: bodyBase.refine(salaryRangeValid, {
    message: 'Lương tối thiểu phải nhỏ hơn hoặc bằng lương tối đa.',
  }),
  params: empty,
  query: empty,
});

export const updateSchema = z.object({
  body: bodyBase.partial().refine(salaryRangeValid, {
    message: 'Lương tối thiểu phải nhỏ hơn hoặc bằng lương tối đa.',
  }),
  params: z.object({ id: oid }),
  query: empty,
});

export const idSchema = z.object({
  body: empty,
  params: z.object({ id: oid }),
  query: empty,
});
