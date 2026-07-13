import { z } from 'zod';
const oid = z.string().regex(/^[0-9a-fA-F]{24}$/),
  empty = z.object({}).passthrough();
export const createSchema = z.object({
  body: z.object({
    targetType: z.enum(['content', 'comment', 'user', 'property', 'job']),
    targetId: oid,
    reason: z.enum([
      'spam',
      'false_information',
      'harassment',
      'scam',
      'privacy',
      'copyright',
      'wrong_category',
      'duplicate',
      'other',
    ]),
    description: z.string().max(3000).optional(),
  }),
  params: empty,
  query: empty,
});
