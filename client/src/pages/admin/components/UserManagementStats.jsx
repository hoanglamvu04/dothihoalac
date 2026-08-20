import { Users, ShieldCheck, UserCheck, UserX } from 'lucide-react';

import './UserManagementStats.css';

const cards = [
  { key: 'total', label: 'Tổng người dùng', icon: Users },
  { key: 'active', label: 'Đang hoạt động', icon: UserCheck },
  { key: 'verified', label: 'Đã xác thực', icon: ShieldCheck },
  { key: 'blocked', label: 'Bị khóa', icon: UserX },
];

export default function UserManagementStats({ stats = {} }) {
  return (
    <section className="user-management-stats" aria-label="Thống kê người dùng">
      {cards.map(({ key, label, icon: Icon }) => (
        <article key={key} className="user-management-stat-card">
          <span className="user-management-stat-icon"><Icon size={18} /></span>
          <div>
            <strong>{Number(stats[key] || 0).toLocaleString('vi-VN')}</strong>
            <small>{label}</small>
          </div>
        </article>
      ))}
    </section>
  );
}
