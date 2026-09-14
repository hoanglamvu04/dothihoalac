import PropertyListing from '../modules/properties/propertyListing.model.js';
import PropertyPriceHistory from '../modules/properties/propertyPriceHistory.model.js';
import { upsertContent, daysFromSeed } from './seedHelpers.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const LISTING_PRIORITY = {
  diamond: 30,
  gold: 20,
  silver: 10,
  standard: 0,
};

// Các key dưới đây đều là ảnh mạng Unsplash đã được seedMedia upsert vào Media.
// Mỗi tin showcase dùng 6 ảnh khác nhau theo vòng xoay để trang chi tiết có gallery đầy đủ.
const NETWORK_HOUSE_MEDIA_KEYS = [
  'property-photo-house-exterior-1',
  'property-photo-house-exterior-2',
  'property-photo-house-exterior-3',
  'property-photo-interior-1',
  'property-photo-interior-2',
  'property-photo-apartment-1',
  'property-photo-room-1',
  'property-photo-office-1',
];

function galleryFor(media, offset, count = 6) {
  const items = [];

  for (let index = 0; index < count; index += 1) {
    const key = NETWORK_HOUSE_MEDIA_KEYS[(offset + index) % NETWORK_HOUSE_MEDIA_KEYS.length];
    const item = media[key];
    if (!item) {
      throw new Error(`Missing network property media: ${key}`);
    }
    items.push(item);
  }

  return items;
}

function listHtml(items = []) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function makeBodyHtml(item) {
  return [
    `<h2>${item.title}</h2>`,
    `<p>${item.description}</p>`,
    '<h3>Thông số bất động sản</h3>',
    listHtml(item.highlights),
    '<h3>Vị trí và kết nối</h3>',
    `<p>${item.locationNote}</p>`,
    '<h3>Tiện ích và công năng</h3>',
    `<p>${item.utilityNote}</p>`,
    '<h3>Phù hợp với</h3>',
    `<p>${item.suitableFor}</p>`,
    '<h3>Pháp lý và giao dịch</h3>',
    `<p>${item.legalNote}</p>`,
    '<p>Người mua hoặc người thuê nên kiểm tra trực tiếp hiện trạng, hồ sơ pháp lý, quy hoạch, diện tích thực tế và điều khoản giao dịch trước khi đặt cọc.</p>',
    '<p><em>Đây là dữ liệu mẫu phục vụ phát triển/kiểm thử Đô Thị Hòa Lạc, không phải tài sản đang được chào bán ngoài đời thực.</em></p>',
  ].join('');
}

