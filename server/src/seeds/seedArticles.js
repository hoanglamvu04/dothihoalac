import Article from '../modules/articles/article.model.js';
import ArticleSource from '../modules/articles/articleSource.model.js';
import NewsTip from '../modules/articles/newsTip.model.js';
import SeoMetadata from '../modules/system/seoMetadata.model.js';
import { makeBody, upsertContent, daysFromSeed } from './seedHelpers.js';

const articleDefinitions = [
  ['tong-quan-quy-hoach-hoa-lac', 'Tổng quan định hướng phát triển đô thị Hòa Lạc', 'quy-hoach', 'hoa-lac', 'article-planning', ['hoa-lac', 'quy-hoach-ha-noi'], 'analysis', true, 4200],
  ['nhung-tuyen-duong-quan-trong-ket-noi-hoa-lac', 'Những tuyến đường quan trọng kết nối Hòa Lạc', 'ha-tang-giao-thong', 'hoa-lac', 'article-infrastructure', ['giao-thong', 'dai-lo-thang-long'], 'guide', true, 3100],
  ['cap-nhat-ha-tang-khu-cong-nghe-cao-hoa-lac', 'Cập nhật hạ tầng Khu Công nghệ cao Hòa Lạc', 'khu-cong-nghe-cao', 'khu-cong-nghe-cao-hoa-lac', 'article-techpark', ['khu-cong-nghe-cao', 'giao-thong'], 'news', false, 2700],
  ['doi-song-sinh-vien-tai-dai-hoc-quoc-gia', 'Đời sống sinh viên tại Đại học Quốc gia Hòa Lạc', 'giao-duc', 'dai-hoc-quoc-gia-ha-noi', 'article-education', ['dai-hoc-quoc-gia', 'sinh-vien'], 'guide', false, 2100],
  ['kinh-nghiem-chon-khu-vuc-song-tai-hoa-lac', 'Kinh nghiệm chọn khu vực sinh sống tại Hòa Lạc', 'doi-song-cu-dan', 'hoa-lac', 'article-life', ['nha-o', 'hoa-lac'], 'guide', true, 3800],
  ['bay-buoc-chuan-bi-truoc-khi-xay-nha', '7 bước chuẩn bị trước khi xây nhà tại Hòa Lạc', 'kien-truc-xay-dung', 'hoa-lac', 'article-construction', ['xay-nha', 'nha-o'], 'guide', true, 5200],
  ['goi-y-lich-trinh-cuoi-tuan-tai-hoa-lac', 'Gợi ý lịch trình cuối tuần tại Hòa Lạc', 'du-lich-nghi-duong', 'tien-xuan', 'article-tourism', ['du-lich-cuoi-tuan', 'homestay'], 'guide', false, 2900],
  ['canh-bao-chieu-tro-dang-tin-nha-dat-sai-gia', 'Cảnh báo chiêu trò đăng tin nhà đất sai giá', 'an-ninh-canh-bao', 'hoa-lac', 'article-warning', ['canh-bao-lua-dao', 'gia-dat'], 'news', true, 4600],
  ['thi-truong-nha-dat-hoa-lac-nhin-tu-nhu-cau-thuc', 'Thị trường nhà đất Hòa Lạc nhìn từ nhu cầu thực', 'bat-dong-san', 'hoa-lac', 'property-land', ['gia-dat', 'nha-o'], 'analysis', false, 3400],
  ['huong-dan-thu-tuc-hanh-chinh-co-ban-cho-cu-dan-moi', 'Hướng dẫn thủ tục hành chính cơ bản cho cư dân mới', 'chinh-sach-hanh-chinh', 'hoa-lac', 'article-life', ['hoa-lac'], 'guide', false, 1800],
  ['doanh-nghiep-cong-nghe-mo-rong-hoat-dong-tai-hoa-lac', 'Doanh nghiệp công nghệ mở rộng hoạt động tại Hòa Lạc', 'kinh-te-doanh-nghiep', 'khu-cong-nghe-cao-hoa-lac', 'article-techpark', ['khu-cong-nghe-cao', 'viec-lam'], 'news', false, 2300],
  ['su-kien-ket-noi-cong-dong-hoa-lac-thang-bay', 'Sự kiện kết nối cộng đồng Hòa Lạc tháng 7', 'su-kien', 'hoa-lac', 'article-life', ['su-kien', 'hoa-lac'], 'news', false, 1500],
  ['so-sanh-chi-phi-xay-nha-mot-va-hai-tang', 'So sánh chi phí xây nhà một tầng và hai tầng', 'kien-truc-xay-dung', 'thach-hoa', 'article-construction', ['xay-nha'], 'analysis', false, 2600],
  ['nhung-dieu-can-biet-khi-thue-phong-tro-hoa-lac', 'Những điều cần biết khi thuê phòng trọ tại Hòa Lạc', 'giao-duc', 'dai-hoc-quoc-gia-ha-noi', 'property-room', ['sinh-vien', 'nha-o'], 'guide', false, 2400],
];

