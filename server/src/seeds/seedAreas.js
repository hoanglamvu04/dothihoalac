import Area from '../modules/taxonomy/area.model.js';

const rootItems = [
  {
    name: 'Hòa Lạc',
    slug: 'hoa-lac',
    areaType: 'functional_zone',
    description: 'Khu vực trung tâm của nền tảng Đô Thị Hòa Lạc.',
    location: { type: 'Point', coordinates: [105.525, 21.01] },
  },
];

const childItems = [
  ['Thạch Hòa', 'thach-hoa', 'commune'],
  ['Bình Yên', 'binh-yen', 'commune'],
  ['Tân Xã', 'tan-xa', 'commune'],
  ['Hạ Bằng', 'ha-bang', 'commune'],
  ['Tây Phương', 'tay-phuong', 'commune'],
  ['Thạch Thất', 'thach-that', 'district'],
  ['Yên Xuân', 'yen-xuan', 'commune'],
  ['Đồng Trúc', 'dong-truc', 'commune'],
  ['Tiến Xuân', 'tien-xuan', 'commune'],
  ['Yên Bình', 'yen-binh', 'commune'],
  ['Phú Cát', 'phu-cat', 'commune'],
  ['Khu Công nghệ cao Hòa Lạc', 'khu-cong-nghe-cao-hoa-lac', 'functional_zone'],
  ['Đại học Quốc gia Hà Nội', 'dai-hoc-quoc-gia-ha-noi', 'functional_zone'],
  ['Khu đô thị Hòa Lạc', 'khu-do-thi-hoa-lac', 'urban_area'],
  ['Đại lộ Thăng Long', 'dai-lo-thang-long', 'project'],
];

export async function seedAreas() {
  const roots = {};
  for (const item of rootItems) {
    roots[item.slug] = await Area.findOneAndUpdate(
      { slug: item.slug },
      { $set: { ...item, parentId: null, isActive: true } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  const root = roots['hoa-lac'];
  const items = { ...roots };
  for (const [name, slug, areaType] of childItems) {
    items[slug] = await Area.findOneAndUpdate(
      { slug },
      {
        $set: {
          name,
          areaType,
          parentId: root._id,
          description: `Thông tin, nội dung và dữ liệu liên quan đến ${name}.`,
          isActive: true,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }
  return items;
}
