import Report from './report.model.js';
import ApiError from '../../utils/ApiError.js';
export async function create(userId, d) {
  const existing = await Report.exists({
    reporterId: userId,
    targetType: d.targetType,
    targetId: d.targetId,
    status: { $in: ['pending', 'reviewing'] },
  });
  if (existing)
    throw new ApiError(
      409,
      'Bạn đã báo cáo đối tượng này và báo cáo đang được xử lý.',
      'REPORT_EXISTS',
    );
  return Report.create({ ...d, reporterId: userId });
}
