import { useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import { authApi } from '../../api/auth.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [devToken, setDevToken] = useState('');
  const toast = useToast();
  const submit = async (event) => { event.preventDefault(); setLoading(true); try { const data = await authApi.forgotPassword(email); setDevToken(data?.devToken || ''); setDone(true); } catch (error) { toast.error(apiErrorMessage(error)); } finally { setLoading(false); } };
  return <section className="auth-page"><Seo title="Quên mật khẩu" /><div className="auth-card"><div className="auth-card__intro"><span>Khôi phục tài khoản</span><h1>Quên mật khẩu</h1><p>Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.</p></div>{done ? <div className="success-panel"><h2>Kiểm tra email của bạn</h2><p>Nếu email tồn tại, hệ thống đã gửi đường dẫn đặt lại mật khẩu.</p>{devToken ? <Link className="btn btn--primary btn--md" to={`/dat-lai-mat-khau/${devToken}`}>Mở liên kết thử nghiệm</Link> : null}<Link to="/dang-nhap">Quay lại đăng nhập</Link></div> : <form className="stack-form" onSubmit={submit}><FormField label="Email" required><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></FormField><Button type="submit" loading={loading} className="btn--full">Gửi hướng dẫn</Button><p className="auth-switch"><Link to="/dang-nhap">Quay lại đăng nhập</Link></p></form>}</div></section>;
}
