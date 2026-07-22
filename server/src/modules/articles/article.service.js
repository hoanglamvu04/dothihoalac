import mongoose from 'mongoose';

import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import Article from './article.model.js';
import NewsTip from './newsTip.model.js';

import User from '../users/user.model.js';
import Category from '../taxonomy/category.model.js';
import Area from '../taxonomy/area.model.js';
import Tag from '../taxonomy/tag.model.js';
import Media from '../media/media.model.js';

import {
  createContentWithBody,
  updateContentWithBody,
} from '../contents/content.service.js';

import {
  parsePagination,
  buildPaginationMeta,
} from '../../utils/pagination.js';

import { escapeRegex } from '../../utils/escapeRegex.js';
import { logger } from '../../config/logger.js';
import ApiError from '../../utils/ApiError.js';

function normalizeText(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function normalizeSlug(value) {
  return normalizeText(value).toLowerCase();
}

function isValidId(value) {
  return Boolean(
    value &&
      mongoose.isValidObjectId(String(value)),
  );
}

function uniqueValidIds(values = []) {
  return [
    ...new Set(
      values
        .filter(isValidId)
        .map((value) => String(value)),
    ),
  ];
}

function mapById(documents = []) {
  return new Map(
    documents.map((document) => [
      String(document._id),
      document,
    ]),
  );
}

function mappedDocument(map, value) {
  if (!isValidId(value)) {
    return null;
  }

  return map.get(String(value)) || null;
}

function emptyResult(page, limit) {
  return {
    items: [],
    meta: buildPaginationMeta({
      page,
      limit,
      total: 0,
    }),
  };
}

function parseOptionalDate(
  value,
  fieldName = 'date',
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(
      422,
      `${fieldName} không hợp lệ.`,
      'INVALID_DATE',
      {
        field: fieldName,
        value,
      },
    );
  }

  return date;
}

async function resolveTaxonomyId(
  Model,
  value,
  extraFilter = {},
) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  if (mongoose.isValidObjectId(normalized)) {
    const exists = await Model.exists({
      _id: normalized,
      ...extraFilter,
    });

    return exists ? normalized : null;
  }

  const item = await Model.findOne({
    slug: normalized.toLowerCase(),
    isActive: true,
    ...extraFilter,
  })
    .select('_id')
    .lean();

  return item?._id || null;
}

/**
 * Ghép dữ liệu quan hệ thủ công.
 *
 * Cách này không phụ thuộc vào populate() và không làm hỏng
 * toàn bộ request khi một bản ghi cũ chứa ID không hợp lệ.
 */
async function hydrateArticleContents(
  rawItems = [],
  {
    includeArticleData = false,
  } = {},
) {
  if (!rawItems.length) {
    return [];
  }

  const authorIds = uniqueValidIds(
    rawItems.map((item) => item.authorId),
  );

  const categoryIds = uniqueValidIds(
    rawItems.map(
      (item) => item.primaryCategoryId,
    ),
  );

  const areaIds = uniqueValidIds(
    rawItems.map(
      (item) => item.primaryAreaId,
    ),
  );

  const mediaIds = uniqueValidIds(
    rawItems.map(
      (item) => item.thumbnailMediaId,
    ),
  );

  const contentIds = uniqueValidIds(
    rawItems.map((item) => item._id),
  );

  const [
    authors,
    categories,
    areas,
    mediaItems,
    articleItems,
  ] = await Promise.all([
    authorIds.length
      ? User.find({
          _id: {
            $in: authorIds,
          },
        })
          .select(
            [
              'username',
              'displayName',
              'emailVerifiedAt',
              'phoneVerifiedAt',
              'status',
            ].join(' '),
          )
          .lean()
      : [],

    categoryIds.length
      ? Category.find({
          _id: {
            $in: categoryIds,
          },
        })
          .select(
            [
              'name',
              'slug',
              'contentScope',
              'description',
            ].join(' '),
          )
          .lean()
      : [],

    areaIds.length
      ? Area.find({
          _id: {
            $in: areaIds,
          },
        })
          .select(
            [
              'name',
              'slug',
              'areaType',
              'description',
            ].join(' '),
          )
          .lean()
      : [],

    mediaIds.length
      ? Media.find({
          _id: {
            $in: mediaIds,
          },
          deletedAt: null,
        })
          .select(
            [
              'provider',
              'publicId',
              'assetId',
              'url',
              'secureUrl',
              'resourceType',
              'format',
              'width',
              'height',
              'fileSize',
              'altText',
              'status',
            ].join(' '),
          )
          .lean()
      : [],

    includeArticleData && contentIds.length
      ? Article.find({
          contentId: {
            $in: contentIds,
          },
        }).lean()
      : [],
  ]);

  const authorMap = mapById(authors);
  const categoryMap = mapById(categories);
  const areaMap = mapById(areas);
  const mediaMap = mapById(mediaItems);

  const articleMap = new Map(
    articleItems.map((item) => [
      String(item.contentId),
      item,
    ]),
  );

  return rawItems.map((item) => ({
    ...item,

    authorId: mappedDocument(
      authorMap,
      item.authorId,
    ),

    primaryCategoryId: mappedDocument(
      categoryMap,
      item.primaryCategoryId,
    ),

    primaryAreaId: mappedDocument(
      areaMap,
      item.primaryAreaId,
    ),

    thumbnailMediaId: mappedDocument(
      mediaMap,
      item.thumbnailMediaId,
    ),

    ...(includeArticleData
      ? {
          article:
            articleMap.get(String(item._id)) ||
            null,
        }
      : {}),
  }));
}

