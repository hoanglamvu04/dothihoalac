import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Eye,
  Image as ImageIcon,
  MousePointerClick,
  PauseCircle,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import FormField from '../../components/common/FormField';
import MediaUploader from '../../components/forms/MediaUploader';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { mediaUrl } from '../../utils/media';
import { formatDateTime } from '../../utils/formatters';
import { AD_SLOT_OPTIONS, adSlotLabel, adSlotMeta } from '../../config/adSlots';

import './AdminAdsPage.css';

const EMPTY_FORM = {
  title: '',
  headline: '',
  description: '',
  ctaLabel: '',
  creativeType: 'image',
  imageMediaId: null,
  targetUrl: '',
  slotKey: 'community_left_primary',
  device: 'all',
  startAt: '',
  endAt: '',
  isActive: true,
  displayOrder: 0,
  priority: 0,
};

function localDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function adStatus(item) {
  const now = Date.now();
  const start = item.startAt ? new Date(item.startAt).getTime() : null;
  const end = item.endAt ? new Date(item.endAt).getTime() : null;

  if (!item.isActive) return { key: 'paused', label: 'Đã tắt', tone: 'soft' };
  if (start && start > now) return { key: 'scheduled', label: 'Đã lên lịch', tone: 'warning' };
  if (end && end < now) return { key: 'expired', label: 'Đã hết hạn', tone: 'neutral' };
  return { key: 'active', label: 'Đang chạy', tone: 'success' };
}

function ctr(item) {
  const views = Number(item.impressionCount || 0);
  const clicks = Number(item.clickCount || 0);
  if (!views) return '0%';
  return `${((clicks / views) * 100).toFixed(2)}%`;
}

function previewUrl(item) {
  return mediaUrl(item.imageMediaId);
}

