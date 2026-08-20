import { ShieldCheck, Activity, FileText, UserRound } from 'lucide-react';

const tabs = [
  {
    key: 'overview',
    label: 'Tổng quan',
    icon: UserRound,
  },
  {
    key: 'activity',
    label: 'Hoạt động',
    icon: Activity,
  },
  {
    key: 'content',
    label: 'Nội dung',
    icon: FileText,
  },
  {
    key: 'security',
    label: 'Bảo mật',
    icon: ShieldCheck,
  },
];

export default function AdminUserDetailTabs({ active = 'overview', onChange }) {
  return (
    <div className="admin-user-detail-tabs" role="tablist">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          className={active === key ? 'is-active' : ''}
          onClick={() => onChange?.(key)}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </div>
  );
}
