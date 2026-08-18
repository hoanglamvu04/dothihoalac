import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  FileText,
  Flag,
  FolderKanban,
  MessageSquareWarning,
  Plus,
  Users,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import { LoadingBlock } from '../../components/common/Loading';
import ErrorState from '../../components/common/ErrorState';
import { adminApi } from '../../api/admin.api';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      adminApi.dashboard(),
      adminApi.projects({ page: 1, limit: 1 }),
    ])
      .then(([dashboard, projects]) => {
        if (!active) return;
        setData({
          ...dashboard,
          projectSummary: projects?.meta?.summary || {},
        });
      })
      .catch((nextError) => {
        if (active) setError(nextError);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!data && !error) return <LoadingBlock />;
  if (error) return <ErrorState error={error} />;

  const projectSummary = data.projectSummary || {};
  const cards = [
    ['Người dùng', data.userCount, Users, '/quan-tri/nguoi-dung', 'Tài khoản đang hoạt động trong hệ thống'],
    ['Chờ duyệt', data.pendingContent, MessageSquareWarning, '/quan-tri/kiem-duyet', 'Nội dung cần xử lý theo thứ tự gửi'],
    ['Báo cáo', data.pendingReports, Flag, '/quan-tri/bao-cao', 'Báo cáo vi phạm chưa hoàn tất'],
    ['Lead mới', data.newLeads, BarChart3, '/quan-tri/khach-hang', 'Nhu cầu tư vấn cần phản hồi sớm'],
    ['Dự án đang theo dõi', projectSummary.active, FolderKanban, '/quan-tri/du-an', 'Project Tracker từ chủ trương tới thi công'],
    ['Dự án quá mốc', projectSummary.delayed, AlertTriangle, '/quan-tri/du-an?status=paused', 'Cần rà soát deadline hoặc trạng thái tiến độ'],
  ];

  return (
    <div>
      <Seo title="Dashboard quản trị" />
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">DTHL Operations</p>
          <h1>Tổng quan vận hành</h1>
          <p>Không gian quản trị tập trung cho nội dung, cộng đồng, dự án, vận hành và nguồn khách hàng Hòa Lạc.</p>
        </div>
        <div className="admin-row-actions">
          <Link className="admin-secondary" to="/quan-tri/du-an/moi"><Plus size={15} /> Thêm dự án</Link>
          <Link className="admin-primary" to="/quan-tri/bai-viet/moi"><FileText size={15} /> Viết bài mới</Link>
        </div>
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
            <li>Rà Project Tracker: dự án quá mốc, cập nhật tiến độ mới, hồ sơ cần bổ sung nguồn.</li>
            <li>Phản hồi lead kiến trúc, xây dựng, homestay và villa mới.</li>
            <li>Biên tập tin địa phương trong Content Studio và đồng bộ Google Docs.</li>
          </ol>
        </section>
        <section>
          <h3>Sức khỏe dữ liệu Project Tracker</h3>
          <p>Tổng dự án: <strong>{Number(projectSummary.total || 0).toLocaleString('vi-VN')}</strong></p>
          <p>Đang thi công: <strong>{Number(projectSummary.construction || 0).toLocaleString('vi-VN')}</strong></p>
          <p>Hoàn thành: <strong>{Number(projectSummary.completed || 0).toLocaleString('vi-VN')}</strong></p>
          <p>Công khai trên website: <strong>{Number(projectSummary.public || 0).toLocaleString('vi-VN')}</strong></p>
          <p>Bình luận đang hiển thị: <strong>{Number(data.comments || 0).toLocaleString('vi-VN')}</strong></p>
        </section>
      </div>
    </div>
  );
}
