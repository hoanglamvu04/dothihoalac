import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ExternalLink,
  FileText,
  RefreshCw,
  Save,
  Settings2,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import { LoadingBlock } from '../../components/common/Loading';
import TaxonomyFields from '../../components/forms/TaxonomyFields';
import FormField from '../../components/common/FormField';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { CONTENT_STATUS } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';
import { mediaUrl } from '../../utils/media';

import './ArticleMetadataPage.css';

const ARTICLE_TYPES = [
  ['news', 'Tin tức'],
  ['analysis', 'Phân tích'],
  ['guide', 'Hướng dẫn'],
  ['interview', 'Phỏng vấn'],
  ['photo', 'Bài ảnh'],
  ['sponsored', 'Nội dung tài trợ'],
];

const EDITABLE_STATUSES = [
  ['draft', 'Bản nháp'],
  ['pending_review', 'Chờ duyệt'],
  ['approved', 'Đã duyệt'],
  ['scheduled', 'Lên lịch'],
];

function idOf(value) {
  return value?._id || value?.id || value || null;
}

function localDateTime(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const shifted = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );

  return shifted.toISOString().slice(0, 16);
}

function formFromArticle(item) {
  return {
    articleType: item?.article?.articleType || 'news',
    primaryCategoryId: idOf(item?.primaryCategoryId),
    primaryAreaId: idOf(item?.primaryAreaId),
    tagIds: Array.isArray(item?.tagIds)
      ? item.tagIds.map(idOf).filter(Boolean)
      : [],
    visibility: item?.visibility || 'public',
    allowComments: item?.allowComments !== false,
    isFeatured: Boolean(item?.isFeatured),
    isSponsored: Boolean(item?.isSponsored),
    status: item?.status || 'draft',
    scheduledAt: localDateTime(item?.scheduledAt),
    sourceNote: item?.article?.sourceNote || '',
  };
}

