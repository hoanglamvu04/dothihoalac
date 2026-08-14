import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import CommunityPost from './communityPost.model.js';
import Comment from '../comments/comment.model.js';
import Reaction from '../reactions/reaction.model.js';

import {
  createContentWithBody,
  getPublishedContentBySlug,
  getOwnedContentOrThrow,
  assertEditable,
  updateContentWithBody,
} from '../contents/content.service.js';

import {
  parsePagination,
  buildPaginationMeta,
} from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function loadCommentPreviews(contentIds) {
  if (!contentIds.length) {
    return new Map();
  }

  const groups = await Comment.aggregate([
    {
      $match: {
        contentId: { $in: contentIds },
        parentId: null,
        status: 'published',
        deletedAt: null,
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$contentId',
        comments: { $push: '$$ROOT' },
      },
    },
    {
      $project: {
        comments: { $slice: ['$comments', 2] },
      },
    },
  ]);

  const rawComments = groups.flatMap(
    (group) => group.comments || [],
  );

  const populated = rawComments.length
    ? await Comment.populate(rawComments, {
        path: 'userId',
        select:
          'username displayName emailVerifiedAt phoneVerifiedAt',
      })
    : [];

  const populatedMap = new Map(
    populated.map((comment) => [
      String(comment._id),
      comment,
    ]),
  );

  return new Map(
    groups.map((group) => [
      String(group._id),
      (group.comments || []).map(
        (comment) =>
          populatedMap.get(String(comment._id)) || comment,
      ),
    ]),
  );
}

