import User from '../modules/users/user.model.js';
import UserProfile from '../modules/users/userProfile.model.js';
import { assignRoleBySlug } from '../modules/roles/role.service.js';
import { ROLES } from '../constants/roles.js';
import { env } from '../config/env.js';
export async function seedAdmin() {
  let user = await User.findOne({ email: env.ADMIN_EMAIL });
  if (!user) {
    user = new User({
      email: env.ADMIN_EMAIL,
      username: 'admin',
      displayName: 'Quản trị Đô Thị Hòa Lạc',
      passwordHash: 'pending',
      emailVerifiedAt: new Date(),
      status: 'active',
    });
    await user.setPassword(env.ADMIN_PASSWORD);
    await user.save();
    await UserProfile.create({ userId: user._id, fullName: 'Quản trị Đô Thị Hòa Lạc' });
  }
  await assignRoleBySlug(user._id, ROLES.SYSTEM_ADMIN, user._id);
  return user;
}
