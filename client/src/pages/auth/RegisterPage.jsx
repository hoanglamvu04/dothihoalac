import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/http';

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', displayName: '', password: '', confirmPassword: '', acceptTerms: false });
  const [loading, setLoading] = useState(false);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setLoading(true);
    try { await register(form); toast.success('Đăng ký thành công. Hãy xác thực email.'); navigate('/xac-thuc-email'); }
    catch (error) { toast.error(apiErrorMessage(error)); } finally { setLoading(false); }
  };
  return (
    <section className="auth-page"><Seo title="Đăng ký" /><div className="auth-card auth-card--wide"><div className="auth-card__intro"><span>Tham gia cộng đồng</span><h1>Tạo tài khoản mới</h1><p>Đăng bài, bình luận, lưu tin và theo dõi các khu vực bạn quan tâm.</p></div><form onSubmit={submit} className="stack-form"><div className="form-grid form-grid--2"><FormField label="Tên hiển thị" required><input value={form.displayName} onChange={(event) => change('displayName', event.target.value)} required minLength={2} maxLength={80} /></FormField><FormField label="Tên người dùng" required hint="Chữ thường không dấu, số, dấu chấm hoặc gạch dưới."><input value={form.username} onChange={(event) => change('username', event.target.value.toLowerCase())} required minLength={4} maxLength={30} pattern="[a-z0-9._]+" /></FormField></div><FormField label="Email" required><input type="email" value={form.email} onChange={(event) => change('email', event.target.value)} required /></FormField><div className="form-grid form-grid--2"><FormField label="Mật khẩu" required hint="Tối thiểu 8 ký tự."><input type="password" value={form.password} onChange={(event) => change('password', event.target.value)} required minLength={8} /></FormField><FormField label="Xác nhận mật khẩu" required><input type="password" value={form.confirmPassword} onChange={(event) => change('confirmPassword', event.target.value)} required minLength={8} /></FormField></div><label className="checkbox-row"><input type="checkbox" checked={form.acceptTerms} onChange={(event) => change('acceptTerms', event.target.checked)} required /><span>Tôi đồng ý với <Link to="/dieu-khoan" target="_blank">Điều khoản sử dụng</Link> và <Link to="/chinh-sach-quyen-rieng" target="_blank">Chính sách quyền riêng tư</Link>.</span></label><Button type="submit" loading={loading} className="btn--full">Tạo tài khoản</Button><p className="auth-switch">Đã có tài khoản? <Link to="/dang-nhap">Đăng nhập</Link></p></form></div></section>
  );
}
