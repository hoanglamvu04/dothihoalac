import { search } from './search.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
export async function run(req, res) {
  const r = await search(req.query);
  return sendSuccess(res, {
    data: { contents: r.items, users: r.users, areas: r.areas },
    meta: r.meta,
  });
}
