import './AdminUserManagementPro.css';

const stats = [
  ['Tổng tài khoản', '1,248'],
  ['Đang hoạt động', '1,102'],
  ['Chờ xác thực', '86'],
  ['Bị hạn chế', '12'],
];

const users = [
  ['Thanh Lịch', '@thanhlich123', 'Thành viên', 'Đang hoạt động'],
  ['Tuyển dụng CNC', '@tuyendungcnc', 'Doanh nghiệp', 'Đang hoạt động'],
  ['Hoàng Gia Bảo', '@sinhvienvnu', 'Thành viên', 'Đang hoạt động'],
];

export default function AdminUserManagementPro() {
  return (
    <section className="admin-user-pro">
      <div className="user-pro-head">
        <div>
          <span>IDENTITY & ACCESS CONTROL</span>
          <h1>Quản lý người dùng nâng cao</h1>
          <p>Quản lý tài khoản, vai trò, quyền truy cập và lịch sử hoạt động.</p>
        </div>
        <button>+ Thêm người dùng</button>
      </div>

      <div className="user-stats">
        {stats.map(([label, value]) => <article key={label}><small>{label}</small><strong>{value}</strong></article>)}
      </div>

      <div className="user-toolbar">
        <input placeholder="Tìm email, username, tên hoặc số điện thoại" />
        <select><option>Tất cả vai trò</option></select>
        <select><option>Tất cả trạng thái</option></select>
        <button>Tìm</button>
      </div>

      <div className="user-table">
        {users.map((u) => (
          <div className="user-row" key={u[1]}>
            <div><b>{u[0]}</b><small>{u[1]}</small></div>
            <span>{u[2]}</span>
            <span className="status">{u[3]}</span>
            <button>Quản lý</button>
          </div>
        ))}
      </div>
    </section>
  );
}
