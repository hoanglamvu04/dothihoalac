import Bookmark from '../modules/bookmarks/bookmark.model.js';
import Comment from '../modules/comments/comment.model.js';
import Content from '../modules/contents/content.model.js';
import ContentBody from '../modules/contents/contentBody.model.js';
import ContentRevision from '../modules/contents/contentRevision.model.js';
import CommunityPost from '../modules/community/communityPost.model.js';
import ContentMedia from '../modules/media/contentMedia.model.js';
import ModerationAction from '../modules/moderation/moderationAction.model.js';
import UserViolation from '../modules/moderation/userViolation.model.js';
import Notification from '../modules/notifications/notification.model.js';
import Reaction from '../modules/reactions/reaction.model.js';
import Report from '../modules/reports/report.model.js';
import { makeBody, upsertContent } from './seedHelpers.js';

const LEGACY_COMMUNITY_SEED_SLUGS = [
  'hoi-kinh-nghiem-thue-tro-hoa-lac',
  'review-khu-cong-nghe-cao-hoa-lac',
  'phan-anh-den-duong-ha-bang',
  'hoi-gia-thue-nha-ha-bang',
  'review-am-thuc-thach-hoa',
  'chia-se-cuoc-song-thach-that',
  'hoi-quy-hoach-thach-that',
  'phan-anh-duong-xuong-cap-yen-xuan',
  'review-homestay-yen-xuan',
  'tim-lop-hoc-them-hoa-lac',
  'chia-se-anh-dep-hoa-lac',
  'thao-luan-giao-thong-hoa-lac',
  'thanh-ly-noi-that-sinh-vien',
  'tim-dich-vu-sua-chua-nha',
  'su-kien-cong-dong-trong-cay',
  'chia-se-bua-sang-hoa-lac',
  'hoi-cho-thue-can-ho-sinh-vien',
  'giao-thong-dai-lo-thang-long',
  'phan-anh-rac-thai-khu-dan-cu',
  'review-cuoi-tuan-tay-phuong',
  'hoi-thu-tuc-xay-nha',
  'viec-lam-cho-nguoi-moi',
  'cho-do-do-cu-sinh-vien',
  'su-kien-xanh-phu-cat',
  'tim-dich-vu-sua-nha',
  'hoi-tuyen-xe-buyt-tu-trung-tam-den-hoa-lac',
  'phan-anh-doan-duong-ngap-sau-mua',
];

