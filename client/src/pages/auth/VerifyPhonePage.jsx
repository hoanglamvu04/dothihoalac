import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import { authApi } from '../../api/auth.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function VerifyPhonePage() {
  const { user, refreshUser } = useAuth(); const toast = useToast(); const navigate = useNavigate();
  const [phone, setPhone] = useState(user?.phone || ''); const [code, setCode] = useState(''); const [devCode, setDevCode] = useState(''); const [sent, setSent] = useState(false); const [loading, setLoading] = useState(false);
  const request = async () => { setLoading(true); try { const data = await authApi.requestPhoneOtp(phone); setPhone(data.phone || phone); setDevCode(data?.devCode || ''); setSent(true); toast.success('Đã gửi mã OTP.'); } catch (error) { toast.error(apiErrorMessage(error)); } finally { setLoading(false); } };
  const confirm = async (event) => { event.preventDefault(); setLoading(true); try { await authApi.confirmPhoneOtp(phone, code); await refreshUser(); toast.success('Xác thực số điện thoại thành công.'); navigate('/tai-khoan'); } catch (error) { toast.error(apiErrorMessage(error)); } finally { setLoading(false); } };
  return <section className="auth-page"><Seo title="Xác thực số điện thoại" /><div className="auth-card"><div className="auth-card__intro"><h1>Xác thực số điện thoại</h1><p>Bắt buộc trước khi đăng tin bất động sản.</p></div>{user?.phoneVerifiedAt ? <div className="success-panel"><h2>Số điện thoại đã xác thực</h2><p>{user.phone}</p><Button onClick={() => navigate('/tai-khoan')}>Về tài khoản</Button></div> : <form className="stack-form" onSubmit={confirm}><FormField label="Số điện thoại" required><input value={phone} onChange={(event) => setPhone(event.target.value)} required minLength={9} maxLength={20} /></FormField><Button variant="outline" onClick={request} loading={loading}>Gửi mã OTP</Button>{sent ? <><FormField label="Mã OTP" required><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} required /></FormField>{devCode ? <div className="dev-token">Mã phát triển: <strong>{devCode}</strong></div> : null}<Button type="submit" loading={loading}>Xác nhận OTP</Button></> : null}</form>}</div></section>;
}
