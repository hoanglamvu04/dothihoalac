import { z } from 'zod';
const oid = z.string().regex(/^[0-9a-fA-F]{24}$/);
const empty = z.object({}).passthrough();
export const listSchema = z.object({
  body: empty,
  params: z.object({ contentId: oid }),
  query: z
    .object({
      page: z.string().optional(),
      limit: z.string().optional(),
      sort: z.enum(['newest', 'oldest', 'popular']).optional(),
    })
    .passthrough(),
});
export const createSchema = z.object({
  body: z.object({ body: z.string().trim().min(1).max(5000), parentId: oid.nullable().optional() }),
  params: z.object({ contentId: oid }),
  query: empty,
});
export const updateSchema = z.object({
  body: z.object({ body: z.string().trim().min(1).max(5000) }),
  params: z.object({ id: oid }),
  query: empty,
});
export const idSchema = z.object({ body: empty, params: z.object({ id: oid }), query: empty });
