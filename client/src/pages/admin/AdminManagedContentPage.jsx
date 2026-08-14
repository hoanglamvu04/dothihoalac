import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { CONTENT_STATUS } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';

import './AdminManagedContentPage.css';

const STATUS_OPTIONS = [
  ['', 'Tất cả'],
  ['draft', 'Nháp'],
  ['pending_review', 'Chờ duyệt'],
  ['needs_revision', 'Cần sửa'],
  ['approved', 'Đã duyệt'],
  ['published', 'Đã đăng'],
  ['hidden', 'Đã ẩn'],
  ['rejected', 'Từ chối'],
  ['archived', 'Lưu trữ'],
  ['expired', 'Hết hạn'],
];

const STATUS_ACTIONS = [
  ['published', 'Duyệt & đăng'],
  ['approved', 'Duyệt'],
  ['needs_revision', 'Yêu cầu sửa'],
  ['rejected', 'Từ chối'],
  ['hidden', 'Ẩn'],
  ['archived', 'Lưu trữ'],
  ['draft', 'Chuyển về nháp'],
];

const CONFIG = {
  community: {
    title: 'Cộng đồng',
    kicker: 'Nội dung thành viên',
    description: 'Quản lý toàn bộ bài cộng đồng: tìm kiếm, xem chi tiết, sửa nội dung, duyệt, đăng, ẩn, lưu trữ và xóa.',
    publicBase: '/cong-dong',
    createPath: '/dang-bai/cong-dong',
    detailKey: 'community',
    columns: [
      ['postType', 'Loại bài'],
      ['questionStatus', 'Hỏi đáp'],
      ['incidentStatus', 'Phản ánh'],
    ],
    fields: [
      ['postType', 'Loại bài', 'select', ['discussion', 'question', 'report', 'sharing', 'review', 'support', 'marketplace', 'community_event', 'other']],
      ['questionStatus', 'Trạng thái hỏi đáp', 'select', ['open', 'answered', 'closed']],
      ['incidentStatus', 'Trạng thái phản ánh', 'select', ['new', 'verifying', 'forwarded', 'processing', 'resolved', 'insufficient_evidence']],
      ['locationText', 'Địa điểm', 'text'],
      ['rating', 'Đánh giá', 'number'],
    ],
  },
  property: {
    title: 'Tin bất động sản',
    kicker: 'Marketplace địa phương',
    description: 'Quản lý toàn bộ tin nhà đất: xem dữ liệu người đăng, sửa thông tin tin, duyệt/đăng, ẩn, đánh dấu trạng thái và xóa.',
    publicBase: '/nha-dat',
    createPath: '/dang-bai/nha-dat',
    detailKey: 'property',
    columns: [
      ['transactionType', 'Giao dịch'],
      ['propertyType', 'Loại BĐS'],
      ['price', 'Giá'],
    ],
    fields: [
      ['transactionType', 'Loại giao dịch', 'select', ['sale', 'rent', 'transfer', 'wanted_buy', 'wanted_rent']],
      ['propertyType', 'Loại bất động sản', 'select', ['residential_land', 'land_plot', 'project_land', 'service_land', 'house', 'townhouse', 'villa', 'apartment', 'mini_apartment', 'room', 'whole_house', 'commercial_space', 'office', 'warehouse', 'farm']],
      ['ownerType', 'Người đăng', 'select', ['owner', 'broker', 'business']],
      ['price', 'Giá', 'number'],
      ['priceUnit', 'Đơn vị giá', 'select', ['total', 'per_m2', 'per_month', 'negotiable']],
      ['isNegotiable', 'Giá thỏa thuận', 'checkbox'],
      ['landArea', 'Diện tích đất (m²)', 'number'],
      ['usableArea', 'Diện tích sử dụng (m²)', 'number'],
      ['bedrooms', 'Phòng ngủ', 'number'],
      ['bathrooms', 'Phòng tắm', 'number'],
      ['frontage', 'Mặt tiền (m)', 'number'],
      ['roadWidth', 'Đường rộng (m)', 'number'],
      ['direction', 'Hướng', 'select', ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'unknown']],
      ['legalStatus', 'Pháp lý', 'select', ['red_book', 'contract', 'waiting_certificate', 'shared_certificate', 'other', 'unknown']],
      ['addressText', 'Địa chỉ', 'text'],
      ['contactName', 'Tên liên hệ', 'text'],
      ['contactPhone', 'Điện thoại', 'text'],
      ['contactEmail', 'Email liên hệ', 'email'],
      ['expiresAt', 'Ngày hết hạn', 'datetime-local'],
    ],
  },
  job: {
    title: 'Việc làm',
    kicker: 'Tuyển dụng địa phương',
    description: 'Quản lý toàn bộ tin tuyển dụng thay vì chỉ hàng chờ duyệt: xem, sửa, duyệt, đăng, ẩn, lưu trữ và xóa.',
    publicBase: '/viec-lam',
    createPath: '/dang-bai/viec-lam',
    detailKey: 'job',
    columns: [
      ['companyName', 'Doanh nghiệp'],
      ['jobType', 'Loại việc'],
      ['deadline', 'Hạn nộp'],
    ],
    fields: [
      ['jobType', 'Loại việc', 'select', ['full_time', 'part_time', 'internship', 'temporary', 'student', 'construction', 'service']],
      ['companyName', 'Tên doanh nghiệp', 'text'],
      ['salaryMin', 'Lương từ', 'number'],
      ['salaryMax', 'Lương đến', 'number'],
      ['salaryUnit', 'Đơn vị lương', 'select', ['month', 'hour', 'day', 'project', 'negotiable']],
      ['experienceLevel', 'Kinh nghiệm', 'select', ['none', 'under_1_year', '1_3_years', '3_5_years', 'over_5_years']],
      ['workLocation', 'Nơi làm việc', 'text'],
      ['applicationMethod', 'Cách ứng tuyển', 'textarea'],
      ['contactEmail', 'Email', 'email'],
      ['contactPhone', 'Điện thoại', 'text'],
      ['deadline', 'Hạn nộp', 'datetime-local'],
      ['positionsCount', 'Số lượng tuyển', 'number'],
    ],
  },
};

