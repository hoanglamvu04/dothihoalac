import Seo from '../../components/common/Seo';
import EmptyState from '../../components/common/EmptyState';

export default function NotFoundPage() {
  return <section className="page-section"><Seo title="Không tìm thấy trang" /><div className="container"><EmptyState title="Trang không tồn tại" description="Đường dẫn có thể đã thay đổi hoặc nội dung đã được gỡ." actionLabel="Về trang chủ" actionTo="/" /></div></section>;
}
