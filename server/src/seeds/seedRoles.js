import Role from '../modules/roles/role.model.js';
import Permission from '../modules/roles/permission.model.js';
import RolePermission from '../modules/roles/rolePermission.model.js';
import { ROLES } from '../constants/roles.js';
import { PERMISSIONS } from '../constants/permissions.js';

const roleDefinitions = {
  [ROLES.MEMBER]: [],
  [ROLES.VERIFIED_MEMBER]: [],
  [ROLES.BROKER]: [],
  [ROLES.BUSINESS]: [],
  [ROLES.CONTRIBUTOR]: [PERMISSIONS.CREATE_ARTICLE],
  [ROLES.MODERATOR]: [
    PERMISSIONS.MODERATE_COMMUNITY,
    PERMISSIONS.MODERATE_PROPERTY,
    PERMISSIONS.MODERATE_JOB,
    PERMISSIONS.MODERATE_COMMENT,
  ],
  [ROLES.EDITOR]: [
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.EDIT_ARTICLE,
    PERMISSIONS.APPROVE_ARTICLE,
  ],
  [ROLES.CHIEF_EDITOR]: [
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.EDIT_ARTICLE,
    PERMISSIONS.APPROVE_ARTICLE,
    PERMISSIONS.PUBLISH_ARTICLE,
  ],
  [ROLES.USER_ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MODERATE_COMMUNITY,
    PERMISSIONS.MODERATE_COMMENT,
  ],
  [ROLES.SYSTEM_ADMIN]: Object.values(PERMISSIONS),
};

const roleNames = {
  member: 'Thành viên',
  verified_member: 'Thành viên đã xác thực',
  broker: 'Môi giới',
  business: 'Doanh nghiệp',
  contributor: 'Cộng tác viên',
  moderator: 'Kiểm duyệt viên',
  editor: 'Biên tập viên',
  chief_editor: 'Trưởng ban biên tập',
  user_admin: 'Quản trị người dùng',
  system_admin: 'Quản trị hệ thống',
};

export async function seedRoles() {
  const permissionMap = {};
  for (const slug of Object.values(PERMISSIONS)) {
    permissionMap[slug] = await Permission.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: slug.replaceAll('_', ' '),
          description: `Quyền hệ thống: ${slug}`,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  const roles = {};
  for (const [slug, permissions] of Object.entries(roleDefinitions)) {
    const role = await Role.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: roleNames[slug] || slug.replaceAll('_', ' '),
          description: `Vai trò hệ thống ${roleNames[slug] || slug}`,
          isSystem: true,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    roles[slug] = role;

    const desiredPermissionIds = permissions.map((permission) => permissionMap[permission]._id);
    await RolePermission.deleteMany({
      roleId: role._id,
      ...(desiredPermissionIds.length ? { permissionId: { $nin: desiredPermissionIds } } : {}),
    });

    if (!desiredPermissionIds.length) {
      await RolePermission.deleteMany({ roleId: role._id });
      continue;
    }

    for (const permissionId of desiredPermissionIds) {
      await RolePermission.findOneAndUpdate(
        { roleId: role._id, permissionId },
        { $setOnInsert: { roleId: role._id, permissionId } },
        { upsert: true, new: true },
      );
    }
  }

  return { roleDefinitions, roles, permissions: permissionMap };
}
