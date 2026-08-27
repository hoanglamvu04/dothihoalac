import CommunityPost from '../modules/community/communityPost.model.js';
import { makeBody, upsertContent, daysFromSeed } from './seedHelpers.js';

const posts = [
  ['chia-se-bua-sang-hoa-lac', 'Quán ăn sáng ngon gần khu Công nghệ cao Hòa Lạc', 'review', 'chia-se-review', 'khu-cong-nghe-cao-hoa-lac', 'resident', 'community-food'],
  ['hoi-cho-thue-can-ho-sinh-vien', 'Sinh viên mới về Hòa Lạc nên thuê trọ khu nào?', 'question', 'hoi-dap', 'dai-hoc-quoc-gia-ha-noi', 'student', 'property-photo-room-1'],
  ['giao-thong-dai-lo-thang-long', 'Chia sẻ tình hình di chuyển Đại lộ Thăng Long giờ cao điểm', 'discussion', 'thao-luan', 'dai-lo-thang-long', 'member', 'community-road'],
  ['phan-anh-rac-thai-khu-dan-cu', 'Phản ánh tình trạng rác thải tại khu dân cư', 'report', 'phan-anh-kien-nghi', 'tan-xa', 'resident', 'community-environment'],
  ['review-cuoi-tuan-tay-phuong', 'Địa điểm đi chơi cuối tuần quanh Tây Phương', 'review', 'chia-se-review', 'tay-phuong', 'contributor', 'community-weekend'],
  ['hoi-thu-tuc-xay-nha', 'Hỏi kinh nghiệm chuẩn bị hồ sơ xây nhà tại Hòa Lạc', 'question', 'hoi-dap', 'thach-that', 'member', 'community-home'],
  ['viec-lam-cho-nguoi-moi', 'Cơ hội việc làm cho người mới chuyển về Hòa Lạc', 'sharing', 'thao-luan', 'hoa-lac', 'employer', 'community-work'],
  ['cho-do-do-cu-sinh-vien', 'Trao đổi đồ dùng cũ cho sinh viên khu vực VNU', 'marketplace', 'mua-ban-trao-doi', 'dai-hoc-quoc-gia-ha-noi', 'student', 'community-market'],
  ['su-kien-xanh-phu-cat', 'Cộng đồng Phú Cát tổ chức hoạt động trồng cây', 'community_event', 'su-kien-cong-dong', 'phu-cat', 'contributor', 'community-green'],
  ['tim-dich-vu-sua-nha', 'Tìm thợ sửa chữa nhà uy tín tại Hòa Lạc', 'support', 'tim-kiem-ho-tro', 'hoa-lac', 'member', 'community-home'],
];

export async function seedCommunityFeed({ users, categories, areas, tags, media }) {
  const result = {};

  for (let index = 0; index < posts.length; index += 1) {
    const [slug, title, postType, categorySlug, areaSlug, userKey, mediaKey] = posts[index];

    const content = await upsertContent({
      slug,
      contentType: 'community',
      authorId: users[userKey]._id,
      title,
      summary: `${title}. Chia sẻ thực tế từ cộng đồng Đô Thị Hòa Lạc.`,
      bodyHtml: makeBody(title, [
        'Nội dung mẫu mô phỏng bài đăng thật của cư dân địa phương.',
        'Thành viên có thể bình luận, trao đổi kinh nghiệm và bổ sung thông tin.',
      ]),
      thumbnailMediaId: media[mediaKey]?._id || media['article-life']._id,
      primaryCategoryId: categories[`community:${categorySlug}`]._id,
      primaryAreaId: areas[areaSlug]._id,
      categoryIds: [categories[`community:${categorySlug}`]._id],
      areaIds: [areas[areaSlug]._id],
      tagIds: [tags['hoa-lac']._id],
      status: 'published',
      publishedAt: daysFromSeed(-index, -index),
      viewCount: 80 + index * 42,
    });

    await CommunityPost.findOneAndUpdate(
      { contentId: content._id },
      {
        $set: {
          postType,
          questionStatus: postType === 'question' ? 'open' : 'closed',
          incidentStatus: postType === 'report' ? 'processing' : 'new',
          incidentTime: postType === 'report' ? daysFromSeed(-1) : null,
          locationText: areas[areaSlug].name,
          rating: postType === 'review' ? 5 : null,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    result[slug] = content;
  }

  return result;
}
