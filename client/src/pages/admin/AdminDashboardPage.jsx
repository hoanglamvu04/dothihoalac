import { useEffect, useState } from 'react';
import { BarChart3, Flag, MessageSquareWarning, Users } from 'lucide-react';
import Seo from '../../components/common/Seo';
import { LoadingBlock } from '../../components/common/Loading';
import ErrorState from '../../components/common/ErrorState';
import { adminApi } from '../../api/admin.api';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null); const [error, setError] = useState(null);
  useEffect(() => { adminApi.dashboard().then(setData).catch(setError); }, []);
  if (!data && !error) return <LoadingBlock />;
  if (error) return <ErrorState error={error} />;
  const cards = [
    ['Người dùng', data.userCount, Users],
    ['Nội dung chờ duyệt', data.pendingContent, MessageSquareWarning],
    ['Báo cáo chờ xử lý', data.pendingReports, Flag],
    ['Lead mới', data.newLeads, BarChart3],
  ];
  return <div><Seo title="Dashboard quản trị" /><h2>Tổng quan vận hành</h2><div className="admin-stat-grid">{cards.map(([label,value,Icon]) => <article key={label}><Icon size={26} /><span>{label}</span><strong>{value || 0}</strong></article>)}</div><div className="admin-overview-grid"><section><h3>Ưu tiên hôm nay</h3><ol><li>Xử lý nội dung đang chờ duyệt lâu nhất.</li><li>Kiểm tra báo cáo có dấu hiệu lừa đảo hoặc vi phạm riêng tư.</li><li>Liên hệ lead kiến trúc, xây dựng và booking mới.</li><li>Rà soát tin bất động sản hết hạn.</li></ol></section><section><h3>Chỉ số cộng đồng</h3><p>Tổng bình luận đang hiển thị: <strong>{data.comments || 0}</strong></p><p>Để có báo cáo chuyên sâu, có thể bổ sung API thống kê theo ngày, chuyên mục, khu vực và nguồn chuyển đổi.</p></section></div></div>;
}
