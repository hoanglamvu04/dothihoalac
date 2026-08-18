import { z } from 'zod';

const oid = z.string().regex(/^[0-9a-fA-F]{24}$/);
const empty = z.object({}).passthrough();

export const createDraftSchema = z.object({
  body: z.object({
    contentType: z.enum(['community', 'property', 'job']),
  }),
  params: empty,
  query: empty,
});

export const draftIdSchema = z.object({
  body: empty,
  params: z.object({ id: oid }),
  query: empty,
});
