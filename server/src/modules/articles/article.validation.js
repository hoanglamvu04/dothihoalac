import { z } from 'zod';

const oid = z.string().regex(/^[0-9a-fA-F]{24}$/);
const empty = z.object({}).passthrough();
const articleType = z.enum([
  'news',
  'analysis',
  'guide',
  'interview',
  'photo',
  'sponsored',
]);
const articleStatus = z.enum([
  'draft',
  'pending_review',
  'approved',
  'scheduled',
  'published',
]);

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
  params: z.object({
    slug: z.string().min(1).max(300),
  }),
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
    bodyHtml: z
      .string()
      .min(1)
      .max(500000)
      .refine(
        (value) => !/src\s*=\s*["']data:image\//i.test(value),
        {
          message: 'Không được nhúng ảnh base64 vào nội dung.',
        },
      ),
    articleType: articleType.default('news'),
    primaryCategoryId: oid.nullable().optional(),
    primaryAreaId: oid.nullable().optional(),
    categoryIds: z.array(oid).optional(),
    tagIds: z.array(oid).optional(),
    areaIds: z.array(oid).optional(),
    thumbnailMediaId: oid.nullable().optional(),
    status: articleStatus.optional(),
    scheduledAt: z.coerce.date().nullable().optional(),
    sourceNote: z.string().max(2000).optional(),
  }),
  // POST không có id, PATCH có id. Giữ id để validate middleware không xóa req.params.id.
  params: z.object({
    id: oid.optional(),
  }),
  query: empty,
});

export const articleMetadataSchema = z.object({
  body: z.object({
    articleType: articleType.optional(),
    primaryCategoryId: oid.nullable().optional(),
    primaryAreaId: oid.nullable().optional(),
    categoryIds: z.array(oid).max(20).optional(),
    tagIds: z.array(oid).max(50).optional(),
    areaIds: z.array(oid).max(20).optional(),
    thumbnailMediaId: oid.nullable().optional(),
    status: articleStatus.optional(),
    scheduledAt: z.coerce.date().nullable().optional(),
    sourceNote: z.string().max(2000).optional(),
    visibility: z.enum(['public', 'members', 'private']).optional(),
    allowComments: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isSponsored: z.boolean().optional(),
    factCheckedAt: z.coerce.date().nullable().optional(),
    factCheckedBy: oid.nullable().optional(),
    originalPublishedAt: z.coerce.date().nullable().optional(),
    changeNote: z.string().max(500).optional(),
  }),
  params: z.object({
    id: oid,
  }),
  query: empty,
});
