import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Rss,
  SearchCheck,
} from 'lucide-react';

import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import './AdminSourceWatchPage.css';

const TYPE_LABELS = {
  rss: 'RSS / Atom',
  web: 'Website',
  facebook: 'Facebook Page',
};

const ITEM_STATUS_LABELS = {
  baseline: 'Mốc ban đầu',
  new: 'Tin mới',
  reviewed: 'Đã xem',
  ignored: 'Bỏ qua',
};

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export default function AdminSourceWatchPage() {
  const toast = useToast();
  const [overview, setOverview] = useState(null);
  const [sources, setSources] = useState([]);
  const [items, setItems] = useState([]);
  const [itemStatus, setItemStatus] = useState('new');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState({
    name: '',
    type: 'rss',
    url: '',
    includePath: '',
    facebookPageId: '',
    intervalMinutes: 15,
  });

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [nextOverview, nextSources, nextItems] = await Promise.all([
        adminApi.sourceWatchOverview(),
        adminApi.sourceWatchSources(),
        adminApi.sourceWatchItems({
          ...(itemStatus ? { status: itemStatus } : {}),
          limit: 60,
        }),
      ]);
      setOverview(nextOverview);
      setSources(nextSources || []);
      setItems(nextItems.items || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không tải được nguồn theo dõi.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [itemStatus, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => load({ silent: true }), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const activeCount = useMemo(
    () => sources.filter((source) => source.enabled).length,
    [sources],
  );

  const submit = async (event) => {
    event.preventDefault();
    setBusy('create');
    try {
      await adminApi.createSourceWatchSource({
        ...form,
        intervalMinutes: Number(form.intervalMinutes) || 15,
      });
      toast.success('Đã thêm nguồn. Lần kiểm tra đầu sẽ tạo mốc ban đầu, các lần sau mới đánh dấu Tin mới.');
      setForm({
        name: '',
        type: 'rss',
        url: '',
        includePath: '',
        facebookPageId: '',
        intervalMinutes: 15,
      });
      await load({ silent: true });
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không thêm được nguồn.'));
    } finally {
      setBusy('');
    }
  };

  const checkNow = async (source) => {
    setBusy(`check:${source._id}`);
    try {
      const result = await adminApi.checkSourceWatchSource(source._id);
      const created = Number(result?.created || 0);
      toast.success(result?.baseline
        ? `Đã tạo mốc ban đầu với ${created} mục.`
        : `Đã kiểm tra. Phát hiện ${created} mục mới.`);
      await load({ silent: true });
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không kiểm tra được nguồn.'));
      await load({ silent: true });
    } finally {
      setBusy('');
    }
  };

  const toggleSource = async (source) => {
    setBusy(`toggle:${source._id}`);
    try {
      await adminApi.updateSourceWatchSource(source._id, {
        enabled: !source.enabled,
      });
      await load({ silent: true });
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không cập nhật được nguồn.'));
    } finally {
      setBusy('');
    }
  };

  const updateItemStatus = async (item, status) => {
    setBusy(`item:${item._id}`);
    try {
      await adminApi.updateSourceWatchItemStatus(item._id, status);
      await load({ silent: true });
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không cập nhật được tin nguồn.'));
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="source-watch-admin">
      <header className="source-watch-admin__header">
        <div>
          <span className="source-watch-admin__eyebrow"><SearchCheck size={16} /> SOURCE WATCH</span>
          <h1>Theo dõi nguồn tin</h1>
          <p>
            Theo dõi RSS, trang web và Facebook Page được cấp quyền. Hệ thống chỉ phát hiện nội dung mới, lưu snapshot để biên tập viên xem lại; không dùng AI và không tự đăng bài.
          </p>
        </div>
        <button type="button" className="source-watch-btn" onClick={() => load()} disabled={loading}>
          <RefreshCw size={17} /> Làm mới
        </button>
      </header>

      <div className="source-watch-stats">
        <article><span>Nguồn đang bật</span><strong>{activeCount}</strong></article>
        <article><span>Tin mới chưa xem</span><strong>{overview?.newItems ?? 0}</strong></article>
        <article><span>Đang kiểm tra</span><strong>{overview?.checkingSources ?? 0}</strong></article>
        <article><span>Worker</span><strong>{overview?.workerEnabled ? 'Bật' : 'Tắt'}</strong></article>
      </div>

      <div className="source-watch-grid">
        <form className="source-watch-card source-watch-form" onSubmit={submit}>
          <div className="source-watch-card__title">
            <Plus size={18} />
            <div><strong>Thêm nguồn</strong><span>RSS là nhẹ và ổn định nhất. Website dùng URL trang danh sách tin.</span></div>
          </div>

          <label>
            <span>Tên nguồn</span>
            <input
              required
              value={form.name}
              onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
              placeholder="Ví dụ: Cổng thông tin Hòa Lạc"
            />
          </label>

          <div className="source-watch-form__row">
            <label>
              <span>Loại nguồn</span>
              <select
                value={form.type}
                onChange={(event) => setForm((value) => ({ ...value, type: event.target.value }))}
              >
                <option value="rss">RSS / Atom</option>
                <option value="web">Website</option>
                <option value="facebook">Facebook Page</option>
              </select>
            </label>
            <label>
              <span>Chu kỳ</span>
              <select
                value={form.intervalMinutes}
                onChange={(event) => setForm((value) => ({ ...value, intervalMinutes: event.target.value }))}
              >
                <option value="5">5 phút</option>
                <option value="15">15 phút</option>
                <option value="30">30 phút</option>
                <option value="60">1 giờ</option>
                <option value="180">3 giờ</option>
              </select>
            </label>
          </div>

          <label>
            <span>URL nguồn</span>
            <input
              required
              type="url"
              value={form.url}
              onChange={(event) => setForm((value) => ({ ...value, url: event.target.value }))}
              placeholder={form.type === 'rss' ? 'https://example.vn/rss.xml' : 'https://example.vn/tin-tuc'}
            />
          </label>

          {form.type === 'web' ? (
            <label>
              <span>Lọc đường dẫn bài viết (tùy chọn)</span>
              <input
                value={form.includePath}
                onChange={(event) => setForm((value) => ({ ...value, includePath: event.target.value }))}
                placeholder="Ví dụ: /tin-tuc-su-kien/"
              />
              <small>Giúp bỏ menu/trang danh mục và chỉ giữ link bài thật.</small>
            </label>
          ) : null}

          {form.type === 'facebook' ? (
            <label>
              <span>Facebook Page ID</span>
              <input
                required
                value={form.facebookPageId}
                onChange={(event) => setForm((value) => ({ ...value, facebookPageId: event.target.value }))}
                placeholder="ID Page từ Meta Graph API"
              />
              <small>
                Backend cần FACEBOOK_GRAPH_ACCESS_TOKEN có quyền đọc Page tương ứng. Token chỉ đặt trong server/.env.
              </small>
            </label>
          ) : null}

          <button type="submit" className="source-watch-btn source-watch-btn--primary" disabled={busy === 'create'}>
            <Plus size={17} /> {busy === 'create' ? 'Đang thêm...' : 'Thêm nguồn'}
          </button>
        </form>

        <div className="source-watch-card source-watch-sources">
          <div className="source-watch-card__title">
            <Rss size={18} />
            <div><strong>Nguồn đang theo dõi</strong><span>{sources.length} nguồn đã cấu hình.</span></div>
          </div>

          <div className="source-watch-source-list">
            {sources.map((source) => (
              <article key={source._id} className={!source.enabled ? 'is-disabled' : ''}>
                <div className="source-watch-source-main">
                  <div>
                    <span className={`source-watch-type is-${source.type}`}>{TYPE_LABELS[source.type]}</span>
                    <strong>{source.name}</strong>
                    <a href={source.url} target="_blank" rel="noreferrer">{source.url} <ExternalLink size={12} /></a>
                  </div>
                  <span className={`source-watch-health is-${source.status}`}>{source.status}</span>
                </div>
                <div className="source-watch-source-meta">
                  <span>Lần cuối: {formatDate(source.lastCheckedAt)}</span>
                  <span>Mới: {source.stats?.newItems || 0}</span>
                  <span>Tổng lưu: {source.stats?.totalItems || 0}</span>
                </div>
                {source.lastError ? <p className="source-watch-error">{source.lastError}</p> : null}
                <div className="source-watch-source-actions">
                  <button type="button" onClick={() => checkNow(source)} disabled={busy === `check:${source._id}`}>
                    <RefreshCw size={14} /> Kiểm tra ngay
                  </button>
                  <button type="button" onClick={() => toggleSource(source)} disabled={busy === `toggle:${source._id}`}>
                    {source.enabled ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                    {source.enabled ? 'Tạm dừng' : 'Bật lại'}
                  </button>
                </div>
              </article>
            ))}
            {!sources.length ? <p className="source-watch-empty">Chưa có nguồn. Thêm RSS hoặc website ở khung bên trái.</p> : null}
          </div>
        </div>
      </div>

      <div className="source-watch-card source-watch-items">
        <div className="source-watch-items__head">
          <div className="source-watch-card__title">
            <CheckCircle2 size={18} />
            <div><strong>Nội dung đã phát hiện</strong><span>Chỉ lưu để theo dõi/biên tập, chưa phải bài DTHL.</span></div>
          </div>
          <select value={itemStatus} onChange={(event) => setItemStatus(event.target.value)}>
            <option value="new">Tin mới</option>
            <option value="">Tất cả</option>
            <option value="baseline">Mốc ban đầu</option>
            <option value="reviewed">Đã xem</option>
            <option value="ignored">Bỏ qua</option>
          </select>
        </div>

        <div className="source-watch-item-list">
          {items.map((item) => (
            <article key={item._id}>
              <div className="source-watch-item-copy">
                <div>
                  <span className={`source-watch-item-status is-${item.status}`}>{ITEM_STATUS_LABELS[item.status]}</span>
                  <span>{item.sourceId?.name || 'Nguồn'}</span>
                  <span>{formatDate(item.publishedAt || item.discoveredAt)}</span>
                </div>
                <a href={item.url} target="_blank" rel="noreferrer">
                  <strong>{item.title || item.url}</strong> <ExternalLink size={13} />
                </a>
                {item.excerpt ? <p>{item.excerpt}</p> : null}
              </div>
              <div className="source-watch-item-actions">
                {item.status !== 'reviewed' ? (
                  <button type="button" onClick={() => updateItemStatus(item, 'reviewed')} disabled={busy === `item:${item._id}`}>
                    Đã xem
                  </button>
                ) : null}
                {item.status !== 'ignored' ? (
                  <button type="button" onClick={() => updateItemStatus(item, 'ignored')} disabled={busy === `item:${item._id}`}>
                    Bỏ qua
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {!loading && !items.length ? <p className="source-watch-empty">Chưa có nội dung ở trạng thái này.</p> : null}
        </div>
      </div>
    </section>
  );
}
