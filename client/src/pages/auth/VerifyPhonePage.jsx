import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Phone,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';

export default function VerifyPhonePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const verified = Boolean(user?.phoneVerifiedAt);

  return (
    <section className="auth-page">
      <Seo title="Số điện thoại" />

      <div className="auth-card">
        <div className="auth-card__intro">
          {verified ? (
            <CheckCircle2 size={34} />
          ) : (
            <Phone size={34} />
          )}

          <h1>
            {verified
              ? 'Số điện thoại đã xác thực'
              : 'Chưa yêu cầu OTP số điện thoại'}
          </h1>

          <p>
            {verified
              ? user?.phone || 'Số điện thoại của bạn đã được xác thực.'
              : 'Hiện tại Đô Thị Hòa Lạc chưa bắt buộc xác thực OTP qua SMS. Khi đăng bất động sản, bạn chỉ cần nhập số điện thoại Việt Nam hợp lệ.'}
          </p>
        </div>

        <div className="success-panel">
          <p>
            {verified
              ? 'Trạng thái xác thực cũ vẫn được giữ nguyên.'
              : 'Số điện thoại nhập khi đăng tin sẽ được lưu làm thông tin liên hệ nhưng không được đánh dấu là đã xác thực.'}
          </p>

          <Button onClick={() => navigate('/studio/bat-dong-san')}>
            Đăng tin bất động sản
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/tai-khoan')}
          >
            Về tài khoản
          </Button>
        </div>
      </div>
    </section>
  );
}