async function getHydratedContentById(
  contentId,
  options = {},
) {
  const rawContent = await Content.findById(
    contentId,
  ).lean();

  if (!rawContent) {
    return null;
  }

  const items = await hydrateArticleContents(
    [rawContent],
    options,
  );

  return items[0] || null;
}

async function buildPublicFilters(
  query,
  page,
  limit,
) {
  const [
    categoryId,
    areaId,
    tagId,
  ] = await Promise.all([
    query.category
      ? resolveTaxonomyId(
          Category,
          query.category,
          {
            contentScope: {
              $in: ['article', 'all'],
            },
          },
        )
      : null,

    query.area
      ? resolveTaxonomyId(
          Area,
          query.area,
        )
      : null,

    query.tag
      ? resolveTaxonomyId(
          Tag,
          query.tag,
        )
      : null,
  ]);

  if (query.category && !categoryId) {
    return {
      empty: emptyResult(page, limit),
    };
  }

  if (query.area && !areaId) {
    return {
      empty: emptyResult(page, limit),
    };
  }

  if (query.tag && !tagId) {
    return {
      empty: emptyResult(page, limit),
    };
  }

  const filter = {
    contentType: 'article',
    status: 'published',
    visibility: 'public',
    deletedAt: null,
  };

  if (categoryId) {
    filter.primaryCategoryId = categoryId;
  }

  if (areaId) {
    filter.primaryAreaId = areaId;
  }

  if (tagId) {
    filter.tagIds = tagId;
  }

  const keyword = normalizeText(query.q);

  if (keyword) {
    const expression = new RegExp(
      escapeRegex(keyword),
      'i',
    );

    filter.$or = [
      {
        title: expression,
      },
      {
        summary: expression,
      },
      {
        bodyText: expression,
      },
    ];
  }

  return {
    filter,
  };
}

export async function list(query = {}) {
  try {
    const {
      page,
      limit,
      skip,
    } = parsePagination(query);

    const filterResult =
      await buildPublicFilters(
        query,
        page,
        limit,
      );

    if (filterResult.empty) {
      return filterResult.empty;
    }

    const filter = filterResult.filter;

    const sort =
      query.sort === 'popular'
        ? {
            viewCount: -1,
            publishedAt: -1,
            _id: -1,
          }
        : {
            publishedAt: -1,
            createdAt: -1,
            _id: -1,
          };

    const [rawItems, total] =
      await Promise.all([
        Content.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),

        Content.countDocuments(filter),
      ]);

    const items =
      await hydrateArticleContents(rawItems);

    return {
      items,
      meta: buildPaginationMeta({
        page,
        limit,
        total,
      }),
    };
  } catch (error) {
    logger.error(
      {
        err: error,
        query,
        errorName: error?.name,
        errorMessage: error?.message,
        errorStack: error?.stack,
      },
      'Article list query failed',
    );

    throw error;
  }
}