// 15 tin nhà ở mẫu, ưu tiên dữ liệu đủ để test card, list, detail, filter, map và gallery.
const definitions = [
  {
    slug: 'ban-nha-3-tang-thach-hoa-82m2-noi-that-moi',
    title: 'Bán nhà 3 tầng Thạch Hòa 82 m², 4 phòng ngủ, nội thất mới',
    summary: 'Nhà 3 tầng tại Thạch Hòa, diện tích đất 82 m², sử dụng khoảng 225 m², 4 phòng ngủ, ô tô vào tận cửa.',
    description: 'Căn nhà hoàn thiện theo phong cách hiện đại, không gian phòng khách và bếp liên thông, phù hợp gia đình ở lâu dài.',
    highlights: ['Diện tích đất 82 m², sử dụng khoảng 225 m².', '4 phòng ngủ, 3 phòng tắm.', 'Mặt tiền 5,2 m, đường trước nhà khoảng 6 m.', 'Giá mẫu 6,15 tỷ đồng, có thương lượng.'],
    locationNote: 'Khu vực Thạch Hòa, thuận tiện di chuyển tới Khu Công nghệ cao và Đại lộ Thăng Long.',
    utilityNote: 'Có chỗ để ô tô, điện nước riêng, bếp hoàn thiện, ban công và không gian sinh hoạt chung rộng.',
    suitableFor: 'Gia đình 4-6 người, chuyên gia làm việc tại Hòa Lạc hoặc khách mua ở lâu dài.',
    legalNote: 'Pháp lý mô phỏng: sổ đỏ riêng, hiện trạng xây dựng ổn định.',
    transactionType: 'sale', propertyType: 'townhouse', ownerType: 'owner',
    price: 6150000000, priceUnit: 'total', isNegotiable: true,
    landArea: 82, usableArea: 225, bedrooms: 4, bathrooms: 3, frontage: 5.2, roadWidth: 6,
    direction: 'southeast', legalStatus: 'red_book', area: 'thach-hoa', category: 'mua-ban-nha-dat',
    features: ['o-to-vao-tan-noi', 'gan-khu-cong-nghe-cao', 'dien-nuoc-day-du', 'phu-hop-o-lau-dai', 'co-so-do'],
    author: 'resident', address: 'Khu vực Thạch Hòa, Thạch Thất, Hà Nội', coordinates: [105.5361, 21.0268], listingTier: 'diamond',
  },
  {
    slug: 'ban-biet-thu-vuon-yen-xuan-420m2-5-phong-ngu',
    title: 'Bán biệt thự vườn Yên Xuân 420 m², 5 phòng ngủ, sân rộng',
    summary: 'Biệt thự vườn khuôn viên 420 m² tại Yên Xuân, diện tích sử dụng khoảng 310 m², 5 phòng ngủ và sân vườn lớn.',
    description: 'Không gian sống nhiều cây xanh, kiến trúc mở, phù hợp nhu cầu second home hoặc gia đình nhiều thế hệ.',
    highlights: ['Khuôn viên 420 m², xây dựng khoảng 310 m² sàn.', '5 phòng ngủ, 5 phòng tắm.', 'Mặt tiền khoảng 16 m, đường ô tô 8 m.', 'Giá mẫu 10,8 tỷ đồng.'],
    locationNote: 'Yên Xuân có không gian thoáng, kết nối thuận tiện về Hòa Lạc và các khu dịch vụ nghỉ cuối tuần.',
    utilityNote: 'Sân vườn, khu BBQ, chỗ đỗ 2 ô tô, phòng sinh hoạt chung và các phòng ngủ có cửa sổ lớn.',
    suitableFor: 'Second home, gia đình nhiều thế hệ hoặc mô hình lưu trú nhỏ sau khi kiểm tra điều kiện kinh doanh.',
    legalNote: 'Pháp lý mô phỏng: sổ đỏ riêng, có thể giao dịch ngay trong môi trường test.',
    transactionType: 'sale', propertyType: 'villa', ownerType: 'broker',
    price: 10800000000, priceUnit: 'total', isNegotiable: true,
    landArea: 420, usableArea: 310, bedrooms: 5, bathrooms: 5, frontage: 16, roadWidth: 8,
    direction: 'east', legalStatus: 'red_book', area: 'yen-xuan', category: 'mua-ban-nha-dat',
    features: ['phu-hop-lam-homestay', 'o-to-vao-tan-noi', 'duong-rong-tren-6m', 'dien-nuoc-day-du', 'co-so-do'],
    author: 'broker', address: 'Khu vực Yên Xuân, Thạch Thất, Hà Nội', coordinates: [105.4618, 20.9966], listingTier: 'diamond',
  },
  {
    slug: 'ban-nha-2-tang-binh-yen-96m2-gan-dai-lo',
    title: 'Bán nhà 2 tầng Bình Yên 96 m², gần Đại lộ Thăng Long',
    summary: 'Nhà 2 tầng diện tích 96 m² tại Bình Yên, 3 phòng ngủ, đường ô tô, kết nối nhanh ra Đại lộ Thăng Long.',
    description: 'Căn nhà có công năng gọn, phòng khách rộng, bếp riêng và sân trước đủ để xe gia đình.',
    highlights: ['Diện tích đất 96 m², sử dụng khoảng 165 m².', '3 phòng ngủ, 3 phòng tắm.', 'Mặt tiền 5,5 m, đường trước nhà khoảng 5,5 m.', 'Giá mẫu 5,25 tỷ đồng.'],
    locationNote: 'Bình Yên, gần tuyến kết nối Đại lộ Thăng Long và thuận tiện đi trung tâm Hòa Lạc.',
    utilityNote: 'Điện nước đầy đủ, sân để xe, khu dân cư hiện hữu và gần các tiện ích sinh hoạt cơ bản.',
    suitableFor: 'Gia đình trẻ hoặc khách làm việc quanh Hòa Lạc muốn ở thực.',
    legalNote: 'Pháp lý mô phỏng: sổ đỏ riêng, thông tin quy hoạch cần kiểm tra khi giao dịch thực tế.',
    transactionType: 'sale', propertyType: 'house', ownerType: 'owner',
    price: 5250000000, priceUnit: 'total', isNegotiable: true,
    landArea: 96, usableArea: 165, bedrooms: 3, bathrooms: 3, frontage: 5.5, roadWidth: 5.5,
    direction: 'south', legalStatus: 'red_book', area: 'binh-yen', category: 'mua-ban-nha-dat',
    features: ['gan-dai-lo-thang-long', 'o-to-vao-tan-noi', 'dien-nuoc-day-du', 'phu-hop-o-lau-dai', 'co-so-do'],
    author: 'resident', address: 'Khu vực Bình Yên, Thạch Thất, Hà Nội', coordinates: [105.5422, 21.0374], listingTier: 'gold',
  },
  {
    slug: 'ban-nha-lien-ke-hoa-lac-72m2-4-phong-ngu',
    title: 'Bán nhà liền kề Hòa Lạc 72 m², 4 phòng ngủ, đường rộng',
    summary: 'Nhà liền kề 4 tầng tại Hòa Lạc, diện tích đất 72 m², 4 phòng ngủ, phù hợp ở kết hợp làm văn phòng.',
    description: 'Nhà xây mới, bố trí tầng 1 phòng khách và bếp, các tầng trên là phòng ngủ và phòng làm việc.',
    highlights: ['Diện tích đất 72 m², tổng sàn khoảng 250 m².', '4 phòng ngủ, 4 phòng tắm.', 'Mặt tiền 4,8 m, đường khoảng 10 m.', 'Giá mẫu 7,45 tỷ đồng.'],
    locationNote: 'Khu vực Hòa Lạc, kết nối thuận tiện tới Khu Công nghệ cao, Đại học Quốc gia và Đại lộ Thăng Long.',
    utilityNote: 'Có chỗ để ô tô, điều hòa cơ bản, điện nước riêng và không gian tầng 1 phù hợp văn phòng nhỏ.',
    suitableFor: 'Gia đình, chuyên gia, doanh nghiệp nhỏ hoặc khách mua ở kết hợp làm việc.',
    legalNote: 'Pháp lý mô phỏng: sổ đỏ riêng.',
    transactionType: 'sale', propertyType: 'villa_townhouse', ownerType: 'broker',
    price: 7450000000, priceUnit: 'total', isNegotiable: true,
    landArea: 72, usableArea: 250, bedrooms: 4, bathrooms: 4, frontage: 4.8, roadWidth: 10,
    direction: 'northeast', legalStatus: 'red_book', area: 'hoa-lac', category: 'mua-ban-nha-dat',
    features: ['gan-khu-cong-nghe-cao', 'duong-rong-tren-6m', 'o-to-vao-tan-noi', 'phu-hop-kinh-doanh', 'co-so-do'],
    author: 'broker', address: 'Khu vực Hòa Lạc, Hà Nội', coordinates: [105.5247, 21.0116], listingTier: 'gold',
  },
  {
    slug: 'ban-nha-vuon-tien-xuan-650m2-co-be-boi',
    title: 'Bán nhà vườn Tiến Xuân 650 m², 4 phòng ngủ, khuôn viên nghỉ dưỡng',
    summary: 'Nhà vườn tại Tiến Xuân có khuôn viên 650 m², nhà ở khoảng 210 m², 4 phòng ngủ và sân vườn rộng.',
    description: 'Bất động sản mô phỏng theo phong cách nghỉ dưỡng ngoại ô, nhiều mảng xanh và không gian sinh hoạt ngoài trời.',
    highlights: ['Khuôn viên 650 m², sử dụng khoảng 210 m².', '4 phòng ngủ, 4 phòng tắm.', 'Mặt tiền 20 m, đường ô tô khoảng 7 m.', 'Giá mẫu 9,6 tỷ đồng.'],
    locationNote: 'Tiến Xuân, không gian xanh và thuận tiện kết nối về Hòa Lạc.',
    utilityNote: 'Sân vườn lớn, khu thư giãn ngoài trời, chỗ đỗ nhiều xe và không gian phù hợp nghỉ cuối tuần.',
    suitableFor: 'Gia đình cần second home hoặc mô hình homestay quy mô nhỏ sau khi kiểm tra pháp lý.',
    legalNote: 'Pháp lý mô phỏng: sổ đỏ riêng.',
    transactionType: 'sale', propertyType: 'farm_resort', ownerType: 'broker',
    price: 9600000000, priceUnit: 'total', isNegotiable: true,
    landArea: 650, usableArea: 210, bedrooms: 4, bathrooms: 4, frontage: 20, roadWidth: 7,
    direction: 'west', legalStatus: 'red_book', area: 'tien-xuan', category: 'mua-ban-nha-dat',
    features: ['phu-hop-lam-homestay', 'o-to-vao-tan-noi', 'duong-rong-tren-6m', 'dien-nuoc-day-du', 'co-so-do'],
    author: 'broker', address: 'Khu vực Tiến Xuân, Thạch Thất, Hà Nội', coordinates: [105.4743, 20.9845], listingTier: 'diamond',
  },
  {
    slug: 'ban-nha-3-tang-ha-bang-88m2-duong-6m',
    title: 'Bán nhà 3 tầng Hạ Bằng 88 m², 4 phòng ngủ, đường 6 m',
    summary: 'Nhà 3 tầng tại Hạ Bằng, diện tích 88 m², 4 phòng ngủ, đường ô tô rộng và khu dân cư ổn định.',
    description: 'Công năng phù hợp gia đình, có phòng khách, bếp, phòng thờ và sân phơi tách biệt.',
    highlights: ['Diện tích đất 88 m², sử dụng khoảng 235 m².', '4 phòng ngủ, 3 phòng tắm.', 'Mặt tiền 5,3 m, đường khoảng 6 m.', 'Giá mẫu 5,65 tỷ đồng.'],
    locationNote: 'Hạ Bằng, thuận tiện di chuyển về Khu Công nghệ cao và trung tâm Thạch Thất.',
    utilityNote: 'Ô tô đỗ cửa, điện nước riêng, khu dân cư đông và gần chợ dân sinh.',
    suitableFor: 'Gia đình ở thực hoặc chuyên gia mua nhà gần nơi làm việc.',
    legalNote: 'Pháp lý mô phỏng: sổ đỏ riêng.',
    transactionType: 'sale', propertyType: 'townhouse', ownerType: 'owner',
    price: 5650000000, priceUnit: 'total', isNegotiable: true,
    landArea: 88, usableArea: 235, bedrooms: 4, bathrooms: 3, frontage: 5.3, roadWidth: 6,
    direction: 'north', legalStatus: 'red_book', area: 'ha-bang', category: 'mua-ban-nha-dat',
    features: ['o-to-vao-tan-noi', 'gan-khu-cong-nghe-cao', 'dien-nuoc-day-du', 'phu-hop-o-lau-dai', 'co-so-do'],
    author: 'resident', address: 'Khu vực Hạ Bằng, Thạch Thất, Hà Nội', coordinates: [105.5512, 21.0482], listingTier: 'silver',
  },
  {
    slug: 'ban-biet-thu-khu-do-thi-hoa-lac-260m2',
    title: 'Bán biệt thự Khu đô thị Hòa Lạc 260 m², 5 phòng ngủ',
    summary: 'Biệt thự khuôn viên 260 m² trong khu vực đô thị Hòa Lạc, diện tích sử dụng khoảng 330 m², 5 phòng ngủ.',
    description: 'Thiết kế hiện đại với nhiều cửa kính, phòng khách lớn và khoảng sân xanh bao quanh.',
    highlights: ['Khuôn viên 260 m², tổng sàn khoảng 330 m².', '5 phòng ngủ, 5 phòng tắm.', 'Mặt tiền 13 m, đường nội khu khoảng 12 m.', 'Giá mẫu 12,9 tỷ đồng.'],
    locationNote: 'Khu đô thị Hòa Lạc, kết nối thuận tiện các khu công nghệ, giáo dục và dịch vụ.',
    utilityNote: 'Sân vườn, chỗ đỗ 2 ô tô, phòng làm việc, phòng sinh hoạt chung và hệ thống điện nước hoàn chỉnh.',
    suitableFor: 'Gia đình nhiều thế hệ, chuyên gia cao cấp hoặc khách cần không gian sống rộng.',
    legalNote: 'Pháp lý mô phỏng: hồ sơ sở hữu riêng, dùng cho môi trường test.',
    transactionType: 'sale', propertyType: 'villa', ownerType: 'business',
    price: 12900000000, priceUnit: 'total', isNegotiable: true,
    landArea: 260, usableArea: 330, bedrooms: 5, bathrooms: 5, frontage: 13, roadWidth: 12,
    direction: 'southeast', legalStatus: 'red_book', area: 'khu-do-thi-hoa-lac', category: 'mua-ban-nha-dat',
    features: ['duong-rong-tren-6m', 'o-to-vao-tan-noi', 'dien-nuoc-day-du', 'phu-hop-o-lau-dai', 'co-so-do'],
    author: 'business', address: 'Khu đô thị Hòa Lạc, Hà Nội', coordinates: [105.5188, 21.0189], listingTier: 'diamond',
  },
  {
    slug: 'ban-nha-pho-tay-phuong-68m2-kinh-doanh',
    title: 'Bán nhà phố Tây Phương 68 m², 4 tầng, phù hợp kinh doanh',
    summary: 'Nhà phố 4 tầng tại Tây Phương, diện tích 68 m², mặt tiền 5 m, vị trí dễ khai thác cửa hàng hoặc văn phòng.',
    description: 'Tầng 1 có mặt bằng mở, các tầng trên bố trí phòng ở và phòng làm việc, phù hợp kết hợp kinh doanh.',
    highlights: ['Diện tích đất 68 m², tổng sàn khoảng 230 m².', '4 phòng ngủ, 4 phòng tắm.', 'Mặt tiền 5 m, đường khoảng 8 m.', 'Giá mẫu 6,85 tỷ đồng.'],
    locationNote: 'Tây Phương, gần khu dân cư và tuyến kết nối trung tâm Thạch Thất.',
    utilityNote: 'Mặt bằng tầng 1 rộng, có chỗ đỗ xe, điện nước riêng và biển hiệu dễ quan sát.',
    suitableFor: 'Gia đình kết hợp kinh doanh, văn phòng dịch vụ hoặc cửa hàng.',
    legalNote: 'Pháp lý mô phỏng: sổ đỏ riêng.',
    transactionType: 'sale', propertyType: 'street_house', ownerType: 'owner',
    price: 6850000000, priceUnit: 'total', isNegotiable: true,
    landArea: 68, usableArea: 230, bedrooms: 4, bathrooms: 4, frontage: 5, roadWidth: 8,
    direction: 'east', legalStatus: 'red_book', area: 'tay-phuong', category: 'mua-ban-nha-dat',
    features: ['phu-hop-kinh-doanh', 'duong-rong-tren-6m', 'o-to-vao-tan-noi', 'dien-nuoc-day-du', 'co-so-do'],
    author: 'resident', address: 'Khu vực Tây Phương, Thạch Thất, Hà Nội', coordinates: [105.6084, 21.0326], listingTier: 'gold',
  },
  {
    slug: 'ban-nha-nguyen-can-tan-xa-105m2-gan-cnc',
    title: 'Bán nhà nguyên căn Tân Xã 105 m², 3 tầng, gần Khu Công nghệ cao',
    summary: 'Nhà 3 tầng diện tích 105 m² tại Tân Xã, 5 phòng ngủ, phù hợp gia đình hoặc khai thác cho thuê chuyên gia.',
    description: 'Căn nhà có diện tích rộng, công năng nhiều phòng và khoảng sân trước đủ để ô tô.',
    highlights: ['Diện tích đất 105 m², sử dụng khoảng 270 m².', '5 phòng ngủ, 4 phòng tắm.', 'Mặt tiền 6 m, đường trước nhà khoảng 6 m.', 'Giá mẫu 7,2 tỷ đồng.'],
    locationNote: 'Tân Xã, vị trí thuận tiện tới Khu Công nghệ cao Hòa Lạc.',
    utilityNote: 'Có sân để xe, phòng làm việc, bếp rộng và hệ thống điện nước riêng.',
    suitableFor: 'Gia đình nhiều thành viên hoặc mua để khai thác cho thuê dài hạn.',
    legalNote: 'Pháp lý mô phỏng: sổ đỏ riêng.',
    transactionType: 'sale', propertyType: 'house', ownerType: 'broker',
    price: 7200000000, priceUnit: 'total', isNegotiable: true,
    landArea: 105, usableArea: 270, bedrooms: 5, bathrooms: 4, frontage: 6, roadWidth: 6,
    direction: 'southwest', legalStatus: 'red_book', area: 'tan-xa', category: 'mua-ban-nha-dat',
    features: ['gan-khu-cong-nghe-cao', 'o-to-vao-tan-noi', 'dien-nuoc-day-du', 'phu-hop-o-lau-dai', 'co-so-do'],
    author: 'broker', address: 'Khu vực Tân Xã, Thạch Thất, Hà Nội', coordinates: [105.5486, 21.0154], listingTier: 'gold',
  },
  {
    slug: 'ban-nha-vuon-phu-cat-500m2-nghi-duong',
    title: 'Bán nhà vườn Phú Cát 500 m², 4 phòng ngủ, không gian nghỉ dưỡng',
    summary: 'Nhà vườn Phú Cát khuôn viên 500 m², nhà ở khoảng 190 m², sân rộng và nhiều khoảng xanh.',
    description: 'Không gian yên tĩnh, bố trí nhà một tầng rưỡi và khu vườn lớn, phù hợp nghỉ cuối tuần.',
    highlights: ['Khuôn viên 500 m², diện tích sử dụng khoảng 190 m².', '4 phòng ngủ, 3 phòng tắm.', 'Mặt tiền 17 m, đường ô tô khoảng 6,5 m.', 'Giá mẫu 8,15 tỷ đồng.'],
    locationNote: 'Phú Cát, khu vực phía tây Hòa Lạc, phù hợp nhu cầu không gian xanh và nghỉ cuối tuần.',
    utilityNote: 'Sân vườn, khu BBQ, chỗ đỗ 2-3 ô tô và các phòng đều có ánh sáng tự nhiên.',
    suitableFor: 'Second home, gia đình nhiều thế hệ hoặc lưu trú nhỏ.',
    legalNote: 'Pháp lý mô phỏng: sổ đỏ riêng.',
    transactionType: 'sale', propertyType: 'farm_resort', ownerType: 'broker',
    price: 8150000000, priceUnit: 'total', isNegotiable: true,
    landArea: 500, usableArea: 190, bedrooms: 4, bathrooms: 3, frontage: 17, roadWidth: 6.5,
    direction: 'northeast', legalStatus: 'red_book', area: 'phu-cat', category: 'mua-ban-nha-dat',
    features: ['phu-hop-lam-homestay', 'o-to-vao-tan-noi', 'duong-rong-tren-6m', 'dien-nuoc-day-du', 'co-so-do'],
    author: 'broker', address: 'Khu vực Phú Cát, Quốc Oai, Hà Nội', coordinates: [105.4935, 21.0078], listingTier: 'silver',
  },
  {
    slug: 'ban-can-ho-mini-hoa-lac-48m2-full-noi-that',
    title: 'Bán căn hộ mini Hòa Lạc 48 m², 2 phòng ngủ, đầy đủ nội thất',
    summary: 'Căn hộ mini 48 m² tại Hòa Lạc, 2 phòng ngủ, 1 phòng tắm, nội thất cơ bản phù hợp người trẻ và chuyên gia.',
    description: 'Căn hộ bố trí tối ưu diện tích, phòng khách nối bếp, hai phòng ngủ có cửa sổ và khu vệ sinh riêng.',
    highlights: ['Diện tích sử dụng 48 m².', '2 phòng ngủ, 1 phòng tắm.', 'Nội thất cơ bản, có điều hòa và bếp.', 'Giá mẫu 1,95 tỷ đồng.'],
    locationNote: 'Hòa Lạc, thuận tiện tới Khu Công nghệ cao và khu dịch vụ.',
    utilityNote: 'Có thang máy, khu để xe, điện nước riêng và internet cáp quang.',
    suitableFor: 'Người trẻ, chuyên gia, cặp đôi hoặc nhà đầu tư khai thác cho thuê.',
    legalNote: 'Pháp lý mô phỏng: hợp đồng sở hữu/căn hộ mẫu cho môi trường test.',
    transactionType: 'sale', propertyType: 'mini_apartment', ownerType: 'business',
    price: 1950000000, priceUnit: 'total', isNegotiable: true,
    landArea: 48, usableArea: 48, bedrooms: 2, bathrooms: 1, frontage: null, roadWidth: 8,
    direction: 'south', legalStatus: 'contract', area: 'hoa-lac', category: 'mua-ban-nha-dat',
    features: ['gan-khu-cong-nghe-cao', 'dien-nuoc-day-du', 'phu-hop-o-lau-dai', 'duong-rong-tren-6m'],
    author: 'business', address: 'Khu vực Hòa Lạc, Hà Nội', coordinates: [105.5281, 21.0092], listingTier: 'silver',
  },
  {
    slug: 'ban-nha-4-tang-thach-that-80m2-o-to-vao-nha',
    title: 'Bán nhà 4 tầng Thạch Thất 80 m², 5 phòng ngủ, ô tô vào nhà',
    summary: 'Nhà 4 tầng diện tích 80 m² tại Thạch Thất, 5 phòng ngủ, có gara và tổng diện tích sử dụng khoảng 285 m².',
    description: 'Căn nhà nhiều tầng phù hợp gia đình đông người, tầng 1 có gara và bếp, các tầng trên bố trí phòng ngủ.',
    highlights: ['Diện tích đất 80 m², tổng sàn khoảng 285 m².', '5 phòng ngủ, 4 phòng tắm.', 'Mặt tiền 5 m, đường trước nhà khoảng 7 m.', 'Giá mẫu 7,75 tỷ đồng.'],
    locationNote: 'Khu vực Thạch Thất, thuận tiện chợ, trường học và các tuyến đi Hòa Lạc.',
    utilityNote: 'Gara ô tô, phòng thờ, sân phơi, điện nước riêng và hạ tầng dân cư đầy đủ.',
    suitableFor: 'Gia đình nhiều thế hệ hoặc khách cần nhà rộng để ở lâu dài.',
    legalNote: 'Pháp lý mô phỏng: sổ đỏ riêng.',
    transactionType: 'sale', propertyType: 'townhouse', ownerType: 'owner',
    price: 7750000000, priceUnit: 'total', isNegotiable: true,
    landArea: 80, usableArea: 285, bedrooms: 5, bathrooms: 4, frontage: 5, roadWidth: 7,
    direction: 'northwest', legalStatus: 'red_book', area: 'thach-that', category: 'mua-ban-nha-dat',
    features: ['o-to-vao-tan-noi', 'duong-rong-tren-6m', 'dien-nuoc-day-du', 'phu-hop-o-lau-dai', 'co-so-do'],
    author: 'resident', address: 'Khu vực Thạch Thất, Hà Nội', coordinates: [105.5849, 21.0537], listingTier: 'silver',
  },
  {
    slug: 'ban-villa-tien-xuan-320m2-san-vuon-rong',
    title: 'Bán villa Tiến Xuân 320 m², 5 phòng ngủ, sân vườn rộng',
    summary: 'Villa khuôn viên 320 m² tại Tiến Xuân, tổng sàn khoảng 275 m², 5 phòng ngủ và không gian xanh bao quanh.',
    description: 'Kiến trúc hiện đại, phòng khách trần cao, bếp mở và khu sân vườn phù hợp sinh hoạt gia đình.',
    highlights: ['Khuôn viên 320 m², tổng sàn khoảng 275 m².', '5 phòng ngủ, 4 phòng tắm.', 'Mặt tiền 14 m, đường khoảng 7 m.', 'Giá mẫu 9,25 tỷ đồng.'],
    locationNote: 'Tiến Xuân, khu vực nhiều không gian xanh và kết nối nhanh về Hòa Lạc.',
    utilityNote: 'Sân vườn, khu BBQ, chỗ đỗ 2 ô tô, phòng làm việc và ban công rộng.',
    suitableFor: 'Gia đình nhiều thế hệ, second home hoặc khách cần không gian sống ngoại ô.',
    legalNote: 'Pháp lý mô phỏng: sổ đỏ riêng.',
    transactionType: 'sale', propertyType: 'villa', ownerType: 'broker',
    price: 9250000000, priceUnit: 'total', isNegotiable: true,
    landArea: 320, usableArea: 275, bedrooms: 5, bathrooms: 4, frontage: 14, roadWidth: 7,
    direction: 'west', legalStatus: 'red_book', area: 'tien-xuan', category: 'mua-ban-nha-dat',
    features: ['phu-hop-lam-homestay', 'o-to-vao-tan-noi', 'duong-rong-tren-6m', 'dien-nuoc-day-du', 'co-so-do'],
    author: 'broker', address: 'Khu vực Tiến Xuân, Thạch Thất, Hà Nội', coordinates: [105.4697, 20.9811], listingTier: 'gold',
  },
  {
    slug: 'cho-thue-nha-thach-hoa-90m2-4-phong-ngu',
    title: 'Cho thuê nhà Thạch Hòa 90 m², 4 phòng ngủ, có nội thất',
    summary: 'Nhà nguyên căn 3 tầng tại Thạch Hòa, diện tích đất 90 m², 4 phòng ngủ, phù hợp gia đình hoặc nhóm chuyên gia.',
    description: 'Nhà có phòng khách, bếp, 4 phòng ngủ và khu để xe, trang bị nội thất cơ bản để vào ở ngay.',
    highlights: ['Diện tích đất 90 m², sử dụng khoảng 190 m².', '4 phòng ngủ, 3 phòng tắm.', 'Mặt tiền 5 m, đường khoảng 6 m.', 'Giá thuê mẫu 16 triệu đồng/tháng.'],
    locationNote: 'Thạch Hòa, thuận tiện di chuyển tới Khu Công nghệ cao và Đại học Quốc gia.',
    utilityNote: 'Có điều hòa, nóng lạnh, bếp, máy giặt, điện nước riêng và chỗ để ô tô.',
    suitableFor: 'Gia đình hoặc nhóm 3-5 chuyên gia làm việc quanh Hòa Lạc.',
    legalNote: 'Giao dịch mô phỏng theo hợp đồng thuê nhà, đặt cọc 1 tháng.',
    transactionType: 'rent', propertyType: 'whole_house', ownerType: 'owner',
    price: 16000000, priceUnit: 'per_month', isNegotiable: true,
    landArea: 90, usableArea: 190, bedrooms: 4, bathrooms: 3, frontage: 5, roadWidth: 6,
    direction: 'southeast', legalStatus: 'contract', area: 'thach-hoa', category: 'cho-thue',
    features: ['gan-khu-cong-nghe-cao', 'o-to-vao-tan-noi', 'dien-nuoc-day-du', 'phu-hop-o-lau-dai'],
    author: 'resident', address: 'Khu vực Thạch Hòa, Thạch Thất, Hà Nội', coordinates: [105.5379, 21.0248], listingTier: 'silver',
  },
  {
    slug: 'cho-thue-nha-lien-ke-khu-do-thi-hoa-lac-75m2',
    title: 'Cho thuê nhà liền kề Khu đô thị Hòa Lạc 75 m², 4 tầng',
    summary: 'Nhà liền kề 4 tầng, diện tích đất 75 m², tổng sàn khoảng 255 m², phù hợp gia đình hoặc văn phòng chuyên gia.',
    description: 'Nhà hoàn thiện cơ bản, có gara, phòng khách, bếp và 4 phòng ngủ, ưu tiên hợp đồng dài hạn.',
    highlights: ['Diện tích đất 75 m², sử dụng khoảng 255 m².', '4 phòng ngủ, 4 phòng tắm.', 'Mặt tiền 5 m, đường nội khu 10 m.', 'Giá thuê mẫu 24 triệu đồng/tháng.'],
    locationNote: 'Khu đô thị Hòa Lạc, thuận tiện tiếp cận các khu công nghệ và dịch vụ.',
    utilityNote: 'Gara, điều hòa cơ bản, điện nước riêng, internet và không gian làm việc tại nhà.',
    suitableFor: 'Gia đình chuyên gia, nhóm quản lý hoặc văn phòng đại diện nhỏ.',
    legalNote: 'Giao dịch mô phỏng theo hợp đồng thuê nhà dài hạn.',
    transactionType: 'rent', propertyType: 'villa_townhouse', ownerType: 'business',
    price: 24000000, priceUnit: 'per_month', isNegotiable: true,
    landArea: 75, usableArea: 255, bedrooms: 4, bathrooms: 4, frontage: 5, roadWidth: 10,
    direction: 'north', legalStatus: 'contract', area: 'khu-do-thi-hoa-lac', category: 'cho-thue',
    features: ['duong-rong-tren-6m', 'o-to-vao-tan-noi', 'dien-nuoc-day-du', 'phu-hop-o-lau-dai'],
    author: 'business', address: 'Khu đô thị Hòa Lạc, Hà Nội', coordinates: [105.5205, 21.0201], listingTier: 'gold',
  },
  {
    slug: 'cho-thue-biet-thu-hoa-lac-240m2-noi-that-day-du',
    title: 'Cho thuê biệt thự Hòa Lạc 240 m², 5 phòng ngủ, đầy đủ nội thất',
    summary: 'Biệt thự cho thuê tại Hòa Lạc, khuôn viên 240 m², 5 phòng ngủ, nội thất đầy đủ, phù hợp chuyên gia và gia đình.',
    description: 'Biệt thự có phòng khách rộng, bếp đầy đủ thiết bị, sân vườn nhỏ và không gian làm việc riêng.',
    highlights: ['Khuôn viên 240 m², tổng sàn khoảng 300 m².', '5 phòng ngủ, 5 phòng tắm.', 'Mặt tiền 12 m, đường khoảng 10 m.', 'Giá thuê mẫu 38 triệu đồng/tháng.'],
    locationNote: 'Hòa Lạc, thuận tiện tới Khu Công nghệ cao, Đại học Quốc gia và Đại lộ Thăng Long.',
    utilityNote: 'Full nội thất, chỗ đỗ 2 ô tô, sân vườn, internet, máy giặt và các thiết bị bếp cơ bản.',
    suitableFor: 'Gia đình chuyên gia, quản lý doanh nghiệp hoặc khách thuê dài hạn.',
    legalNote: 'Giao dịch mô phỏng theo hợp đồng thuê nhà, điều khoản đặt cọc và thanh toán thỏa thuận.',
    transactionType: 'rent', propertyType: 'villa', ownerType: 'business',
    price: 38000000, priceUnit: 'per_month', isNegotiable: true,
    landArea: 240, usableArea: 300, bedrooms: 5, bathrooms: 5, frontage: 12, roadWidth: 10,
    direction: 'south', legalStatus: 'contract', area: 'hoa-lac', category: 'cho-thue',
    features: ['gan-khu-cong-nghe-cao', 'duong-rong-tren-6m', 'o-to-vao-tan-noi', 'dien-nuoc-day-du', 'phu-hop-o-lau-dai'],
    author: 'business', address: 'Khu vực Hòa Lạc, Hà Nội', coordinates: [105.5266, 21.0134], listingTier: 'diamond',
  },
];

