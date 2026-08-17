import { z } from 'zod';

const oid = z.string().regex(/^[0-9a-fA-F]{24}$/);
const empty = z.object({}).passthrough();

const body = z.object({
  title: z.string().min(10).max(250),
  summary: z.string().max(1000).optional(),
  bodyHtml: z.string().min(1),
  transactionType: z.enum(['sale', 'rent', 'transfer', 'wanted_buy', 'wanted_rent']),
  propertyType: z.enum([
    'house',
    'villa_townhouse',
    'street_house',
    'shophouse',
    'project_land',
    'land',
    'farm_resort',
    'condotel',
    'warehouse',
    'other_property',
    // Legacy values kept so existing listings remain editable.
    'residential_land',
    'land_plot',
    'service_land',
    'townhouse',
    'villa',
    'apartment',
    'mini_apartment',
    'room',
    'whole_house',
    'commercial_space',
    'office',
    'farm',
  ]),
  ownerType: z.enum(['owner', 'broker', 'business']),
  price: z.number().min(0),
  priceUnit: z
    .enum(['total', 'million', 'billion', 'per_m2', 'per_month', 'negotiable'])
    .default('total'),
  isNegotiable: z.boolean().default(false),
  landArea: z.number().positive(),
  usableArea: z.number().min(0).nullable().optional(),
  bedrooms: z.number().int().min(0).nullable().optional(),
  bathrooms: z.number().int().min(0).nullable().optional(),
  frontage: z.number().min(0).nullable().optional(),
  roadWidth: z.number().min(0).nullable().optional(),
  direction: z
    .enum([
      'north',
      'south',
      'east',
      'west',
      'northeast',
      'northwest',
      'southeast',
      'southwest',
      'unknown',
    ])
    .optional(),
  legalStatus: z
    .enum(['red_book', 'contract', 'waiting_certificate', 'shared_certificate', 'other', 'unknown'])
    .optional(),
  addressText: z.string().min(3).max(500),
  longitude: z.number().min(-180).max(180).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  contactName: z.string().min(2).max(100),
  contactPhone: z.string().min(9).max(20),
  contactEmail: z.union([z.email(), z.literal('')]).optional(),
  featureIds: z.array(oid).optional(),
  primaryAreaId: oid,
  categoryIds: z.array(oid).optional(),
  tagIds: z.array(oid).optional(),
  areaIds: z.array(oid).optional(),
  thumbnailMediaId: oid,
  galleryMediaIds: z.array(oid).max(20).optional(),
  listingTier: z.enum(['diamond', 'gold', 'silver', 'standard']).optional(),
  listingDurationDays: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
  listingStartAt: z.coerce.date().optional(),
});

export const createSchema = z.object({ body, params: empty, query: empty });

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

export const contactSchema = z.object({
  body: z.object({
    contactType: z.enum(['reveal_phone', 'call', 'send_request', 'open_chat', 'copy_phone']),
  }),
  params: z.object({ id: oid }),
  query: empty,
});
