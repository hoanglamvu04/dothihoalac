import { z } from 'zod';
const oid = z.string().regex(/^[0-9a-fA-F]{24}$/),
  empty = z.object({}).passthrough();
export const putSchema = z.object({
  body: z.object({
    reactionType: z.enum(['like', 'interested', 'helpful', 'surprised', 'disagree']),
  }),
  params: z.object({ targetType: z.enum(['content', 'comment']), targetId: oid }),
  query: empty,
});
export const deleteSchema = z.object({
  body: empty,
  params: z.object({ targetType: z.enum(['content', 'comment']), targetId: oid }),
  query: empty,
});
