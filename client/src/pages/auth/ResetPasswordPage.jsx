import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import { authApi } from '../../api/auth.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

export default function ResetPasswordPage() {
  const { token } = useParams(); const navigate = useNavigate(); const toast = useToast();
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' }); const [loading, setLoading] = useState(false);
  const submit = async (event) => { event.preventDefault(); setLoading(true); try { await authApi.resetPassword({ token, ...form }); toast.success('Đặt lại mật khẩu thành công.'); navigate('/dang-nhap'); } catch (error) { toast.error(apiErrorMessage(error)); } finally { setLoading(false); } };
  return <section className="auth-page"><Seo title="Đặt lại mật khẩu" /><div className="auth-card"><div className="auth-card__intro"><h1>Đặt lại mật khẩu</h1><p>Tạo mật khẩu mới có tối thiểu 8 ký tự.</p></div><form className="stack-form" onSubmit={submit}><FormField label="Mật khẩu mới" required><input type="password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} minLength={8} required /></FormField><FormField label="Xác nhận mật khẩu" required><input type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} minLength={8} required /></FormField><Button type="submit" loading={loading} className="btn--full">Đặt lại mật khẩu</Button><p className="auth-switch"><Link to="/dang-nhap">Quay lại đăng nhập</Link></p></form></div></section>;
}
