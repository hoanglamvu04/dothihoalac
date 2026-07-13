import { BadgeCheck } from 'lucide-react';

export default function VerifiedMark({ emailVerifiedAt, phoneVerifiedAt, compact = false }) {
  if (!emailVerifiedAt && !phoneVerifiedAt) return null;
  const label = phoneVerifiedAt ? 'Đã xác thực số điện thoại' : 'Đã xác thực email';
  return (
    <span className={`verified-mark ${compact ? 'verified-mark--compact' : ''}`} title={label}>
      <BadgeCheck size={compact ? 15 : 17} />
      {compact ? null : label}
    </span>
  );
}