export async function detail(slug) {
  try {
    const normalizedSlug =
      normalizeSlug(slug);

    if (!normalizedSlug) {
      throw new ApiError(
        400,
        'Slug bài viết không hợp lệ.',
        'INVALID_ARTICLE_SLUG',
      );
    }

    /*
     * Không gọi getPublishedContentBySlug() để tránh phụ thuộc
     * vào populate của content.service cũ.
     */
    const rawContent =
      await Content.findOneAndUpdate(
        {
          slug: normalizedSlug,
          contentType: 'article',
          status: 'published',
          visibility: 'public',
          deletedAt: null,
        },
        {
          $inc: {
            viewCount: 1,
          },
        },
        {
          new: true,
          runValidators: false,
        },
      ).lean();

    if (!rawContent) {
      throw new ApiError(
        404,
        'Không tìm thấy bài viết.',
        'ARTICLE_NOT_FOUND',
      );
    }

    const [
      hydratedItems,
      body,
      rawArticle,
    ] = await Promise.all([
      hydrateArticleContents([
        rawContent,
      ]),

      ContentBody.findOne({
        contentId: rawContent._id,
      }).lean(),

      Article.findOne({
        contentId: rawContent._id,
      }).lean(),
    ]);

    const content =
      hydratedItems[0] || rawContent;

    let article = rawArticle || null;

    if (article) {
      const relatedUserIds =
        uniqueValidIds([
          article.editorId,
          article.factCheckedBy,
        ]);

      const relatedUsers =
        relatedUserIds.length
          ? await User.find({
              _id: {
                $in: relatedUserIds,
              },
            })
              .select(
                'username displayName',
              )
              .lean()
          : [];

      const relatedUserMap =
        mapById(relatedUsers);

      article = {
        ...article,

        editorId: mappedDocument(
          relatedUserMap,
          article.editorId,
        ),

        factCheckedBy: mappedDocument(
          relatedUserMap,
          article.factCheckedBy,
        ),
      };
    }

    return {
      ...content,

      body:
        body || {
          contentId: rawContent._id,
          bodyHtml: '',
          bodyText:
            rawContent.bodyText || '',
          readingTime: 1,
          wordCount: 0,
        },

      article,
    };
  } catch (error) {
    logger.error(
      {
        err: error,
        slug,
        errorName: error?.name,
        errorMessage: error?.message,
        errorStack: error?.stack,
      },
      'Article detail query failed',
    );

    throw error;
  }
}

export async function submitTip(
  userId,
  data,
) {
  return NewsTip.create({
    ...data,
    userId: userId || null,
  });
}

export async function adminCreate(
  userId,
  data,
) {
  const status = data.status || 'draft';

  if (
    status === 'scheduled' &&
    !data.scheduledAt
  ) {
    throw new ApiError(
      422,
      'Bài lên lịch phải có thời gian xuất bản.',
      'SCHEDULED_AT_REQUIRED',
    );
  }

  const scheduledAt =
    status === 'scheduled'
      ? parseOptionalDate(
          data.scheduledAt,
          'scheduledAt',
        )
      : null;

  const publishedAt =
    status === 'published'
      ? parseOptionalDate(
          data.publishedAt,
          'publishedAt',
        ) || new Date()
      : null;

  const content =
    await createContentWithBody({
      authorId: userId,
      contentType: 'article',
      title: data.title,
      summary: data.summary,
      bodyHtml: data.bodyHtml,
      status,
      visibility:
        data.visibility || 'public',
      allowComments:
        data.allowComments !== false,
      primaryCategoryId:
        data.primaryCategoryId || null,
      primaryAreaId:
        data.primaryAreaId || null,
      categoryIds:
        data.categoryIds || [],
      tagIds:
        data.tagIds || [],
      areaIds:
        data.areaIds || [],
      thumbnailMediaId:
        data.thumbnailMediaId || null,
      isFeatured:
        Boolean(data.isFeatured),
      isSponsored:
        Boolean(data.isSponsored),
    });

  try {
    content.publishedAt = publishedAt;
    content.scheduledAt = scheduledAt;

    await content.save();

    await Article.create({
      contentId: content._id,
      articleType:
        data.articleType || 'news',
      editorId: userId,
      sourceNote:
        normalizeText(data.sourceNote),
      factCheckedAt:
        parseOptionalDate(
          data.factCheckedAt,
          'factCheckedAt',
        ),
      factCheckedBy:
        data.factCheckedBy || null,
      originalPublishedAt:
        parseOptionalDate(
          data.originalPublishedAt,
          'originalPublishedAt',
        ),
    });

    return await getHydratedContentById(
      content._id,
      {
        includeArticleData: true,
      },
    );
  } catch (error) {
    /*
     * Xóa toàn bộ dữ liệu đã tạo nếu Article lỗi,
     * tránh ContentBody bị mồ côi.
     */
    await Promise.allSettled([
      Article.deleteMany({
        contentId: content._id,
      }),

      ContentBody.deleteMany({
        contentId: content._id,
      }),

      Content.deleteOne({
        _id: content._id,
      }),
    ]);

    throw error;
  }
}

