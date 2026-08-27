import JobPost from '../modules/jobs/jobPost.model.js';
import { upsertContent } from './seedHelpers.js';

// Dữ liệu mô phỏng thực tế cho môi trường dev/staging.
// Tên doanh nghiệp trong seed không đại diện cho tin tuyển dụng đang hoạt động ngoài đời.
const definitions = [
  {
    slug: 'backend-developer-nodejs-hoa-lac',
    title: 'Backend Developer Node.js - Hòa Lạc',
    summary:
      'Tuyển Backend Developer Node.js phát triển API, tích hợp dữ liệu và các dịch vụ nội bộ cho sản phẩm web vận hành tại Hòa Lạc.',
    jobType: 'full_time',
    categorySlug: 'viec-lam-cong-nghe-cao',
    areaSlug: 'hoa-lac',
    companyName: 'Công ty CP Công nghệ HLS',
    salaryMin: 22000000,
    salaryMax: 35000000,
    salaryUnit: 'month',
    experienceLevel: '1_3_years',
    positionsCount: 2,
    deadlineDays: 35,
    mediaKey: 'job-tech',
    workLocation: 'Khu vực Hòa Lạc, Hà Nội',
    schedule: 'Thứ Hai - Thứ Sáu, 08:30 - 17:30; làm việc trực tiếp tại văn phòng.',
    responsibilities: [
      'Phát triển và bảo trì REST API bằng Node.js, Express và MongoDB.',
      'Thiết kế luồng dữ liệu, tối ưu truy vấn và xử lý lỗi cho các dịch vụ backend.',
      'Phối hợp với frontend, QA và product để triển khai tính năng theo sprint.',
      'Viết tài liệu kỹ thuật, review code và tham gia xử lý sự cố khi cần.',
    ],
    requirements: [
      'Có từ 1 năm kinh nghiệm backend JavaScript/Node.js.',
      'Nắm chắc REST API, Git, MongoDB hoặc hệ quản trị dữ liệu tương đương.',
      'Biết Docker, CI/CD hoặc cloud là lợi thế.',
      'Có tư duy debug tốt và chủ động trao đổi trong nhóm.',
    ],
    benefits: [
      'Lương 22 - 35 triệu đồng/tháng theo năng lực.',
      'Thưởng hiệu quả dự án, xét tăng lương định kỳ.',
      'Đóng BHXH theo quy định và có ngày phép năm.',
      'Trang thiết bị làm việc và ngân sách học tập chuyên môn.',
    ],
  },
  {
    slug: 'thuc-tap-sinh-data-ai-hoa-lac',
    title: 'Thực tập sinh Data/AI - Hòa Lạc',
    summary:
      'Chương trình thực tập Data/AI dành cho sinh viên năm cuối hoặc mới tốt nghiệp, làm việc với dữ liệu thực tế và pipeline phân tích.',
    jobType: 'internship',
    categorySlug: 'viec-lam-cong-nghe-cao',
    areaSlug: 'hoa-lac',
    companyName: 'Trung tâm Giải pháp Dữ liệu HLS',
    salaryMin: 5000000,
    salaryMax: 8000000,
    salaryUnit: 'month',
    experienceLevel: 'none',
    positionsCount: 4,
    deadlineDays: 28,
    mediaKey: 'job-tech',
    workLocation: 'Khu vực Hòa Lạc, Hà Nội',
    schedule: 'Tối thiểu 4 ngày/tuần; có thể linh hoạt theo lịch học.',
    responsibilities: [
      'Làm sạch, chuẩn hóa và kiểm tra chất lượng dữ liệu.',
      'Hỗ trợ xây dựng dashboard, báo cáo và các notebook phân tích.',
      'Thử nghiệm mô hình machine learning cơ bản theo hướng dẫn của mentor.',
      'Ghi chép kết quả, trình bày insight và cập nhật tài liệu dự án.',
    ],
    requirements: [
      'Sinh viên năm cuối hoặc mới tốt nghiệp ngành CNTT, Toán, Data Science hoặc ngành liên quan.',
      'Biết Python, SQL và thao tác dữ liệu bằng pandas.',
      'Có kiến thức thống kê hoặc machine learning cơ bản.',
      'Đọc hiểu tài liệu tiếng Anh và có khả năng tự học.',
    ],
    benefits: [
      'Hỗ trợ 5 - 8 triệu đồng/tháng tùy số ngày làm việc.',
      'Có mentor hướng dẫn theo lộ trình và review công việc hằng tuần.',
      'Được tham gia dự án thực tế, có xác nhận thực tập.',
      'Có cơ hội chuyển chính thức nếu đáp ứng yêu cầu sau kỳ thực tập.',
    ],
  },
  {
    slug: 'ky-su-dien-cong-nghiep-ha-bang',
    title: 'Kỹ sư điện công nghiệp - Hạ Bằng',
    summary:
      'Tuyển kỹ sư điện phụ trách hệ thống điện động lực, tủ điện và bảo trì thiết bị cho công trình, xưởng sản xuất tại khu vực Hạ Bằng.',
    jobType: 'construction',
    categorySlug: 'viec-lam-xay-dung',
    areaSlug: 'ha-bang',
    companyName: 'Công ty TNHH Cơ điện Hạ Bằng',
    salaryMin: 15000000,
    salaryMax: 22000000,
    salaryUnit: 'month',
    experienceLevel: '1_3_years',
    positionsCount: 2,
    deadlineDays: 32,
    mediaKey: 'article-construction',
    workLocation: 'Hạ Bằng, khu vực Thạch Thất, Hà Nội',
    schedule: 'Thứ Hai - Thứ Bảy; 08:00 - 17:00, nghỉ luân phiên theo tiến độ dự án.',
    responsibilities: [
      'Giám sát lắp đặt hệ thống điện động lực, chiếu sáng và tủ phân phối.',
      'Đọc bản vẽ, bóc tách khối lượng và phối hợp nghiệm thu hiện trường.',
      'Lập kế hoạch bảo trì, kiểm tra an toàn điện và xử lý sự cố.',
      'Theo dõi vật tư, hồ sơ kỹ thuật và báo cáo tiến độ cho quản lý dự án.',
    ],
    requirements: [
      'Tốt nghiệp cao đẳng/đại học chuyên ngành Điện, Điện công nghiệp hoặc Tự động hóa.',
      'Có 1 - 3 năm kinh nghiệm thi công hoặc bảo trì điện.',
      'Đọc được bản vẽ kỹ thuật và sử dụng AutoCAD ở mức cơ bản.',
      'Sẵn sàng di chuyển ngắn trong khu vực Hòa Lạc - Thạch Thất.',
    ],
    benefits: [
      'Lương 15 - 22 triệu đồng/tháng.',
      'Có phụ cấp công trình, ăn trưa và điện thoại.',
      'Được cấp bảo hộ lao động, công cụ và đào tạo an toàn.',
      'Thưởng theo tiến độ và chất lượng công trình.',
    ],
  },
  {
    slug: 'nhan-vien-dieu-phoi-kho-van-ha-bang',
    title: 'Nhân viên điều phối kho vận - Hạ Bằng',
    summary:
      'Tuyển nhân viên điều phối kho vận theo dõi nhập xuất hàng, lịch xe và chứng từ giao nhận tại khu vực Hạ Bằng.',
    jobType: 'service',
    categorySlug: 'viec-lam-dich-vu',
    areaSlug: 'ha-bang',
    companyName: 'Công ty CP Kho vận Tây Hà Nội',
    salaryMin: 10000000,
    salaryMax: 14000000,
    salaryUnit: 'month',
    experienceLevel: 'under_1_year',
    positionsCount: 3,
    deadlineDays: 30,
    mediaKey: 'job-service',
    workLocation: 'Hạ Bằng, khu vực Thạch Thất, Hà Nội',
    schedule: 'Làm việc theo ca 8 giờ; xoay ca sáng/chiều theo kế hoạch kho.',
    responsibilities: [
      'Tiếp nhận kế hoạch nhập xuất và sắp xếp lịch xe giao nhận.',
      'Kiểm tra chứng từ, số lượng hàng và cập nhật trạng thái trên hệ thống.',
      'Phối hợp với thủ kho, tài xế và bộ phận kinh doanh để xử lý phát sinh.',
      'Lập báo cáo tồn, giao hàng chậm và các sai lệch trong ngày.',
    ],
    requirements: [
      'Tốt nghiệp trung cấp/cao đẳng trở lên; chấp nhận ứng viên mới có kinh nghiệm dưới 1 năm.',
      'Sử dụng được Excel và các phần mềm văn phòng cơ bản.',
      'Cẩn thận, giao tiếp rõ ràng và chịu được nhịp công việc theo ca.',
      'Có kinh nghiệm kho, vận tải hoặc logistics là lợi thế.',
    ],
    benefits: [
      'Lương 10 - 14 triệu đồng/tháng.',
      'Phụ cấp ca, ăn giữa ca và hỗ trợ gửi xe.',
      'Được hướng dẫn quy trình kho và phần mềm quản lý.',
      'BHXH, nghỉ phép và thưởng hiệu suất theo quy định công ty.',
    ],
  },
  {
    slug: 'ky-thuat-vien-cnc-tay-phuong',
    title: 'Kỹ thuật viên vận hành máy CNC - Tây Phương',
    summary:
      'Tuyển kỹ thuật viên vận hành máy CNC, kiểm soát kích thước chi tiết và bảo dưỡng thiết bị tại khu vực Tây Phương.',
    jobType: 'full_time',
    categorySlug: 'viec-lam-cong-nghe-cao',
    areaSlug: 'tay-phuong',
    companyName: 'Công ty TNHH Cơ khí Chính xác Tây Phương',
    salaryMin: 12000000,
    salaryMax: 18000000,
    salaryUnit: 'month',
    experienceLevel: 'under_1_year',
    positionsCount: 3,
    deadlineDays: 38,
    mediaKey: 'job-tech',
    workLocation: 'Tây Phương, khu vực Thạch Thất, Hà Nội',
    schedule: 'Làm 2 ca luân phiên, 8 giờ/ca; nghỉ 1 ngày/tuần theo lịch sản xuất.',
    responsibilities: [
      'Cài đặt thông số và vận hành máy tiện/phay CNC theo phiếu công nghệ.',
      'Đo kiểm kích thước bằng thước cặp, panme và dụng cụ đo chuyên dụng.',
      'Theo dõi dao cụ, vật tư và ghi nhận lỗi trong quá trình gia công.',
      'Thực hiện vệ sinh, bảo dưỡng cấp 1 và bàn giao máy giữa các ca.',
    ],
    requirements: [
      'Tốt nghiệp nghề/cao đẳng Cơ khí, Cắt gọt kim loại hoặc ngành liên quan.',
      'Đọc được bản vẽ cơ khí cơ bản; ứng viên mới ra trường được đào tạo.',
      'Có ý thức an toàn, kỷ luật và khả năng làm việc theo ca.',
      'Biết chỉnh offset hoặc đọc G-code là lợi thế.',
    ],
    benefits: [
      'Lương 12 - 18 triệu đồng/tháng tùy tay nghề.',
      'Phụ cấp ca, chuyên cần và hỗ trợ bữa ăn.',
      'Được đào tạo vận hành máy và kiểm soát chất lượng.',
      'Có lộ trình lên kỹ thuật viên chính hoặc tổ trưởng sản xuất.',
    ],
  },
  {
    slug: 'nhan-vien-kinh-doanh-vat-lieu-xay-dung-tay-phuong',
    title: 'Nhân viên kinh doanh vật liệu xây dựng - Tây Phương',
    summary:
      'Tuyển nhân viên kinh doanh chăm sóc khách hàng công trình, báo giá và phát triển đại lý vật liệu xây dựng tại Tây Phương và khu vực lân cận.',
    jobType: 'full_time',
    categorySlug: 'viec-lam-xay-dung',
    areaSlug: 'tay-phuong',
    companyName: 'Công ty CP Vật liệu Xây dựng An Phương',
    salaryMin: 10000000,
    salaryMax: 18000000,
    salaryUnit: 'month',
    experienceLevel: 'under_1_year',
    positionsCount: 2,
    deadlineDays: 33,
    mediaKey: 'article-construction',
    workLocation: 'Tây Phương, khu vực Thạch Thất, Hà Nội',
    schedule: 'Thứ Hai - Thứ Bảy, 08:00 - 17:30; có đi thị trường trong khu vực.',
    responsibilities: [
      'Tư vấn sản phẩm, lập báo giá và theo dõi đơn hàng cho khách công trình.',
      'Chăm sóc khách hàng cũ và phát triển đại lý, đội thợ, nhà thầu mới.',
      'Theo dõi công nợ, lịch giao hàng và phối hợp xử lý phản hồi sau bán.',
      'Cập nhật thông tin thị trường, đối thủ và nhu cầu xây dựng tại địa bàn.',
    ],
    requirements: [
      'Có kỹ năng giao tiếp và chủ động đi thị trường.',
      'Chấp nhận ứng viên dưới 1 năm kinh nghiệm; được đào tạo sản phẩm.',
      'Biết sử dụng điện thoại, email và bảng tính để quản lý khách hàng.',
      'Có phương tiện cá nhân và hiểu khu vực Thạch Thất là lợi thế.',
    ],
    benefits: [
      'Thu nhập cơ bản 10 - 18 triệu đồng/tháng, chưa gồm thưởng doanh số.',
      'Phụ cấp xăng xe, điện thoại và hỗ trợ tiếp khách.',
      'Có data khách hàng ban đầu và đào tạo kỹ năng bán hàng B2B.',
      'Thưởng theo doanh số và chính sách công nợ an toàn.',
    ],
  },
  {
    slug: 'ky-su-qs-du-toan-thach-that',
    title: 'Kỹ sư QS/Dự toán xây dựng - Thạch Thất',
    summary:
      'Tuyển kỹ sư QS lập dự toán, bóc tách khối lượng, quản lý hồ sơ thanh quyết toán cho các dự án dân dụng và hạ tầng tại Thạch Thất.',
    jobType: 'construction',
    categorySlug: 'viec-lam-xay-dung',
    areaSlug: 'thach-that',
    companyName: 'Công ty CP Xây dựng và Hạ tầng Thạch Thất',
    salaryMin: 16000000,
    salaryMax: 25000000,
    salaryUnit: 'month',
    experienceLevel: '1_3_years',
    positionsCount: 2,
    deadlineDays: 40,
    mediaKey: 'article-construction',
    workLocation: 'Khu vực Thạch Thất, Hà Nội',
    schedule: 'Thứ Hai - Thứ Sáu và sáng Thứ Bảy; có đi công trường theo giai đoạn.',
    responsibilities: [
      'Bóc tách khối lượng, lập dự toán và kiểm tra hồ sơ mời thầu/hợp đồng.',
      'Theo dõi phát sinh, khối lượng nghiệm thu và hồ sơ thanh toán với các bên.',
      'Kiểm soát chi phí vật tư, nhân công và thầu phụ theo ngân sách dự án.',
      'Phối hợp ban chỉ huy công trường cập nhật tiến độ và hồ sơ hoàn công.',
    ],
    requirements: [
      'Tốt nghiệp Xây dựng, Kinh tế xây dựng hoặc chuyên ngành liên quan.',
      'Có 1 - 3 năm kinh nghiệm QS/dự toán công trình dân dụng hoặc hạ tầng.',
      'Sử dụng tốt Excel và phần mềm dự toán; đọc bản vẽ thành thạo.',
      'Cẩn thận với số liệu, hợp đồng và hồ sơ thanh quyết toán.',
    ],
    benefits: [
      'Lương 16 - 25 triệu đồng/tháng.',
      'Thưởng dự án và hỗ trợ chi phí đi công trường.',
      'Được tham gia dự án từ giai đoạn dự toán đến quyết toán.',
      'Đóng bảo hiểm và xét tăng lương theo năng lực.',
    ],
  },
  {
    slug: 'ke-toan-noi-bo-thach-that',
    title: 'Kế toán nội bộ - Thạch Thất',
    summary:
      'Tuyển kế toán nội bộ theo dõi thu chi, công nợ, hóa đơn và báo cáo quản trị cho doanh nghiệp dịch vụ tại khu vực Thạch Thất.',
    jobType: 'full_time',
    categorySlug: 'viec-lam-dich-vu',
    areaSlug: 'thach-that',
    companyName: 'Công ty TNHH Dịch vụ Doanh nghiệp TT',
    salaryMin: 11000000,
    salaryMax: 16000000,
    salaryUnit: 'month',
    experienceLevel: '1_3_years',
    positionsCount: 1,
    deadlineDays: 26,
    mediaKey: 'job-service',
    workLocation: 'Khu vực Thạch Thất, Hà Nội',
    schedule: 'Thứ Hai - Thứ Sáu, 08:00 - 17:00; sáng Thứ Bảy làm luân phiên.',
    responsibilities: [
      'Hạch toán thu chi, ngân hàng, tạm ứng và đối chiếu công nợ.',
      'Kiểm tra chứng từ, hóa đơn đầu vào và lưu trữ hồ sơ kế toán.',
      'Theo dõi bảng lương, chi phí vận hành và lập báo cáo quản trị định kỳ.',
      'Phối hợp với đơn vị dịch vụ thuế khi kê khai và quyết toán.',
    ],
    requirements: [
      'Tốt nghiệp cao đẳng/đại học chuyên ngành Kế toán, Tài chính.',
      'Có 1 - 3 năm kinh nghiệm kế toán nội bộ hoặc kế toán tổng hợp.',
      'Sử dụng tốt Excel; biết MISA hoặc phần mềm tương đương là lợi thế.',
      'Trung thực, cẩn thận và có khả năng bảo mật số liệu.',
    ],
    benefits: [
      'Lương 11 - 16 triệu đồng/tháng.',
      'Hỗ trợ ăn trưa và gửi xe.',
      'Thưởng lễ, Tết và hiệu quả công việc.',
      'Môi trường ổn định, quy trình chứng từ rõ ràng.',
    ],
  },
  {
    slug: 'giao-vien-stem-ban-thoi-gian-yen-xuan',
    title: 'Giáo viên STEM bán thời gian - Yên Xuân',
    summary:
      'Tuyển giáo viên STEM bán thời gian phụ trách lớp Robotics, khoa học ứng dụng và lập trình cơ bản cho học sinh tại Yên Xuân.',
    jobType: 'part_time',
    categorySlug: 'viec-lam-giao-duc',
    areaSlug: 'yen-xuan',
    companyName: 'Trung tâm Giáo dục STEM Yên Xuân',
    salaryMin: 180000,
    salaryMax: 280000,
    salaryUnit: 'hour',
    experienceLevel: '1_3_years',
    positionsCount: 3,
    deadlineDays: 42,
    mediaKey: 'job-service',
    workLocation: 'Yên Xuân, khu vực Thạch Thất, Hà Nội',
    schedule: 'Ca tối ngày thường và cuối tuần; đăng ký lịch dạy theo tháng.',
    responsibilities: [
      'Giảng dạy Robotics, Scratch/Python cơ bản hoặc khoa học ứng dụng theo giáo án.',
      'Chuẩn bị dụng cụ, kiểm tra thiết bị và hỗ trợ học sinh thực hành theo nhóm.',
      'Theo dõi tiến độ học tập, nhận xét sau buổi học và trao đổi với phụ huynh khi cần.',
      'Tham gia xây dựng hoạt động trải nghiệm và ngày hội STEM.',
    ],
    requirements: [
      'Tốt nghiệp hoặc đang học năm cuối ngành Sư phạm, CNTT, Điện tử, Cơ điện tử hoặc ngành phù hợp.',
      'Có kỹ năng đứng lớp và giao tiếp tốt với học sinh.',
      'Ưu tiên ứng viên từng dạy STEM, Robotics hoặc lập trình thiếu nhi.',
      'Có thể làm tối thiểu 3 ca/tuần.',
    ],
    benefits: [
      'Thu nhập 180.000 - 280.000 đồng/giờ tùy lớp và kinh nghiệm.',
      'Được cung cấp giáo án, học cụ và đào tạo phương pháp giảng dạy.',
      'Lịch làm việc linh hoạt, phù hợp giáo viên và sinh viên năm cuối.',
      'Thưởng theo chất lượng lớp và chương trình ngoại khóa.',
    ],
  },
  {
    slug: 'nhan-vien-van-hanh-homestay-yen-xuan',
    title: 'Nhân viên vận hành homestay - Yên Xuân',
    summary:
      'Tuyển nhân viên vận hành homestay phụ trách đón khách, chuẩn bị phòng, phối hợp dịch vụ và xử lý yêu cầu trong ca tại Yên Xuân.',
    jobType: 'service',
    categorySlug: 'viec-lam-dich-vu',
    areaSlug: 'yen-xuan',
    companyName: 'Yên Xuân Retreat',
    salaryMin: 9000000,
    salaryMax: 13000000,
    salaryUnit: 'month',
    experienceLevel: 'none',
    positionsCount: 3,
    deadlineDays: 31,
    mediaKey: 'job-service',
    workLocation: 'Yên Xuân, khu vực Thạch Thất, Hà Nội',
    schedule: 'Làm theo ca 8 giờ; có ca cuối tuần và ngày lễ theo lịch vận hành.',
    responsibilities: [
      'Chuẩn bị phòng, khu vực chung và kiểm tra checklist trước giờ khách nhận phòng.',
      'Đón khách, hướng dẫn sử dụng tiện ích và tiếp nhận yêu cầu trong thời gian lưu trú.',
      'Phối hợp vệ sinh, bếp, bảo trì và nhà cung cấp dịch vụ khi có phát sinh.',
      'Cập nhật tình trạng phòng, bàn giao ca và ghi nhận phản hồi của khách.',
    ],
    requirements: [
      'Tốt nghiệp THPT trở lên; không yêu cầu kinh nghiệm nếu giao tiếp tốt.',
      'Tác phong gọn gàng, lịch sự và có tinh thần dịch vụ.',
      'Sử dụng điện thoại, ứng dụng nhắn tin và bảng tính cơ bản.',
      'Có thể làm cuối tuần, lễ và xoay ca.',
    ],
    benefits: [
      'Lương 9 - 13 triệu đồng/tháng.',
      'Có phụ cấp ca, bữa ăn và thưởng theo đánh giá khách hàng.',
      'Được đào tạo quy trình vận hành lưu trú và xử lý tình huống.',
      'Có cơ hội lên ca trưởng sau thời gian đánh giá.',
    ],
  },
];

