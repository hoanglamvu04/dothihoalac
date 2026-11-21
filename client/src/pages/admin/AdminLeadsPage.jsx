import { useEffect, useState } from 'react';
import { AlertCircle, Clock3, RefreshCw } from 'lucide-react';

import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import FormField from '../../components/common/FormField';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { LEAD_STATUS, LEAD_TYPES } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';

import './AdminLeadsPage.css';

const brands = {
  kientruchoalac: 'Kiến Trúc Hòa Lạc',
  mely_space: 'Mely Space',
  media_space: 'Media Space',
  xspace: 'XSpace',
};

const finishedStatuses = new Set(['won', 'lost', 'closed']);

function localDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function isOverdue(item) {
  return (
    item?.nextFollowUpAt &&
    !finishedStatuses.has(item.status) &&
    new Date(item.nextFollowUpAt).getTime() < Date.now()
  );
}

export default function AdminLeadsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [overview, setOverview] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [brand, setBrand] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    status: 'new',
    assignedBrand: '',
    activityType: 'contact',
    note: '',
    assignedTo: '',
    nextFollowUpAt: '',
  });

  useEffect(() => {
    let active = true;
    adminApi.leadsOverview().then((value) => {
      if (active) setOverview(value);
    }).catch(() => null);
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    let active = true;
    adminApi.leads({
      page,
      limit: 20,
      status: status || undefined,
      brand: brand || undefined,
      followUp: followUp || undefined,
    }).then((result) => {
      if (!active) return;
      setItems(result.items || []);
      setMeta(result.meta || {});
    }).catch((requestError) => {
      if (active) toast.error(apiErrorMessage(requestError));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, brand, followUp, reload]);

  const open = async (item) => {
    setSelected(item);
    setDetail(null);
    setForm({
      status: item.status || 'new',
      assignedBrand: item.assignedBrand || '',
      activityType: 'contact',
      note: '',
      assignedTo: '',
      nextFollowUpAt: localDateTime(item.nextFollowUpAt),
    });
    try {
      setDetail(await adminApi.leadDetail(item._id));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!selected || saving) return;

    setSaving(true);
    try {
      await adminApi.updateLead(selected._id, {
        ...form,
        assignedTo: form.assignedTo || undefined,
        assignedBrand: form.assignedBrand || selected.assignedBrand,
        nextFollowUpAt: form.nextFollowUpAt
          ? new Date(form.nextFollowUpAt).toISOString()
          : null,
      });
      toast.success('Đã cập nhật khách hàng và lịch nhắc lại.');
      setSelected(null);
      setDetail(null);
      setLoading(true);
      setReload((value) => value + 1);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-leads-v3">
      <Seo title="Khách hàng tiềm năng" />
      <div className="panel-heading">
        <div>
          <h2>Khách hàng tiềm năng</h2>
          <p>Quản lý nhu cầu, lịch liên hệ và kết quả chuyển đổi.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => {
          setLoading(true);
          setReload((value) => value + 1);
        }}><RefreshCw size={15} /> Làm mới</Button>
      </div>

      {overview ? (
        <div className="admin-leads-stats">
          <div><strong>{overview.total}</strong><span>Tổng khách hàng</span></div>
          <div><strong>{overview.newLast7Days}</strong><span>Tiếp nhận 7 ngày</span></div>
          <div><strong>{overview.won}</strong><span>Chốt dịch vụ</span></div>
          <button type="button" className="admin-leads-due" onClick={() => {
            setFollowUp('overdue');
            setPage(1);
          }}>
            <strong>{overview.overdueFollowUps}</strong>
            <span><AlertCircle size={15} /> Đến hạn liên hệ</span>
          </button>
        </div>
      ) : null}

      <div className="admin-leads-filters">
        <select value={brand} onChange={(event) => { setBrand(event.target.value); setPage(1); }}>
          <option value="">Mọi thương hiệu</option>
          {Object.entries(brands).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(LEAD_STATUS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select value={followUp} onChange={(event) => { setFollowUp(event.target.value); setPage(1); }}>
          <option value="">Tất cả lịch liên hệ</option>
          <option value="overdue">Cần liên hệ ngay</option>
        </select>
      </div>

      {loading ? <LoadingBlock /> : items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Nhu cầu</th>
                <th>Thương hiệu</th>
                <th>Trạng thái</th>
                <th>Nhắc lại</th>
                <th>Ngày nhận</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td><strong>{item.fullName}</strong><small>{item.phone} · {item.email || 'Không có email'}</small></td>
                  <td>{LEAD_TYPES[item.leadType] || item.leadType}<small>{item.areaId?.name || item.sourcePage || '—'}</small></td>
                  <td>{brands[item.assignedBrand] || 'Chưa phân loại'}</td>
                  <td>
                    <Badge tone={item.status === 'new' ? 'warning' : item.status === 'won' ? 'success' : 'soft'}>
                      {LEAD_STATUS[item.status] || item.status}
                    </Badge>
                  </td>
                  <td className={isOverdue(item) ? 'is-overdue' : ''}>
                    {item.nextFollowUpAt ? (
                      <span><Clock3 size={13} /> {formatDateTime(item.nextFollowUpAt)}</span>
                    ) : '—'}
                  </td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td><Button size="sm" onClick={() => open(item)}>Mở</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="Chưa có khách hàng phù hợp" />}

      <Pagination meta={meta} onPageChange={(nextPage) => {
        setPage(nextPage);
        setLoading(true);
      }} />

      <Modal
        open={Boolean(selected)}
        onClose={() => { setSelected(null); setDetail(null); }}
        title="Chi tiết khách hàng"
      >
        {selected ? (
          <form className="stack-form" onSubmit={submit}>
            <div className="lead-detail-card">
              <h3>{selected.fullName}</h3>
              <p><strong>Điện thoại:</strong> {selected.phone}</p>
              <p><strong>Email:</strong> {selected.email || '—'}</p>
              <p><strong>Nhu cầu:</strong> {LEAD_TYPES[selected.leadType] || selected.leadType}</p>
              <p><strong>Nội dung:</strong> {selected.message || '—'}</p>
              <p><strong>Ngân sách:</strong> {selected.budgetRange || '—'}</p>
              <p><strong>Thời gian dự kiến:</strong> {selected.expectedTime || '—'}</p>
            </div>

            <div className="form-grid form-grid--2">
              <FormField label="Trạng thái">
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  {Object.entries(LEAD_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </FormField>
              <FormField label="Chuyển thương hiệu">
                <select value={form.assignedBrand} onChange={(event) => setForm({ ...form, assignedBrand: event.target.value })}>
                  {Object.entries(brands).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </FormField>
            </div>

            <FormField label="Lịch nhắc liên hệ lại">
              <input
                type="datetime-local"
                value={form.nextFollowUpAt}
                onChange={(event) => setForm({ ...form, nextFollowUpAt: event.target.value })}
              />
            </FormField>
            <FormField label="Loại hoạt động">
              <select value={form.activityType} onChange={(event) => setForm({ ...form, activityType: event.target.value })}>
                <option value="contact">Đã liên hệ</option>
                <option value="no_answer">Không liên hệ được</option>
                <option value="consultation">Đã tư vấn</option>
                <option value="proposal_sent">Đã gửi đề xuất</option>
                <option value="survey_booked">Đã đặt lịch khảo sát</option>
                <option value="converted">Đã chốt dịch vụ</option>
                <option value="admin_update">Cập nhật quản trị</option>
              </select>
            </FormField>
            <FormField label="Ghi chú">
              <textarea rows="5" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
            </FormField>
            {detail?.activities?.length ? (
              <div className="activity-timeline">
                <h4>Lịch sử xử lý</h4>
                {detail.activities.map((activity) => (
                  <div key={activity._id}>
                    <strong>{activity.activityType}</strong>
                    <span>{activity.note}</span>
                    <small>{formatDateTime(activity.createdAt)}</small>
                  </div>
                ))}
              </div>
            ) : null}
            <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu cập nhật'}</Button>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