export default function ArticleMetadataPage() {
  const { id } = useParams();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let active = true;

    adminApi
      .articleDetail(id)
      .then((result) => {
        if (!active) return;
        setItem(result);
        setForm(formFromArticle(result));
      })
      .catch((error) => {
        if (active) toast.error(apiErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, toast]);

  const apply = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const cover = useMemo(
    () => mediaUrl(item?.thumbnailMediaId),
    [item?.thumbnailMediaId],
  );

  const docUrl = item?.article?.googleDocUrl || '';
  const docPath = `/quan-tri/bai-viet/${id}/docs`;
  const publicPath = item?.slug ? `/tin-tuc/${item.slug}` : '';
  const published = item?.status === 'published';

  const save = async (event) => {
    event.preventDefault();

    if (!form || saving || syncing) return;

    if (form.status === 'scheduled' && !form.scheduledAt) {
      toast.error('Hãy chọn thời gian xuất bản cho bài lên lịch.');
      return;
    }

    setSaving(true);

    try {
      const updated = await adminApi.updateArticleMetadata(id, {
        articleType: form.articleType,
        primaryCategoryId: idOf(form.primaryCategoryId),
        primaryAreaId: idOf(form.primaryAreaId),
        tagIds: Array.isArray(form.tagIds)
          ? form.tagIds.map(idOf).filter(Boolean)
          : [],
        visibility: form.visibility,
        allowComments: Boolean(form.allowComments),
        isFeatured: Boolean(form.isFeatured),
        isSponsored: Boolean(form.isSponsored),
        status: form.status,
        scheduledAt:
          form.status === 'scheduled'
            ? form.scheduledAt
            : null,
        sourceNote: String(form.sourceNote || '').trim(),
        changeNote: 'Cập nhật thuộc tính CMS của bài viết',
      });

      setItem(updated);
      setForm(formFromArticle(updated));
      toast.success('Đã lưu thuộc tính bài viết. Nội dung Google Docs không bị thay đổi.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const syncDocs = async () => {
    if (!item?.article?.googleDocId || saving || syncing) return;

    setSyncing(true);

    try {
      const synced = await adminApi.syncGoogleDoc(id);
      setItem(synced);
      setForm(formFromArticle(synced));
      toast.success('Đã đồng bộ đúng cấu trúc tiêu đề, sapo, nội dung và hình ảnh từ Google Docs.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  if (!item || !form) {
    return (
      <div className="admin-alert error">
        Không tải được thông tin bài viết.
      </div>
    );
  }

  return (
    <div className="admin-article-metadata-page">
      <Seo title={`Thuộc tính · ${item.title}`} />

      <header className="admin-page-head admin-article-metadata-head">
        <div>
          <p className="admin-kicker">Content Studio · Thuộc tính CMS</p>
          <h1>Thuộc tính bài viết</h1>
          <p>
            Google Docs giữ tiêu đề, sapo tùy chọn, nội dung và hình ảnh. Trang này quản lý
            loại tin, danh mục, khu vực, thẻ, hiển thị, lịch đăng và ghi chú biên tập.
          </p>
        </div>

        <div className="admin-row-actions">
          <a
            className="admin-secondary"
            href={docUrl || docPath}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText size={14} /> Mở Google Docs ↗
          </a>

          {item?.article?.googleDocId ? (
            <button
              type="button"
              className="admin-secondary"
              disabled={saving || syncing}
              onClick={syncDocs}
            >
              <RefreshCw size={14} />
              {syncing ? 'Đang đồng bộ…' : 'Đồng bộ Docs'}
            </button>
          ) : null}

          {published && publicPath ? (
            <a
              className="admin-secondary"
              href={publicPath}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={14} /> Xem bài ↗
            </a>
          ) : null}

          <button
            type="submit"
            form="article-metadata-form"
            className="admin-primary"
            disabled={saving || syncing}
          >
            <Save size={14} />
            {saving ? 'Đang lưu…' : 'Lưu thuộc tính'}
          </button>
        </div>
      </header>

      <section className="admin-article-metadata-summary">
        <div className="admin-article-metadata-cover">
          {cover ? (
            <img src={cover} alt={item.title} />
          ) : (
            <span>Chưa có ảnh bìa</span>
          )}
        </div>

        <div className="admin-article-metadata-title">
          <div className="admin-article-metadata-badges">
            <Badge tone={published ? 'success' : 'soft'}>
              {CONTENT_STATUS[item.status] || item.status}
            </Badge>
            <span>{item?.article?.documentCode || 'Chưa có mã Docs'}</span>
          </div>
          <h2>{item.title}</h2>
          <p>
            {item.summary || 'Không có sapo — website sẽ đi thẳng vào thân bài, không tự lấy đoạn đầu tiên làm mô tả.'}
          </p>
          <small>
            Ảnh đầu tiên trong Google Docs vẫn được dùng làm ảnh đại diện cho thẻ bài/SEO,
            nhưng trên trang chi tiết ảnh sẽ giữ đúng vị trí bạn đặt trong tài liệu.
          </small>
        </div>
      </section>

      <section className="admin-doc-structure-guide" aria-label="Quy ước soạn bài Google Docs">
        <div className="admin-doc-structure-guide__intro">
          <FileText size={19} />
          <div>
            <strong>Quy ước Google Docs → Website</strong>
            <p>Hệ thống chỉ suy luận những gì có quy ước rõ ràng; đoạn văn thường sẽ luôn là thân bài.</p>
          </div>
        </div>

        <div className="admin-doc-structure-guide__rules">
          <div>
            <b>1. Tiêu đề</b>
            <span>Dòng đầu hoặc style Title / Heading 1.</span>
          </div>
          <div>
            <b>2. Sapo tùy chọn</b>
            <span>Dùng style Subtitle hoặc bắt đầu dòng bằng “SAPO:” / “Mô tả:”. Không có thì để trống.</span>
          </div>
          <div>
            <b>3. Thân bài</b>
            <span>Normal text là nội dung; Heading 2–4 là tiêu đề phụ. Bold, italic, gạch chân và link được giữ lại.</span>
          </div>
          <div>
            <b>4. Hình ảnh</b>
            <span>Ảnh đầu tiên làm thumbnail nhưng vẫn nằm nguyên vị trí trong bài; các ảnh sau cũng giữ thứ tự trong Docs.</span>
          </div>
        </div>
      </section>

      <form id="article-metadata-form" onSubmit={save}>
        <div className="admin-article-metadata-grid">
          <section className="admin-settings-card admin-article-metadata-card admin-article-metadata-card--wide">
            <div className="admin-article-metadata-section-head">
              <Settings2 size={18} />
              <div>
                <h3>Phân loại nội dung</h3>
                <p>Thông tin này không được lấy từ Google Docs và cần quản lý trong CMS.</p>
              </div>
            </div>

            <div className="form-grid form-grid--2">
              <FormField label="Loại tin">
                <select
                  value={form.articleType}
                  onChange={(event) => apply('articleType', event.target.value)}
                >
                  {ARTICLE_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Quyền xem">
                <select
                  value={form.visibility}
                  onChange={(event) => apply('visibility', event.target.value)}
                >
                  <option value="public">Công khai</option>
                  <option value="members">Chỉ thành viên</option>
                  <option value="private">Riêng tư</option>
                </select>
              </FormField>
            </div>

            <TaxonomyFields
              scope="article"
              categoryId={form.primaryCategoryId}
              areaId={form.primaryAreaId}
              tagIds={form.tagIds}
              onChange={apply}
            />
          </section>

          <section className="admin-settings-card admin-article-metadata-card">
            <div className="admin-article-metadata-section-head">
              <div>
                <h3>Quy trình xuất bản</h3>
                <p>Xuất bản chính thức vẫn thực hiện bằng nút Xuất bản/Cập nhật ở danh sách bài viết.</p>
              </div>
            </div>

            <FormField label="Trạng thái">
              {published ? (
                <select value="published" disabled>
                  <option value="published">Đã xuất bản</option>
                </select>
              ) : (
                <select
                  value={form.status}
                  onChange={(event) => apply('status', event.target.value)}
                >
                  {EDITABLE_STATUSES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              )}
            </FormField>

            {form.status === 'scheduled' ? (
              <FormField label="Thời gian đăng" required>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(event) => apply('scheduledAt', event.target.value)}
                />
              </FormField>
            ) : null}

            <div className="admin-article-metadata-checks">
              <label>
                <input
                  type="checkbox"
                  checked={form.allowComments}
                  onChange={(event) => apply('allowComments', event.target.checked)}
                />
                Cho phép bình luận
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(event) => apply('isFeatured', event.target.checked)}
                />
                Bài nổi bật
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={form.isSponsored}
                  onChange={(event) => apply('isSponsored', event.target.checked)}
                />
                Nội dung tài trợ
              </label>
            </div>
          </section>

          <section className="admin-settings-card admin-article-metadata-card">
            <div className="admin-article-metadata-section-head">
              <div>
                <h3>Nguồn & ghi chú biên tập</h3>
                <p>Dùng cho nội bộ ban biên tập, không thay đổi nội dung Google Docs.</p>
              </div>
            </div>

            <FormField label="Nguồn / ghi chú">
              <textarea
                rows={8}
                maxLength={2000}
                value={form.sourceNote}
                onChange={(event) => apply('sourceNote', event.target.value)}
                placeholder="Nguồn tin, liên hệ, lưu ý kiểm chứng, ghi chú cho biên tập viên…"
              />
            </FormField>
          </section>
        </div>
      </form>

      <footer className="admin-article-metadata-footer">
        <span>Cập nhật CMS: {formatDateTime(item.updatedAt || item.createdAt)}</span>
        {item?.article?.googleDocSyncedAt ? (
          <span>Đồng bộ Docs: {formatDateTime(item.article.googleDocSyncedAt)}</span>
        ) : null}
      </footer>
    </div>
  );
}
