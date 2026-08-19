import { sendSuccess } from '../../utils/apiResponse.js';
import {
  getAccessControlOverview,
  setUserStaffRoles,
} from './role.service.js';

export async function overview(_req, res) {
  return sendSuccess(res, {
    data: await getAccessControlOverview(),
  });
}

export async function updateUserRoles(req, res) {
  const data = await setUserStaffRoles({
    userId: req.params.id,
    roleSlugs: Array.isArray(req.body?.roles) ? req.body.roles : [],
    assignedBy: req.user._id,
    ipAddress: req.ip,
  });

  return sendSuccess(res, {
    data,
    message: 'Đã cập nhật vai trò người dùng.',
  });
}
