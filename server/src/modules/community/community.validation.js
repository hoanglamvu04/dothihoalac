import { z } from 'zod';

const oid = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, {
      error: 'Dữ liệu tham chiếu không hợp lệ.',
    }),
  empty = z.object({}).passthrough();

const body = z.object({
  title: z
    .string({ error: 'Nội dung bài viết không hợp lệ.' })
    .trim()
    .min(5, {
      error: 'Nội dung bài viết cần ít nhất 5 ký tự.',
    })
    .max(250, {
      error: 'Tiêu đề tự động của bài viết quá dài.',
    }),
  summary: z
    .string({ error: 'Phần mô tả bài viết không hợp lệ.' })
    .max(1000, {
      error: 'Phần mô tả bài viết không được vượt quá 1.000 ký tự.',
    })
    .optional(),
  bodyHtml: z
    .string({ error: 'Nội dung bài viết không hợp lệ.' })
    .min(1, {
      error: 'Bạn cần nhập nội dung hoặc thêm ảnh trước khi đăng.',
    }),
  postType: z.enum(
    [
      'discussion',
      'question',
      'report',
      'sharing',
      'review',
      'support',
      'marketplace',
      'community_event',
      'other',
    ],
    {
      error: 'Dạng bài viết không hợp lệ.',
    },
  ),
  primaryCategoryId: oid.nullable().optional(),
  primaryAreaId: oid.nullable().optional(),
  categoryIds: z.array(oid).optional(),
  tagIds: z.array(oid).optional(),
  areaIds: z.array(oid).optional(),
  thumbnailMediaId: oid.nullable().optional(),
  allowComments: z
    .boolean({
      error: 'Tùy chọn bình luận không hợp lệ.',
    })
    .optional(),
  incidentTime: z.coerce
    .date({
      error: 'Thời gian sự việc không hợp lệ.',
    })
    .nullable()
    .optional(),
  locationText: z
    .string({
      error: 'Thông tin vị trí không hợp lệ.',
    })
    .max(500, {
      error: 'Thông tin vị trí không được vượt quá 500 ký tự.',
    })
    .optional(),
  rating: z
    .number({
      error: 'Điểm đánh giá không hợp lệ.',
    })
    .min(1, {
      error: 'Điểm đánh giá phải từ 1 đến 5.',
    })
    .max(5, {
      error: 'Điểm đánh giá phải từ 1 đến 5.',
    })
    .nullable()
    .optional(),
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
  params: z.object({
    slug: z
      .string({
        error: 'Đường dẫn bài viết không hợp lệ.',
      })
      .min(1, {
        error: 'Đường dẫn bài viết không hợp lệ.',
      }),
  }),
  query: empty,
});

export const acceptSchema = z.object({
  body: z.object({ commentId: oid }),
  params: z.object({ id: oid }),
  query: empty,
});
