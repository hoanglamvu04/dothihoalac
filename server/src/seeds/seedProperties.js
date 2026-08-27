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

function daysFromNow(days) {
  return new Date(Date.now() + days * DAY_MS);
}

function listHtml(items = []) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function makePropertyBody(item) {
  return [
    `<h2>${item.title}</h2>`,
    `<p>${item.description}</p>`,
    '<h3>Thông tin chính</h3>',
    listHtml(item.highlights),
    '<h3>Vị trí và kết nối</h3>',
    `<p>${item.locationNote}</p>`,
    '<h3>Phù hợp với</h3>',
    `<p>${item.suitableFor}</p>`,
    '<h3>Lưu ý khi giao dịch</h3>',
    '<p>Người mua hoặc người thuê nên kiểm tra trực tiếp hiện trạng, hồ sơ pháp lý, thông tin quy hoạch và các điều khoản giao dịch trước khi đặt cọc.</p>',
    '<p><em>Dữ liệu này được tạo cho môi trường phát triển/kiểm thử của Đô Thị Hòa Lạc, không phải lời chào bán tài sản ngoài đời thực.</em></p>',
  ].join('');
}

// Dữ liệu mô phỏng thực tế để kiểm thử danh sách, bộ lọc, card và trang chi tiết BĐS.
// Hai slug đầu được giữ lại để không phá các seed interaction/moderation đang tham chiếu.
const definitions = [
  {
    slug: 'ban-dat-thach-hoa-120m2-duong-o-to',
    title: 'Bán đất Thạch Hòa 120 m², mặt tiền 6 m, ô tô vào tận nơi',
    summary:
      'Lô đất 120 m² tại Thạch Hòa, mặt tiền 6 m, đường ô tô tiếp cận thuận tiện, phù hợp xây nhà ở hoặc giữ tài sản dài hạn.',
    description:
      'Lô đất có hình thể vuông vắn, mặt tiền rộng, khu dân cư hiện hữu và kết nối thuận tiện về phía Hòa Lạc.',
    highlights: [
      'Diện tích 120 m², mặt tiền khoảng 6 m.',
      'Đường trước đất khoảng 5 m, ô tô đi lại thuận tiện.',
      'Pháp lý mô phỏng: sổ đỏ riêng.',
      'Giá tham khảo seed: 3,6 tỷ đồng, có thương lượng.',
    ],
    locationNote:
      'Khu vực Thạch Hòa, gần các tuyến kết nối về Đại lộ Thăng Long và khu công nghệ cao.',
    suitableFor: 'Xây nhà ở lâu dài, nhà cho chuyên gia thuê hoặc tích lũy tài sản.',
    transactionType: 'sale',
    propertyType: 'residential_land',
    ownerType: 'owner',
    price: 3600000000,
    priceUnit: 'total',
    isNegotiable: true,
    landArea: 120,
    frontage: 6,
    roadWidth: 5,
    direction: 'southeast',
    area: 'thach-hoa',
    category: 'mua-ban-nha-dat',
    media: 'property-photo-land-1',
    gallery: ['property-photo-land-1'],
    legalStatus: 'red_book',
    features: ['o-to-vao-tan-noi', 'co-so-do', 'co-the-xay-dung-ngay'],
    author: 'resident',
    address: 'Khu vực Thạch Hòa, Thạch Thất, Hà Nội',
    listingTier: 'diamond',
  },
  {
    slug: 'ban-dat-nen-binh-yen-100m2',
    title: 'Bán đất Bình Yên 100 m², gần Đại lộ Thăng Long',
    summary:
      'Lô đất 100 m² tại Bình Yên, đường ô tô, khoảng cách kết nối Đại lộ Thăng Long thuận tiện, phù hợp nhu cầu ở và đầu tư trung hạn.',
    description:
      'Đất nằm trong khu dân cư, diện tích vừa phải, dễ bố trí nhà ở gia đình và có đường tiếp cận thuận lợi.',
    highlights: [
      'Diện tích 100 m², mặt tiền khoảng 5 m.',
      'Đường tiếp cận khoảng 5 m.',
      'Pháp lý mô phỏng: sổ đỏ riêng.',
      'Giá tham khảo seed: 2,85 tỷ đồng.',
    ],
    locationNote:
      'Khu vực Bình Yên, thuận tiện di chuyển về Đại lộ Thăng Long và trung tâm Hòa Lạc.',
    suitableFor: 'Xây nhà ở, giữ đất dài hạn hoặc làm tài sản tích lũy.',
    transactionType: 'sale',
    propertyType: 'land_plot',
    ownerType: 'broker',
    price: 2850000000,
    priceUnit: 'total',
    isNegotiable: true,
    landArea: 100,
    frontage: 5,
    roadWidth: 5,
    direction: 'east',
    area: 'binh-yen',
    category: 'mua-ban-nha-dat',
    media: 'property-photo-land-1',
    gallery: ['property-photo-land-1'],
    legalStatus: 'red_book',
    features: ['gan-dai-lo-thang-long', 'co-so-do', 'o-to-vao-tan-noi'],
    author: 'broker',
    address: 'Khu vực Bình Yên, Thạch Thất, Hà Nội',
    listingTier: 'gold',
  },
  {
    slug: 'ban-dat-ha-bang-96m2-gan-truc-chinh',
    title: 'Bán đất Hạ Bằng 96 m², gần trục chính, ô tô đỗ cửa',
    summary:
      'Lô đất 96 m² tại Hạ Bằng, mặt tiền 5,2 m, đường rộng, khu dân cư ổn định và thuận tiện di chuyển về Hòa Lạc.',
    description:
      'Lô đất phù hợp nhu cầu ở thực, hình thể dễ thiết kế nhà 2-3 tầng và có hạ tầng dân cư cơ bản xung quanh.',
    highlights: [
      'Diện tích 96 m², mặt tiền khoảng 5,2 m.',
      'Đường trước đất khoảng 6 m, ô tô tránh nhau.',
      'Pháp lý mô phỏng: sổ đỏ riêng.',
      'Giá tham khảo seed: 2,45 tỷ đồng.',
    ],
    locationNote:
      'Hạ Bằng, Thạch Thất; kết nối thuận tiện tới các khu sản xuất, dịch vụ và khu vực Hòa Lạc.',
    suitableFor: 'Gia đình trẻ, người làm việc quanh Hòa Lạc hoặc đầu tư giữ tài sản.',
    transactionType: 'sale',
    propertyType: 'residential_land',
    ownerType: 'broker',
    price: 2450000000,
    priceUnit: 'total',
    isNegotiable: true,
    landArea: 96,
    frontage: 5.2,
    roadWidth: 6,
    direction: 'south',
    area: 'ha-bang',
    category: 'mua-ban-nha-dat',
    media: 'property-photo-land-1',
    gallery: ['property-photo-land-1'],
    legalStatus: 'red_book',
    features: ['o-to-vao-tan-noi', 'co-so-do', 'duong-rong-tren-6m'],
    author: 'broker',
    address: 'Khu vực Hạ Bằng, Thạch Thất, Hà Nội',
    listingTier: 'silver',
  },
  {
    slug: 'ban-dat-tay-phuong-82m2-ngo-o-to',
    title: 'Bán đất Tây Phương 82 m², ngõ ô tô, khu dân cư hiện hữu',
    summary:
      'Lô đất 82 m² tại Tây Phương, mặt tiền hơn 5 m, ngõ ô tô vào thuận tiện, phù hợp xây nhà ở lâu dài.',
    description:
      'Diện tích gọn, mặt tiền cân đối, xung quanh có nhà dân và tiện ích sinh hoạt cơ bản.',
    highlights: [
      'Diện tích 82 m², mặt tiền khoảng 5,1 m.',
      'Ngõ trước đất khoảng 4,5 m.',
      'Pháp lý mô phỏng: sổ đỏ riêng.',
      'Giá tham khảo seed: 2,15 tỷ đồng.',
    ],
    locationNote:
      'Khu vực Tây Phương, kết nối về trung tâm Thạch Thất và các tuyến đi Hòa Lạc.',
    suitableFor: 'Xây nhà gia đình, cho thuê dài hạn hoặc giữ tài sản.',
    transactionType: 'sale',
    propertyType: 'residential_land',
    ownerType: 'owner',
    price: 2150000000,
    priceUnit: 'total',
    isNegotiable: true,
    landArea: 82,
    frontage: 5.1,
    roadWidth: 4.5,
    direction: 'northeast',
    area: 'tay-phuong',
    category: 'mua-ban-nha-dat',
    media: 'property-photo-land-1',
    gallery: ['property-photo-land-1'],
    legalStatus: 'red_book',
    features: ['o-to-vao-tan-noi', 'co-so-do', 'co-the-xay-dung-ngay'],
    author: 'resident',
    address: 'Khu vực Tây Phương, Thạch Thất, Hà Nội',
    listingTier: 'standard',
  },
  {
    slug: 'ban-nha-3-tang-thach-that-75m2',
    title: 'Bán nhà 3 tầng Thạch Thất 75 m², 4 phòng ngủ, ô tô vào nhà',
    summary:
      'Nhà 3 tầng trên khu đất 75 m², tổng diện tích sử dụng khoảng 210 m², 4 phòng ngủ, phù hợp gia đình ở lâu dài.',
    description:
      'Nhà bố trí công năng theo nhu cầu gia đình, có phòng khách, bếp, 4 phòng ngủ và khu vực để xe.',
    highlights: [
      'Diện tích đất 75 m², sử dụng khoảng 210 m².',
      '4 phòng ngủ, 3 phòng tắm.',
      'Đường trước nhà khoảng 6 m.',
      'Giá tham khảo seed: 5,8 tỷ đồng.',
    ],
    locationNote:
      'Khu vực Thạch Thất, thuận tiện tiếp cận chợ, trường học và tuyến kết nối Hòa Lạc.',
    suitableFor: 'Gia đình 4-6 người hoặc kết hợp ở và làm văn phòng nhỏ.',
    transactionType: 'sale',
    propertyType: 'townhouse',
    ownerType: 'owner',
    price: 5800000000,
    priceUnit: 'total',
    isNegotiable: true,
    landArea: 75,
    usableArea: 210,
    bedrooms: 4,
    bathrooms: 3,
    frontage: 5,
    roadWidth: 6,
    direction: 'south',
    area: 'thach-that',
    category: 'mua-ban-nha-dat',
    media: 'property-photo-house-exterior-2',
    gallery: [
      'property-photo-house-exterior-2',
      'property-photo-interior-1',
      'property-photo-interior-2',
    ],
    legalStatus: 'red_book',
    features: ['o-to-vao-tan-noi', 'dien-nuoc-day-du', 'phu-hop-o-lau-dai', 'co-so-do'],
    author: 'resident',
    address: 'Khu vực Thạch Thất, Hà Nội',
    listingTier: 'gold',
  },
  {
    slug: 'ban-nha-vuon-yen-xuan-620m2',
    title: 'Bán nhà vườn Yên Xuân 620 m², khuôn viên xanh, đường ô tô',
    summary:
      'Nhà vườn diện tích 620 m² tại Yên Xuân, có nhà ở khoảng 180 m², sân vườn rộng và không gian phù hợp nghỉ cuối tuần.',
    description:
      'Khuôn viên rộng, có khoảng sân và mảng xanh, phù hợp gia đình cần không gian nghỉ dưỡng ngoại ô.',
    highlights: [
      'Khuôn viên khoảng 620 m², diện tích sử dụng khoảng 180 m².',
      '4 phòng ngủ, 4 phòng tắm.',
      'Đường ô tô tiếp cận thuận tiện.',
      'Giá tham khảo seed: 7,9 tỷ đồng.',
    ],
    locationNote:
      'Yên Xuân, khu vực có nhiều không gian xanh và kết nối về Hòa Lạc, phù hợp nhu cầu nghỉ dưỡng cuối tuần.',
    suitableFor: 'Nhà vườn gia đình, second home hoặc mô hình lưu trú quy mô nhỏ sau khi kiểm tra điều kiện pháp lý.',
    transactionType: 'sale',
    propertyType: 'farm_resort',
    ownerType: 'broker',
    price: 7900000000,
    priceUnit: 'total',
    isNegotiable: true,
    landArea: 620,
    usableArea: 180,
    bedrooms: 4,
    bathrooms: 4,
    frontage: 18,
    roadWidth: 7,
    direction: 'east',
    area: 'yen-xuan',
    category: 'mua-ban-nha-dat',
    media: 'property-photo-house-exterior-1',
    gallery: [
      'property-photo-house-exterior-1',
      'property-photo-interior-2',
      'property-photo-interior-1',
    ],
    legalStatus: 'red_book',
    features: ['phu-hop-lam-homestay', 'o-to-vao-tan-noi', 'co-so-do'],
    author: 'broker',
    address: 'Khu vực Yên Xuân, Thạch Thất, Hà Nội',
    listingTier: 'diamond',
  },
  {
    slug: 'cho-thue-nha-nguyen-can-hoa-lac-90m2',
    title: 'Cho thuê nhà nguyên căn Hòa Lạc 90 m², 4 phòng ngủ',
    summary:
      'Nhà nguyên căn 3 tầng, 4 phòng ngủ, phù hợp gia đình hoặc nhóm chuyên gia làm việc tại khu vực Hòa Lạc.',
    description:
      'Nhà có không gian sinh hoạt đầy đủ, bếp, phòng khách và khu vực để xe; ưu tiên hợp đồng thuê dài hạn.',
    highlights: [
      'Diện tích đất khoảng 90 m², sử dụng khoảng 180 m².',
      '4 phòng ngủ, 3 phòng tắm.',
      'Có nội thất cơ bản và điện nước riêng.',
      'Giá tham khảo seed: 15 triệu đồng/tháng.',
    ],
    locationNote:
      'Khu vực Hòa Lạc, thuận tiện di chuyển đến khu công nghệ cao và các cụm dịch vụ lân cận.',
    suitableFor: 'Gia đình, nhóm kỹ sư/chuyên gia hoặc nhân sự làm việc dài hạn tại Hòa Lạc.',
    transactionType: 'rent',
    propertyType: 'whole_house',
    ownerType: 'owner',
    price: 15000000,
    priceUnit: 'per_month',
    isNegotiable: true,
    landArea: 90,
    usableArea: 180,
    bedrooms: 4,
    bathrooms: 3,
    frontage: 5,
    roadWidth: 6,
    direction: 'southeast',
    area: 'hoa-lac',
    category: 'cho-thue',
    media: 'property-photo-house-exterior-3',
    gallery: [
      'property-photo-house-exterior-3',
      'property-photo-interior-1',
      'property-photo-interior-2',
    ],
    legalStatus: 'contract',
    features: ['dien-nuoc-day-du', 'o-to-vao-tan-noi', 'phu-hop-o-lau-dai'],
    author: 'resident',
    address: 'Khu vực Hòa Lạc, Hà Nội',
    listingTier: 'silver',
  },
  {
    slug: 'cho-thue-phong-khep-kin-ha-bang-28m2',
    title: 'Cho thuê phòng khép kín Hạ Bằng 28 m², có nội thất cơ bản',
    summary:
      'Phòng khép kín khoảng 28 m² tại Hạ Bằng, có điều hòa, nóng lạnh và khu bếp nhỏ, phù hợp 1-2 người.',
    description:
      'Phòng có cửa sổ, khu vệ sinh riêng và các hạng mục nội thất cơ bản phục vụ sinh hoạt hằng ngày.',
    highlights: [
      'Diện tích khoảng 28 m².',
      'Phòng khép kín, có điều hòa và nóng lạnh.',
      'Có khu để xe và điện nước tính riêng.',
      'Giá tham khảo seed: 3,2 triệu đồng/tháng.',
    ],
    locationNote:
      'Hạ Bằng, thuận tiện cho người làm việc tại Thạch Thất và khu vực Hòa Lạc.',
    suitableFor: 'Người đi làm, sinh viên thực tập hoặc cặp đôi cần thuê dài hạn.',
    transactionType: 'rent',
    propertyType: 'room',
    ownerType: 'business',
    price: 3200000,
    priceUnit: 'per_month',
    isNegotiable: false,
    landArea: 28,
    usableArea: 28,
    bedrooms: 1,
    bathrooms: 1,
    roadWidth: 4,
    direction: 'unknown',
    area: 'ha-bang',
    category: 'cho-thue',
    media: 'property-photo-room-1',
    gallery: ['property-photo-room-1', 'property-photo-apartment-1'],
    legalStatus: 'contract',
    features: ['dien-nuoc-day-du', 'phu-hop-o-lau-dai'],
    author: 'business',
    address: 'Khu vực Hạ Bằng, Thạch Thất, Hà Nội',
    listingTier: 'standard',
  },
  {
    slug: 'cho-thue-van-phong-hoa-lac-120m2',
    title: 'Cho thuê văn phòng Hòa Lạc 120 m², mặt bằng sáng, chỗ đỗ ô tô',
    summary:
      'Văn phòng khoảng 120 m² tại Hòa Lạc, không gian mở, phù hợp nhóm 15-25 nhân sự và doanh nghiệp công nghệ/dịch vụ.',
    description:
      'Mặt bằng văn phòng bố trí không gian mở, có khu họp nhỏ và hạ tầng điện, mạng phục vụ doanh nghiệp.',
    highlights: [
      'Diện tích sử dụng khoảng 120 m².',
      'Không gian mở, có điều hòa và hệ thống điện mạng.',
      'Có khu vực đỗ ô tô, xe máy.',
      'Giá tham khảo seed: 22 triệu đồng/tháng.',
    ],
    locationNote:
      'Khu vực Hòa Lạc, thuận tiện kết nối Khu Công nghệ cao và Đại lộ Thăng Long.',
    suitableFor: 'Doanh nghiệp công nghệ, văn phòng đại diện, nhóm dự án hoặc trung tâm dịch vụ.',
    transactionType: 'rent',
    propertyType: 'office',
    ownerType: 'business',
    price: 22000000,
    priceUnit: 'per_month',
    isNegotiable: true,
    landArea: 120,
    usableArea: 120,
    bathrooms: 2,
    frontage: 8,
    roadWidth: 10,
    direction: 'north',
    area: 'hoa-lac',
    category: 'cho-thue',
    media: 'property-photo-office-1',
    gallery: ['property-photo-office-1', 'property-photo-interior-1'],
    legalStatus: 'contract',
    features: ['gan-khu-cong-nghe-cao', 'dien-nuoc-day-du', 'phu-hop-kinh-doanh', 'duong-rong-tren-6m'],
    author: 'business',
    address: 'Khu vực Hòa Lạc, Hà Nội',
    listingTier: 'gold',
  },
  {
    slug: 'sang-nhuong-mat-bang-tay-phuong-110m2',
    title: 'Sang nhượng mặt bằng kinh doanh Tây Phương 110 m², mặt đường',
    summary:
      'Mặt bằng khoảng 110 m² tại Tây Phương, mặt tiền rộng, phù hợp cửa hàng, showroom nhỏ hoặc mô hình dịch vụ địa phương.',
    description:
      'Mặt bằng có không gian kinh doanh phía trước, khu phụ trợ phía sau và vị trí dễ nhận diện từ trục đường dân cư.',
    highlights: [
      'Diện tích khoảng 110 m², mặt tiền 7 m.',
      'Đường trước mặt bằng khoảng 8 m.',
      'Điện nước và khu vệ sinh riêng.',
      'Giá sang nhượng tham khảo seed: 380 triệu đồng.',
    ],
    locationNote:
      'Tây Phương, gần khu dân cư và tuyến đi trung tâm Thạch Thất.',
    suitableFor: 'Cửa hàng tiện ích, showroom, văn phòng giao dịch hoặc dịch vụ ăn uống sau khi kiểm tra điều kiện kinh doanh.',
    transactionType: 'transfer',
    propertyType: 'commercial_space',
    ownerType: 'business',
    price: 380000000,
    priceUnit: 'total',
    isNegotiable: true,
    landArea: 110,
    usableArea: 110,
    bathrooms: 1,
    frontage: 7,
    roadWidth: 8,
    direction: 'west',
    area: 'tay-phuong',
    category: 'sang-nhuong',
    media: 'property-photo-office-1',
    gallery: ['property-photo-office-1', 'property-photo-apartment-1'],
    legalStatus: 'contract',
    features: ['phu-hop-kinh-doanh', 'o-to-vao-tan-noi', 'dien-nuoc-day-du'],
    author: 'business',
    address: 'Khu vực Tây Phương, Thạch Thất, Hà Nội',
    listingTier: 'silver',
  },
  {
    slug: 'can-mua-dat-thach-that-90-130m2',
    title: 'Cần mua đất Thạch Thất 90-130 m², ngân sách khoảng 3,2 tỷ',
    summary:
      'Khách có nhu cầu mua đất ở khu vực Thạch Thất, ưu tiên lô 90-130 m², đường ô tô, pháp lý rõ ràng.',
    description:
      'Nhu cầu mua để xây nhà ở trong 6-12 tháng tới, ưu tiên khu dân cư hiện hữu và có đường ô tô tiếp cận.',
    highlights: [
      'Diện tích mong muốn 90-130 m².',
      'Ngân sách dự kiến tối đa khoảng 3,2 tỷ đồng.',
      'Ưu tiên sổ đỏ riêng và đường ô tô.',
      'Có thể xem đất trong giờ hành chính hoặc cuối tuần.',
    ],
    locationNote:
      'Ưu tiên khu vực Thạch Thất và các vị trí kết nối thuận tiện về Hòa Lạc.',
    suitableFor: 'Chủ đất chính chủ có sản phẩm phù hợp nhu cầu mua ở thực.',
    transactionType: 'wanted_buy',
    propertyType: 'residential_land',
    ownerType: 'owner',
    price: 3200000000,
    priceUnit: 'total',
    isNegotiable: true,
    landArea: 100,
    roadWidth: 4,
    direction: 'unknown',
    area: 'thach-that',
    category: 'can-mua-can-thue',
    media: 'property-photo-land-1',
    gallery: ['property-photo-land-1'],
    legalStatus: 'red_book',
    features: ['o-to-vao-tan-noi', 'co-so-do'],
    author: 'member',
    address: 'Khu vực Thạch Thất, Hà Nội',
    listingTier: 'standard',
  },
  {
    slug: 'ban-biet-thu-vuon-yen-xuan-350m2',
    title: 'Bán biệt thự vườn Yên Xuân 350 m², 5 phòng ngủ, sân rộng',
    summary:
      'Biệt thự vườn tại Yên Xuân có khuôn viên 350 m², diện tích sử dụng khoảng 280 m², 5 phòng ngủ và nhiều không gian xanh.',
    description:
      'Công trình phong cách hiện đại, ưu tiên không gian mở và sân vườn; phù hợp nghỉ cuối tuần hoặc ở lâu dài.',
    highlights: [
      'Khuôn viên 350 m², diện tích sử dụng khoảng 280 m².',
      '5 phòng ngủ, 5 phòng tắm.',
      'Mặt tiền khoảng 15 m, đường ô tô rộng.',
      'Giá tham khảo seed: 8,9 tỷ đồng.',
    ],
    locationNote:
      'Yên Xuân, không gian thoáng và thuận tiện kết nối về khu vực Hòa Lạc.',
    suitableFor: 'Second home, gia đình nhiều thế hệ hoặc lưu trú nghỉ cuối tuần.',
    transactionType: 'sale',
    propertyType: 'villa',
    ownerType: 'broker',
    price: 8900000000,
    priceUnit: 'total',
    isNegotiable: true,
    landArea: 350,
    usableArea: 280,
    bedrooms: 5,
    bathrooms: 5,
    frontage: 15,
    roadWidth: 8,
    direction: 'northwest',
    area: 'yen-xuan',
    category: 'mua-ban-nha-dat',
    media: 'property-photo-house-exterior-1',
    gallery: [
      'property-photo-house-exterior-1',
      'property-photo-interior-1',
      'property-photo-interior-2',
    ],
    legalStatus: 'red_book',
    features: ['phu-hop-lam-homestay', 'o-to-vao-tan-noi', 'co-so-do', 'duong-rong-tren-6m'],
    author: 'broker',
    address: 'Khu vực Yên Xuân, Thạch Thất, Hà Nội',
    listingTier: 'diamond',
  },
  {
    slug: 'ban-lo-dat-hoa-lac-150m2-gan-cnc',
    title: 'Bán lô đất Hòa Lạc 150 m², gần Khu Công nghệ cao',
    summary:
      'Lô đất 150 m² tại khu vực Hòa Lạc, mặt tiền 7,5 m, phù hợp xây nhà ở kết hợp cho thuê chuyên gia.',
    description:
      'Lô đất diện tích rộng, mặt tiền thuận lợi bố trí công năng và có khả năng khai thác nhu cầu ở quanh khu công nghệ cao.',
    highlights: [
      'Diện tích 150 m², mặt tiền khoảng 7,5 m.',
      'Đường tiếp cận khoảng 7 m.',
      'Pháp lý mô phỏng: sổ đỏ riêng.',
      'Giá tham khảo seed: 5,25 tỷ đồng.',
    ],
    locationNote:
      'Khu vực Hòa Lạc, khoảng kết nối thuận tiện tới Khu Công nghệ cao và Đại lộ Thăng Long.',
    suitableFor: 'Xây nhà ở, căn hộ dịch vụ quy mô nhỏ hoặc tích lũy tài sản dài hạn.',
    transactionType: 'sale',
    propertyType: 'land_plot',
    ownerType: 'broker',
    price: 5250000000,
    priceUnit: 'total',
    isNegotiable: true,
    landArea: 150,
    frontage: 7.5,
    roadWidth: 7,
    direction: 'southeast',
    area: 'hoa-lac',
    category: 'mua-ban-nha-dat',
    media: 'property-photo-land-1',
    gallery: ['property-photo-land-1'],
    legalStatus: 'red_book',
    features: ['gan-khu-cong-nghe-cao', 'o-to-vao-tan-noi', 'co-so-do', 'duong-rong-tren-6m'],
    author: 'broker',
    address: 'Khu vực Hòa Lạc, Hà Nội',
    listingTier: 'gold',
  },

  // Bản nháp/chờ duyệt để tiếp tục kiểm thử Content Studio và moderation.
  {
    slug: 'tin-mau-ban-dat-yen-binh-120m2',
    title: '[TIN MẪU] Bán lô đất 120 m² tại Yên Bình, đường ô tô',
    summary: 'Tin chờ duyệt phục vụ kiểm thử quản trị bất động sản.',
    description: 'Dữ liệu mô phỏng cho luồng kiểm duyệt.',
    highlights: ['Diện tích 120 m².', 'Mặt tiền 6 m.', 'Đường ô tô.', 'Có sổ đỏ mô phỏng.'],
    locationNote: 'Khu vực Yên Bình, Thạch Thất.',
    suitableFor: 'Kiểm thử luồng duyệt tin.',
    transactionType: 'sale',
    propertyType: 'residential_land',
    ownerType: 'owner',
    price: 3200000000,
    priceUnit: 'total',
    isNegotiable: true,
    landArea: 120,
    frontage: 6,
    roadWidth: 5,
    direction: 'southeast',
    area: 'yen-binh',
    category: 'mua-ban-nha-dat',
    media: 'property-photo-land-1',
    gallery: ['property-photo-land-1'],
    legalStatus: 'red_book',
    features: ['o-to-vao-tan-noi', 'co-so-do'],
    author: 'admin',
    address: 'Khu vực Yên Bình, Thạch Thất, Hà Nội',
    status: 'pending_review',
    listingTier: 'standard',
  },
  {
    slug: 'tin-mau-cho-thue-nha-3-tang-thach-hoa',
    title: '[TIN MẪU] Cho thuê nhà 3 tầng tại Thạch Hòa',
    summary: 'Tin chờ duyệt phục vụ kiểm thử quản trị và đồng bộ nội dung BĐS.',
    description: 'Nhà mô phỏng 3 tầng với đầy đủ dữ liệu cấu trúc.',
    highlights: ['Diện tích đất 90 m².', '4 phòng ngủ.', '3 phòng tắm.', 'Đường ô tô.'],
    locationNote: 'Khu vực Thạch Hòa, Thạch Thất.',
    suitableFor: 'Kiểm thử luồng duyệt tin cho thuê.',
    transactionType: 'rent',
    propertyType: 'whole_house',
    ownerType: 'owner',
    price: 12000000,
    priceUnit: 'per_month',
    isNegotiable: true,
    landArea: 90,
    usableArea: 220,
    bedrooms: 4,
    bathrooms: 3,
    frontage: 5,
    roadWidth: 6,
    direction: 'south',
    area: 'thach-hoa',
    category: 'cho-thue',
    media: 'property-photo-house-exterior-2',
    gallery: ['property-photo-house-exterior-2', 'property-photo-interior-1'],
    legalStatus: 'contract',
    features: ['o-to-vao-tan-noi', 'dien-nuoc-day-du', 'phu-hop-o-lau-dai'],
    author: 'admin',
    address: 'Khu vực Thạch Hòa, Thạch Thất, Hà Nội',
    status: 'pending_review',
    listingTier: 'standard',
  },
  {
    slug: 'tin-mau-ban-biet-thu-nghi-duong-tien-xuan',
    title: '[TIN MẪU] Bán biệt thự nghỉ dưỡng 350 m² tại Tiến Xuân',
    summary: 'Tin chờ duyệt phục vụ kiểm thử giao diện quản trị BĐS.',
    description: 'Biệt thự mô phỏng có khuôn viên xanh và thông tin đầy đủ.',
    highlights: ['Khuôn viên 350 m².', '5 phòng ngủ.', '5 phòng tắm.', 'Đường ô tô.'],
    locationNote: 'Khu vực Tiến Xuân, Thạch Thất.',
    suitableFor: 'Kiểm thử luồng duyệt tin biệt thự/nghỉ dưỡng.',
    transactionType: 'sale',
    propertyType: 'villa',
    ownerType: 'owner',
    price: 8900000000,
    priceUnit: 'total',
    isNegotiable: true,
    landArea: 350,
    usableArea: 280,
    bedrooms: 5,
    bathrooms: 5,
    frontage: 15,
    roadWidth: 8,
    direction: 'northwest',
    area: 'tien-xuan',
    category: 'mua-ban-nha-dat',
    media: 'property-photo-house-exterior-1',
    gallery: ['property-photo-house-exterior-1', 'property-photo-interior-2'],
    legalStatus: 'red_book',
    features: ['phu-hop-lam-homestay', 'o-to-vao-tan-noi', 'co-so-do'],
    author: 'admin',
    address: 'Khu vực Tiến Xuân, Thạch Thất, Hà Nội',
    status: 'pending_review',
    listingTier: 'standard',
  },
];

