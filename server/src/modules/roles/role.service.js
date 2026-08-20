import Role from './role.model.js';
import Permission from './permission.model.js';
import UserRole from './userRole.model.js';
import RolePermission from './rolePermission.model.js';
import User from '../users/user.model.js';
import { ROLES } from '../../constants/roles.js';
import { writeAuditLog } from '../../services/audit.service.js';
import ApiError from '../../utils/ApiError.js';

export const STAFF_ROLE_SLUGS = Object.freeze([
  ROLES.CONTRIBUTOR,
  ROLES.MODERATOR,
  ROLES.EDITOR,
  ROLES.CHIEF_EDITOR,
  ROLES.USER_ADMIN,
  ROLES.SYSTEM_ADMIN,
]);

function activeRoleFilter(now = new Date()) {
  return {
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  };
}

export async function getUserAuthorization(userId) {
  const now = new Date();
  const userRoles = await UserRole.find({
    userId,
    ...activeRoleFilter(now),
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
    {
      $set: {
        assignedBy,
        assignedAt: new Date(),
        expiresAt: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function getAccessControlOverview() {
  const now = new Date();
  const [roles, permissions, links, assignmentCounts] = await Promise.all([
    Role.find({}).sort({ isSystem: -1, name: 1 }).lean(),
    Permission.find({}).sort({ slug: 1 }).lean(),
    RolePermission.find({}).lean(),
    UserRole.aggregate([
      { $match: activeRoleFilter(now) },
      { $group: { _id: '$roleId', count: { $sum: 1 } } },
    ]),
  ]);

  const permissionsById = new Map(
    permissions.map((permission) => [String(permission._id), permission]),
  );
  const permissionSlugsByRoleId = new Map();

  links.forEach((link) => {
    const roleId = String(link.roleId);
    const permission = permissionsById.get(String(link.permissionId));
    if (!permission) return;
    const list = permissionSlugsByRoleId.get(roleId) || [];
    list.push(permission.slug);
    permissionSlugsByRoleId.set(roleId, list);
  });

  const countsByRoleId = new Map(
    assignmentCounts.map((item) => [String(item._id), Number(item.count || 0)]),
  );

  return {
    staffRoleSlugs: STAFF_ROLE_SLUGS,
    roles: roles.map((role) => ({
      id: role._id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isStaff: STAFF_ROLE_SLUGS.includes(role.slug),
      userCount: countsByRoleId.get(String(role._id)) || 0,
      permissions: [...(permissionSlugsByRoleId.get(String(role._id)) || [])].sort(),
    })),
    permissions: permissions.map((permission) => ({
      id: permission._id,
      slug: permission.slug,
      name: permission.name,
      description: permission.description,
    })),
  };
}

export async function setUserStaffRoles({
  userId,
  roleSlugs = [],
  assignedBy,
  ipAddress = '',
}) {
  const target = await User.findOne({ _id: userId, deletedAt: null }).lean();
  if (!target) {
    throw new ApiError(404, 'Không tìm thấy người dùng.', 'USER_NOT_FOUND');
  }

  const desiredSlugs = [...new Set(roleSlugs.map((value) => String(value || '').trim()))]
    .filter(Boolean);
  const invalid = desiredSlugs.filter((slug) => !STAFF_ROLE_SLUGS.includes(slug));
  if (invalid.length) {
    throw new ApiError(
      422,
      'Danh sách vai trò nhân sự có giá trị không hợp lệ.',
      'STAFF_ROLE_INVALID',
      { invalid },
    );
  }

  const staffRoles = await Role.find({ slug: { $in: STAFF_ROLE_SLUGS } }).lean();
  const staffRoleIds = staffRoles.map((role) => role._id);
  const roleBySlug = new Map(staffRoles.map((role) => [role.slug, role]));
  const missingRoles = desiredSlugs.filter((slug) => !roleBySlug.has(slug));
  if (missingRoles.length) {
    throw new ApiError(
      409,
      'Một số vai trò chưa được khởi tạo trong hệ thống. Hãy chạy seed role trước.',
      'ROLE_CATALOG_INCOMPLETE',
      { missingRoles },
    );
  }

  const currentLinks = await UserRole.find({
    userId,
    roleId: { $in: staffRoleIds },
    ...activeRoleFilter(),
  }).lean();
  const currentRoleIds = new Set(currentLinks.map((item) => String(item.roleId)));
  const currentSlugs = staffRoles
    .filter((role) => currentRoleIds.has(String(role._id)))
    .map((role) => role.slug);

  if (
    currentSlugs.includes(ROLES.SYSTEM_ADMIN) &&
    !desiredSlugs.includes(ROLES.SYSTEM_ADMIN)
  ) {
    const systemAdminRole = roleBySlug.get(ROLES.SYSTEM_ADMIN);
    const otherSystemAdmins = await UserRole.countDocuments({
      userId: { $ne: userId },
      roleId: systemAdminRole._id,
      ...activeRoleFilter(),
    });

    if (otherSystemAdmins < 1) {
      throw new ApiError(
        409,
        'Không thể gỡ System Admin cuối cùng của hệ thống.',
        'LAST_SYSTEM_ADMIN',
      );
    }
  }

  const desiredRoleIds = desiredSlugs.map((slug) => roleBySlug.get(slug)._id);

  await UserRole.deleteMany({
    userId,
    roleId: {
      $in: staffRoleIds.filter(
        (roleId) => !desiredRoleIds.some((desiredId) => String(desiredId) === String(roleId)),
      ),
    },
  });

  for (const roleId of desiredRoleIds) {
    await UserRole.findOneAndUpdate(
      { userId, roleId },
      {
        $set: {
          assignedBy,
          assignedAt: new Date(),
          expiresAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  await writeAuditLog({
    adminId: assignedBy,
    action: 'user.roles.update',
    targetType: 'user',
    targetId: userId,
    oldData: { staffRoles: currentSlugs },
    newData: { staffRoles: desiredSlugs },
    ipAddress,
  });

  const authorization = await getUserAuthorization(userId);
  return {
    userId,
    staffRoles: desiredSlugs,
    roles: authorization.roles,
    permissions: authorization.permissions,
  };
}
