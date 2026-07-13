import Role from './role.model.js';
import Permission from './permission.model.js';
import UserRole from './userRole.model.js';
import RolePermission from './rolePermission.model.js';

export async function getUserAuthorization(userId) {
  const now = new Date();
  const userRoles = await UserRole.find({
    userId,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  }).lean();
  if (!userRoles.length) return { roles: [], permissions: [] };
  const roleIds = userRoles.map((item) => item.roleId);
  const [roles, links] = await Promise.all([
    Role.find({ _id: { $in: roleIds } }).lean(),
    RolePermission.find({ roleId: { $in: roleIds } }).lean(),
  ]);
  const permissionIds = [...new Set(links.map((item) => String(item.permissionId)))];
  const permissions = permissionIds.length
    ? await Permission.find({ _id: { $in: permissionIds } }).lean()
    : [];
  return {
    roles: roles.map((role) => role.slug),
    permissions: permissions.map((permission) => permission.slug),
  };
}

export async function assignRoleBySlug(userId, roleSlug, assignedBy = null) {
  const role = await Role.findOne({ slug: roleSlug });
  if (!role) return null;
  return UserRole.findOneAndUpdate(
    { userId, roleId: role._id },
    { $setOnInsert: { assignedBy, assignedAt: new Date() } },
    { upsert: true, new: true },
  );
}
