import './AdminUserManagementPro.css';
import { useState } from 'react';

const stats = [
  ['Tổng tài khoản', '1,248'],
  ['Đang hoạt động', '1,102'],
  ['Chờ xác thực', '86'],
  ['Bị hạn chế', '12'],
  ['Quản trị viên', '8'],
];

const users = [
  { name: 'Thanh Lịch', username: '@thanhlich123', email: 'thanhlich4325@gmail.com', roles: ['Thành viên'], status: 'Đang hoạt động' },
  { name: 'Tuyển dụng CNC', username: '@tuyendungcnc', email: 'tuyendung@example.com', roles: ['Doanh nghiệp'], status: 'Đang hoạt động' },
  { name: 'Hoàng Gia Bảo', username: '@sinhvienvnu', email: 'sinhvien@example.com', roles: ['Thành viên'], status: 'Chưa xác thực' },
];

const tabs = ['Tổng quan', 'Quyền & Vai trò', 'Bảo mật', 'Hoạt động', 'Kiểm duyệt'];

export default function AdminUserManagementPro() {
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('Tổng quan');

  return (
    <section className="admin-user-pro">
      <header className="user-pro-head">
        <div>
          <span>IDENTITY & ACCESS CONTROL</span>
          <h1>Người dùng & phân quyền</h1>
          <p>Quản lý tài khoản, vai trò, quyền truy cập và lịch sử bảo mật.</p>
        </div>
        <button>+ Thêm người dùng</button>
      </header>

      <div className="user-stats">
        {stats.map(([label, value]) => (
          <article key={label}><small>{label}</small><strong>{value}</strong></article>
        ))}
      </div>

      <div className="user-toolbar">
        <input placeholder="Email, tên, username hoặc số điện thoại" />
        <select><option>Tất cả vai trò</option></select>
        <select><option>Tất cả trạng thái</option></select>
        <button>Tìm</button>
      </div>

      <div className="user-table">
        <div className="user-row user-header">
          <b>Người dùng</b><b>Vai trò</b><b>Trạng thái</b><b></b>
        </div>
        {users.map((user) => (
          <div className="user-row" key={user.username}>
            <div><b>{user.name}</b><small>{user.username}<br />{user.email}</small></div>
            <div>{user.roles.map((r) => <span key={r} className="role">{r}</span>)}</div>
            <span className="status">{user.status}</span>
            <button onClick={() => setSelected(user)}>Quản lý</button>
          </div>
        ))}
      </div>

      {selected && (
        <div className="user-drawer">
          <button className="close" onClick={() => setSelected(null)}>×</button>
          <h2>{selected.name}</h2>
          <p>{selected.email}</p>
          <nav>{tabs.map((item) => <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</nav>
          <div className="drawer-content">
            <h3>{tab}</h3>
            {tab === 'Quyền & Vai trò' && <p>Gán role, permission và phạm vi truy cập cho tài khoản.</p>}
            {tab === 'Bảo mật' && <p>Quản lý xác thực, phiên đăng nhập và thiết bị.</p>}
            {tab === 'Hoạt động' && <p>Lịch sử đăng nhập và thao tác quản trị.</p>}
            {tab === 'Kiểm duyệt' && <p>Vi phạm, báo cáo và lịch sử moderation.</p>}
            {tab === 'Tổng quan' && <p>Thông tin hồ sơ và trạng thái tài khoản.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
