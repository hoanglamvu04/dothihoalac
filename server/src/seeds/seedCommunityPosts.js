import CommunityPost from '../modules/community/communityPost.model.js';
import { makeBody, upsertContent, daysFromSeed } from './seedHelpers.js';

const definitions = [
  ['hoi-tuyen-xe-buyt-tu-trung-tam-den-hoa-lac', 'Hỏi tuyến xe buýt thuận tiện từ trung tâm đến Hòa Lạc', 'question', 'hoi-dap', 'hoa-lac', 'student'],
  ['phan-anh-doan-duong-ngap-sau-mua', 'Phản ánh đoạn đường ngập sau mưa lớn', 'report', 'phan-anh-kien-nghi', 'thach-hoa', 'resident'],
  ['review-quan-an-gia-dinh-o-thach-hoa', 'Review quán ăn gia đình tại Thạch Hòa', 'review', 'chia-se-review', 'thach-hoa', 'resident'],
  ['chia-se-kinh-nghiem-tim-phong-tro', 'Chia sẻ kinh nghiệm tìm phòng trọ gần Đại học Quốc gia', 'sharing', 'chia-se-review', 'dai-hoc-quoc-gia-ha-noi', 'student'],
  ['tim-nguoi-di-chung-xe-cuoi-tuan', 'Tìm người đi chung xe cuối tuần', 'support', 'tim-kiem-ho-tro', 'hoa-lac', 'member'],
  ['thao-luan-ve-khong-gian-cong-cong-hoa-lac', 'Thảo luận về không gian công cộng tại Hòa Lạc', 'discussion', 'thao-luan', 'hoa-lac', 'resident'],
  ['thanh-ly-ban-hoc-sinh-vien', 'Thanh lý bàn học sinh viên còn mới', 'marketplace', 'mua-ban-trao-doi', 'dai-hoc-quoc-gia-ha-noi', 'student'],
  ['su-kien-doi-rac-lay-cay-xanh', 'Sự kiện đổi rác lấy cây xanh cuối tuần', 'community_event', 'su-kien-cong-dong', 'tan-xa', 'contributor'],
  ['hoi-chi-phi-cai-tao-nha-cap-bon', 'Hỏi chi phí cải tạo nhà cấp bốn tại Hòa Lạc', 'question', 'hoi-dap', 'binh-yen', 'member'],
  ['can-ho-tro-tim-cho-that-lac', 'Cần hỗ trợ tìm chó bị thất lạc', 'support', 'tim-kiem-ho-tro', 'yen-binh', 'resident'],
];

export async function seedCommunityPosts({ users, categories, areas, tags, media }) {
  const result = {};
  for (let index = 0; index < definitions.length; index += 1) {
    const [slug, title, postType, categorySlug, areaSlug, userKey] = definitions[index];
    const content = await upsertContent({
      slug,
      contentType: 'community',
      authorId: users[userKey]._id,
      title,
      summary: `Bài cộng đồng mẫu: ${title}.`,
      bodyHtml: makeBody(title, [
        'Mình đăng bài để xin ý kiến và chia sẻ thông tin với cộng đồng Hòa Lạc.',
        'Mọi người có kinh nghiệm thực tế vui lòng bình luận, bổ sung địa điểm hoặc lưu ý cần thiết.',
      ]),
      thumbnailMediaId: postType === 'report' ? media['article-warning']._id : media['article-life']._id,
      primaryCategoryId: categories[`community:${categorySlug}`]._id,
      primaryAreaId: areas[areaSlug]._id,
      categoryIds: [categories[`community:${categorySlug}`]._id],
      areaIds: [areas[areaSlug]._id, areas['hoa-lac']._id],
      tagIds: [tags['hoa-lac']._id],
      status: 'published',
      publishedAt: daysFromSeed(-index, -3),
      viewCount: 120 + index * 45,
    });
    await CommunityPost.findOneAndUpdate(
      { contentId: content._id },
      {
        $set: {
          postType,
          questionStatus: postType === 'question' ? 'open' : 'closed',
          incidentStatus: postType === 'report' ? 'processing' : 'new',
          incidentTime: postType === 'report' ? daysFromSeed(-2) : null,
          locationText: postType === 'report' ? 'Tuyến đường nội khu Thạch Hòa' : '',
          rating: postType === 'review' ? 4 : null,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    result[slug] = content;
  }

  const pending = await upsertContent({
    slug: 'bai-cong-dong-cho-duyet',
    contentType: 'community',
    authorId: users.member._id,
    title: 'Bài cộng đồng đang chờ kiểm duyệt',
    summary: 'Dữ liệu mẫu cho hàng chờ kiểm duyệt.',
    bodyHtml: makeBody('Bài cộng đồng đang chờ kiểm duyệt'),
    primaryCategoryId: categories['community:thao-luan']._id,
    primaryAreaId: areas['hoa-lac']._id,
    status: 'pending_review',
  });
  await CommunityPost.findOneAndUpdate(
    { contentId: pending._id },
    { $set: { postType: 'discussion', questionStatus: 'closed' } },
    { upsert: true, new: true },
  );
  result[pending.slug] = pending;

  return result;
}