export async function adminUpdate(
  id,
  userId,
  data,
) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(
      400,
      'ID bài viết không hợp lệ.',
      'INVALID_ARTICLE_ID',
    );
  }

  const content = await Content.findOne({
    _id: id,
    contentType: 'article',
    deletedAt: null,
  });

  if (!content) {
    throw new ApiError(
      404,
      'Không tìm thấy bài viết.',
      'ARTICLE_NOT_FOUND',
    );
  }

  await updateContentWithBody(
    content,
    data,
    userId,
    data.changeNote || 'Admin update',
  );

  if (data.status !== undefined) {
    content.status = data.status;

    if (data.status === 'published') {
      content.publishedAt =
        parseOptionalDate(
          data.publishedAt,
          'publishedAt',
        ) ||
        content.publishedAt ||
        new Date();

      content.scheduledAt = null;
    } else if (
      data.status === 'scheduled'
    ) {
      if (!data.scheduledAt) {
        throw new ApiError(
          422,
          'Bài lên lịch phải có thời gian xuất bản.',
          'SCHEDULED_AT_REQUIRED',
        );
      }

      content.scheduledAt =
        parseOptionalDate(
          data.scheduledAt,
          'scheduledAt',
        );

      content.publishedAt = null;
    } else {
      content.scheduledAt = null;
    }

    await content.save();
  }

  const articleChanges = {
    editorId: userId,
  };

  if (data.articleType !== undefined) {
    articleChanges.articleType =
      data.articleType;
  }

  if (data.sourceNote !== undefined) {
    articleChanges.sourceNote =
      normalizeText(data.sourceNote);
  }

  if (data.factCheckedAt !== undefined) {
    articleChanges.factCheckedAt =
      parseOptionalDate(
        data.factCheckedAt,
        'factCheckedAt',
      );
  }

  if (data.factCheckedBy !== undefined) {
    articleChanges.factCheckedBy =
      data.factCheckedBy || null;
  }

  if (
    data.originalPublishedAt !== undefined
  ) {
    articleChanges.originalPublishedAt =
      parseOptionalDate(
        data.originalPublishedAt,
        'originalPublishedAt',
      );
  }

  await Article.findOneAndUpdate(
    {
      contentId: content._id,
    },
    {
      $set: articleChanges,

      $setOnInsert: {
        contentId: content._id,
        articleType:
          data.articleType || 'news',
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );

  return getHydratedContentById(
    content._id,
    {
      includeArticleData: true,
    },
  );
}

export async function adminList(
  query = {},
) {
  try {
    const {
      page,
      limit,
      skip,
    } = parsePagination(query);

    const filter = {
      contentType: 'article',
      deletedAt: null,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.category) {
      const categoryId =
        await resolveTaxonomyId(
          Category,
          query.category,
          {
            contentScope: {
              $in: ['article', 'all'],
            },
          },
        );

      if (!categoryId) {
        return emptyResult(page, limit);
      }

      filter.primaryCategoryId =
        categoryId;
    }

    if (query.area) {
      const areaId =
        await resolveTaxonomyId(
          Area,
          query.area,
        );

      if (!areaId) {
        return emptyResult(page, limit);
      }

      filter.primaryAreaId = areaId;
    }

    const keyword =
      normalizeText(query.q);

    if (keyword) {
      const expression = new RegExp(
        escapeRegex(keyword),
        'i',
      );

      filter.$or = [
        {
          title: expression,
        },
        {
          summary: expression,
        },
        {
          bodyText: expression,
        },
      ];
    }

    const [rawItems, total] =
      await Promise.all([
        Content.find(filter)
          .sort({
            createdAt: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Content.countDocuments(filter),
      ]);

    const items =
      await hydrateArticleContents(
        rawItems,
        {
          includeArticleData: true,
        },
      );

    return {
      items,
      meta: buildPaginationMeta({
        page,
        limit,
        total,
      }),
    };
  } catch (error) {
    logger.error(
      {
        err: error,
        query,
        errorName: error?.name,
        errorMessage: error?.message,
        errorStack: error?.stack,
      },
      'Admin article list query failed',
    );

    throw error;
  }
}