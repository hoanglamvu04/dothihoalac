import User from '../modules/users/user.model.js';
import UserProfile from '../modules/users/userProfile.model.js';
import { assignRoleBySlug } from '../modules/roles/role.service.js';
import { ROLES } from '../constants/roles.js';
import { DEMO_PASSWORD } from './seedHelpers.js';

const userDefinitions = [
  {
    key: 'chiefEditor',
    email: 'truongban@dothihoalac.vn',
    username: 'truongban',
    displayName: 'Nguyễn Minh Anh',
    fullName: 'Nguyễn Minh Anh',
    occupation: 'Trưởng ban biên tập',
    bio: 'Phụ trách định hướng nội dung và kiểm chứng thông tin địa phương.',
    role: ROLES.CHIEF_EDITOR,
    areaSlug: 'hoa-lac',
    verified: true,
  },
  {
    key: 'editor',
    email: 'bientap@dothihoalac.vn',
    username: 'bientapvien',
    displayName: 'Lê Hoàng Nam',
    fullName: 'Lê Hoàng Nam',
    occupation: 'Biên tập viên',
    bio: 'Theo dõi quy hoạch, hạ tầng và đời sống khu vực Hòa Lạc.',
    role: ROLES.EDITOR,
    areaSlug: 'thach-hoa',
    verified: true,
  },
  {
    key: 'moderator',
    email: 'kiemduyet@dothihoalac.vn',
    username: 'kiemduyet',
    displayName: 'Trần Thu Hà',
    fullName: 'Trần Thu Hà',
    occupation: 'Kiểm duyệt viên cộng đồng',
    bio: 'Hỗ trợ duyệt bài, báo cáo và nội dung cộng đồng.',
    role: ROLES.MODERATOR,
    areaSlug: 'tan-xa',
    verified: true,
  },
  {
    key: 'contributor',
    email: 'congtacvien@dothihoalac.vn',
    username: 'congtacvien',
    displayName: 'Phạm Đức Long',
    fullName: 'Phạm Đức Long',
    occupation: 'Cộng tác viên địa phương',
    bio: 'Ghi nhận hình ảnh và thông tin thực tế tại Hòa Lạc.',
    role: ROLES.CONTRIBUTOR,
    areaSlug: 'binh-yen',
    verified: true,
  },
  {
    key: 'broker',
    email: 'moigioi@example.com',
    phone: '0901000001',
    username: 'minhquanbds',
    displayName: 'Minh Quân BĐS',
    fullName: 'Đỗ Minh Quân',
    occupation: 'Môi giới bất động sản',
    bio: 'Tư vấn nhà đất khu vực Hòa Lạc, minh bạch thông tin và pháp lý.',
    role: ROLES.BROKER,
    areaSlug: 'thach-hoa',
    verified: true,
  },
  {
    key: 'business',
    email: 'doanhnghiep@example.com',
    phone: '0901000002',
    username: 'xaydunghoalac',
    displayName: 'Xây dựng Hòa Lạc',
    fullName: 'Công ty Xây dựng Hòa Lạc',
    occupation: 'Doanh nghiệp xây dựng',
    bio: 'Đơn vị tư vấn thiết kế, thi công và cải tạo công trình.',
    role: ROLES.BUSINESS,
    areaSlug: 'hoa-lac',
    verified: true,
  },
  {
    key: 'resident',
    email: 'cudan@example.com',
    phone: '0901000003',
    username: 'cudanhoalac',
    displayName: 'Mai Lan',
    fullName: 'Nguyễn Mai Lan',
    occupation: 'Cư dân Hòa Lạc',
    bio: 'Chia sẻ kinh nghiệm sinh sống, trường học và dịch vụ địa phương.',
    role: ROLES.VERIFIED_MEMBER,
    areaSlug: 'tan-xa',
    verified: true,
  },
  {
    key: 'student',
    email: 'sinhvien@example.com',
    phone: '0901000004',
    username: 'sinhvienvnu',
    displayName: 'Hoàng Gia Bảo',
    fullName: 'Hoàng Gia Bảo',
    occupation: 'Sinh viên',
    bio: 'Quan tâm nhà trọ, xe buýt, việc làm thêm và đời sống sinh viên.',
    role: ROLES.VERIFIED_MEMBER,
    areaSlug: 'dai-hoc-quoc-gia-ha-noi',
    verified: true,
  },
  {
    key: 'employer',
    email: 'tuyendung@example.com',
    phone: '0901000005',
    username: 'tuyendungcnc',
    displayName: 'Tuyển dụng CNC',
    fullName: 'Phòng nhân sự CNC',
    occupation: 'Nhà tuyển dụng',
    bio: 'Đăng tuyển các vị trí công nghệ, kỹ thuật và vận hành.',
    role: ROLES.BUSINESS,
    areaSlug: 'khu-cong-nghe-cao-hoa-lac',
    verified: true,
  },
  {
    key: 'member',
    email: 'thanhvien@example.com',
    username: 'thanhvienmoi',
    displayName: 'Thành viên mới',
    fullName: 'Trần Văn Thành',
    occupation: 'Người dùng cộng đồng',
    bio: 'Tài khoản mẫu để kiểm thử luồng thành viên thường.',
    role: ROLES.MEMBER,
    areaSlug: 'yen-binh',
    verified: false,
  },
];

export async function seedUsers({ areas, adminUser }) {
  const result = { admin: adminUser };

  for (const definition of userDefinitions) {
    let user = await User.findOne({ email: definition.email }).select('+passwordHash');
    if (!user) {
      user = new User({
        email: definition.email,
        phone: definition.phone,
        username: definition.username,
        displayName: definition.displayName,
        passwordHash: 'pending',
        status: 'active',
        emailVerifiedAt: definition.verified ? new Date() : null,
        phoneVerifiedAt: definition.verified && definition.phone ? new Date() : null,
      });
      await user.setPassword(DEMO_PASSWORD);
      await user.save();
    } else {
      user.displayName = definition.displayName;
      user.status = 'active';
      user.emailVerifiedAt = definition.verified ? user.emailVerifiedAt || new Date() : null;
      if (definition.phone) {
        user.phone = definition.phone;
        user.phoneVerifiedAt = definition.verified ? user.phoneVerifiedAt || new Date() : null;
      }
      await user.save();
    }

    const area = areas[definition.areaSlug];
    await UserProfile.findOneAndUpdate(
      { userId: user._id },
      {
        $setOnInsert: { userId: user._id },
        $set: {
          fullName: definition.fullName,
          bio: definition.bio,
          occupation: definition.occupation,
          areaId: area?._id || null,
          website: '',
          publicProfile: true,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    await assignRoleBySlug(user._id, ROLES.MEMBER, adminUser._id);
    if (definition.role !== ROLES.MEMBER) {
      await assignRoleBySlug(user._id, definition.role, adminUser._id);
    }
    result[definition.key] = user;
  }

  return result;
}

export { userDefinitions };
