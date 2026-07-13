import { Link } from 'react-router-dom';
import { BriefcaseBusiness, Building2, FilePenLine, Home, Newspaper, Send } from 'lucide-react';
import Seo from '../../components/common/Seo';
import PageHeader from '../../components/common/PageHeader';

const options = [
  { to: '/dang-bai/cong-dong', icon: FilePenLine, title: 'Bài viết cộng đồng', text: 'Thảo luận, hỏi đáp, phản ánh, chia sẻ hoặc review.' },
  { to: '/dang-bai/nha-dat', icon: Building2, title: 'Tin bất động sản', text: 'Bán, cho thuê, sang nhượng, cần mua hoặc cần thuê.' },
  { to: '/dang-bai/viec-lam', icon: BriefcaseBusiness, title: 'Tin việc làm', text: 'Tuyển dụng, thực tập, thời vụ hoặc việc làm sinh viên.' },
  { to: '/gui-tin', icon: Newspaper, title: 'Gửi tin cho Ban biên tập', text: 'Cung cấp sự kiện, hình ảnh hoặc nguồn tin địa phương.' },
  { to: '/tu-van?type=architecture_design', icon: Home, title: 'Yêu cầu tư vấn kiến trúc', text: 'Thiết kế, thi công, cải tạo hoặc ước tính chi phí.' },
  { to: '/tu-van?type=homestay_search', icon: Send, title: 'Tìm homestay hoặc villa', text: 'Chuyển nhu cầu phù hợp tới Mely Space.' },
];

export default function CreateHubPage() {
  return <section className="page-section page-section--muted"><Seo title="Đăng nội dung" /><div className="container"><PageHeader eyebrow="Đóng góp nội dung" title="Bạn muốn đăng gì?" description="Chọn đúng loại nội dung để hệ thống áp dụng biểu mẫu và quy trình kiểm duyệt phù hợp." /><div className="create-option-grid">{options.map(({ to, icon: Icon, title, text }) => <Link key={to} to={to}><Icon size={30} /><h2>{title}</h2><p>{text}</p><span>Tiếp tục →</span></Link>)}</div></div></section>;
}