const posts = [
  {
    slug: 'hoi-xe-buyt-hoa-lac-trung-tam-27-08',
    title: 'Đi từ trung tâm Hà Nội lên Hòa Lạc bằng xe buýt thế nào thuận tiện?',
    postType: 'question',
    categorySlug: 'hoi-dap',
    areaSlug: 'hoa-lac',
    userKey: 'student',
    mediaKey: null,
    publishedAt: '2026-08-27T08:05:00+07:00',
    viewCount: 126,
    summary: 'Xin kinh nghiệm chọn tuyến xe buýt từ trung tâm Hà Nội lên Hòa Lạc và cách chuyển tuyến dễ nhất.',
    paragraphs: [
      'Mình mới chuyển lịch học lên Hòa Lạc nên đang tìm phương án đi xe buýt từ khu trung tâm Hà Nội. Ưu tiên tuyến dễ nhớ, ít phải đi bộ và vẫn có chuyến về vào cuối buổi chiều.',
      'Bạn nào đi thường xuyên cho mình xin kinh nghiệm điểm đón, thời gian di chuyển và chỗ chuyển tuyến thuận tiện nhé.',
    ],
  },
  {
    slug: 'phan-anh-ngap-sau-mua-ha-bang-27-08',
    title: 'Một số đoạn đường ở Hạ Bằng thoát nước chậm sau mưa lớn',
    postType: 'report',
    categorySlug: 'phan-anh-kien-nghi',
    areaSlug: 'ha-bang',
    userKey: 'resident',
    mediaKey: 'community-road',
    publishedAt: '2026-08-27T08:42:00+07:00',
    viewCount: 214,
    summary: 'Cư dân trao đổi về các đoạn đường thoát nước chậm sau mưa và đề xuất cập nhật vị trí để cùng theo dõi.',
    paragraphs: [
      'Sau các đợt mưa lớn, một số đoạn đường dân sinh có thời điểm thoát nước khá chậm, việc đi xe máy buổi tối hơi bất tiện.',
      'Mọi người ở Hạ Bằng nếu gặp tình trạng tương tự có thể bổ sung vị trí cụ thể để cộng đồng cùng tổng hợp và phản ánh chính xác hơn.',
    ],
  },
  {
    slug: 'review-bua-sang-hoa-lac-27-08',
    title: 'Mọi người hay ăn sáng ở đâu khi làm việc quanh Hòa Lạc?',
    postType: 'review',
    categorySlug: 'chia-se-review',
    areaSlug: 'hoa-lac',
    userKey: 'resident',
    mediaKey: 'community-food',
    publishedAt: '2026-08-27T09:20:00+07:00',
    viewCount: 301,
    summary: 'Gợi ý những lựa chọn ăn sáng nhanh, sạch và dễ ghé trước giờ làm quanh Hòa Lạc.',
    paragraphs: [
      'Mình thường cần ăn sáng khá sớm trước giờ làm nên đang muốn tổng hợp vài địa chỉ dễ ghé, có chỗ để xe và phục vụ nhanh.',
      'Ai có quán quen quanh Hòa Lạc thì chia sẻ món nên thử, khoảng giá và khung giờ đông khách để mọi người tham khảo nhé.',
    ],
    rating: 5,
  },
  {
    slug: 'chia-se-giao-thong-hoa-lac-27-08',
    title: 'Khung giờ nào đi Hòa Lạc - Hà Nội đỡ đông nhất?',
    postType: 'discussion',
    categorySlug: 'thao-luan',
    areaSlug: 'hoa-lac',
    userKey: 'member',
    mediaKey: null,
    publishedAt: '2026-08-27T10:05:00+07:00',
    viewCount: 188,
    summary: 'Cùng chia sẻ kinh nghiệm chọn khung giờ di chuyển giữa Hòa Lạc và nội đô để tiết kiệm thời gian.',
    paragraphs: [
      'Mình đang thử điều chỉnh giờ đi làm để tránh các khung giờ đông xe trên tuyến kết nối Hòa Lạc với nội đô.',
      'Mọi người thường xuất phát lúc mấy giờ vào buổi sáng và chiều? Nếu có điểm hay ùn hoặc tuyến thay thế thì cùng cập nhật cho cộng đồng nhé.',
    ],
  },
  {
    slug: 'hoi-thue-tro-hoa-lac-27-08',
    title: 'Sinh viên mới lên Hòa Lạc nên ưu tiên thuê trọ khu nào?',
    postType: 'question',
    categorySlug: 'hoi-dap',
    areaSlug: 'hoa-lac',
    userKey: 'student',
    mediaKey: 'property-photo-room-1',
    publishedAt: '2026-08-27T10:55:00+07:00',
    viewCount: 356,
    summary: 'Xin kinh nghiệm chọn phòng trọ thuận tiện đi học, mua đồ ăn và di chuyển hằng ngày tại Hòa Lạc.',
    paragraphs: [
      'Mình đang tìm phòng trọ cho năm học mới, ưu tiên chỗ an ninh, có chỗ để xe, mạng ổn và đi học không quá xa.',
      'Ngoài giá thuê thì mọi người thấy nên để ý thêm khoản điện nước, giờ giấc, đường đi hay tiện ích nào khi xem phòng?',
    ],
  },
  {
    slug: 'review-cuoi-tuan-tay-phuong-27-08',
    title: 'Cuối tuần quanh Tây Phương có chỗ nào phù hợp đi cùng gia đình?',
    postType: 'review',
    categorySlug: 'chia-se-review',
    areaSlug: 'tay-phuong',
    userKey: 'contributor',
    mediaKey: 'community-weekend',
    publishedAt: '2026-08-27T11:40:00+07:00',
    viewCount: 264,
    summary: 'Tổng hợp gợi ý điểm đi chơi, ăn uống và nghỉ ngắn trong ngày quanh Tây Phương.',
    paragraphs: [
      'Nhà mình muốn tìm lịch trình nhẹ nhàng cho cuối tuần, ưu tiên nơi có không gian thoáng và phù hợp cả người lớn lẫn trẻ nhỏ.',
      'Mọi người có điểm nào hay quanh Tây Phương thì chia sẻ thêm thời gian nên đi và chỗ ăn uống gần đó nhé.',
    ],
    rating: 4,
  },
  {
    slug: 'chia-se-cuoc-song-thach-that-27-08',
    title: 'Chuyển về Thạch Thất sinh sống cần chuẩn bị những gì?',
    postType: 'sharing',
    categorySlug: 'thao-luan',
    areaSlug: 'thach-that',
    userKey: 'resident',
    mediaKey: null,
    publishedAt: '2026-08-27T13:15:00+07:00',
    viewCount: 173,
    summary: 'Chia sẻ kinh nghiệm thực tế về đi lại, mua sắm, trường học và các dịch vụ thiết yếu khi sống tại Thạch Thất.',
    paragraphs: [
      'Gia đình mình chuyển về khu vực Thạch Thất được một thời gian và thấy việc chuẩn bị trước các điểm mua sắm, y tế, trường học giúp sinh hoạt thuận tiện hơn khá nhiều.',
      'Mọi người mới chuyển về có thể hỏi ngay trong bài, ai biết địa chỉ dịch vụ hữu ích thì cùng bổ sung để tạo một danh sách chung.',
    ],
  },
  {
    slug: 'tim-tho-sua-nha-thach-that-27-08',
    title: 'Xin giới thiệu thợ sửa điện nước uy tín ở Thạch Thất',
    postType: 'support',
    categorySlug: 'tim-kiem-ho-tro',
    areaSlug: 'thach-that',
    userKey: 'member',
    mediaKey: 'community-home',
    publishedAt: '2026-08-27T14:05:00+07:00',
    viewCount: 142,
    summary: 'Tìm đội thợ sửa điện nước dân dụng có thể xử lý việc nhỏ, báo giá rõ ràng và hỗ trợ khu vực Thạch Thất.',
    paragraphs: [
      'Nhà mình có vài hạng mục điện nước nhỏ cần kiểm tra và sửa trong ngày, không phải công trình lớn.',
      'Ai từng dùng dịch vụ ổn có thể giới thiệu giúp số liên hệ hoặc tên đội thợ. Mình ưu tiên người làm rõ giá trước và có thể quay lại bảo hành nếu cần.',
    ],
  },
  {
    slug: 'phan-anh-den-duong-yen-xuan-27-08',
    title: 'Xin cập nhật các điểm đèn đường cần kiểm tra ở Yên Xuân',
    postType: 'report',
    categorySlug: 'phan-anh-kien-nghi',
    areaSlug: 'yen-xuan',
    userKey: 'resident',
    mediaKey: null,
    publishedAt: '2026-08-27T14:50:00+07:00',
    viewCount: 199,
    summary: 'Mời cư dân Yên Xuân bổ sung vị trí các điểm chiếu sáng công cộng cần kiểm tra để phản ánh tập trung.',
    paragraphs: [
      'Mình muốn tổng hợp các vị trí đèn đường hoạt động chưa ổn định để tránh phản ánh rời rạc và thiếu địa chỉ cụ thể.',
      'Nếu mọi người biết điểm nào cần kiểm tra, hãy ghi tên đường hoặc mốc gần nhất và khung giờ thường gặp vấn đề.',
    ],
  },
  {
    slug: 'su-kien-trong-cay-phu-cat-27-08',
    title: 'Gợi ý tổ chức buổi trồng cây và dọn vệ sinh cuối tuần ở Phú Cát',
    postType: 'community_event',
    categorySlug: 'su-kien-cong-dong',
    areaSlug: 'phu-cat',
    userKey: 'contributor',
    mediaKey: 'community-green',
    publishedAt: '2026-08-27T15:25:00+07:00',
    viewCount: 233,
    summary: 'Thành viên đề xuất một buổi hoạt động cộng đồng nhỏ, cùng trồng cây và dọn vệ sinh khu vực sinh hoạt chung.',
    paragraphs: [
      'Mình muốn rủ mọi người tổ chức một buổi hoạt động ngắn vào cuối tuần, chủ yếu dọn vệ sinh và bổ sung cây xanh tại khu vực phù hợp.',
      'Nếu có đủ người tham gia, chúng ta có thể thống nhất địa điểm, dụng cụ cần mang và phân công đơn giản ngay trong phần bình luận.',
    ],
  },
  {
    slug: 'hoi-dich-vu-giao-hang-ha-bang-27-08',
    title: 'Ở Hạ Bằng mọi người hay dùng dịch vụ giao hàng nào?',
    postType: 'question',
    categorySlug: 'hoi-dap',
    areaSlug: 'ha-bang',
    userKey: 'member',
    mediaKey: null,
    publishedAt: '2026-08-27T15:50:00+07:00',
    viewCount: 117,
    summary: 'Xin kinh nghiệm chọn dịch vụ giao hàng và vận chuyển đồ nhỏ hoạt động ổn định tại Hạ Bằng.',
    paragraphs: [
      'Mình thỉnh thoảng cần gửi đồ nhỏ trong ngày nhưng chưa biết đơn vị nào nhận khu vực Hạ Bằng đều và dễ liên hệ.',
      'Mọi người dùng dịch vụ nào ổn có thể chia sẻ mức phí tham khảo, thời gian lấy hàng và phạm vi giao giúp mình nhé.',
    ],
  },
  {
    slug: 'thanh-ly-ban-hoc-hoa-lac-27-08',
    title: 'Thanh lý bàn học và kệ sách cho bạn nào đang ở Hòa Lạc',
    postType: 'marketplace',
    categorySlug: 'mua-ban-trao-doi',
    areaSlug: 'hoa-lac',
    userKey: 'student',
    mediaKey: null,
    publishedAt: '2026-08-27T16:15:00+07:00',
    viewCount: 205,
    summary: 'Sinh viên đăng thanh lý một số đồ dùng học tập còn sử dụng tốt và ưu tiên người có thể tự vận chuyển.',
    paragraphs: [
      'Mình chuyển chỗ ở nên cần nhượng lại một bàn học nhỏ và kệ sách. Đồ đã dùng nhưng vẫn chắc chắn, phù hợp phòng trọ sinh viên.',
      'Bạn nào thực sự cần có thể nhắn trong bình luận để mình gửi thêm kích thước và tình trạng chi tiết trước khi qua xem.',
    ],
  },
  {
    slug: 'co-hoi-viec-lam-hoa-lac-27-08',
    title: 'Người mới chuyển về Hòa Lạc thường tìm việc qua kênh nào?',
    postType: 'sharing',
    categorySlug: 'thao-luan',
    areaSlug: 'hoa-lac',
    userKey: 'employer',
    mediaKey: 'community-work',
    publishedAt: '2026-08-27T16:45:00+07:00',
    viewCount: 278,
    summary: 'Cùng chia sẻ các kênh tìm việc, nhóm nghề và cách tiếp cận doanh nghiệp quanh khu vực Hòa Lạc.',
    paragraphs: [
      'Nhiều bạn mới chuyển về khu vực thường hỏi nên bắt đầu tìm việc từ đâu ngoài các nền tảng tuyển dụng lớn.',
      'Mọi người có thể chia sẻ nhóm nghề đang dễ tìm, cách theo dõi tin tuyển dụng địa phương và những lưu ý khi liên hệ nhà tuyển dụng.',
    ],
  },
];