export async function seedProperties({ users, categories, areas, tags, media, propertyFeatures }) {
  const result = {};

  for (let index = 0; index < definitions.length; index += 1) {
    const item = definitions[index];
    const status = item.status || 'published';
    const author = users[item.author];
    const area = areas[item.area];
    const rootArea = areas['hoa-lac'];
    const category = categories[`property:${item.category}`];
    const thumbnail = media[item.media] || media['property-house'];

    if (!author || !area || !rootArea || !category || !thumbnail) {
      throw new Error(`Property seed dependency missing for ${item.slug}`);
    }

    const areaIds = String(area._id) === String(rootArea._id)
      ? [rootArea._id]
      : [area._id, rootArea._id];

    const content = await upsertContent({
      slug: item.slug,
      contentType: 'property',
      authorId: author._id,
      title: item.title,
      summary: item.summary,
      bodyHtml: makePropertyBody(item),
      thumbnailMediaId: thumbnail._id,
      primaryCategoryId: category._id,
      primaryAreaId: area._id,
      categoryIds: [category._id],
      areaIds,
      tagIds: [tags['gia-dat']._id, tags['hoa-lac']._id],
      status,
      publishedAt: status === 'published' ? daysFromNow(-(index + 1)) : null,
      viewCount: status === 'published' ? 340 + index * 73 : 0,
    });

    const featureIds = item.features
      .map((slug) => propertyFeatures[slug]?._id)
      .filter(Boolean);

    const galleryMediaIds = (item.gallery || [])
      .map((key) => media[key]?._id)
      .filter(Boolean);

    const listingTier = item.listingTier || 'standard';
    const listingDurationDays = item.listingDurationDays || 60;
    const listingStartAt = daysFromNow(-(index % 7));
    const expiresAt = new Date(
      listingStartAt.getTime() + listingDurationDays * DAY_MS,
    );

    const listing = await PropertyListing.findOneAndUpdate(
      { contentId: content._id },
      {
        $set: {
          transactionType: item.transactionType,
          propertyType: item.propertyType,
          ownerType: item.ownerType,
          price: item.price,
          priceUnit: item.priceUnit || 'total',
          isNegotiable: item.isNegotiable ?? false,
          landArea: item.landArea,
          usableArea: item.usableArea ?? null,
          bedrooms: item.bedrooms ?? null,
          bathrooms: item.bathrooms ?? null,
          frontage: item.frontage ?? null,
          roadWidth: item.roadWidth ?? null,
          direction: item.direction || 'unknown',
          legalStatus: item.legalStatus,
          addressText: item.address,
          contactName: author.displayName,
          contactPhone: author.phone || '0966709790',
          contactEmail: author.email,
          featureIds,
          galleryMediaIds,
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

    if (status === 'published') {
      // Dùng mốc seed cố định cho price history để chạy lặp không sinh bản ghi lịch sử mới.
      await PropertyPriceHistory.findOneAndUpdate(
        {
          contentId: content._id,
          changedAt: daysFromSeed(-index - 2),
        },
        {
          $set: {
            oldPrice: Math.round(item.price * 1.04),
            newPrice: item.price,
            changedBy: author._id,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    result[item.slug] = { content, listing };
  }

  const expiredContent = await upsertContent({
    slug: 'tin-bat-dong-san-da-het-han',
    contentType: 'property',
    authorId: users.broker._id,
    title: 'Tin bất động sản đã hết hạn',
    summary: 'Dữ liệu mẫu để kiểm thử trạng thái hết hạn.',
    bodyHtml: '<h2>Tin bất động sản đã hết hạn</h2><p>Dữ liệu kiểm thử trạng thái expired.</p>',
    primaryCategoryId: categories['property:mua-ban-nha-dat']._id,
    primaryAreaId: areas['hoa-lac']._id,
    thumbnailMediaId: media['property-photo-land-1']._id,
    status: 'expired',
  });

  await PropertyListing.findOneAndUpdate(
    { contentId: expiredContent._id },
    {
      $set: {
        transactionType: 'sale',
        propertyType: 'land_plot',
        ownerType: 'broker',
        price: 2000000000,
        priceUnit: 'total',
        isNegotiable: true,
        landArea: 90,
        legalStatus: 'red_book',
        addressText: 'Khu vực Hòa Lạc, Hà Nội',
        contactName: users.broker.displayName,
        contactPhone: users.broker.phone,
        contactEmail: users.broker.email,
        featureIds: [],
        galleryMediaIds: [media['property-photo-land-1']._id],
        listingTier: 'standard',
        listingPriority: 0,
        listingDurationDays: 15,
        listingStartAt: daysFromNow(-20),
        expiresAt: daysFromNow(-5),
        soldAt: null,
        rentedAt: null,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );

  result[expiredContent.slug] = { content: expiredContent };

  return result;
}

export { definitions as propertySeedDefinitions };
