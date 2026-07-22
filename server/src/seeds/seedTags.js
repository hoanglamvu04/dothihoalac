import Tag from '../modules/taxonomy/tag.model.js';

const items = [
  ['Hòa Lạc', 'hoa-lac'],
  ['Quy hoạch Hà Nội', 'quy-hoach-ha-noi'],
  ['Đại lộ Thăng Long', 'dai-lo-thang-long'],
  ['Khu Công nghệ cao', 'khu-cong-nghe-cao'],
  ['Đại học Quốc gia', 'dai-hoc-quoc-gia'],
  ['Giá đất', 'gia-dat'],
  ['Nhà ở', 'nha-o'],
  ['Xây nhà', 'xay-nha'],
  ['Giao thông', 'giao-thong'],
  ['Môi trường', 'moi-truong'],
  ['Việc làm', 'viec-lam'],
  ['Sinh viên', 'sinh-vien'],
  ['Du lịch cuối tuần', 'du-lich-cuoi-tuan'],
  ['Homestay', 'homestay'],
  ['Cảnh báo lừa đảo', 'canh-bao-lua-dao'],
  ['Sự kiện', 'su-kien'],
];

export async function seedTags() {
  const result = {};
  for (const [name, slug] of items) {
    result[slug] = await Tag.findOneAndUpdate(
      { slug },
      { $set: { name, isActive: true } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }
  return result;
}
