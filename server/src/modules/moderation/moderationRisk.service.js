import Content from '../contents/content.model.js';
import PropertyListing from '../properties/propertyListing.model.js';
import { foldVietnamese, normalizedTitleTokens, tokenSimilarity } from '../../utils/vietnameseSearch.js';


function id(value) {
  return String(value?._id || value || '');
}

function unitNumber(value) {
  const folded = foldVietnamese(value);
  return folded.match(/\b(?:can|phong|unit|lo)\s*(\d{2,4}[a-z]?)\b/i)?.[1] || null;
}

function closeRatio(a, b, tolerance) {
  const left = Number(a || 0);
  const right = Number(b || 0);
  return left > 0 && right > 0 &&
    Math.abs(left - right) / Math.max(left, right) <= tolerance;
}

export function propertyDuplicateScore(source, candidate, sourceProperty, candidateProperty) {
  if (!sourceProperty || !candidateProperty) return { score: 0, signals: [] };
  if (sourceProperty.propertyType !== candidateProperty.propertyType) return { score: 0, signals: [] };
  const sourceUnit = unitNumber(sourceProperty.addressText || source.title);
  const candidateUnit = unitNumber(candidateProperty.addressText || candidate.title);
  // Distinct apartments/rooms in the same building must never be marked
  // duplicates just because the broker, location, area and price match.
  if (sourceUnit && candidateUnit && sourceUnit !== candidateUnit) {
    return { score: 0, signals: [] };
  }
  const titleScore = tokenSimilarity(source.title, candidate.title);
  const sameMedia = Boolean(id(source.thumbnailMediaId) &&
    id(source.thumbnailMediaId) === id(candidate.thumbnailMediaId));
  if (!sameMedia && titleScore < 0.46) return { score: 0, signals: [] };

  const signals = [];
  let score = titleScore * 0.27;
  if (sameMedia) { score += 0.19; signals.push('Cùng ảnh đại diện đã lưu'); }
  if (id(source.primaryAreaId) && id(source.primaryAreaId) === id(candidate.primaryAreaId)) {
    score += 0.15; signals.push('Cùng khu vực');
  }
  if (sourceProperty.contactPhone && candidateProperty.contactPhone &&
    sourceProperty.contactPhone === candidateProperty.contactPhone) {
    score += 0.16; signals.push('Cùng số liên hệ');
  }
  if (closeRatio(sourceProperty.landArea, candidateProperty.landArea, 0.04)) {
    score += 0.12; signals.push('Diện tích gần trùng');
  }
  if (sourceProperty.priceUnit === candidateProperty.priceUnit &&
    closeRatio(sourceProperty.price, candidateProperty.price, 0.06)) {
    score += 0.11; signals.push('Giá gần trùng');
  }
  return { score: Math.min(1, Number(score.toFixed(3))), signals };
}

function moderationQualityScore(content) {
  let score = 100;
  if (String(content.title || '').trim().length < 18) score -= 20;
  if (String(content.summary || '').trim().length < 25) score -= 20;
  if (!content.primaryAreaId) score -= 15;
  if (!content.thumbnailMediaId) score -= 15;
  return Math.max(0, score);
}

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

      const props = options.propertiesById;
      const sourceProperty = props?.get(id(content._id));
      const candidateProperty = props?.get(id(candidate._id));
      const sourceUnit = unitNumber(sourceProperty?.addressText || title);
      const candidateUnit = unitNumber(candidateProperty?.addressText || candidate.title);
      if (sourceUnit && candidateUnit && sourceUnit !== candidateUnit) continue;

      const titleScore = tokenSimilarity(title, candidate.title);
      const property = content.contentType === 'property'
        ? propertyDuplicateScore(content, candidate, sourceProperty, candidateProperty)
        : { score: 0, signals: [] };
      const score = Math.max(titleScore, property.score);
      if (score < 0.84 || (duplicate && score <= duplicate.score)) continue;
      duplicate = {
        contentId: String(candidate._id),
        title: String(candidate.title || '').slice(0, 250),
        score: Number(score.toFixed(3)),
        signals: property.score >= 0.84 ? property.signals : ['Tiêu đề rất giống'],
      };
    }
  }

  if (duplicate) flags.push('Tiêu đề gần trùng nội dung khác');
  return {
    level: duplicate?.score >= 0.95 ? 'high' : flags.length ? 'review' : 'clear',
    flags,
    duplicate,
    // A heuristic warning, never an automatic finding or publishing ban.
    qualityScore: moderationQualityScore(content),
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
    .select('_id contentType title summary primaryAreaId thumbnailMediaId')
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
  const propertyIds = candidates.filter((candidate) => candidate.contentType === 'property')
    .map((candidate) => candidate._id);
  const propertyRows = propertyIds.length
    ? await PropertyListing.find({ contentId: { $in: propertyIds } })
      .select('contentId propertyType contactPhone landArea price priceUnit addressText')
      .lean()
    : [];
  const propertiesById = new Map(propertyRows.map((row) => [id(row.contentId), row]));
  return items.map((item) => ({
    ...item,
    moderationRisk: assessModerationRisk(item, candidates, {
      authorRecentCount: burstMap.get(String(item.authorId?._id || item.authorId)) || 0,
      propertiesById,
    }),
  }));
}
