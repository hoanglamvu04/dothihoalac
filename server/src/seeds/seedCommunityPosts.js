import CommunityPost from '../modules/community/communityPost.model.js';
import { makeBody, upsertContent, daysFromSeed } from './seedHelpers.js';

const definitions = [
  ['hoi-kinh-nghiem-thue-tro-hoa-lac', 'Hỏi kinh nghiệm thuê trọ gần Đại học Quốc gia Hòa Lạc', 'question', 'hoi-dap', 'hoa-lac', 'student', 'property-photo-room-1'],
  ['review-khu-cong-nghe-cao-hoa-lac', 'Review khu Công nghệ cao Hòa Lạc sau khi chuyển về sinh sống', 'review', 'chia-se-review', 'hoa-lac', 'resident', 'community-work'],
  ['phan-anh-den-duong-ha-bang', 'Phản ánh hệ thống đèn đường tại Hạ Bằng buổi tối', 'report', 'phan-anh-kien-nghi', 'ha-bang', 'resident', 'community-road'],
  ['hoi-gia-thue-nha-ha-bang', 'Hỏi giá thuê nhà và phòng trọ tại Hạ Bằng', 'question', 'hoi-dap', 'ha-bang', 'member', 'property-photo-room-1'],
  ['review-am-thuc-thach-hoa', 'Gợi ý quán ăn ngon quanh Thạch Hòa', 'review', 'chia-se-review', 'thach-hoa', 'resident', 'community-food'],
  ['chia-se-cuoc-song-thach-that', 'Chia sẻ cuộc sống tại Thạch Thất', 'sharing', 'thao-luan', 'thach-that', 'resident', 'community-weekend'],
  ['hoi-quy-hoach-thach-that', 'Hỏi thông tin quy hoạch khu vực Thạch Thất', 'question', 'hoi-dap', 'thach-that', 'member', 'property-photo-land-1'],
  ['phan-anh-duong-xuong-cap-yen-xuan', 'Phản ánh đường dân sinh xuống cấp tại Yên Xuân', 'report', 'phan-anh-kien-nghi', 'yen-xuan', 'resident', 'community-road'],
  ['review-homestay-yen-xuan', 'Review homestay cuối tuần tại Yên Xuân', 'review', 'chia-se-review', 'yen-xuan', 'resident', 'community-weekend'],
  ['tim-lop-hoc-them-hoa-lac', 'Tìm lớp học thêm cho trẻ quanh Hòa Lạc', 'support', 'tim-kiem-ho-tro', 'hoa-lac', 'member', 'community-campus'],
  ['chia-se-anh-dep-hoa-lac', 'Chia sẻ ảnh đẹp Hòa Lạc mùa xanh', 'sharing', 'chia-se-review', 'hoa-lac', 'contributor', 'community-green'],
  ['thao-luan-giao-thong-hoa-lac', 'Thảo luận giao thông kết nối Hòa Lạc - Hà Nội', 'discussion', 'thao-luan', 'hoa-lac', 'resident', 'community-road'],
  ['thanh-ly-noi-that-sinh-vien', 'Thanh lý nội thất sinh viên còn tốt', 'marketplace', 'mua-ban-trao-doi', 'dai-hoc-quoc-gia-ha-noi', 'student', 'community-market'],
  ['tim-dich-vu-sua-chua-nha', 'Tìm dịch vụ sửa chữa nhà uy tín', 'support', 'tim-kiem-ho-tro', 'thach-hoa', 'member', 'community-home'],
  ['su-kien-cong-dong-trong-cay', 'Sự kiện cộng đồng trồng cây xanh cuối tuần', 'community_event', 'su-kien-cong-dong', 'tan-xa', 'contributor', 'community-green'],
];

export async function seedCommunityPosts({ users, categories, areas, tags, media }) {
  const result = {};
  for (let index = 0; index < definitions.length; index += 1) {
    const [slug, title, postType, categorySlug, areaSlug, userKey, mediaKey] = definitions[index];
    const content = await upsertContent({
      slug,
      contentType: 'community',
      authorId: users[userKey]._id,
      title,
      summary: `${title}. Bài viết cộng đồng khu vực Hòa Lạc để trao đổi thông tin thực tế.`,
      bodyHtml: makeBody(title, [
        'Cư dân đăng bài để chia sẻ thông tin, kinh nghiệm và kết nối với cộng đồng địa phương.',
        'Mọi người có thể bình luận bổ sung kinh nghiệm, địa điểm hoặc giải pháp phù hợp.',
      ]),
      thumbnailMediaId: media[mediaKey]?._id || media['article-life']._id,
      primaryCategoryId: categories[`community:${categorySlug}`]._id,
      primaryAreaId: areas[areaSlug]._id,
      categoryIds: [categories[`community:${categorySlug}`]._id],
      areaIds: [areas[areaSlug]._id, areas['hoa-lac']._id],
      tagIds: [tags['hoa-lac']._id],
      status: 'published',
      publishedAt: daysFromSeed(-index, -2),
      viewCount: 180 + index * 35,
    });
    await CommunityPost.findOneAndUpdate(
      { contentId: content._id },
      {
        $set: {
          postType,
          questionStatus: postType === 'question' ? 'open' : 'closed',
          incidentStatus: postType === 'report' ? 'processing' : 'new',
          incidentTime: postType === 'report' ? daysFromSeed(-1) : null,
          locationText: postType === 'report' ? areas[areaSlug].name : '',
          rating: postType === 'review' ? 4 : null,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    result[slug] = content;
  }
  return result;
}
