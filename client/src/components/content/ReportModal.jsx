import { useState } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import Button from '../common/Button';
import { REPORT_REASONS } from '../../utils/constants';
import { reportApi } from '../../api/interaction.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

export default function ReportModal({ open, onClose, targetType, targetId }) {
  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await reportApi.create({ targetType, targetId, reason, description });
      toast.success('Báo cáo đã được gửi tới bộ phận kiểm duyệt.');
      setDescription('');
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Báo cáo nội dung">
      <form className="stack-form" onSubmit={submit}>
        <FormField label="Lý do" required>
          <select value={reason} onChange={(event) => setReason(event.target.value)}>
            {Object.entries(REPORT_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </FormField>
        <FormField label="Mô tả thêm"><textarea rows="4" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={3000} /></FormField>
        <div className="form-actions"><Button variant="ghost" onClick={onClose}>Hủy</Button><Button type="submit" loading={loading}>Gửi báo cáo</Button></div>
      </form>
    </Modal>
  );
}