function daysFromNow(days, hours = 0) {
  return new Date(Date.now() + (days * 24 + hours) * 60 * 60 * 1000);
}

function listHtml(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function makeJobBody(definition) {
  return [
    `<h2>${definition.title}</h2>`,
    `<p><strong>${definition.companyName}</strong> đang tuyển nhân sự làm việc tại ${definition.workLocation}.</p>`,
    '<h3>Mô tả công việc</h3>',
    listHtml(definition.responsibilities),
    '<h3>Yêu cầu ứng viên</h3>',
    listHtml(definition.requirements),
    '<h3>Quyền lợi</h3>',
    listHtml(definition.benefits),
    '<h3>Thời gian làm việc</h3>',
    `<p>${definition.schedule}</p>`,
    '<h3>Lưu ý khi ứng tuyển</h3>',
    '<p>Ứng viên không phải nộp bất kỳ khoản phí tuyển dụng nào. Chỉ gửi hồ sơ qua thông tin liên hệ được hiển thị trong tin.</p>',
  ].join('');
}

export async function seedJobs({ users, categories, areas, tags, media }) {
  const result = {};
  const rootArea = areas['hoa-lac'];
  const jobTag = tags['viec-lam'];

  if (!users?.employer || !rootArea || !jobTag) {
    throw new Error('Thiếu dữ liệu phụ thuộc để seed việc làm. Hãy seed users, areas và tags trước.');
  }

  for (let index = 0; index < definitions.length; index += 1) {
    const definition = definitions[index];
    const category = categories[`job:${definition.categorySlug}`];
    const area = areas[definition.areaSlug];
    const thumbnail = media[definition.mediaKey] || media['job-service'];

    if (!category) {
      throw new Error(`Không tìm thấy danh mục việc làm: ${definition.categorySlug}`);
    }

    if (!area) {
      throw new Error(`Không tìm thấy khu vực việc làm: ${definition.areaSlug}`);
    }

    const areaIds =
      definition.areaSlug === 'hoa-lac'
        ? [area._id]
        : [area._id, rootArea._id];

    const content = await upsertContent({
      slug: definition.slug,
      contentType: 'job',
      authorId: users.employer._id,
      title: definition.title,
      summary: definition.summary,
      bodyHtml: makeJobBody(definition),
      thumbnailMediaId: thumbnail?._id || null,
      primaryCategoryId: category._id,
      primaryAreaId: area._id,
      categoryIds: [category._id],
      areaIds,
      tagIds: [jobTag._id],
      status: 'published',
      publishedAt: daysFromNow(-(index + 1)),
      viewCount: 220 + index * 47,
    });

    const applicationMethod = [
      `Gửi CV về ${users.employer.email}.`,
      `Tiêu đề email: [${definition.areaSlug.toUpperCase()}] ${definition.title} - Họ tên.`,
      users.employer.phone ? `Có thể liên hệ ${users.employer.phone} trong giờ hành chính.` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const job = await JobPost.findOneAndUpdate(
      { contentId: content._id },
      {
        $set: {
          jobType: definition.jobType,
          companyName: definition.companyName,
          salaryMin: definition.salaryMin,
          salaryMax: definition.salaryMax,
          salaryUnit: definition.salaryUnit,
          experienceLevel: definition.experienceLevel,
          workLocation: definition.workLocation,
          applicationMethod,
          contactEmail: users.employer.email,
          contactPhone: users.employer.phone || '',
          deadline: daysFromNow(definition.deadlineDays),
          positionsCount: definition.positionsCount,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    result[definition.slug] = { content, job };
  }

  return result;
}

export { definitions as jobSeedDefinitions };