export default function AdminAdsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [customSlot, setCustomSlot] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      setItems((await adminApi.banners()) || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không thể tải danh sách quảng cáo.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const result = {
      total: items.length,
      active: 0,
      impressions: 0,
      clicks: 0,
    };

    items.forEach((item) => {
      if (adStatus(item).key === 'active') result.active += 1;
      result.impressions += Number(item.impressionCount || 0);
      result.clicks += Number(item.clickCount || 0);
    });

    return result;
  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return items.filter((item) => {
      if (statusFilter !== 'all' && adStatus(item).key !== statusFilter) return false;
      if (!keyword) return true;

      return [
        item.title,
        item.headline,
        item.description,
        item.slotKey,
        adSlotLabel(item.slotKey),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [items, query, statusFilter]);

  const openCreate = () => {
    setEditing({ mode: 'create' });
    setForm({ ...EMPTY_FORM });
    setCustomSlot(false);
  };

  const openEdit = (item) => {
    const knownSlot = Boolean(adSlotMeta(item.slotKey));
    setEditing({ mode: 'edit', item });
    setCustomSlot(!knownSlot);
    setForm({
      ...EMPTY_FORM,
      ...item,
      imageMediaId: item.imageMediaId || null,
      slotKey: item.slotKey || item.position || 'community_left_primary',
      startAt: localDateTime(item.startAt),
      endAt: localDateTime(item.endAt),
    });
  };

  const closeModal = () => {
    if (saving) return;
    setEditing(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        imageMediaId: form.imageMediaId?._id || form.imageMediaId || null,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
        displayOrder: Number(form.displayOrder || 0),
        priority: Number(form.priority || 0),
      };

      if (editing?.mode === 'edit') {
        await adminApi.updateBanner(editing.item._id, payload);
        toast.success('Đã cập nhật quảng cáo.');
      } else {
        await adminApi.createBanner(payload);
        toast.success('Đã tạo quảng cáo.');
      }

      setEditing(null);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không thể lưu quảng cáo.'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item) => {
    try {
      await adminApi.toggleBanner(item._id, !item.isActive);
      toast.success(item.isActive ? 'Đã tắt quảng cáo.' : 'Đã bật quảng cáo.');
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Xóa quảng cáo “${item.title}”?`)) return;

    try {
      await adminApi.deleteBanner(item._id);
      toast.success('Đã xóa quảng cáo.');
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <div className="admin-ads-page">
      <Seo title="Quản lý quảng cáo" />

      <div className="panel-heading admin-ads-heading">
        <div>
          <h2>Quản lý quảng cáo</h2>
          <p>Quản lý ảnh, nội dung, vị trí, lịch chạy và hiệu quả quảng cáo trên toàn website.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} />
          Thêm quảng cáo
        </Button>
      </div>

      <div className="admin-ads-stats">
        <article>
          <span><BarChart3 size={18} /></span>
          <div><strong>{stats.total}</strong><small>Tổng chiến dịch</small></div>
        </article>
        <article>
          <span><Power size={18} /></span>
          <div><strong>{stats.active}</strong><small>Đang chạy</small></div>
        </article>
        <article>
          <span><Eye size={18} /></span>
          <div><strong>{stats.impressions.toLocaleString('vi-VN')}</strong><small>Lượt hiển thị</small></div>
        </article>
        <article>
          <span><MousePointerClick size={18} /></span>
          <div><strong>{stats.clicks.toLocaleString('vi-VN')}</strong><small>Lượt nhấp</small></div>
        </article>
      </div>

      <div className="admin-ads-toolbar">
        <label className="admin-ads-search">
          <Search size={17} />
          <input
            value={query}
            placeholder="Tìm tên, nội dung hoặc vị trí..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="filter-tabs">
          {[
            ['all', 'Tất cả'],
            ['active', 'Đang chạy'],
            ['scheduled', 'Đã lên lịch'],
            ['paused', 'Đã tắt'],
            ['expired', 'Hết hạn'],
          ].map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={statusFilter === key ? 'is-active' : ''}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : filteredItems.length ? (
        <div className="admin-ad-list">
          {filteredItems.map((item) => {
            const status = adStatus(item);
            const image = previewUrl(item);

            return (
              <article className="admin-ad-card" key={item._id}>
                <div className="admin-ad-card__preview">
                  {image ? (
                    <img src={image} alt={item.imageMediaId?.altText || item.title} />
                  ) : (
                    <span><ImageIcon size={25} /></span>
                  )}
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>

                <div className="admin-ad-card__content">
                  <div className="admin-ad-card__title">
                    <div>
                      <strong>{item.title}</strong>
                      <small>{adSlotLabel(item.slotKey || item.position)}</small>
                    </div>
                    <span>{item.device === 'mobile' ? 'Mobile' : item.device === 'desktop' ? 'Desktop' : 'Mọi thiết bị'}</span>
                  </div>

                  {item.headline ? <h3>{item.headline}</h3> : null}
                  {item.description ? <p>{item.description}</p> : null}

                  <div className="admin-ad-card__meta">
                    <span>Bắt đầu: {item.startAt ? formatDateTime(item.startAt) : 'Ngay khi bật'}</span>
                    <span>Kết thúc: {item.endAt ? formatDateTime(item.endAt) : 'Không giới hạn'}</span>
                    <span>Ưu tiên: {Number(item.priority || 0)}</span>
                  </div>

                  <div className="admin-ad-card__metrics">
                    <span><Eye size={15} /> {Number(item.impressionCount || 0).toLocaleString('vi-VN')}</span>
                    <span><MousePointerClick size={15} /> {Number(item.clickCount || 0).toLocaleString('vi-VN')}</span>
                    <span>CTR {ctr(item)}</span>
                  </div>
                </div>

                <div className="admin-ad-card__actions">
                  <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                    <Pencil size={15} /> Sửa
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggle(item)}>
                    {item.isActive ? <PauseCircle size={15} /> : <Power size={15} />}
                    {item.isActive ? 'Tắt' : 'Bật'}
                  </Button>
                  <button type="button" className="admin-ad-delete" onClick={() => remove(item)}>
                    <Trash2 size={16} />
                    Xóa
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-ad-empty">
          <ImageIcon size={34} />
          <h3>Chưa có quảng cáo phù hợp</h3>
          <p>Khi không có quảng cáo đang chạy, website sẽ không hiển thị placeholder hoặc khoảng trống quảng cáo.</p>
          <Button size="sm" onClick={openCreate}>Tạo quảng cáo đầu tiên</Button>
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={closeModal}
        title={editing?.mode === 'edit' ? 'Chỉnh sửa quảng cáo' : 'Tạo quảng cáo'}
      >
        {editing ? (
          <form className="admin-ad-form" onSubmit={submit}>
            <div className="form-grid form-grid--2">
              <FormField label="Tên chiến dịch" required>
                <input
                  required
                  maxLength={200}
                  value={form.title || ''}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </FormField>

              <FormField label="Loại nội dung">
                <select
                  value={form.creativeType || 'image'}
                  onChange={(event) => setForm({ ...form, creativeType: event.target.value })}
                >
                  <option value="image">Chỉ ảnh</option>
                  <option value="text">Chỉ chữ</option>
                  <option value="image_text">Ảnh + chữ</option>
                </select>
              </FormField>
            </div>

            {form.creativeType !== 'text' ? (
              <MediaUploader
                label="Ảnh quảng cáo"
                required={form.creativeType === 'image' || form.creativeType === 'image_text'}
                value={form.imageMediaId}
                onChange={(value) => setForm({ ...form, imageMediaId: value })}
              />
            ) : null}

            {form.creativeType !== 'image' ? (
              <>
                <FormField label="Tiêu đề hiển thị" required>
                  <input
                    required
                    maxLength={240}
                    value={form.headline || ''}
                    onChange={(event) => setForm({ ...form, headline: event.target.value })}
                  />
                </FormField>

                <FormField label="Mô tả">
                  <textarea
                    rows={3}
                    maxLength={1200}
                    value={form.description || ''}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                  />
                </FormField>

                <FormField label="Nhãn nút CTA">
                  <input
                    maxLength={80}
                    placeholder="Ví dụ: Xem chi tiết"
                    value={form.ctaLabel || ''}
                    onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })}
                  />
                </FormField>
              </>
            ) : null}

            <FormField label="Liên kết đích">
              <input
                placeholder="https://... hoặc /duong-dan-noi-bo"
                value={form.targetUrl || ''}
                onChange={(event) => setForm({ ...form, targetUrl: event.target.value })}
              />
            </FormField>

            <div className="form-grid form-grid--2">
              <FormField label="Vị trí hiển thị" required>
                <select
                  value={customSlot ? '__custom__' : form.slotKey}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === '__custom__') {
                      setCustomSlot(true);
                      setForm({ ...form, slotKey: '' });
                    } else {
                      setCustomSlot(false);
                      setForm({ ...form, slotKey: value });
                    }
                  }}
                >
                  {AD_SLOT_OPTIONS.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label} · {slot.recommendedSize}
                    </option>
                  ))}
                  <option value="__custom__">Vị trí tùy chỉnh...</option>
                </select>
              </FormField>

              <FormField label="Thiết bị">
                <select
                  value={form.device || 'all'}
                  onChange={(event) => setForm({ ...form, device: event.target.value })}
                >
                  <option value="all">Mọi thiết bị</option>
                  <option value="desktop">Chỉ desktop</option>
                  <option value="mobile">Chỉ mobile</option>
                </select>
              </FormField>
            </div>

            {customSlot ? (
              <FormField
                label="Mã vị trí tùy chỉnh"
                required
                hint="Vị trí này chỉ hiển thị khi giao diện có AdSlot với cùng mã."
              >
                <input
                  required
                  placeholder="vd: article_sidebar_partner"
                  value={form.slotKey || ''}
                  onChange={(event) => setForm({ ...form, slotKey: event.target.value.trim() })}
                />
              </FormField>
            ) : null}

            <div className="form-grid form-grid--2">
              <FormField label="Bắt đầu chạy">
                <input
                  type="datetime-local"
                  value={form.startAt || ''}
                  onChange={(event) => setForm({ ...form, startAt: event.target.value })}
                />
              </FormField>
              <FormField label="Tự kết thúc">
                <input
                  type="datetime-local"
                  value={form.endAt || ''}
                  onChange={(event) => setForm({ ...form, endAt: event.target.value })}
                />
              </FormField>
            </div>

            <div className="form-grid form-grid--2">
              <FormField label="Độ ưu tiên" hint="Số lớn hơn được ưu tiên hiển thị trước.">
                <input
                  type="number"
                  value={form.priority || 0}
                  onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })}
                />
              </FormField>
              <FormField label="Thứ tự trong cùng vị trí">
                <input
                  type="number"
                  value={form.displayOrder || 0}
                  onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) })}
                />
              </FormField>
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={Boolean(form.isActive)}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              />
              <span>Bật quảng cáo sau khi lưu</span>
            </label>

            <div className="admin-ad-form__actions">
              <Button type="button" variant="outline" disabled={saving} onClick={closeModal}>
                Hủy
              </Button>
              <Button type="submit" loading={saving}>
                {editing.mode === 'edit' ? 'Lưu thay đổi' : 'Tạo quảng cáo'}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