async function removeLegacyCommunitySeed() {
  const legacyContents = await Content.find({
    contentType: 'community',
    slug: { $in: LEGACY_COMMUNITY_SEED_SLUGS },
  })
    .select('_id')
    .lean();

  const contentIds = legacyContents.map((item) => item._id);
  if (!contentIds.length) return 0;

  const legacyComments = await Comment.find({
    contentId: { $in: contentIds },
  })
    .select('_id')
    .lean();
  const commentIds = legacyComments.map((item) => item._id);

  const reactionFilters = [
    { targetType: 'content', targetId: { $in: contentIds } },
  ];
  if (commentIds.length) {
    reactionFilters.push({
      targetType: 'comment',
      targetId: { $in: commentIds },
    });
  }

  await Promise.all([
    Reaction.deleteMany({ $or: reactionFilters }),
    Bookmark.deleteMany({ contentId: { $in: contentIds } }),
    Notification.deleteMany({
      targetType: 'content',
      targetId: { $in: contentIds },
    }),
    Report.deleteMany({
      targetType: 'content',
      targetId: { $in: contentIds },
    }),
    ModerationAction.deleteMany({
      targetType: 'content',
      targetId: { $in: contentIds },
    }),
    UserViolation.deleteMany({
      relatedTargetType: 'content',
      relatedTargetId: { $in: contentIds },
    }),
    ContentRevision.deleteMany({ contentId: { $in: contentIds } }),
    ContentMedia.deleteMany({ contentId: { $in: contentIds } }),
    ContentBody.deleteMany({ contentId: { $in: contentIds } }),
    CommunityPost.deleteMany({ contentId: { $in: contentIds } }),
    Comment.deleteMany({ contentId: { $in: contentIds } }),
  ]);

  await Content.deleteMany({ _id: { $in: contentIds } });
  return contentIds.length;
}

