import { search } from './search.service.js';
import { suggestSearch } from './search.suggestions.js';
import { recordSearchActivity } from '../../services/userActivity.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function run(req, res) {
  const r = await search(req.query);

  // A user-requested preview of saved filters should not create another
  // search-history event. Ordinary user-initiated search history is unchanged.
  if (req.user && req.query.preview !== 'saved-search' && String(req.query.q || '').trim()) {
    await recordSearchActivity(req.user._id, req.query).catch(() => null);
  }

  return sendSuccess(res, {
    data: {
      contents: r.items,
      users: r.users,
      areas: r.areas,
      facets: r.facets,
      sort: r.sort,
      suggestion: r.suggestion || null,
    },
    meta: r.meta,
  });
}

export async function suggest(req, res) {
  res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');
  return sendSuccess(res, { data: await suggestSearch(req.query.q) });
}
