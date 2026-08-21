import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import Modal from '../../components/common/Modal';

function passwordChecks(password) {
  return {
    length: password.length >= 8 && password.length <= 128,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export default function AdminUserPasswordModal({ user, open, saving, onClose, onSubmit }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const checks = useMemo(() => passwordChecks(password), [password]);
  const strength = Object.values(checks).filter(Boolean).length;
  const matches = Boolean(confirm) && password === confirm;
  const canSubmit = checks.length && matches && !saving;

  useEffect(() => {
    if (!open) return;
    setPassword('');
    setConfirm('');
    setVisible(false);
  }, [open, user?._id]);

  const close = () => {
    if (!saving) onClose();
  };

  const submit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit(password);
  };

  return (
    <Modal open={open} onClose={close} title="Đổi mật khẩu tài khoản">
      <form className="stack-form admin-password-form" onSubmit={submit}>
        <div className="admin-password-user">
          <span className="admin-password-user__icon"><KeyRound size={18} /></span>
          <div>
            <h3>{user?.displayName}</h3>
            <p>@{user?.username} · {user?.email}</p>
          </div>
        </div>

        <div className="admin-password-notice">
          Sau khi đổi mật khẩu, toàn bộ phiên đăng nhập cũ của tài khoản này sẽ bị thu hồi.
        </div>

        <FormField label="Mật khẩu mới">
          <div className="admin-password-input-wrap">
            <input
              type={visible ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              placeholder="Nhập ít nhất 8 ký tự"
              required
            />
            <button
              type="button"
              className="admin-password-visibility"
              onClick={() => setVisible((current) => !current)}
              aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </FormField>

        <div className="admin-password-strength" aria-live="polite">
          <div className="admin-password-strength__bar" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((level) => (
              <span key={level} className={strength >= level ? 'is-active' : ''} />
            ))}
          </div>
          <div className="admin-password-rules">
            <span className={checks.length ? 'is-ok' : ''}>8–128 ký tự</span>
            <span className={checks.uppercase ? 'is-ok' : ''}>Có chữ hoa</span>
            <span className={checks.lowercase ? 'is-ok' : ''}>Có chữ thường</span>
            <span className={checks.number ? 'is-ok' : ''}>Có số</span>
            <span className={checks.special ? 'is-ok' : ''}>Có ký tự đặc biệt</span>
          </div>
          <small>Chỉ yêu cầu tối thiểu 8 ký tự; các tiêu chí còn lại giúp mật khẩu mạnh hơn.</small>
        </div>

        <FormField label="Xác nhận mật khẩu">
          <input
            type={visible ? 'text' : 'password'}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu mới"
            required
          />
        </FormField>

        {confirm && !matches ? (
          <div className="admin-password-error" role="alert">Mật khẩu xác nhận không khớp.</div>
        ) : null}

        <div className="form-actions admin-password-actions">
          <Button type="button" variant="outline" onClick={close} disabled={saving}>Hủy</Button>
          <Button type="submit" disabled={!canSubmit}>
            {saving ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
