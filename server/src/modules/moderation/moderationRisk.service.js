import Content from '../contents/content.model.js';
import { foldVietnamese, normalizedTitleTokens, tokenSimilarity } from '../../utils/vietnameseSearch.js';

export function assessModerationRisk(content, candidates = [], options = {}) {
  const title = String(content?.title || '');
  const normalizedTitle = foldVietnamese(title);
  const tokens = normalizedTitleTokens(title);
  const flags = [];
  if (normalizedTitle.length < 18) flags.push('Tiêu đề quá ngắn, cần kiểm tra lại');
  if (String(content?.summary || '').trim().length < 25) {
    flags.push('Thiếu mô tả ngắn đầy đủ');
  }

  const linkCount = (String(content?.summary || '').match(/https?:\/\//gi) || []).length;
  if (linkCount >= 2) flags.push('Mô tả chứa nhiều liên kết');
  // User-level burst signal; advisory only, never an automatic suspension.
  if (Number(options.authorRecentCount || 0) >= 8) {
    flags.push('Tài khoản gửi nhiều bài trong 24 giờ, cần đối chiếu nguồn');
  }

  let duplicate = null;
  if (tokens.length >= 4 && normalizedTitle.length >= 20) {
    for (const candidate of candidates) {
      if (
        String(candidate._id) === String(content._id) ||
        candidate.contentType !== content.contentType
      ) continue;

      const score = tokenSimilarity(title, candidate.title);
      if (score < 0.84 || (duplicate && score <= duplicate.score)) continue;
      duplicate = {
        contentId: String(candidate._id),
        title: String(candidate.title || '').slice(0, 250),
        score: Number(score.toFixed(3)),
      };
    }
  }

  if (duplicate) flags.push('Tiêu đề gần trùng nội dung khác');
  return {
    level: duplicate?.score >= 0.95 ? 'high' : flags.length ? 'review' : 'clear',
    flags,
    duplicate,
    // A heuristic warning, never an automatic finding or publishing ban.
    automatedDecision: false,
  };
}

export async function annotateModerationQueue(items = [], allowedTypes = []) {
  if (!items.length || !allowedTypes.length) return items;
  const since = new Date(Date.now() - 120 * 86_400_000);
  const publicCandidates = await Content.find({
    contentType: { $in: allowedTypes },
    status: 'published',
    visibility: 'public',
    deletedAt: null,
    publishedAt: { $gte: since },
  })
    .select('_id contentType title summary')
    .sort({ publishedAt: -1 })
    .limit(350)
    .lean();

  const authors = [...new Map(items
    .map((item) => item.authorId?._id || item.authorId)
    .filter(Boolean)
    .map((authorId) => [String(authorId), authorId])).values()];
  const bursts = authors.length ? await Content.aggregate([
    {
      $match: {
        authorId: { $in: authors },
        contentType: { $in: allowedTypes },
        status: { $in: ['pending_review', 'approved', 'published'] },
        deletedAt: null,
        createdAt: { $gte: new Date(Date.now() - 86_400_000) },
      },
    },
    { $group: { _id: '$authorId', count: { $sum: 1 } } },
  ]) : [];
  const burstMap = new Map(bursts.map((row) => [String(row._id), row.count]));
  const candidates = [...publicCandidates, ...items];
  return items.map((item) => ({
    ...item,
    moderationRisk: assessModerationRisk(item, candidates, {
      authorRecentCount: burstMap.get(String(item.authorId?._id || item.authorId)) || 0,
    }),
  }));
}
