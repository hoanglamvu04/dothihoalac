import { create as createReport } from './report.service.js';
import { sendCreated } from '../../utils/apiResponse.js';
export async function create(req, res) {
  return sendCreated(res, await createReport(req.user._id, req.body), 'Đã gửi báo cáo.');
}