export async function seedCommunityPosts({ users, categories, areas, tags, media }) {
  await removeLegacyCommunitySeed();

  const result = {};

  for (const definition of posts) {
    const {
      slug,
      title,
      postType,
      categorySlug,
      areaSlug,
      userKey,
      mediaKey,
      publishedAt,
      viewCount,
      summary,
      paragraphs,
      rating = null,
    } = definition;

    const content = await upsertContent({
      slug,
      contentType: 'community',
      authorId: users[userKey]._id,
      title,
      summary,
      bodyHtml: makeBody(title, paragraphs),
      thumbnailMediaId: mediaKey ? media[mediaKey]?._id || null : null,
      primaryCategoryId: categories[`community:${categorySlug}`]._id,
      primaryAreaId: areas[areaSlug]._id,
      categoryIds: [categories[`community:${categorySlug}`]._id],
      areaIds: [areas[areaSlug]._id],
      tagIds: [tags['hoa-lac']._id],
      status: 'published',
      publishedAt: new Date(publishedAt),
      viewCount,
    });

    await CommunityPost.findOneAndUpdate(
      { contentId: content._id },
      {
        $set: {
          postType,
          questionStatus: postType === 'question' ? 'open' : 'closed',
          incidentStatus: postType === 'report' ? 'processing' : 'new',
          incidentTime: postType === 'report' ? new Date(publishedAt) : null,
          locationText: postType === 'report' ? areas[areaSlug].name : '',
          rating: postType === 'review' ? rating || 4 : null,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    result[slug] = content;
  }

  return result;
}

export { LEGACY_COMMUNITY_SEED_SLUGS };
