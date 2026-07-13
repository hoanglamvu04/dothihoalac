import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import { authApi } from '../../api/auth.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function SecurityPage() {
  const { user, logout } = useAuth(); const toast = useToast(); const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' }); const [loading, setLoading] = useState(false);
  const submit = async (event) => { event.preventDefault(); setLoading(true); try { await authApi.changePassword(form); toast.success('Đã đổi mật khẩu. Vui lòng đăng nhập lại.'); await logout(); navigate('/dang-nhap'); } catch (error) { toast.error(apiErrorMessage(error)); } finally { setLoading(false); } };
  return <div><Seo title="Bảo mật tài khoản" /><h2>Bảo mật và xác thực</h2><div className="verification-grid"><div><strong>Email</strong><span>{user?.email}</span><b className={user?.emailVerifiedAt ? 'text-success' : 'text-warning'}>{user?.emailVerifiedAt ? 'Đã xác thực' : 'Chưa xác thực'}</b>{!user?.emailVerifiedAt ? <Link to="/xac-thuc-email">Xác thực ngay</Link> : null}</div><div><strong>Số điện thoại</strong><span>{user?.phone || 'Chưa cập nhật'}</span><b className={user?.phoneVerifiedAt ? 'text-success' : 'text-warning'}>{user?.phoneVerifiedAt ? 'Đã xác thực' : 'Chưa xác thực'}</b>{!user?.phoneVerifiedAt ? <Link to="/xac-thuc-so-dien-thoai">Xác thực ngay</Link> : null}</div></div><hr className="section-divider" /><h2>Đổi mật khẩu</h2><form className="stack-form form-card--plain" onSubmit={submit}><FormField label="Mật khẩu hiện tại" required><input type="password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} required /></FormField><div className="form-grid form-grid--2"><FormField label="Mật khẩu mới" required><input type="password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} minLength={8} required /></FormField><FormField label="Xác nhận mật khẩu" required><input type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} minLength={8} required /></FormField></div><Button type="submit" loading={loading}>Đổi mật khẩu</Button></form></div>;
}
