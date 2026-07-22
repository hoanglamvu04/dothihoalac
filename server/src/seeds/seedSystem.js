import SystemSetting from '../modules/system/systemSetting.model.js';
import StaticPage from '../modules/system/staticPage.model.js';
import Banner from '../modules/system/banner.model.js';
import Redirect from '../modules/system/redirect.model.js';
import AdminActivityLog from '../modules/system/adminActivityLog.model.js';

const settings = [
  ['site.name', 'Đô Thị Hòa Lạc', 'string'],
  ['site.tagline', 'Thông tin đúng - Kết nối thật', 'string'],
  ['site.contact_email', 'contact@dothihoalac.vn', 'string'],
  ['site.hotline', '0966709790', 'string'],
  ['content.default_page_size', 12, 'number'],
  ['moderation.new_user_posts_require_review', true, 'boolean'],
  ['property.default_expire_days', 30, 'number'],
  ['jobs.default_expire_days', 30, 'number'],
  ['features.property_enabled', true, 'boolean'],
  ['features.jobs_enabled', true, 'boolean'],
];

const pages = [
  ['Giới thiệu', 'gioi-thieu', '<h2>Đô Thị Hòa Lạc</h2><p>Nền tảng tin tức, cộng đồng và dữ liệu địa phương về Hòa Lạc.</p>'],
  ['Điều khoản sử dụng', 'dieu-khoan-su-dung', '<h2>Điều khoản sử dụng</h2><p>Người dùng chịu trách nhiệm về nội dung đăng tải và tuân thủ quy định cộng đồng.</p>'],
  ['Chính sách quyền riêng tư', 'chinh-sach-bao-mat', '<h2>Chính sách quyền riêng tư</h2><p>Thông tin cá nhân chỉ được xử lý theo mục đích đã công bố và sự đồng ý của người dùng.</p>'],
  ['Quy định đăng bài', 'quy-dinh-dang-bai', '<h2>Quy định đăng bài</h2><p>Nội dung phải đúng chuyên mục, có nguồn phù hợp và không gây hiểu nhầm.</p>'],
  ['Chính sách kiểm duyệt', 'chinh-sach-kiem-duyet', '<h2>Chính sách kiểm duyệt</h2><p>Nội dung có rủi ro sẽ được kiểm tra trước hoặc sau khi xuất bản.</p>'],
  ['Quy trình khiếu nại', 'quy-trinh-khieu-nai', '<h2>Quy trình khiếu nại</h2><p>Người dùng có thể gửi khiếu nại qua trang liên hệ và theo dõi kết quả xử lý.</p>'],
];

export async function seedSystem({ users, media }) {
  for (const [settingKey, settingValue, valueType] of settings) {
    await SystemSetting.findOneAndUpdate(
      { settingKey },
      { $set: { settingValue, valueType, updatedBy: users.admin._id } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  const pageMap = {};
  for (const [title, slug, body] of pages) {
    pageMap[slug] = await StaticPage.findOneAndUpdate(
      { slug },
      { $set: { title, body, status: 'published', updatedBy: users.admin._id } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  await Banner.findOneAndUpdate(
    { position: 'home_top', title: 'Tư vấn thiết kế và xây dựng tại Hòa Lạc' },
    {
      $set: {
        imageMediaId: media['banner-architecture']._id,
        targetUrl: '/yeu-cau-tu-van-kien-truc',
        startAt: null,
        endAt: null,
        isActive: true,
        displayOrder: 1,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  await Banner.findOneAndUpdate(
    { position: 'home_sidebar', title: 'Khám phá homestay và villa Hòa Lạc' },
    {
      $set: {
        imageMediaId: media['banner-homestay']._id,
        targetUrl: '/tim-homestay',
        startAt: null,
        endAt: null,
        isActive: true,
        displayOrder: 2,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  await Redirect.findOneAndUpdate(
    { oldPath: '/tin-quy-hoach' },
    { $set: { newPath: '/tin-tuc?category=quy-hoach', redirectType: 301, isActive: true } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  await AdminActivityLog.findOneAndUpdate(
    { adminId: users.admin._id, action: 'seed_demo_data', targetType: 'system' },
    {
      $set: {
        targetId: null,
        oldData: null,
        newData: { source: 'src/seeds', version: 2 },
        ipAddress: '127.0.0.1',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return { pages: pageMap };
}
