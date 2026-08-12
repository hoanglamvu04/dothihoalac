import { z } from 'zod';

const oid = z.string().regex(/^[0-9a-fA-F]{24}$/),
  empty = z.object({}).passthrough();

const body = z.object({
  title: z.string().trim().min(5).max(250),
  summary: z.string().max(1000).optional(),
  bodyHtml: z.string().min(1),
  postType: z.enum([
    'discussion',
    'question',
    'report',
    'sharing',
    'review',
    'support',
    'marketplace',
    'community_event',
    'other',
  ]),
  primaryCategoryId: oid.nullable().optional(),
  primaryAreaId: oid.nullable().optional(),
  categoryIds: z.array(oid).optional(),
  tagIds: z.array(oid).optional(),
  areaIds: z.array(oid).optional(),
  thumbnailMediaId: oid.nullable().optional(),
  allowComments: z.boolean().optional(),
  incidentTime: z.coerce.date().nullable().optional(),
  locationText: z.string().max(500).optional(),
  rating: z.number().min(1).max(5).nullable().optional(),
});

export const createSchema = z.object({
  body,
  params: empty,
  query: empty,
});

export const updateSchema = z.object({
  body: body.partial(),
  params: z.object({ id: oid }),
  query: empty,
});

export const idSchema = z.object({
  body: empty,
  params: z.object({ id: oid }),
  query: empty,
});

export const slugSchema = z.object({
  body: empty,
  params: z.object({ slug: z.string().min(1) }),
  query: empty,
});

export const acceptSchema = z.object({
  body: z.object({ commentId: oid }),
  params: z.object({ id: oid }),
  query: empty,
});
