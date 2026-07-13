import { z } from 'zod';
const oid = z.string().regex(/^[0-9a-fA-F]{24}$/);
const empty = z.object({}).passthrough();
export const usernameParamSchema = z.object({
  body: empty,
  params: z.object({ username: z.string().min(4).max(30) }),
  query: empty,
});
export const updateProfileSchema = z.object({
  body: z.object({
    displayName: z.string().trim().min(2).max(80).optional(),
    fullName: z.string().trim().max(100).optional(),
    bio: z.string().trim().max(500).optional(),
    occupation: z.string().trim().max(100).optional(),
    areaId: oid.nullable().optional(),
    website: z.union([z.url(), z.literal('')]).optional(),
    publicProfile: z.boolean().optional(),
    avatarMediaId: oid.nullable().optional(),
    coverMediaId: oid.nullable().optional(),
  }),
  params: empty,
  query: empty,
});
export const changeUsernameSchema = z.object({
  body: z.object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(4)
      .max(30)
      .regex(/^[a-z0-9._]+$/),
  }),
  params: empty,
  query: empty,
});
export const sessionParamSchema = z.object({
  body: empty,
  params: z.object({ id: oid }),
  query: empty,
});
