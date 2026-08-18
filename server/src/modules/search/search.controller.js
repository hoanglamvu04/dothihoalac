import { search } from './search.service.js';
import { recordSearchActivity } from '../../services/userActivity.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function run(req, res) {
  const r = await search(req.query);

  if (req.user && String(req.query.q || '').trim()) {
    await recordSearchActivity(req.user._id, req.query).catch(() => null);
  }

  return sendSuccess(res, {
    data: { contents: r.items, users: r.users, areas: r.areas },
    meta: r.meta,
  });
}
