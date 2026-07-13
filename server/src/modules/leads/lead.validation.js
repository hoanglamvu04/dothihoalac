import { z } from 'zod';
const oid = z.string().regex(/^[0-9a-fA-F]{24}$/);
const empty = z.object({}).passthrough();
export const createSchema = z.object({
  body: z.object({
    leadType: z.enum([
      'architecture_design',
      'construction',
      'renovation',
      'cost_estimation',
      'homestay_search',
      'villa_booking',
      'event_booking',
      'advertising',
      'partnership',
    ]),
    sourceContentId: oid.nullable().optional(),
    sourcePage: z.string().max(500).optional(),
    fullName: z.string().trim().min(2).max(100),
    phone: z.string().min(9).max(20),
    email: z.union([z.email(), z.literal('')]).optional(),
    areaId: oid.nullable().optional(),
    message: z.string().max(5000).optional(),
    budgetRange: z.string().max(200).optional(),
    expectedTime: z.string().max(200).optional(),
    assignedBrand: z.enum(['kientruchoalac', 'mely_space', 'media_space', 'xspace']),
    consent: z.literal(true),
  }),
  params: empty,
  query: empty,
});
export const referralSchema = z.object({
  body: z.object({
    brand: z.enum(['kientruchoalac', 'mely_space', 'media_space', 'xspace']),
    sourceContentId: oid.nullable().optional(),
    sourcePage: z.string().max(500).optional(),
    destinationUrl: z.url(),
    eventType: z.enum(['click', 'form_open', 'form_submit', 'phone_reveal']).optional(),
  }),
  params: empty,
  query: empty,
});
