import { useState } from 'react';
import Button from '../common/Button';
import FormField from '../common/FormField';
import { leadApi } from '../../api/lead.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { useToast } from '../../context/ToastContext';
import { LEAD_TYPES } from '../../utils/constants';

export default function LeadForm({
  presetType = 'architecture_design',
  assignedBrand = 'kientruchoalac',
  sourceContentId = null,
  compact = false,
  onSuccess,
}) {
  const { user } = useAuth();
  const { areas } = useTaxonomy();
  const toast = useToast();
  const [form, setForm] = useState({
    leadType: presetType,
    fullName: user?.displayName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    areaId: '',
    message: '',
    budgetRange: '',
    expectedTime: '',
    consent: false,
  });
  const [loading, setLoading] = useState(false);

  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await leadApi.create({
        ...form,
        areaId: form.areaId || null,
        sourceContentId,
        sourcePage: window.location.pathname,
        assignedBrand,
      });
      toast.success('Đã gửi yêu cầu. Bộ phận phụ trách sẽ liên hệ với bạn.');
      setForm((current) => ({ ...current, message: '', consent: false }));
      onSuccess?.();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={`lead-form ${compact ? 'lead-form--compact' : ''}`} onSubmit={submit}>
      <div className="form-grid form-grid--2">
        <FormField label="Nhu cầu" required><select value={form.leadType} onChange={(event) => change('leadType', event.target.value)}>{Object.entries(LEAD_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormField>
        <FormField label="Khu vực"><select value={form.areaId} onChange={(event) => change('areaId', event.target.value)}><option value="">Chưa xác định</option>{areas.map((area) => <option key={area._id} value={area._id}>{area.name}</option>)}</select></FormField>
        <FormField label="Họ và tên" required><input value={form.fullName} onChange={(event) => change('fullName', event.target.value)} required minLength={2} maxLength={100} /></FormField>
        <FormField label="Số điện thoại" required><input value={form.phone} onChange={(event) => change('phone', event.target.value)} required minLength={9} maxLength={20} /></FormField>
        <FormField label="Email"><input type="email" value={form.email} onChange={(event) => change('email', event.target.value)} /></FormField>
        <FormField label="Ngân sách dự kiến"><input value={form.budgetRange} onChange={(event) => change('budgetRange', event.target.value)} placeholder="Ví dụ: 1-2 tỷ" /></FormField>
      </div>
      <FormField label="Thời gian dự kiến"><input value={form.expectedTime} onChange={(event) => change('expectedTime', event.target.value)} placeholder="Ví dụ: Khởi công tháng 10/2026" /></FormField>
      <FormField label="Nội dung cần tư vấn"><textarea rows={compact ? 3 : 5} value={form.message} onChange={(event) => change('message', event.target.value)} maxLength={5000} /></FormField>
      <label className="checkbox-row"><input type="checkbox" checked={form.consent} onChange={(event) => change('consent', event.target.checked)} required /><span>Tôi đồng ý để Đô Thị Hòa Lạc chuyển thông tin này tới đơn vị phù hợp trong hệ sinh thái XSpace.</span></label>
      <Button type="submit" loading={loading}>Gửi yêu cầu tư vấn</Button>
    </form>
  );
}
