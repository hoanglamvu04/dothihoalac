import Area from '../modules/taxonomy/area.model.js';
const items = [
  ['Hòa Lạc', 'hoa-lac', 'functional_zone'],
  ['Thạch Hòa', 'thach-hoa', 'commune'],
  ['Bình Yên', 'binh-yen', 'commune'],
  ['Tân Xã', 'tan-xa', 'commune'],
  ['Hạ Bằng', 'ha-bang', 'commune'],
  ['Đồng Trúc', 'dong-truc', 'commune'],
  ['Tiến Xuân', 'tien-xuan', 'commune'],
  ['Yên Bình', 'yen-binh', 'commune'],
  ['Khu Công nghệ cao Hòa Lạc', 'khu-cong-nghe-cao-hoa-lac', 'functional_zone'],
  ['Đại học Quốc gia Hà Nội', 'dai-hoc-quoc-gia-ha-noi', 'functional_zone'],
];
export async function seedAreas() {
  for (const [name, slug, areaType] of items)
    await Area.findOneAndUpdate(
      { slug },
      { $set: { name, areaType, isActive: true } },
      { upsert: true, new: true },
    );
}
