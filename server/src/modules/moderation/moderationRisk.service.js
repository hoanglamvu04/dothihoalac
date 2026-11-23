import Content from '../contents/content.model.js';
import { foldVietnamese, normalizedTitleTokens, tokenSimilarity } from '../../utils/vietnameseSearch.js';

export function assessModerationRisk(content, candidates = []) {
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

  const candidates = [...publicCandidates, ...items];
  return items.map((item) => ({
    ...item,
    moderationRisk: assessModerationRisk(item, candidates),
  }));
}
