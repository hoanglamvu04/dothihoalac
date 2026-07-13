import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import { authApi } from '../../api/auth.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function VerifyEmailPage() {
  const { user, refreshUser } = useAuth(); const toast = useToast(); const navigate = useNavigate();
  const [code, setCode] = useState(''); const [devCode, setDevCode] = useState(''); const [loading, setLoading] = useState(false);
  const request = async () => { setLoading(true); try { const data = await authApi.requestEmailVerification(); setDevCode(data?.devCode || ''); toast.success(data?.alreadyVerified ? 'Email đã được xác thực.' : 'Đã gửi mã xác thực.'); } catch (error) { toast.error(apiErrorMessage(error)); } finally { setLoading(false); } };
  const confirm = async (event) => { event.preventDefault(); setLoading(true); try { await authApi.confirmEmailVerification(code); await refreshUser(); toast.success('Xác thực email thành công.'); navigate('/tai-khoan'); } catch (error) { toast.error(apiErrorMessage(error)); } finally { setLoading(false); } };
  return <section className="auth-page"><Seo title="Xác thực email" /><div className="auth-card"><div className="auth-card__intro"><h1>Xác thực email</h1><p>Mã xác thực gồm 6 chữ số sẽ được gửi tới <strong>{user?.email}</strong>.</p></div>{user?.emailVerifiedAt ? <div className="success-panel"><h2>Email đã xác thực</h2><Button onClick={() => navigate('/tai-khoan')}>Về tài khoản</Button></div> : <form className="stack-form" onSubmit={confirm}><Button variant="outline" onClick={request} loading={loading}>Gửi mã xác thực</Button>{devCode ? <div className="dev-token">Mã phát triển: <strong>{devCode}</strong></div> : null}<FormField label="Mã xác thực" required><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" pattern="\d{6}" maxLength={6} required /></FormField><Button type="submit" loading={loading}>Xác nhận</Button></form>}</div></section>;
}