export async function seedPropertyShowcase({
  users,
  categories,
  areas,
  tags,
  media,
  propertyFeatures,
}) {
  const result = {};
  const rootArea = areas['hoa-lac'];

  if (!rootArea) {
    throw new Error('Property showcase seed requires hoa-lac area');
  }

  for (let index = 0; index < definitions.length; index += 1) {
    const item = definitions[index];
    const author = users[item.author];
    const area = areas[item.area];
    const category = categories[`property:${item.category}`];
    const gallery = galleryFor(media, index, 6);
    const thumbnail = gallery[0];

    if (!author || !area || !category || !thumbnail) {
      throw new Error(`Property showcase dependency missing for ${item.slug}`);
    }

    const areaIds = String(area._id) === String(rootArea._id)
      ? [rootArea._id]
      : [area._id, rootArea._id];

    const tagIds = ['hoa-lac', 'nha-o', item.transactionType === 'sale' ? 'gia-dat' : null]
      .filter(Boolean)
      .map((slug) => tags[slug]?._id)
      .filter(Boolean);

    const publishedAt = new Date(Date.now() - (index + 1) * DAY_MS);

    const content = await upsertContent({
      slug: item.slug,
      contentType: 'property',
      authorId: author._id,
      title: item.title,
      summary: item.summary,
      bodyHtml: makeBodyHtml(item),
      thumbnailMediaId: thumbnail._id,
      primaryCategoryId: category._id,
      primaryAreaId: area._id,
      categoryIds: [category._id],
      areaIds,
      tagIds,
      status: 'published',
      visibility: 'public',
      allowComments: true,
      isFeatured: index < 4,
      publishedAt,
      viewCount: 420 + index * 137,
    });

    const featureIds = item.features
      .map((slug) => propertyFeatures[slug]?._id)
      .filter(Boolean);

    const listingTier = item.listingTier || 'standard';
    const listingDurationDays = 60;
    const listingStartAt = new Date(Date.now() - (index % 6) * DAY_MS);
    const expiresAt = new Date(listingStartAt.getTime() + listingDurationDays * DAY_MS);

    const listing = await PropertyListing.findOneAndUpdate(
      { contentId: content._id },
      {
        $set: {
          transactionType: item.transactionType,
          propertyType: item.propertyType,
          ownerType: item.ownerType,
          price: item.price,
          priceUnit: item.priceUnit,
          isNegotiable: item.isNegotiable,
          landArea: item.landArea,
          usableArea: item.usableArea,
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
          frontage: item.frontage,
          roadWidth: item.roadWidth,
          direction: item.direction,
          legalStatus: item.legalStatus,
          addressText: item.address,
          location: {
            type: 'Point',
            coordinates: item.coordinates,
          },
          contactName: author.displayName,
          contactPhone: author.phone || '0966709790',
          contactEmail: author.email,
          featureIds,
          galleryMediaIds: gallery.map((entry) => entry._id),
          listingTier,
          listingPriority: LISTING_PRIORITY[listingTier] || 0,
          listingDurationDays,
          listingStartAt,
          expiresAt,
          soldAt: null,
          rentedAt: null,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    await PropertyPriceHistory.findOneAndUpdate(
      {
        contentId: content._id,
        changedAt: daysFromSeed(-120 - index),
      },
      {
        $set: {
          oldPrice: Math.round(item.price * 1.035),
          newPrice: item.price,
          changedBy: author._id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    result[item.slug] = { content, listing };
  }

  return result;
}

export { definitions as propertyShowcaseSeedDefinitions };
