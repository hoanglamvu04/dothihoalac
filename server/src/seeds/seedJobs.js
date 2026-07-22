import JobPost from '../modules/jobs/jobPost.model.js';
import { makeBody, upsertContent, daysFromSeed } from './seedHelpers.js';

const definitions = [
  ['tuyen-ky-su-phan-mem-hoa-lac', 'Tuyển kỹ sư phần mềm làm việc tại Hòa Lạc', 'full_time', 'viec-lam-cong-nghe-cao', 'khu-cong-nghe-cao-hoa-lac', 'Công ty Công nghệ Hòa Lạc', 18000000, 35000000, '1_3_years', 'job-tech'],
  ['tuyen-thuc-tap-sinh-du-lieu', 'Tuyển thực tập sinh phân tích dữ liệu', 'internship', 'viec-lam-cong-nghe-cao', 'khu-cong-nghe-cao-hoa-lac', 'Trung tâm Đổi mới sáng tạo', 4000000, 7000000, 'none', 'job-tech'],
  ['tuyen-kien-truc-su-trien-khai', 'Tuyển kiến trúc sư triển khai hồ sơ', 'construction', 'viec-lam-xay-dung', 'hoa-lac', 'Kiến Trúc Hòa Lạc', 15000000, 25000000, '1_3_years', 'article-construction'],
  ['tuyen-nhan-vien-le-tan-homestay', 'Tuyển nhân viên lễ tân homestay cuối tuần', 'part_time', 'viec-lam-dich-vu', 'tien-xuan', 'Mely Space', 30000, 50000, 'none', 'job-service'],
  ['viec-lam-them-cho-sinh-vien', 'Việc làm thêm nhập liệu cho sinh viên', 'student', 'viec-lam-sinh-vien', 'dai-hoc-quoc-gia-ha-noi', 'Media Space', 25000, 40000, 'none', 'job-service'],
  ['tuyen-giao-vien-tieng-anh-ban-thoi-gian', 'Tuyển giáo viên tiếng Anh bán thời gian', 'part_time', 'viec-lam-giao-duc', 'thach-hoa', 'Trung tâm Ngoại ngữ Hòa Lạc', 150000, 250000, '1_3_years', 'job-service'],
];

export async function seedJobs({ users, categories, areas, tags, media }) {
  const result = {};
  for (let index = 0; index < definitions.length; index += 1) {
    const [slug, title, jobType, categorySlug, areaSlug, companyName, salaryMin, salaryMax, experienceLevel, mediaKey] = definitions[index];
    const content = await upsertContent({
      slug,
      contentType: 'job',
      authorId: users.employer._id,
      title,
      summary: `${companyName} đang tuyển vị trí phù hợp cho ứng viên tại khu vực Hòa Lạc.`,
      bodyHtml: makeBody(title, [
        'Mô tả công việc, yêu cầu và quyền lợi được tạo để kiểm thử module việc làm.',
        'Ứng viên không phải nộp bất kỳ khoản phí nào trong quá trình ứng tuyển.',
      ]),
      thumbnailMediaId: media[mediaKey]._id,
      primaryCategoryId: categories[`job:${categorySlug}`]._id,
      primaryAreaId: areas[areaSlug]._id,
      categoryIds: [categories[`job:${categorySlug}`]._id],
      areaIds: [areas[areaSlug]._id, areas['hoa-lac']._id],
      tagIds: [tags['viec-lam']._id],
      status: 'published',
      publishedAt: daysFromSeed(-index - 1),
      viewCount: 180 + index * 60,
    });
    const job = await JobPost.findOneAndUpdate(
      { contentId: content._id },
      {
        $set: {
          jobType,
          companyName,
          salaryMin,
          salaryMax,
          salaryUnit: jobType === 'part_time' || jobType === 'student' ? 'hour' : 'month',
          experienceLevel,
          workLocation: areas[areaSlug].name,
          applicationMethod: `Gửi CV về ${users.employer.email} hoặc liên hệ ${users.employer.phone}.`,
          contactEmail: users.employer.email,
          contactPhone: users.employer.phone,
          deadline: daysFromSeed(20 + index),
          positionsCount: 1 + (index % 3),
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    result[slug] = { content, job };
  }
  return result;
}
