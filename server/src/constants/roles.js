export const ROLES = Object.freeze({
  MEMBER: 'member',
  VERIFIED_MEMBER: 'verified_member',
  BROKER: 'broker',
  BUSINESS: 'business',
  CONTRIBUTOR: 'contributor',
  MODERATOR: 'moderator',
  EDITOR: 'editor',
  CHIEF_EDITOR: 'chief_editor',
  USER_ADMIN: 'user_admin',
  SYSTEM_ADMIN: 'system_admin',
});

export const ADMIN_ROLES = [
  ROLES.MODERATOR,
  ROLES.EDITOR,
  ROLES.CHIEF_EDITOR,
  ROLES.USER_ADMIN,
  ROLES.SYSTEM_ADMIN,
];
