import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  Flag,
  FolderTree,
  LayoutDashboard,
  Megaphone,
  MessageSquareWarning,
  Settings,
  Users,
} from 'lucide-react';
import PageHeader from '../common/PageHeader';

const links = [
  ['/quan-tri', 'Tổng quan', LayoutDashboard],
  ['/quan-tri/kiem-duyet', 'Hàng chờ kiểm duyệt', MessageSquareWarning],
  ['/quan-tri/bai-viet', 'Tin tức biên tập', FileText],
  ['/quan-tri/nguoi-dung', 'Người dùng', Users],
  ['/quan-tri/bao-cao', 'Báo cáo vi phạm', Flag],
  ['/quan-tri/khach-hang', 'Khách hàng tiềm năng', BarChart3],
  ['/quan-tri/phan-loai', 'Danh mục và khu vực', FolderTree],
  ['/quan-tri/he-thong', 'Trang, banner, cấu hình', Settings],
  ['/quan-tri/nhat-ky', 'Nhật ký quản trị', Megaphone],
];

export default function AdminLayout() {
  return (
    <section className="page-section account-section admin-section">
      <div className="container container--wide">
        <PageHeader eyebrow="Quản trị" title="Trung tâm vận hành" description="Quản lý nội dung, người dùng và hoạt động của Đô Thị Hòa Lạc." />
        <div className="dashboard-layout dashboard-layout--admin">
          <aside className="dashboard-sidebar">
            {links.map(([to, label, Icon]) => (
              <NavLink key={to} to={to} end={to === '/quan-tri'}><Icon size={18} /> {label}</NavLink>
            ))}
          </aside>
          <div className="dashboard-content"><Outlet /></div>
        </div>
      </div>
    </section>
  );
}
