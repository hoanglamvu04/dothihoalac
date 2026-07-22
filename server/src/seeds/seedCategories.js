import Category from '../modules/taxonomy/category.model.js';

const definitions = {
  article: [
    ['Quy hoạch', 'quy-hoach'],
    ['Hạ tầng - Giao thông', 'ha-tang-giao-thong'],
    ['Bất động sản', 'bat-dong-san'],
    ['Khu Công nghệ cao', 'khu-cong-nghe-cao'],
    ['Giáo dục - Đại học Quốc gia', 'giao-duc'],
    ['Đời sống cư dân', 'doi-song-cu-dan'],
    ['Chính sách - Hành chính', 'chinh-sach-hanh-chinh'],
    ['Kinh tế - Doanh nghiệp', 'kinh-te-doanh-nghiep'],
    ['Sự kiện', 'su-kien'],
    ['An ninh - Cảnh báo', 'an-ninh-canh-bao'],
    ['Kiến trúc - Xây dựng', 'kien-truc-xay-dung'],
    ['Du lịch - Nghỉ dưỡng', 'du-lich-nghi-duong'],
  ],
  community: [
    ['Thảo luận', 'thao-luan'],
    ['Hỏi đáp', 'hoi-dap'],
    ['Phản ánh - Kiến nghị', 'phan-anh-kien-nghi'],
    ['Chia sẻ - Review', 'chia-se-review'],
    ['Tìm kiếm - Hỗ trợ', 'tim-kiem-ho-tro'],
    ['Mua bán - Trao đổi', 'mua-ban-trao-doi'],
    ['Sự kiện cộng đồng', 'su-kien-cong-dong'],
  ],
  property: [
    ['Mua bán nhà đất', 'mua-ban-nha-dat'],
    ['Cho thuê', 'cho-thue'],
    ['Cần mua - Cần thuê', 'can-mua-can-thue'],
    ['Sang nhượng', 'sang-nhuong'],
  ],
  job: [
    ['Công nghệ cao', 'viec-lam-cong-nghe-cao'],
    ['Xây dựng - Kiến trúc', 'viec-lam-xay-dung'],
    ['Dịch vụ - Lưu trú', 'viec-lam-dich-vu'],
    ['Giáo dục', 'viec-lam-giao-duc'],
    ['Việc làm sinh viên', 'viec-lam-sinh-vien'],
  ],
};

export async function seedCategories() {
  const result = {};
  for (const [contentScope, items] of Object.entries(definitions)) {
    for (let index = 0; index < items.length; index += 1) {
      const [name, slug] = items[index];
      const category = await Category.findOneAndUpdate(
        { slug, contentScope },
        {
          $set: {
            name,
            description: `Chuyên mục ${name} của Đô Thị Hòa Lạc.`,
            displayOrder: index,
            isActive: true,
          },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      );
      result[`${contentScope}:${slug}`] = category;
    }
  }
  return result;
}
