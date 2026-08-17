import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import FormField from '../../components/common/FormField';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';

const statusLabels = {
  active: 'Đang hoạt động',
  restricted: 'Bị hạn chế',
  suspended: 'Tạm khóa',
  banned: 'Đã khóa',
};

const emptyForm = {
  status: 'active',
  phone: '',
  phoneVerified: false,
  violationType: '',
  severity: 'medium',
  note: '',
};

export default function AdminUsersPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    adminApi.users({
      page,
      limit: 20,
      status: status || undefined,
      q: appliedQuery || undefined,
    })
      .then((result) => {
        setItems(result.items);
        setMeta(result.meta);
      })
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [appliedQuery, page, status]);

  const openUser = (user) => {
    setSelected(user);
    setForm({
      status: user.status || 'active',
      phone: user.phone || '',
      phoneVerified: Boolean(user.phoneVerifiedAt),
      violationType: '',
      severity: 'medium',
      note: '',
    });
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedQuery(query.trim());
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      await adminApi.updateUserStatus(selected._id, form);
      toast.success('Đã cập nhật tài khoản và thông tin số điện thoại.');
      setSelected(null);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <div>
      <Seo title="Quản lý người dùng" />
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Community Operations</p>
          <h1>Người dùng</h1>
          <p>Cảnh báo, hạn chế hoặc khóa tài khoản; thanh lọc và tìm kiếm được đặt cùng một hàng để ưu tiên không gian bảng.</p>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="filter-tabs">
          {[
            ['', 'Tất cả'],
            ['active', 'Hoạt động'],
            ['restricted', 'Hạn chế'],
            ['suspended', 'Tạm khóa'],
            ['banned', 'Đã khóa'],
          ].map(([value, label]) => (
            <button type="button" key={value} className={status === value ? 'is-active' : ''} onClick={() => { setStatus(value); setPage(1); }}>
              {label}
            </button>
          ))}
        </div>
        <form className="admin-search" onSubmit={submitSearch}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Email, tên hoặc username" />
          <button className="admin-secondary" type="submit"><Search size={14} /> Tìm</button>
        </form>
      </div>

      {loading ? <LoadingBlock /> : items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Người dùng</th><th>Liên hệ</th><th>Xác thực</th><th>Trạng thái</th><th>Ngày tạo</th><th /></tr></thead>
            <tbody>
              {items.map((user) => (
                <tr key={user._id}>
                  <td><strong>{user.displayName}</strong><small>@{user.username}</small></td>
                  <td>{user.email}<small>{user.phone || 'Chưa có số điện thoại'}</small></td>
                  <td><small>Email: {user.emailVerifiedAt ? 'Đã xác thực' : 'Chưa xác thực'}</small><small>SĐT: {user.phone && user.phoneVerifiedAt ? 'Đã xác thực' : 'Chưa xác thực'}</small></td>
                  <td><Badge tone={user.status === 'active' ? 'success' : 'warning'}>{statusLabels[user.status] || user.status}</Badge></td>
                  <td>{formatDateTime(user.createdAt)}</td>
                  <td><Button size="sm" variant="outline" onClick={() => openUser(user)}>Quản lý</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="Không tìm thấy người dùng" />}

      <Pagination meta={meta} onPageChange={setPage} />

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Cập nhật tài khoản">
        <form className="stack-form" onSubmit={submit}>
          <div className="moderation-preview"><h3>{selected?.displayName}</h3><p>@{selected?.username} · {selected?.email}</p></div>

          <div className="form-grid form-grid--2">
            <FormField label="Số điện thoại">
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="Ví dụ: 0984305725"
                autoComplete="off"
              />
            </FormField>
            <FormField label="Xác thực số điện thoại">
              <select
                value={form.phoneVerified ? 'verified' : 'unverified'}
                onChange={(event) => setForm({ ...form, phoneVerified: event.target.value === 'verified' })}
                disabled={!form.phone.trim()}
              >
                <option value="unverified">Chưa xác thực</option>
                <option value="verified">Đã xác thực (quản trị)</option>
              </select>
            </FormField>
          </div>

          <FormField label="Trạng thái"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Hoạt động</option><option value="restricted">Hạn chế</option><option value="suspended">Tạm khóa</option><option value="banned">Khóa tài khoản</option></select></FormField>
          <div className="form-grid form-grid--2">
            <FormField label="Loại vi phạm (nếu có)"><input value={form.violationType} onChange={(event) => setForm({ ...form, violationType: event.target.value })} placeholder="spam, scam, harassment..." /></FormField>
            <FormField label="Mức độ"><select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}><option value="low">Thấp</option><option value="medium">Trung bình</option><option value="high">Cao</option><option value="critical">Nghiêm trọng</option></select></FormField>
          </div>
          <FormField label="Thông báo gửi người dùng"><textarea rows="5" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></FormField>
          <Button type="submit">Lưu thay đổi</Button>
        </form>
      </Modal>
    </div>
  );
}