function toneForStatus(status) {
  if (status === 'published' || status === 'approved') return 'success';
  if (status === 'pending_review' || status === 'needs_revision') return 'warning';
  if (status === 'rejected' || status === 'hidden' || status === 'deleted') return 'danger';
  return 'soft';
}

function inputValue(value, type) {
  if (type === 'datetime-local' && value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 16);
  }
  return value ?? '';
}

function normalizeFieldValue(value, type) {
  if (type === 'number') return value === '' ? null : Number(value);
  if (type === 'checkbox') return Boolean(value);
  if (type === 'datetime-local') return value ? new Date(value).toISOString() : null;
  return value;
}

export default function AdminManagedContentPage({ type }) {
  const config = CONFIG[type];
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const load = () => {
    setLoading(true);
    adminApi.managedContents(type, {
      page,
      limit: 20,
      status: status || undefined,
      q: appliedQuery || undefined,
    })
      .then((result) => {
        setItems(result.items);
        setMeta(result.meta);
      })
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [type, page, status, appliedQuery, reloadKey]);

  const publicUrl = (item) => `${config.publicBase}/${item._id}/${item.slug}`;

  const openDetail = async (item, edit = false) => {
    setDetailLoading(true);
    setDetail(item);
    setEditing(edit);
    try {
      const result = await adminApi.managedContentDetail(type, item._id);
      setDetail(result);
      setForm({
        title: result.title || '',
        summary: result.summary || '',
        bodyHtml: result.body?.bodyHtml || '',
        visibility: result.visibility || 'public',
        allowComments: result.allowComments !== false,
        isFeatured: Boolean(result.isFeatured),
        isSponsored: Boolean(result.isSponsored),
        details: { ...(result[config.detailKey] || {}) },
      });
    } catch (error) {
      toast.error(apiErrorMessage(error));
      setDetail(null);
      setEditing(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    if (saving) return;
    setDetail(null);
    setForm(null);
    setEditing(false);
  };

  const save = async () => {
    if (!detail || !form || saving) return;
    setSaving(true);
    try {
      const result = await adminApi.updateManagedContent(type, detail._id, form);
      toast.success('Đã lưu thay đổi.');
      setDetail(result);
      setEditing(false);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (item, nextStatus) => {
    if (!nextStatus || busyId) return;
    const accepted = window.confirm(`Chuyển “${item.title}” sang trạng thái “${CONTENT_STATUS[nextStatus] || nextStatus}”?`);
    if (!accepted) return;
    setBusyId(String(item._id));
    try {
      const result = await adminApi.updateManagedContentStatus(type, item._id, nextStatus);
      toast.success('Đã cập nhật trạng thái.');
      if (detail?._id === item._id) setDetail(result);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusyId('');
    }
  };

  const remove = async (item) => {
    if (busyId) return;
    if (!window.confirm(`Xóa “${item.title}”? Nội dung sẽ bị xóa mềm và biến mất khỏi website.`)) return;
    setBusyId(String(item._id));
    try {
      await adminApi.deleteManagedContent(type, item._id);
      toast.success('Đã xóa nội dung.');
      if (detail?._id === item._id) closeDetail();
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusyId('');
    }
  };

  const detailData = detail?.[config.detailKey] || {};
  const authorName = (item) => item.authorId?.displayName || item.authorId?.username || item.authorId?.email || 'Thành viên';

  const detailPairs = useMemo(() => {
    if (!detail) return [];
    return config.fields.map(([key, label]) => [label, detailData[key]]);
  }, [detail, detailData, config.fields]);

  return (
    <div>
      <Seo title={`Quản lý ${config.title}`} />
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">{config.kicker}</p>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <div className="admin-row-actions">
          <a className="admin-secondary" href={config.publicBase} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Xem ngoài website
          </a>
          <a className="admin-primary" href={config.createPath} target="_blank" rel="noreferrer">
            <Plus size={14} /> Thêm mới
          </a>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="filter-tabs">
          {STATUS_OPTIONS.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={status === value ? 'is-active' : ''}
              onClick={() => { setStatus(value); setPage(1); }}
            >
              {label}
            </button>
          ))}
        </div>
        <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedQuery(query.trim()); }}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tiêu đề hoặc mô tả…" />
          <button className="admin-secondary" type="submit"><Search size={14} /> Tìm</button>
        </form>
      </div>

      {loading ? <LoadingBlock /> : items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table admin-managed-table">
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Người đăng</th>
                {config.columns.map(([, label]) => <th key={label}>{label}</th>)}
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const extra = item[config.detailKey] || {};
                return (
                  <tr key={item._id}>
                    <td><strong>{item.title}</strong><small>{item.summary || 'Không có mô tả ngắn'}</small></td>
                    <td><strong>{authorName(item)}</strong><small>{item.authorId?.email || '—'}</small></td>
                    {config.columns.map(([key]) => (
                      <td key={key}>{key === 'deadline' && extra[key] ? formatDateTime(extra[key]) : String(extra[key] ?? '—')}</td>
                    ))}
                    <td><Badge tone={toneForStatus(item.status)}>{CONTENT_STATUS[item.status] || item.status}</Badge></td>
                    <td>{formatDateTime(item.updatedAt)}</td>
                    <td>
                      <div className="admin-row-actions admin-managed-actions">
                        <button type="button" onClick={() => openDetail(item)}><Eye size={13} /> Chi tiết</button>
                        <button type="button" onClick={() => openDetail(item, true)}><Pencil size={13} /> Sửa</button>
                        <a href={publicUrl(item)} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Xem</a>
                        <select
                          aria-label="Đổi trạng thái"
                          value=""
                          disabled={busyId === String(item._id)}
                          onChange={(event) => changeStatus(item, event.target.value)}
                        >
                          <option value="">Trạng thái…</option>
                          {STATUS_ACTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <button type="button" className="is-danger" onClick={() => remove(item)}><Trash2 size={13} /> Xóa</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title={`Chưa có ${config.title.toLowerCase()} phù hợp bộ lọc`} />}

      <Pagination meta={meta} onPageChange={setPage} />

      {detail ? (
        <div className="admin-managed-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}>
          <section className="admin-managed-modal" role="dialog" aria-modal="true" aria-label={`Chi tiết ${config.title}`}>
            <header>
              <div>
                <p className="admin-kicker">{editing ? 'Chỉnh sửa' : 'Chi tiết'}</p>
                <h2>{detail.title}</h2>
              </div>
              <button type="button" className="admin-secondary" onClick={closeDetail}>Đóng</button>
            </header>

            {detailLoading ? <LoadingBlock /> : editing && form ? (
              <div className="admin-managed-form">
                <label className="is-wide"><span>Tiêu đề</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                <label className="is-wide"><span>Mô tả ngắn</span><textarea rows="3" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
                <label><span>Hiển thị</span><select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value })}><option value="public">Công khai</option><option value="members">Thành viên</option><option value="private">Riêng tư</option></select></label>
                <label className="admin-managed-check"><input type="checkbox" checked={form.allowComments} onChange={(event) => setForm({ ...form, allowComments: event.target.checked })} /><span>Cho phép bình luận</span></label>
                <label className="admin-managed-check"><input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} /><span>Nổi bật</span></label>
                <label className="admin-managed-check"><input type="checkbox" checked={form.isSponsored} onChange={(event) => setForm({ ...form, isSponsored: event.target.checked })} /><span>Tài trợ</span></label>

                {config.fields.map(([key, label, fieldType, options]) => (
                  <label key={key} className={fieldType === 'textarea' ? 'is-wide' : ''}>
                    <span>{label}</span>
                    {fieldType === 'select' ? (
                      <select value={form.details?.[key] ?? ''} onChange={(event) => setForm({ ...form, details: { ...form.details, [key]: event.target.value } })}>
                        <option value="">—</option>
                        {options.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : fieldType === 'textarea' ? (
                      <textarea rows="4" value={form.details?.[key] ?? ''} onChange={(event) => setForm({ ...form, details: { ...form.details, [key]: event.target.value } })} />
                    ) : fieldType === 'checkbox' ? (
                      <input type="checkbox" checked={Boolean(form.details?.[key])} onChange={(event) => setForm({ ...form, details: { ...form.details, [key]: event.target.checked } })} />
                    ) : (
                      <input
                        type={fieldType}
                        value={inputValue(form.details?.[key], fieldType)}
                        onChange={(event) => setForm({ ...form, details: { ...form.details, [key]: normalizeFieldValue(event.target.value, fieldType) } })}
                      />
                    )}
                  </label>
                ))}

                <label className="is-wide"><span>Nội dung HTML</span><textarea rows="12" value={form.bodyHtml} onChange={(event) => setForm({ ...form, bodyHtml: event.target.value })} /></label>
                <div className="admin-managed-form-actions is-wide">
                  <button type="button" className="admin-secondary" onClick={() => setEditing(false)}>Hủy sửa</button>
                  <button type="button" className="admin-primary" disabled={saving} onClick={save}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
                </div>
              </div>
            ) : (
              <div className="admin-managed-detail">
                <dl>
                  <div><dt>ID</dt><dd>{detail._id}</dd></div>
                  <div><dt>Người đăng</dt><dd>{authorName(detail)} · {detail.authorId?.email || '—'}</dd></div>
                  <div><dt>Trạng thái</dt><dd><Badge tone={toneForStatus(detail.status)}>{CONTENT_STATUS[detail.status] || detail.status}</Badge></dd></div>
                  <div><dt>Khu vực</dt><dd>{detail.primaryAreaId?.name || '—'}</dd></div>
                  <div><dt>Danh mục</dt><dd>{detail.primaryCategoryId?.name || '—'}</dd></div>
                  <div><dt>Lượt xem</dt><dd>{detail.viewCount ?? 0}</dd></div>
                  <div><dt>Bình luận</dt><dd>{detail.commentCount ?? 0}</dd></div>
                  <div><dt>Reaction</dt><dd>{detail.reactionCount ?? 0}</dd></div>
                  {detailPairs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{String(value ?? '—')}</dd></div>)}
                </dl>
                <div className="admin-managed-summary"><strong>Mô tả</strong><p>{detail.summary || '—'}</p></div>
                <div className="admin-managed-body"><strong>Nội dung</strong><div dangerouslySetInnerHTML={{ __html: detail.body?.bodyHtml || '<p>Không có nội dung.</p>' }} /></div>
                <div className="admin-managed-form-actions">
                  <a className="admin-secondary" href={publicUrl(detail)} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Xem ngoài website</a>
                  <button type="button" className="admin-primary" onClick={() => setEditing(true)}><Pencil size={14} /> Sửa</button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
