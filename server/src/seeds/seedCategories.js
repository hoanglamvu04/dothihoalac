import Category from '../modules/taxonomy/category.model.js';

export const categoryDefinitions = {
  article: [
    {
      name: 'Quy hoạch',
      slug: 'quy-hoach',
      description: 'Đồ án, điều chỉnh quy hoạch, sử dụng đất và định hướng phát triển không gian.',
    },
    {
      name: 'Hạ tầng - Giao thông',
      slug: 'ha-tang-giao-thong',
      description: 'Đường sá, hạ tầng kỹ thuật, kết nối liên vùng và tiến độ công trình giao thông.',
    },
    {
      name: 'Dự án ĐTXD',
      slug: 'du-an-dtxd',
      description: 'Dự án đầu tư xây dựng, chủ trương đầu tư, tiến độ và các hạng mục triển khai.',
    },
    {
      name: 'BĐS Hòa Lạc',
      slug: 'bat-dong-san-hoa-lac',
      description: 'Thị trường, dự án, pháp lý và chuyển động bất động sản tại khu vực Hòa Lạc.',
    },
    {
      name: 'Hành chính',
      slug: 'hanh-chinh',
      description: 'Tổ chức bộ máy, thủ tục hành chính, địa giới và hoạt động quản lý nhà nước tại địa phương.',
    },
    {
      name: 'Chính sách',
      slug: 'chinh-sach',
      description: 'Quy định, quyết định, cơ chế và chính sách có tác động tới người dân, doanh nghiệp và đầu tư.',
    },
    {
      name: 'Giáo dục',
      slug: 'giao-duc',
      description: 'Trường học, đại học, đào tạo, tuyển sinh, nghiên cứu và hoạt động học thuật.',
    },
    {
      name: 'Khoa học - Công nghệ',
      slug: 'khoa-hoc-cong-nghe',
      description: 'Khoa học, công nghệ, đổi mới sáng tạo và hoạt động của hệ sinh thái công nghệ tại Hòa Lạc.',
    },
    {
      name: 'Kinh tế - Doanh nghiệp',
      slug: 'kinh-te-doanh-nghiep',
      description: 'Đầu tư, sản xuất kinh doanh, doanh nghiệp và chuyển động kinh tế trong khu vực.',
    },
    {
      name: 'Đời sống dân cư',
      slug: 'doi-song-dan-cu',
      description: 'Dân sinh, văn hóa, cộng đồng, tiện ích và các vấn đề gắn trực tiếp với đời sống người dân.',
    },
    {
      name: 'Môi trường - Đô thị',
      slug: 'moi-truong-do-thi',
      description: 'Môi trường, thoát nước, cảnh quan, vệ sinh, không gian công cộng và chất lượng đô thị.',
    },
  ],
  community: [
    { name: 'Thảo luận', slug: 'thao-luan' },
    { name: 'Hỏi đáp', slug: 'hoi-dap' },
    { name: 'Phản ánh - Kiến nghị', slug: 'phan-anh-kien-nghi' },
    { name: 'Chia sẻ - Review', slug: 'chia-se-review' },
    { name: 'Tìm kiếm - Hỗ trợ', slug: 'tim-kiem-ho-tro' },
    { name: 'Mua bán - Trao đổi', slug: 'mua-ban-trao-doi' },
    { name: 'Sự kiện cộng đồng', slug: 'su-kien-cong-dong' },
  ],
  property: [
    { name: 'Mua bán nhà đất', slug: 'mua-ban-nha-dat' },
    { name: 'Cho thuê', slug: 'cho-thue' },
    { name: 'Cần mua - Cần thuê', slug: 'can-mua-can-thue' },
    { name: 'Sang nhượng', slug: 'sang-nhuong' },
  ],
  job: [
    { name: 'Công nghệ cao', slug: 'viec-lam-cong-nghe-cao' },
    { name: 'Xây dựng - Kiến trúc', slug: 'viec-lam-xay-dung' },
    { name: 'Dịch vụ - Lưu trú', slug: 'viec-lam-dich-vu' },
    { name: 'Giáo dục', slug: 'viec-lam-giao-duc' },
    { name: 'Việc làm sinh viên', slug: 'viec-lam-sinh-vien' },
  ],
};

function defaultDescription(name, contentScope) {
  const scopeLabel = {
    article: 'Tin tức',
    community: 'Cộng đồng',
    property: 'Bất động sản',
    job: 'Việc làm',
  }[contentScope];

  return `Danh mục ${name} thuộc khu vực ${scopeLabel || 'nội dung'} của Đô Thị Hòa Lạc.`;
}

export async function seedCategories() {
  const result = {};

  for (const [contentScope, items] of Object.entries(categoryDefinitions)) {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const category = await Category.findOneAndUpdate(
        { slug: item.slug, contentScope },
        {
          $set: {
            name: item.name,
            description: item.description || defaultDescription(item.name, contentScope),
            displayOrder: index,
            parentId: null,
            isActive: true,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );

      result[`${contentScope}:${item.slug}`] = category;
    }
  }

  return result;
}
