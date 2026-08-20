import { useState } from 'react';

import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import Modal from '../../components/common/Modal';

export default function AdminUserPasswordModal({ user, open, saving, onClose, onSubmit }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    if (!password || password !== confirm) return;
    onSubmit(password);
  };

  return (
    <Modal open={open} onClose={onClose} title="Đổi mật khẩu tài khoản">
      <form className="stack-form" onSubmit={submit}>
        <div className="moderation-preview">
          <h3>{user?.displayName}</h3>
          <p>@{user?.username} · {user?.email}</p>
        </div>
        <FormField label="Mật khẩu mới">
          <input
            type={visible ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </FormField>
        <FormField label="Xác nhận mật khẩu">
          <input
            type={visible ? 'text' : 'password'}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </FormField>
        <label>
          <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /> Hiện mật khẩu
        </label>
        <div className="form-actions">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="submit" disabled={saving || password.length < 8 || password !== confirm}>
            {saving ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
