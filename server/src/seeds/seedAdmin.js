import User from '../modules/users/user.model.js';
import UserProfile from '../modules/users/userProfile.model.js';
import { assignRoleBySlug } from '../modules/roles/role.service.js';
import { ROLES } from '../constants/roles.js';
import { env } from '../config/env.js';

export async function seedAdmin() {
  let user = await User.findOne({ email: env.ADMIN_EMAIL }).select('+passwordHash');
  if (!user) {
    user = new User({
      email: env.ADMIN_EMAIL,
      username: 'admin',
      displayName: 'Quản trị Đô Thị Hòa Lạc',
      passwordHash: 'pending',
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
      status: 'active',
    });
    await user.setPassword(env.ADMIN_PASSWORD);
    await user.save();
  } else {
    user.status = 'active';
    user.emailVerifiedAt ||= new Date();
    await user.save();
  }

  await UserProfile.findOneAndUpdate(
    { userId: user._id },
    {
      $setOnInsert: { userId: user._id },
      $set: {
        fullName: 'Quản trị Đô Thị Hòa Lạc',
        occupation: 'Quản trị hệ thống',
        bio: 'Tài khoản quản trị hệ thống Đô Thị Hòa Lạc.',
        publicProfile: false,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  await assignRoleBySlug(user._id, ROLES.MEMBER, user._id);
  await assignRoleBySlug(user._id, ROLES.SYSTEM_ADMIN, user._id);
  return user;
}
