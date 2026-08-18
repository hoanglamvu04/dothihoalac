import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  Flag,
  MessageCircle,
  MessageSquareWarning,
  Sparkles,
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

    adminApi.dashboard()
      .then((dashboard) => {
        if (active) setData(dashboard);
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

  const cards = [
    ['Người dùng', data.userCount, Users, '/quan-tri/nguoi-dung', 'Tài khoản đang hoạt động trong hệ thống'],
    ['Chờ duyệt', data.pendingContent, MessageSquareWarning, '/quan-tri/kiem-duyet', 'Nội dung cần xử lý theo thứ tự gửi'],
    ['Báo cáo', data.pendingReports, Flag, '/quan-tri/bao-cao', 'Báo cáo vi phạm chưa hoàn tất'],
    ['Lead mới', data.newLeads, BarChart3, '/quan-tri/khach-hang', 'Nhu cầu tư vấn cần phản hồi sớm'],
    ['Bình luận', data.comments, MessageCircle, '/quan-tri/binh-luan', 'Theo dõi trao đổi đang hiển thị trên website'],
  ];

  return (
    <div>
      <Seo title="Dashboard quản trị" />
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">DTHL Operations</p>
          <h1>Tổng quan vận hành</h1>
          <p>Không gian quản trị tập trung cho nội dung, cộng đồng, thị trường, kiểm duyệt và nguồn khách hàng Hòa Lạc.</p>
        </div>
        <div className="admin-row-actions">
          <Link className="admin-secondary" to="/quan-tri/bien-tap-noi-bat">
            <Sparkles size={15} /> Biên tập nổi bật
          </Link>
          <Link className="admin-primary" to="/quan-tri/bai-viet/moi">
            <FileText size={15} /> Viết bài mới
          </Link>
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
            <li>Duyệt nội dung cộng đồng, bất động sản và tin tuyển dụng tồn lâu nhất.</li>
            <li>Kiểm tra báo cáo có dấu hiệu lừa đảo, spam hoặc vi phạm riêng tư.</li>
            <li>Chọn 3–5 bài thật sự quan trọng cho mục Đáng chú ý hôm nay.</li>
            <li>Phản hồi lead kiến trúc, xây dựng, homestay và villa mới.</li>
            <li>Biên tập tin địa phương trong Content Studio và đồng bộ Google Docs.</li>
          </ol>
        </section>
        <section>
          <h3>Nhịp biên tập Hòa Lạc 24H</h3>
          <p><strong>Đáng chú ý:</strong> biên tập viên chọn thủ công để giữ đúng trọng tâm trong ngày.</p>
          <p><strong>Mới nhất & Đọc nhiều:</strong> hệ thống tự sắp xếp theo thời gian và lượt xem.</p>
          <p><strong>Thông tin cần biết:</strong> ưu tiên Chính sách và Hành chính.</p>
          <p><strong>Thị trường:</strong> tự lấy tin BĐS mới, việc làm mới và thảo luận cộng đồng.</p>
          <Link className="admin-secondary" to="/quan-tri/bien-tap-noi-bat">
            <Sparkles size={15} /> Mở Biên tập nổi bật
          </Link>
        </section>
      </div>
    </div>
  );
}
