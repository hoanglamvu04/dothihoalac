import Category from '../modules/taxonomy/category.model.js';
const items = [
  ['Quy hoạch', 'quy-hoach'],
  ['Hạ tầng - Giao thông', 'ha-tang-giao-thong'],
  ['Bất động sản', 'bat-dong-san'],
  ['Khu Công nghệ cao', 'khu-cong-nghe-cao'],
  ['Giáo dục', 'giao-duc'],
  ['Đời sống cư dân', 'doi-song-cu-dan'],
  ['Chính sách - Hành chính', 'chinh-sach-hanh-chinh'],
  ['Kiến trúc - Xây dựng', 'kien-truc-xay-dung'],
  ['Du lịch - Nghỉ dưỡng', 'du-lich-nghi-duong'],
];
export async function seedCategories() {
  for (let i = 0; i < items.length; i++)
    await Category.findOneAndUpdate(
      { slug: items[i][1], contentScope: 'article' },
      { $set: { name: items[i][0], displayOrder: i, isActive: true } },
      { upsert: true, new: true },
    );
}
