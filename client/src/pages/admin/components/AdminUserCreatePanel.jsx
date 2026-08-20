import { useState } from 'react';
import { UserPlus } from 'lucide-react';

import Button from '../../../components/common/Button';
import FormField from '../../../components/common/FormField';

const initialForm = {
  username: '',
  email: '',
  password: '',
  role: 'member',
};

export default function AdminUserCreatePanel({ onSubmit, onClose, saving = false }) {
  const [form, setForm] = useState(initialForm);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form className="admin-user-create-panel" onSubmit={(event) => {
      event.preventDefault();
      onSubmit(form);
    }}>
      <header>
        <UserPlus size={18} />
        <div>
          <strong>Thêm người dùng</strong>
          <p>Tạo tài khoản quản trị hoặc thành viên mới.</p>
        </div>
      </header>

      <FormField label="Username">
        <input value={form.username} onChange={(e) => update('username', e.target.value)} required />
      </FormField>

      <FormField label="Email">
        <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
      </FormField>

      <FormField label="Mật khẩu tạm thời">
        <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required />
      </FormField>

      <FormField label="Vai trò">
        <select value={form.role} onChange={(e) => update('role', e.target.value)}>
          <option value="member">Thành viên</option>
          <option value="contributor">Cộng tác viên</option>
          <option value="moderator">Kiểm duyệt viên</option>
          <option value="editor">Biên tập viên</option>
        </select>
      </FormField>

      <footer>
        <Button type="button" onClick={onClose}>Hủy</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo tài khoản'}</Button>
      </footer>
    </form>
  );
}
