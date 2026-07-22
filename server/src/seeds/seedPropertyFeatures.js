import PropertyFeature from '../modules/properties/propertyFeature.model.js';

const items = [
  ['Ô tô vào tận nơi', 'o-to-vao-tan-noi', 'access'],
  ['Đường rộng trên 6 m', 'duong-rong-tren-6m', 'access'],
  ['Gần Đại lộ Thăng Long', 'gan-dai-lo-thang-long', 'location'],
  ['Gần Khu Công nghệ cao', 'gan-khu-cong-nghe-cao', 'location'],
  ['Gần Đại học Quốc gia', 'gan-dai-hoc-quoc-gia', 'location'],
  ['Có sổ đỏ', 'co-so-do', 'legal'],
  ['Có thể xây dựng ngay', 'co-the-xay-dung-ngay', 'legal'],
  ['Điện nước đầy đủ', 'dien-nuoc-day-du', 'utility'],
  ['Phù hợp kinh doanh', 'phu-hop-kinh-doanh', 'suitable_for'],
  ['Phù hợp làm homestay', 'phu-hop-lam-homestay', 'suitable_for'],
  ['Phù hợp ở lâu dài', 'phu-hop-o-lau-dai', 'suitable_for'],
];

export async function seedPropertyFeatures() {
  const result = {};
  for (const [name, slug, featureGroup] of items) {
    result[slug] = await PropertyFeature.findOneAndUpdate(
      { slug },
      { $set: { name, featureGroup, isActive: true } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }
  return result;
}
