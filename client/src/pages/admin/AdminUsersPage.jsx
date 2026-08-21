import { useEffect, useMemo, useState } from 'react';
import {
  KeyRound,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';

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
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';
import AdminUserPasswordModal from './AdminUserPasswordModal';

import './AdminUsersAccess.css';

const statusLabels = {
  active: 'Đang hoạt động',
  restricted: 'Bị hạn chế',
  suspended: 'Tạm khóa',
  banned: 'Đã khóa',
  pending: 'Chờ kích hoạt',
};

const ROLE_LABELS = {
  member: 'Thành viên',
  verified_member: 'Đã xác thực',
  broker: 'Môi giới',
  business: 'Doanh nghiệp',
  contributor: 'Cộng tác viên',
  moderator: 'Kiểm duyệt viên',
  editor: 'Biên tập viên',
  chief_editor: 'Trưởng ban biên tập',
  user_admin: 'Quản trị người dùng',
  system_admin: 'System Admin',
};

const ROLE_DESCRIPTIONS = {
  contributor: 'Tạo bài nháp và đóng góp nội dung cho tòa soạn.',
  moderator: 'Kiểm duyệt cộng đồng, bất động sản, việc làm và bình luận.',
  editor: 'Tạo, sửa và duyệt bài viết trước khi xuất bản.',
  chief_editor: 'Toàn quyền quy trình tòa soạn, gồm lên lịch và xuất bản.',
  user_admin: 'Quản lý tài khoản người dùng và một phần nghiệp vụ kiểm duyệt.',
  system_admin: 'Toàn quyền hệ thống, cấu hình và phân quyền nhân sự.',
};

const PERMISSION_LABELS = {
  create_article: 'Tạo bài viết',
  edit_article: 'Sửa bài viết',
  approve_article: 'Duyệt bài viết',
  publish_article: 'Xuất bản bài viết',
  moderate_community: 'Kiểm duyệt cộng đồng',
  moderate_property: 'Kiểm duyệt BĐS',
  moderate_job: 'Kiểm duyệt việc làm',
  moderate_comment: 'Kiểm duyệt bình luận',
  manage_users: 'Quản lý người dùng',
  manage_taxonomy: 'Quản lý taxonomy',
  manage_media: 'Quản lý media',
  manage_leads: 'Quản lý lead',
  manage_system: 'Quản trị hệ thống',
  view_audit_log: 'Xem nhật ký quản trị',
};

const FALLBACK_STAFF_ROLES = [
  'contributor',
  'moderator',
  'editor',
  'chief_editor',
  'user_admin',
  'system_admin',
];

const emptyForm = {
  status: 'active',
  phone: '',
  phoneVerified: false,
  violationType: '',
  severity: 'medium',
  note: '',
  staffRoles: [],
};

const USER_SYNC_STORAGE_KEY = 'dthl:user-updated';

function userIdOf(user) {
  return String(user?._id || user?.id || '');
}

function isStaffUser(user, staffRoleSlugs = FALLBACK_STAFF_ROLES) {
  return (user?.roles || []).some((role) => staffRoleSlugs.includes(role));
}

function roleTone(role) {
  if (role === 'system_admin') return 'danger';
  if (['chief_editor', 'user_admin'].includes(role)) return 'warning';
  if (['editor', 'moderator'].includes(role)) return 'primary';
  return 'neutral';
}

function RoleBadges({ roles = [], compact = false }) {
  const visible = roles.filter((role) => ROLE_LABELS[role]);
  if (!visible.length) return <small>Chưa có vai trò</small>;

  return (
    <div className={`admin-user-role-badges${compact ? ' is-compact' : ''}`}>
      {visible.map((role) => (
        <Badge key={role} tone={roleTone(role)}>{ROLE_LABELS[role]}</Badge>
      ))}
    </div>
  );
}

function AccessMatrix({ access }) {
  const staffRoleSlugs = access?.staffRoleSlugs || FALLBACK_STAFF_ROLES;
  const roles = (access?.roles || []).filter((role) => staffRoleSlugs.includes(role.slug));

  if (!roles.length) {
    return <EmptyState title="Chưa có dữ liệu vai trò" />;
  }

  return (
    <div className="admin-access-matrix">
      {roles.map((role) => (
        <article className="admin-access-role-card" key={role.slug}>
          <header>
            <div>
              <span className="admin-access-role-icon"><ShieldCheck size={18} /></span>
              <div>
                <h3>{ROLE_LABELS[role.slug] || role.name}</h3>
                <p>{ROLE_DESCRIPTIONS[role.slug] || role.description}</p>
              </div>
            </div>
            <strong>{Number(role.userCount || 0).toLocaleString('vi-VN')} người</strong>
          </header>

          <div className="admin-access-permissions">
            {role.permissions?.length ? role.permissions.map((permission) => (
              <span key={permission}>
                <KeyRound size={13} />
                {PERMISSION_LABELS[permission] || permission}
              </span>
            )) : <small>Không có quyền quản trị đặc biệt.</small>}
          </div>
        </article>
      ))}
    </div>
  );
}

export default function AdminUsersPage() {
  const toast = useToast();
  const { user: currentUser, refreshUser } = useAuth();
  const isSystemAdmin = Boolean(currentUser?.roles?.includes('system_admin'));
  const [view, setView] = useState('users');
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [access, setAccess] = useState(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const staffRoleSlugs = access?.staffRoleSlugs || FALLBACK_STAFF_ROLES;
  const staffRoleCatalog = useMemo(
    () => (access?.roles || [])
      .filter((item) => staffRoleSlugs.includes(item.slug))
      .sort((a, b) => staffRoleSlugs.indexOf(a.slug) - staffRoleSlugs.indexOf(b.slug)),
    [access, staffRoleSlugs],
  );

  const pageStats = useMemo(() => ({
    active: items.filter((item) => item.status === 'active').length,
    staff: items.filter((item) => isStaffUser(item, staffRoleSlugs)).length,
    attention: items.filter((item) => ['restricted', 'suspended', 'banned'].includes(item.status)).length,
  }), [items, staffRoleSlugs]);

  const load = () => {
    setLoading(true);
    adminApi.users({
      page,
      limit: 20,
      status: status || undefined,
      role: role || undefined,
      q: appliedQuery || undefined,
    })
      .then((result) => {
        setItems(result.items);
        setMeta(result.meta);
      })
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  };

  const loadAccess = () => {
    if (!isSystemAdmin) return Promise.resolve(null);
    setAccessLoading(true);
    return adminApi.accessControl()
      .then((result) => {
        setAccess(result);
        return result;
      })
      .catch((error) => {
        toast.error(apiErrorMessage(error, 'Không thể tải cấu hình phân quyền.'));
        return null;
      })
      .finally(() => setAccessLoading(false));
  };

  useEffect(load, [appliedQuery, page, role, status]);

  useEffect(() => {
    if (isSystemAdmin) void loadAccess();
  }, [isSystemAdmin]);

  useEffect(() => {
    if (!isSystemAdmin && view === 'access') setView('users');
  }, [isSystemAdmin, view]);

  const openUser = (user) => {
    setSelected(user);
    setForm({
      status: user.status || 'active',
      phone: user.phone || '',
      phoneVerified: Boolean(user.phone && user.phoneVerifiedAt),
      violationType: '',
      severity: 'medium',
      note: '',
      staffRoles: (user.roles || []).filter((item) => staffRoleSlugs.includes(item)),
    });
  };

  const canResetPassword = (user) => !isStaffUser(user, staffRoleSlugs) || isSystemAdmin;

  const openPassword = (user) => {
    if (!canResetPassword(user)) {
      toast.error('Chỉ System Admin mới được đổi mật khẩu tài khoản nhân sự quản trị.');
      return;
    }
    setPasswordUser(user);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedQuery(query.trim());
  };

  const toggleStaffRole = (roleSlug) => {
    setForm((current) => ({
      ...current,
      staffRoles: current.staffRoles.includes(roleSlug)
        ? current.staffRoles.filter((item) => item !== roleSlug)
        : [...current.staffRoles, roleSlug],
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!selected || saving) return;

    setSaving(true);
    try {
      await adminApi.updateUserStatus(selected._id, {
        status: form.status,
        phone: form.phone,
        phoneVerified: form.phoneVerified,
        violationType: form.violationType,
        severity: form.severity,
        note: form.note,
      });

      if (isSystemAdmin) {
        await adminApi.updateUserRoles(selected._id, form.staffRoles);
      }

      try {
        localStorage.setItem(USER_SYNC_STORAGE_KEY, `${Date.now()}:${selected._id}`);
      } catch {
        /* Trình duyệt có thể chặn localStorage. */
      }

      if (userIdOf(selected) && userIdOf(selected) === userIdOf(currentUser)) {
        await refreshUser({ force: true });
      }

      toast.success(
        isSystemAdmin
          ? 'Đã cập nhật tài khoản, vai trò và quyền hiệu lực.'
          : 'Đã cập nhật tài khoản.',
      );
      setSelected(null);
      load();
      if (isSystemAdmin) void loadAccess();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const submitPassword = async (password) => {
    if (!passwordUser || passwordSaving) return;

    setPasswordSaving(true);
    try {
      await adminApi.changeUserPassword(passwordUser._id, password);
      try {
        localStorage.setItem(USER_SYNC_STORAGE_KEY, `${Date.now()}:${passwordUser._id}`);
      } catch {
        /* Trình duyệt có thể chặn localStorage. */
      }
      toast.success('Đã đổi mật khẩu và thu hồi các phiên đăng nhập cũ.');
      setPasswordUser(null);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không thể đổi mật khẩu tài khoản.'));
    } finally {
      setPasswordSaving(false);
    }
  };

  const selectedIsStaff = isStaffUser(selected, staffRoleSlugs);
  const selectedLockedForCurrentAdmin = selectedIsStaff && !isSystemAdmin;

  return (
    <div>
      <Seo title="Người dùng & phân quyền" />
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Identity & Access Control</p>
          <h1>Người dùng & phân quyền</h1>
          <p>Quản lý tài khoản, trạng thái, xác thực, mật khẩu và phân cấp nhân sự theo nguyên tắc quyền tối thiểu.</p>
        </div>
      </header>

      {isSystemAdmin ? (
        <div className="admin-access-tabs" role="tablist" aria-label="Khu vực quản lý người dùng">
          <button
            type="button"
            className={view === 'users' ? 'is-active' : ''}
            onClick={() => setView('users')}
          >
            <Users size={16} /> Tài khoản
          </button>
          <button
            type="button"
            className={view === 'access' ? 'is-active' : ''}
            onClick={() => setView('access')}
          >
            <UserCog size={16} /> Vai trò & phân quyền
          </button>
        </div>
      ) : null}

      {view === 'access' && isSystemAdmin ? (
        <>
          <div className="admin-access-summary">
            <div>
              <strong>{Number(access?.roles?.length || 0).toLocaleString('vi-VN')}</strong>
              <span>Vai trò hệ thống</span>
            </div>
            <div>
              <strong>{Number(access?.permissions?.length || 0).toLocaleString('vi-VN')}</strong>
              <span>Quyền nguyên tử</span>
            </div>
            <div>
              <strong>{Number(access?.roles?.filter((item) => item.isStaff).length || 0).toLocaleString('vi-VN')}</strong>
              <span>Vai trò nhân sự</span>
            </div>
          </div>
          {accessLoading && !access ? <LoadingBlock /> : <AccessMatrix access={access} />}
        </>
      ) : (
        <>
          <div className="admin-user-overview" aria-label="Tổng quan người dùng">
            <div>
              <strong>{Number(meta?.total || items.length || 0).toLocaleString('vi-VN')}</strong>
              <span>Kết quả phù hợp</span>
            </div>
            <div>
              <strong>{pageStats.active.toLocaleString('vi-VN')}</strong>
              <span>Hoạt động trong trang</span>
            </div>
            <div>
              <strong>{pageStats.staff.toLocaleString('vi-VN')}</strong>
              <span>Nhân sự trong trang</span>
            </div>
            <div>
              <strong>{pageStats.attention.toLocaleString('vi-VN')}</strong>
              <span>Cần chú ý trong trang</span>
            </div>
          </div>

          <div className="admin-toolbar admin-user-toolbar">
            <div className="filter-tabs">
              {[
                ['', 'Tất cả'],
                ['active', 'Hoạt động'],
                ['restricted', 'Hạn chế'],
                ['suspended', 'Tạm khóa'],
                ['banned', 'Đã khóa'],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={status === value ? 'is-active' : ''}
                  onClick={() => { setStatus(value); setPage(1); }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="admin-user-toolbar__tools">
              <select
                className="admin-role-filter"
                value={role}
                onChange={(event) => { setRole(event.target.value); setPage(1); }}
                aria-label="Lọc theo vai trò"
              >
                <option value="">Mọi vai trò</option>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              <form className="admin-search" onSubmit={submitSearch}>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Email, tên, username hoặc SĐT"
                />
                <button className="admin-secondary" type="submit"><Search size={14} /> Tìm</button>
              </form>
            </div>
          </div>

          {loading ? <LoadingBlock /> : items.length ? (
            <div className="admin-table-wrap admin-users-table-wrap">
              <table className="admin-table admin-users-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Vai trò</th>
                    <th>Liên hệ</th>
                    <th>Xác thực</th>
                    <th>Trạng thái</th>
                    <th>Đăng nhập cuối</th>
                    <th>Ngày tạo</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((user) => {
                    const passwordAllowed = canResetPassword(user);
                    return (
                      <tr key={user._id}>
                        <td data-label="Người dùng">
                          <strong>{user.displayName}</strong>
                          <small>@{user.username}</small>
                          {isStaffUser(user, staffRoleSlugs) ? <small className="admin-user-staff-note">Nhân sự hệ thống</small> : null}
                        </td>
                        <td data-label="Vai trò"><RoleBadges roles={user.roles} compact /></td>
                        <td data-label="Liên hệ">{user.email}<small>{user.phone || 'Chưa có số điện thoại'}</small></td>
                        <td data-label="Xác thực">
                          <small>Email: {user.emailVerifiedAt ? 'Đã xác thực' : 'Chưa xác thực'}</small>
                          <small>SĐT: {user.phone && user.phoneVerifiedAt ? 'Đã xác thực' : 'Chưa xác thực'}</small>
                        </td>
                        <td data-label="Trạng thái"><Badge tone={user.status === 'active' ? 'success' : 'warning'}>{statusLabels[user.status] || user.status}</Badge></td>
                        <td data-label="Đăng nhập cuối">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : <small>Chưa ghi nhận</small>}</td>
                        <td data-label="Ngày tạo">{formatDateTime(user.createdAt)}</td>
                        <td data-label="Thao tác">
                          <div className="admin-user-actions">
                            <Button size="sm" variant="outline" onClick={() => openUser(user)}>Quản lý</Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPassword(user)}
                              disabled={!passwordAllowed}
                              title={passwordAllowed ? 'Đổi mật khẩu' : 'Chỉ System Admin được đổi mật khẩu nhân sự quản trị'}
                            >
                              <KeyRound size={14} /> Mật khẩu
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="Không tìm thấy người dùng" />}

          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Quản lý tài khoản">
        <form className="stack-form" onSubmit={submit}>
          <div className="moderation-preview">
            <h3>{selected?.displayName}</h3>
            <p>@{selected?.username} · {selected?.email}</p>
            <RoleBadges roles={selected?.roles} />
            {userIdOf(selected) === userIdOf(currentUser) ? <small>Đây là tài khoản bạn đang đăng nhập.</small> : null}
          </div>

          <div className="admin-user-security-row">
            <div>
              <strong>Bảo mật tài khoản</strong>
              <small>Đổi mật khẩu sẽ thu hồi toàn bộ phiên đăng nhập cũ.</small>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!selected || !canResetPassword(selected)}
              onClick={() => {
                const target = selected;
                setSelected(null);
                openPassword(target);
              }}
            >
              <KeyRound size={14} /> Đổi mật khẩu
            </Button>
          </div>

          {selectedLockedForCurrentAdmin ? (
            <div className="admin-access-warning">
              Tài khoản này đang giữ vai trò nhân sự quản trị. Chỉ System Admin mới được thay đổi trạng thái, mật khẩu hoặc phân quyền của tài khoản này.
            </div>
          ) : null}

          <fieldset disabled={selectedLockedForCurrentAdmin || saving} className="admin-user-fieldset">
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

            <FormField label="Trạng thái">
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="active">Hoạt động</option>
                <option value="restricted">Hạn chế</option>
                <option value="suspended">Tạm khóa</option>
                <option value="banned">Khóa tài khoản</option>
              </select>
            </FormField>

            {isSystemAdmin ? (
              <div className="admin-staff-role-section">
                <div className="admin-staff-role-section__head">
                  <div>
                    <strong>Vai trò nhân sự</strong>
                    <p>Chỉ System Admin được gán hoặc thu hồi vai trò quản trị.</p>
                  </div>
                  <ShieldCheck size={20} />
                </div>
                <div className="admin-staff-role-grid">
                  {(staffRoleCatalog.length ? staffRoleCatalog : staffRoleSlugs.map((slug) => ({ slug }))).map((item) => (
                    <label className="admin-staff-role-option" key={item.slug}>
                      <input
                        type="checkbox"
                        checked={form.staffRoles.includes(item.slug)}
                        onChange={() => toggleStaffRole(item.slug)}
                      />
                      <span>
                        <strong>{ROLE_LABELS[item.slug] || item.name || item.slug}</strong>
                        <small>{ROLE_DESCRIPTIONS[item.slug] || item.description || 'Vai trò nhân sự hệ thống.'}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="form-grid form-grid--2">
              <FormField label="Loại vi phạm (nếu có)">
                <input
                  value={form.violationType}
                  onChange={(event) => setForm({ ...form, violationType: event.target.value })}
                  placeholder="spam, scam, harassment..."
                />
              </FormField>
              <FormField label="Mức độ">
                <select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}>
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                  <option value="critical">Nghiêm trọng</option>
                </select>
              </FormField>
            </div>
            <FormField label="Thông báo gửi người dùng">
              <textarea rows="5" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
            </FormField>
          </fieldset>

          <Button type="submit" disabled={selectedLockedForCurrentAdmin || saving}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </form>
      </Modal>

      <AdminUserPasswordModal
        user={passwordUser}
        open={Boolean(passwordUser)}
        saving={passwordSaving}
        onClose={() => setPasswordUser(null)}
        onSubmit={submitPassword}
      />
    </div>
  );
}
