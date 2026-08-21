import { publicCompanyDetail } from './job.company.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function detail(req, res) {
  return sendSuccess(res, {
    data: await publicCompanyDetail(req.params.slug, req.query),
  });
}
