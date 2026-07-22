import Media from '../modules/media/media.model.js';
import UserProfile from '../modules/users/userProfile.model.js';
import { makeSvgDataUrl } from './seedHelpers.js';

const mediaDefinitions = [
  ['avatar-admin', 'Quản trị', 'Hệ thống', 640, 640, '#e84b24'],
  ['avatar-editor', 'Biên tập', 'Đô Thị Hòa Lạc', 640, 640, '#0f6c80'],
  ['avatar-resident', 'Cư dân', 'Cộng đồng Hòa Lạc', 640, 640, '#c46d2d'],
  ['cover-community', 'Cộng đồng Hòa Lạc', 'Kết nối cư dân và nhu cầu địa phương', 1600, 600, '#e84b24'],
  ['article-planning', 'Quy hoạch Hòa Lạc', 'Thông tin và phân tích', 1200, 675, '#e84b24'],
  ['article-infrastructure', 'Hạ tầng giao thông', 'Đường, nút giao và tiến độ', 1200, 675, '#d38d2f'],
  ['article-techpark', 'Khu Công nghệ cao', 'Doanh nghiệp và đổi mới sáng tạo', 1200, 675, '#178a9a'],
  ['article-education', 'Đại học Quốc gia', 'Giáo dục và đời sống sinh viên', 1200, 675, '#4667b1'],
  ['article-life', 'Đời sống cư dân', 'Dịch vụ, môi trường và tiện ích', 1200, 675, '#3c8b62'],
  ['article-construction', 'Kiến trúc - Xây dựng', 'Kinh nghiệm xây nhà tại Hòa Lạc', 1200, 675, '#e84b24'],
  ['article-tourism', 'Du lịch Hòa Lạc', 'Điểm đến và trải nghiệm cuối tuần', 1200, 675, '#8c5cb1'],
  ['article-warning', 'Cảnh báo cộng đồng', 'Thông tin cần lưu ý', 1200, 675, '#bd3030'],
  ['property-land', 'Đất ở Hòa Lạc', 'Thông tin bất động sản mẫu', 1200, 675, '#a7682a'],
  ['property-house', 'Nhà ở Hòa Lạc', 'Không gian sống và đầu tư', 1200, 675, '#2f7a6a'],
  ['property-room', 'Phòng trọ sinh viên', 'Gần Đại học Quốc gia', 1200, 675, '#5476a8'],
  ['job-tech', 'Việc làm công nghệ', 'Cơ hội tại Khu Công nghệ cao', 1200, 675, '#356cb5'],
  ['job-service', 'Việc làm dịch vụ', 'Nhà hàng, lưu trú và sự kiện', 1200, 675, '#8d5b9d'],
  ['banner-architecture', 'Tư vấn xây dựng', 'Kiến Trúc Hòa Lạc', 1600, 500, '#e84b24'],
  ['banner-homestay', 'Khám phá Hòa Lạc', 'Homestay và villa cuối tuần', 1600, 500, '#8c5cb1'],
];

export async function seedMedia({ users }) {
  const result = {};
  const defaultOwner = users.admin;
  for (const [key, title, subtitle, width, height, accent] of mediaDefinitions) {
    const url = makeSvgDataUrl({ title, subtitle, width, height, accent });
    const media = await Media.findOneAndUpdate(
      { publicId: `seed/${key}` },
      {
        $set: {
          ownerId: defaultOwner._id,
          provider: 'local',
          publicId: `seed/${key}`,
          assetId: null,
          url,
          secureUrl: url,
          resourceType: 'image',
          originalFilename: `${key}.svg`,
          format: 'svg',
          fileSize: Buffer.byteLength(url),
          width,
          height,
          altText: `${title} - ${subtitle}`,
          status: 'active',
          deletedAt: null,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    result[key] = media;
  }

  const profileLinks = [
    [users.admin, 'avatar-admin', 'cover-community'],
    [users.chiefEditor, 'avatar-editor', 'cover-community'],
    [users.editor, 'avatar-editor', 'cover-community'],
    [users.resident, 'avatar-resident', 'cover-community'],
    [users.student, 'avatar-resident', 'cover-community'],
  ];
  for (const [user, avatarKey, coverKey] of profileLinks) {
    if (!user) continue;
    await UserProfile.updateOne(
      { userId: user._id },
      {
        avatarMediaId: result[avatarKey]._id,
        coverMediaId: result[coverKey]._id,
      },
    );
  }

  return result;
}
