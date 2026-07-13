import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/http';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setLoading(true);
    try {
      await login(form); toast.success('Đăng nhập thành công.');
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (error) { toast.error(apiErrorMessage(error)); } finally { setLoading(false); }
  };
  return (
    <section className="auth-page"><Seo title="Đăng nhập" /><div className="auth-card"><div className="auth-card__intro"><span>Chào mừng trở lại</span><h1>Đăng nhập Đô Thị Hòa Lạc</h1><p>Theo dõi nội dung, tham gia cộng đồng và quản lý các bài đăng của bạn.</p></div><form onSubmit={submit} className="stack-form"><FormField label="Email hoặc tên người dùng" required><div className="input-with-icon"><Mail size={18} /><input value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} required autoComplete="username" /></div></FormField><FormField label="Mật khẩu" required><div className="input-with-icon"><LockKeyhole size={18} /><input type={show ? 'text' : 'password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required autoComplete="current-password" /><button type="button" onClick={() => setShow((value) => !value)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></FormField><div className="form-row-between"><label className="checkbox-row"><input type="checkbox" /><span>Ghi nhớ đăng nhập</span></label><Link to="/quen-mat-khau">Quên mật khẩu?</Link></div><Button type="submit" loading={loading} className="btn--full">Đăng nhập</Button><p className="auth-switch">Chưa có tài khoản? <Link to="/dang-ky">Đăng ký ngay</Link></p></form></div></section>
  );
}