export async function seedArticles({ users, categories, areas, tags, media }) {
  const result = {};
  for (let index = 0; index < articleDefinitions.length; index += 1) {
    const [slug, title, categorySlug, areaSlug, mediaKey, tagSlugs, articleType, featured, views] = articleDefinitions[index];
    const publishedAt = daysFromSeed(-index - 1);
    const bodyHtml = makeBody(title, [
      `Bài viết cung cấp thông tin tổng hợp về ${title.toLowerCase()} và các vấn đề người dân thường quan tâm.`,
      'Nội dung được trình bày theo hướng dễ kiểm tra, có bối cảnh địa phương và khuyến nghị thực tế.',
      'Người đọc nên đối chiếu nguồn chính thức khi đưa ra quyết định đầu tư, xây dựng hoặc giao dịch.',
    ]);
    const content = await upsertContent({
      slug,
      contentType: 'article',
      authorId: index % 3 === 0 ? users.chiefEditor._id : users.editor._id,
      title,
      summary: `Thông tin nổi bật về ${title.toLowerCase()}, được biên tập cho độc giả quan tâm đến Hòa Lạc.`,
      bodyHtml,
      thumbnailMediaId: media[mediaKey]._id,
      primaryCategoryId: categories[`article:${categorySlug}`]?._id || null,
      primaryAreaId: areas[areaSlug]?._id || areas['hoa-lac']._id,
      categoryIds: [categories[`article:${categorySlug}`]?._id].filter(Boolean),
      tagIds: tagSlugs.map((tag) => tags[tag]?._id).filter(Boolean),
      areaIds: [areas[areaSlug]?._id, areas['hoa-lac']?._id].filter(Boolean),
      status: 'published',
      isFeatured: featured,
      publishedAt,
      viewCount: views,
    });
    await Article.findOneAndUpdate(
      { contentId: content._id },
      {
        $set: {
          articleType,
          editorId: users.chiefEditor._id,
          sourceNote: 'Dữ liệu seed phục vụ kiểm thử hệ thống; cần thay bằng nguồn thật khi xuất bản chính thức.',
          factCheckedAt: publishedAt,
          factCheckedBy: users.chiefEditor._id,
          originalPublishedAt: publishedAt,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    await ArticleSource.findOneAndUpdate(
      { contentId: content._id, sourceName: 'Đô Thị Hòa Lạc' },
      {
        $set: {
          sourceUrl: 'https://dothihoalac.vn',
          sourceType: 'other',
          accessedAt: publishedAt,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await SeoMetadata.findOneAndUpdate(
      { targetType: 'content', targetId: content._id },
      {
        $set: {
          metaTitle: `${title} | Đô Thị Hòa Lạc`,
          metaDescription: content.summary,
          canonicalUrl: `https://dothihoalac.vn/bai-viet/${slug}`,
          robots: 'index,follow',
          ogImageMediaId: media[mediaKey]._id,
        },
      },
      { upsert: true, new: true },
    );
    result[slug] = content;
  }

  const special = [
    ['ban-nhap-phan-tich-gia-dat', 'Bản nháp phân tích giá đất Hòa Lạc', 'draft'],
    ['bai-cho-duyet-ve-tien-do-ha-tang', 'Bài chờ duyệt về tiến độ hạ tầng', 'pending_review'],
    ['bai-len-lich-tuan-toi', 'Bài viết dự kiến xuất bản tuần tới', 'scheduled'],
  ];
  for (const [slug, title, status] of special) {
    const content = await upsertContent({
      slug,
      contentType: 'article',
      authorId: users.contributor._id,
      title,
      summary: 'Nội dung mẫu để kiểm thử quy trình biên tập và trạng thái bài viết.',
      bodyHtml: makeBody(title),
      primaryCategoryId: categories['article:quy-hoach']._id,
      primaryAreaId: areas['hoa-lac']._id,
      thumbnailMediaId: media['article-planning']._id,
      status,
      scheduledAt: status === 'scheduled' ? daysFromSeed(7) : null,
    });
    await Article.findOneAndUpdate(
      { contentId: content._id },
      { $set: { articleType: 'news', editorId: users.editor._id, sourceNote: 'Seed workflow' } },
      { upsert: true, new: true },
    );
    result[slug] = content;
  }

  await NewsTip.findOneAndUpdate(
    { title: 'Phản ánh điểm ngập sau mưa tại tuyến đường nội khu' },
    {
      $set: {
        userId: users.resident._id,
        description: 'Người dân gửi thông tin và hình ảnh để Ban biên tập kiểm tra.',
        areaId: areas['thach-hoa']._id,
        eventTime: daysFromSeed(-2),
        source: 'Phản ánh cư dân',
        mediaIds: [],
        contactName: 'Nguyễn Mai Lan',
        contactPhone: '0901000003',
        contactEmail: 'cudan@example.com',
        allowContact: true,
        status: 'reviewing',
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  return result;
}
