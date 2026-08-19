import { useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';

const MODERATION_PERMISSIONS = [
  'approve_article',
  'publish_article',
  'moderate_community',
  'moderate_property',
  'moderate_job',
  'moderate_comment',
];

const REPORT_PERMISSIONS = [
  'manage_users',
  'moderate_community',
  'moderate_property',
  'moderate_job',
  'moderate_comment',
];

function hasAnyPermission(user, permissions = []) {
  const current = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.some((permission) => current.includes(permission));
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const canManageSystem = hasAnyPermission(user, ['manage_system']);
  const canManageUsers = hasAnyPermission(user, ['manage_users']);
  const canModerate = hasAnyPermission(user, MODERATION_PERMISSIONS);
  const canHandleReports = hasAnyPermission(user, REPORT_PERMISSIONS);
  const canManageLeads = hasAnyPermission(user, ['manage_leads']);
  const canCreateArticle = hasAnyPermission(user, ['create_article']);

  useEffect(() => {
    let active = true;

    Promise.all([
      adminApi.dashboard(),
      canManageSystem
        ? adminApi.projects({ page: 1, limit: 1 })
        : Promise.resolve({ meta: { summary: {} } }),
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
  }, [canManageSystem]);

  const cards = useMemo(() => {
    if (!data) return [];
    const projectSummary = data.projectSummary || {};
    return [
      canManageUsers
        ? ['Người dùng', data.userCount, Users, '/quan-tri/nguoi-dung', 'Tài khoản và phân quyền nhân sự trong hệ thống']
        : null,
      canModerate
        ? ['Chờ duyệt', data.pendingContent, MessageSquareWarning, '/quan-tri/kiem-duyet', 'Nội dung thuộc phạm vi quyền đang chờ xử lý']
        : null,
      canHandleReports
        ? ['Báo cáo', data.pendingReports, Flag, '/quan-tri/bao-cao', 'Báo cáo vi phạm chưa hoàn tất']
        : null,
      canManageLeads
        ? ['Lead mới', data.newLeads, BarChart3, '/quan-tri/khach-hang', 'Nhu cầu tư vấn cần phản hồi sớm']
        : null,
      canManageSystem
        ? ['Dự án đang theo dõi', projectSummary.active, FolderKanban, '/quan-tri/du-an', 'Project Tracker từ chủ trương tới thi công']
        : null,
      canManageSystem
        ? ['Dự án quá mốc', projectSummary.delayed, AlertTriangle, '/quan-tri/du-an?status=paused', 'Cần rà soát deadline hoặc trạng thái tiến độ']
        : null,
    ].filter(Boolean);
  }, [canHandleReports, canManageLeads, canManageSystem, canManageUsers, canModerate, data]);

  if (!data && !error) return <LoadingBlock />;
  if (error) return <ErrorState error={error} />;

  const projectSummary = data.projectSummary || {};

  return (
    <div>
      <Seo title="Dashboard quản trị" />
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">DTHL Operations</p>
          <h1>Tổng quan vận hành</h1>
          <p>Không gian quản trị hiển thị theo đúng vai trò và quyền hiệu lực của tài khoản đang đăng nhập.</p>
        </div>
        <div className="admin-row-actions">
          {canManageSystem ? (
            <Link className="admin-secondary" to="/quan-tri/du-an/moi"><Plus size={15} /> Thêm dự án</Link>
          ) : null}
          {canCreateArticle ? (
            <Link className="admin-primary" to="/quan-tri/bai-viet/moi"><FileText size={15} /> Viết bài mới</Link>
          ) : null}
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
          <h3>Phạm vi công việc hiện tại</h3>
          <ol>
            {canModerate ? <li>Xử lý hàng chờ đúng nhóm nội dung được phân quyền.</li> : null}
            {canHandleReports ? <li>Tiếp nhận và xử lý báo cáo vi phạm thuộc phạm vi kiểm soát.</li> : null}
            {canCreateArticle ? <li>Soạn và biên tập nội dung trong Content Studio theo quyền tòa soạn.</li> : null}
            {canManageUsers ? <li>Quản lý trạng thái tài khoản; System Admin có thể gán vai trò nhân sự.</li> : null}
            {canManageLeads ? <li>Phản hồi và cập nhật pipeline khách hàng tiềm năng.</li> : null}
            {canManageSystem ? <li>Quản trị Project Tracker, cấu hình, taxonomy, quảng cáo và tích hợp hệ thống.</li> : null}
          </ol>
        </section>

        <section>
          <h3>Sức khỏe dữ liệu trong phạm vi quyền</h3>
          {canManageSystem ? (
            <>
              <p>Tổng dự án: <strong>{Number(projectSummary.total || 0).toLocaleString('vi-VN')}</strong></p>
              <p>Đang thi công: <strong>{Number(projectSummary.construction || 0).toLocaleString('vi-VN')}</strong></p>
              <p>Hoàn thành: <strong>{Number(projectSummary.completed || 0).toLocaleString('vi-VN')}</strong></p>
              <p>Công khai trên website: <strong>{Number(projectSummary.public || 0).toLocaleString('vi-VN')}</strong></p>
            </>
          ) : null}
          {hasAnyPermission(user, ['moderate_comment']) ? (
            <p>Bình luận đang hiển thị: <strong>{Number(data.comments || 0).toLocaleString('vi-VN')}</strong></p>
          ) : null}
          {!canManageSystem && !hasAnyPermission(user, ['moderate_comment']) ? (
            <p>Các chỉ số hệ thống ngoài phạm vi vai trò đã được ẩn.</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
