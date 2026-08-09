import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, FileText, Flag, MessageSquareWarning, Users } from 'lucide-react';

import Seo from '../../components/common/Seo';
import { LoadingBlock } from '../../components/common/Loading';
import ErrorState from '../../components/common/ErrorState';
import { adminApi } from '../../api/admin.api';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.dashboard().then(setData).catch(setError);
  }, []);

  if (!data && !error) return <LoadingBlock />;
  if (error) return <ErrorState error={error} />;

  const cards = [
    ['Người dùng', data.userCount, Users, '/quan-tri/nguoi-dung', 'Tài khoản đang hoạt động trong hệ thống'],
    ['Chờ duyệt', data.pendingContent, MessageSquareWarning, '/quan-tri/kiem-duyet', 'Nội dung cần xử lý theo thứ tự gửi'],
    ['Báo cáo', data.pendingReports, Flag, '/quan-tri/bao-cao', 'Báo cáo vi phạm chưa hoàn tất'],
    ['Lead mới', data.newLeads, BarChart3, '/quan-tri/khach-hang', 'Nhu cầu tư vấn cần phản hồi sớm'],
  ];

  return (
    <div>
      <Seo title="Dashboard quản trị" />
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">DTHL Operations</p>
          <h1>Tổng quan vận hành</h1>
          <p>Không gian quản trị tập trung cho nội dung, cộng đồng và nguồn khách hàng Hòa Lạc.</p>
        </div>
        <Link className="admin-primary" to="/quan-tri/bai-viet/moi"><FileText size={15} /> Viết bài mới</Link>
      </header>

      <div className="admin-stat-grid">
        {cards.map(([label, value, Icon, to, note]) => (
          <Link className="admin-stat-card" key={label} to={to}>
            <Icon size={22} />
            <strong>{Number(value || 0).toLocaleString('vi-VN')}</strong>
            <span>{label}</span>
            <small>{note}</small>
          </Link>
        ))}
      </div>

      <div className="admin-overview-grid">
        <section>
          <h3>Quy trình ưu tiên hôm nay</h3>
          <ol>
            <li>Duyệt nội dung cộng đồng và tin tuyển dụng tồn lâu nhất.</li>
            <li>Kiểm tra báo cáo có dấu hiệu lừa đảo, spam hoặc vi phạm riêng tư.</li>
            <li>Phản hồi lead kiến trúc, xây dựng, homestay và villa mới.</li>
            <li>Biên tập tin địa phương trong Content Studio và chuyển Google Docs sang trạng thái phù hợp.</li>
          </ol>
        </section>
        <section>
          <h3>Sức khỏe cộng đồng</h3>
          <p>Bình luận đang hiển thị: <strong>{Number(data.comments || 0).toLocaleString('vi-VN')}</strong></p>
          <p>Dashboard giữ cách trình bày gọn như KTHL để ưu tiên thao tác và bảng dữ liệu thay vì các khối tiêu đề lớn.</p>
        </section>
      </div>
    </div>
  );
}
