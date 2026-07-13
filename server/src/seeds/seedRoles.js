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
export async function seedRoles() {
  const permissionMap = {};
  for (const slug of Object.values(PERMISSIONS)) {
    permissionMap[slug] = await Permission.findOneAndUpdate(
      { slug },
      { $set: { name: slug.replaceAll('_', ' ') } },
      { upsert: true, new: true },
    );
  }
  for (const [slug, permissions] of Object.entries(roleDefinitions)) {
    const role = await Role.findOneAndUpdate(
      { slug },
      { $set: { name: slug.replaceAll('_', ' '), isSystem: true } },
      { upsert: true, new: true },
    );
    for (const p of permissions)
      await RolePermission.findOneAndUpdate(
        { roleId: role._id, permissionId: permissionMap[p]._id },
        { $setOnInsert: { roleId: role._id, permissionId: permissionMap[p]._id } },
        { upsert: true },
      );
  }
  return roleDefinitions;
}
