import { z } from 'zod';
const oid = z.string().regex(/^[0-9a-fA-F]{24}$/);
const empty = z.object({}).passthrough();
export const listArticlesSchema = z.object({
  body: empty,
  params: empty,
  query: z
    .object({
      page: z.string().optional(),
      limit: z.string().optional(),
      category: z.string().optional(),
      area: z.string().optional(),
      tag: z.string().optional(),
      sort: z.string().optional(),
      q: z.string().max(200).optional(),
    })
    .passthrough(),
});
export const slugSchema = z.object({
  body: empty,
  params: z.object({ slug: z.string().min(1).max(300) }),
  query: empty,
});
export const tipSchema = z.object({
  body: z.object({
    title: z.string().trim().min(10).max(250),
    description: z.string().trim().min(20).max(10000),
    areaId: oid.nullable().optional(),
    eventTime: z.coerce.date().nullable().optional(),
    source: z.string().max(1000).optional(),
    mediaIds: z.array(oid).max(20).optional(),
    contactName: z.string().max(100).optional(),
    contactPhone: z.string().max(20).optional(),
    contactEmail: z.union([z.email(), z.literal('')]).optional(),
    allowContact: z.boolean().default(false),
  }),
  params: empty,
  query: empty,
});
export const articleBodySchema = z.object({
  body: z.object({
    title: z.string().min(5).max(250),
    summary: z.string().max(1000).optional(),
    bodyHtml: z.string().min(1),
    articleType: z
      .enum(['news', 'analysis', 'guide', 'interview', 'photo', 'sponsored'])
      .default('news'),
    primaryCategoryId: oid.nullable().optional(),
    primaryAreaId: oid.nullable().optional(),
    categoryIds: z.array(oid).optional(),
    tagIds: z.array(oid).optional(),
    areaIds: z.array(oid).optional(),
    thumbnailMediaId: oid.nullable().optional(),
    status: z.enum(['draft', 'pending_review', 'approved', 'scheduled', 'published']).optional(),
    scheduledAt: z.coerce.date().nullable().optional(),
    sourceNote: z.string().max(2000).optional(),
  }),
  params: empty,
  query: empty,
});
