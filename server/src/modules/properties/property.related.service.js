import Content from '../contents/content.model.js';
import PropertyListing from './propertyListing.model.js';
import ApiError from '../../utils/ApiError.js';
import { tokenSimilarity } from '../../utils/vietnameseSearch.js';

function key(value) {
  return String(value?._id || value || '');
}

export function propertyRelatedScore(source, candidate, listing, other, now = Date.now()) {
  let score = tokenSimilarity(source.title, candidate.title) * 2;
  if (key(source.primaryAreaId) && key(source.primaryAreaId) === key(candidate.primaryAreaId)) score += 5;
  if (listing.propertyType === other.propertyType) score += 3;
  if (listing.transactionType === other.transactionType) score += 2;
  if (listing.landArea > 0 && other.landArea > 0) {
    const ratio = Math.abs(listing.landArea - other.landArea) /
      Math.max(listing.landArea, other.landArea);
    score += Math.max(0, 2 * (1 - ratio));
  }
  if (listing.priceUnit === other.priceUnit && listing.price > 0 && other.price > 0) {
    const ratio = Math.abs(listing.price - other.price) / Math.max(listing.price, other.price);
    score += Math.max(0, 2 * (1 - ratio));
  }
  const days = Math.max(0, (now - new Date(candidate.publishedAt || now).getTime()) / 86400000);
  score += 1 / (1 + days / 30);
  return score;
}

export async function relatedProperties(slug) {
  const now = new Date();
  const publicFilter = {
    contentType: 'property', status: 'published', visibility: 'public', deletedAt: null,
  };
  const source = await Content.findOne({ ...publicFilter, slug })
    .select('_id title primaryAreaId').lean();
  if (!source) throw new ApiError(404, 'Không tìm thấy tin bất động sản.', 'PROPERTY_NOT_FOUND');
  const listing = await PropertyListing.findOne({
    contentId: source._id, expiresAt: { $gt: now }, soldAt: null, rentedAt: null,
  }).select('transactionType propertyType price priceUnit landArea').lean();
  if (!listing) return [];

  const candidates = await PropertyListing.find({
    contentId: { $ne: source._id },
    transactionType: listing.transactionType,
    propertyType: listing.propertyType,
    expiresAt: { $gt: now }, soldAt: null, rentedAt: null,
  })
    .select('contentId transactionType propertyType landArea price priceUnit')
    .sort({ createdAt: -1 })
    .limit(120).lean();
  if (!candidates.length) return [];
  const content = await Content.find({
    ...publicFilter, _id: { $in: candidates.map((row) => row.contentId) },
  })
    .select('_id title slug summary contentType primaryAreaId thumbnailMediaId publishedAt')
    .populate('primaryAreaId', 'name slug')
    .populate('thumbnailMediaId', 'url secureUrl altText width height resourceType')
    .lean();
  const byId = new Map(content.map((item) => [key(item._id), item]));
  return candidates
    .map((candidate) => {
      const item = byId.get(key(candidate.contentId));
      if (!item) return null;
      return {
        item: {
          ...item,
          // Public card fields only; no phone, email or property contact fields.
          property: {
            propertyType: candidate.propertyType,
            transactionType: candidate.transactionType,
            landArea: candidate.landArea,
            price: candidate.price,
            priceUnit: candidate.priceUnit,
          },
        },
        score: propertyRelatedScore(source, item, listing, candidate, now.getTime()),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score ||
      new Date(b.item.publishedAt || 0).getTime() - new Date(a.item.publishedAt || 0).getTime())
    .slice(0, 4)
    .map(({ item }) => item);
}