export async function list(q, viewerId = null) {
  const { page, limit, skip } = parsePagination(q);

  const filter = {
    contentType: 'community',
    status: 'published',
    deletedAt: null,
  };

  if (q.area) filter.primaryAreaId = q.area;
  if (q.category) filter.primaryCategoryId = q.category;

  const queryText = String(q.q || '').trim();

  if (queryText) {
    const regex = new RegExp(escapeRegex(queryText), 'i');

    filter.$or = [
      { title: regex },
      { summary: regex },
    ];
  }

  const detailFilter = {};
  if (q.type) detailFilter.postType = q.type;

  let ids = null;

  if (Object.keys(detailFilter).length) {
    ids = (
      await CommunityPost.find(detailFilter)
        .select('contentId')
        .lean()
    ).map((item) => item.contentId);
  }

  if (ids) {
    filter._id = { $in: ids };
  }

  const [items, total] = await Promise.all([
    Content.find(filter)
      .populate(
        'authorId',
        'username displayName emailVerifiedAt phoneVerifiedAt',
      )
      .populate('primaryAreaId', 'name slug')
      .populate('primaryCategoryId', 'name slug')
      .populate(
        'thumbnailMediaId',
        'url secureUrl altText width height',
      )
      .sort(
        q.sort === 'popular'
          ? {
              reactionCount: -1,
              commentCount: -1,
              publishedAt: -1,
            }
          : { publishedAt: -1 },
      )
      .skip(skip)
      .limit(limit)
      .lean(),
    Content.countDocuments(filter),
  ]);

  const contentIds = items.map((item) => item._id);

  const [details, bodies, commentMap, viewerReactions] =
    await Promise.all([
      contentIds.length
        ? CommunityPost.find({
            contentId: { $in: contentIds },
          }).lean()
        : [],
      contentIds.length
        ? ContentBody.find({
            contentId: { $in: contentIds },
          })
            .select('contentId bodyText inlineMediaIds')
            .populate(
              'inlineMediaIds',
              'url secureUrl altText width height',
            )
            .lean()
        : [],
      loadCommentPreviews(contentIds),
      viewerId && contentIds.length
        ? Reaction.find({
            userId: viewerId,
            targetType: 'content',
            targetId: { $in: contentIds },
          })
            .select('targetId reactionType')
            .lean()
        : [],
    ]);

  const detailMap = new Map(
    details.map((detail) => [
      String(detail.contentId),
      detail,
    ]),
  );

  const bodyMap = new Map(
    bodies.map((body) => [
      String(body.contentId),
      body,
    ]),
  );

  const reactionMap = new Map(
    viewerReactions.map((reaction) => [
      String(reaction.targetId),
      reaction.reactionType,
    ]),
  );

  return {
    items: items.map((item) => {
      const key = String(item._id);

      return {
        ...item,
        community: detailMap.get(key) || null,
        body: bodyMap.get(key) || null,
        commentPreview: commentMap.get(key) || [],
        viewerReaction: reactionMap.get(key) || null,
      };
    }),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

export async function detail(slug) {
  const base = await getPublishedContentBySlug(
    slug,
    'community',
  );

  const community = await CommunityPost.findOne({
    contentId: base._id,
  }).lean();

  return { ...base, community };
}

export async function editorDetail(id, userId) {
  const content = await getOwnedContentOrThrow(
    id,
    userId,
    'community',
  );

  await content.populate([
    {
      path: 'primaryCategoryId',
      select: 'name slug contentScope description',
    },
    {
      path: 'primaryAreaId',
      select: 'name slug areaType description',
    },
    {
      path: 'tagIds',
      select: 'name slug',
    },
    {
      path: 'thumbnailMediaId',
      select:
        'provider publicId assetId url secureUrl resourceType format width height altText status',
    },
  ]);

  const [body, community] = await Promise.all([
    ContentBody.findOne({ contentId: content._id }).lean(),
    CommunityPost.findOne({ contentId: content._id }).lean(),
  ]);

  return {
    ...content.toObject(),
    body: body || {
      contentId: content._id,
      bodyHtml: '',
      bodyText: '',
      wordCount: 0,
      readingTime: 1,
      inlineMediaIds: [],
    },
    community,
  };
}

export async function create(userId, data) {
  const content = await createContentWithBody({
    authorId: userId,
    contentType: 'community',
    ...data,
    status: 'draft',
  });

  await CommunityPost.create({
    contentId: content._id,
    postType: data.postType,
    incidentTime: data.incidentTime,
    locationText: data.locationText,
    rating: data.rating,
  });

  return content;
}

export async function update(id, userId, data) {
  const content = await getOwnedContentOrThrow(
    id,
    userId,
    'community',
  );

  assertEditable(content);

  await updateContentWithBody(
    content,
    data,
    userId,
    'User edit',
  );

  await CommunityPost.findOneAndUpdate(
    { contentId: id },
    data,
    { returnDocument: 'after' },
  );

  return content;
}

export async function remove(id, userId) {
  const content = await getOwnedContentOrThrow(
    id,
    userId,
    'community',
  );

  content.status = 'deleted';
  content.deletedAt = new Date();
  await content.save();
}

export async function submit(id, userId) {
  const content = await getOwnedContentOrThrow(
    id,
    userId,
    'community',
  );

  if (
    !['draft', 'needs_revision', 'rejected'].includes(
      content.status,
    )
  ) {
    throw new ApiError(
      409,
      'Bài không thể gửi duyệt.',
      'INVALID_STATUS',
    );
  }

  content.status = 'pending_review';
  await content.save();
  return content;
}

export async function acceptAnswer(
  id,
  userId,
  commentId,
) {
  await getOwnedContentOrThrow(
    id,
    userId,
    'community',
  );

  const post = await CommunityPost.findOne({
    contentId: id,
    postType: 'question',
  });

  if (!post) {
    throw new ApiError(
      400,
      'Chỉ bài hỏi đáp mới chọn được câu trả lời.',
      'NOT_QUESTION',
    );
  }

  const comment = await Comment.findOne({
    _id: commentId,
    contentId: id,
    status: 'published',
  });

  if (!comment) {
    throw new ApiError(
      404,
      'Không tìm thấy bình luận.',
      'COMMENT_NOT_FOUND',
    );
  }

  post.acceptedCommentId = commentId;
  post.questionStatus = 'answered';
  await post.save();

  return post;
}
