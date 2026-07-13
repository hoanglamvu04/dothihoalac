import AdminActivityLog from '../modules/system/adminActivityLog.model.js';

export async function writeAuditLog({
  adminId,
  action,
  targetType,
  targetId,
  oldData,
  newData,
  ipAddress,
}) {
  if (!adminId) return null;
  return AdminActivityLog.create({
    adminId,
    action,
    targetType,
    targetId,
    oldData,
    newData,
    ipAddress,
  });
}
