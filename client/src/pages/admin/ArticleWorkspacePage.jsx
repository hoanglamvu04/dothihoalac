import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Save,
  Send,
  Settings2,
  ShieldCheck,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import FormField from '../../components/common/FormField';
import TaxonomyFields from '../../components/forms/TaxonomyFields';
import MediaUploader from '../../components/forms/MediaUploader';
import ArticleBody from '../../components/content/ArticleBody';
import ContentImage from '../../components/content/ContentImage';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { CONTENT_STATUS } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';

import './ArticleWorkspacePage.css';

const ARTICLE_TYPES = [
  ['news', 'Tin tức'],
  ['analysis', 'Phân tích'],
  ['guide', 'Hướng dẫn'],
  ['interview', 'Phỏng vấn'],
  ['photo', 'Bài ảnh'],
  ['sponsored', 'Nội dung tài trợ'],
];

const WORKFLOW_STATUSES = [
  ['draft', 'Bản nháp'],
  ['pending_review', 'Chờ duyệt'],
  ['approved', 'Đã duyệt'],
  ['scheduled', 'Lên lịch'],
];

const TABS = [
  ['content', 'Nội dung', FileText],
  ['taxonomy', 'Phân loại & SEO', Settings2],
  ['publish', 'Xuất bản', ShieldCheck],
];

function idOf(value) {
  return value?._id || value?.id || value || null;
}

function localDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function formFromItem(item) {
  return {
    articleType: item?.article?.articleType || 'news',
    primaryCategoryId: idOf(item?.primaryCategoryId),
    primaryAreaId: idOf(item?.primaryAreaId),
    tagIds: Array.isArray(item?.tagIds) ? item.tagIds.map(idOf).filter(Boolean) : [],
    visibility: item?.visibility || 'public',
    allowComments: item?.allowComments !== false,
    isFeatured: Boolean(item?.isFeatured),
    isSponsored: Boolean(item?.isSponsored),
    status: item?.status || 'draft',
    scheduledAt: localDateTime(item?.scheduledAt),
    sourceNote: item?.article?.sourceNote || '',
    coverMode: item?.article?.coverMode || 'first_doc_image',
    thumbnailMediaId: idOf(item?.thumbnailMediaId),
  };
}

export default function ArticleWorkspacePage() {
  const { id } = useParams();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [form, setForm] = useState(null);
  const [coverMedia, setCoverMedia] = useState(null);
  const [tab, setTab] = useState('content');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const result = await adminApi.articleDetail(id);
      setItem(result);
      setForm(formFromItem(result));
      setCoverMedia(result?.thumbnailMediaId || null);
      return result;
    } catch (error) {
      toast.error(apiErrorMessage(error));
      return null;
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const apply = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const docUrl = item?.article?.googleDocUrl || '';
  const publicUrl = item?.slug ? `/tin-tuc/${encodeURIComponent(item.slug)}` : '';
  const published = item?.status === 'published';
  const customCoverId = form?.coverMode === 'custom' ? idOf(coverMedia) || form?.thumbnailMediaId : null;

  const restoreCustomCover = async (nextItem) => {
    if (!customCoverId || form?.coverMode !== 'custom') return nextItem;

    return adminApi.updateArticleMetadata(id, {
      thumbnailMediaId: customCoverId,
      coverMode: 'custom',
      changeNote: 'Khôi phục ảnh đại diện tùy chọn sau đồng bộ Google Docs',
    });
  };

  const ensureDocs = async () => {
    if (busy) return;
    setBusy('ensure');
    try {
      const result = await adminApi.ensureGoogleDoc(id);
      await load({ quiet: true });
      toast.success('Google Docs đã sẵn sàng.');
      if (result?.docUrl) window.open(result.docUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const syncDocs = async () => {
    if (busy) return;
    setBusy('sync');
    try {
      const synced = await adminApi.syncGoogleDoc(id);
      const finalItem = await restoreCustomCover(synced);
      setItem(finalItem);
      setForm(formFromItem(finalItem));
      setCoverMedia(finalItem?.thumbnailMediaId || coverMedia);
      toast.success('Đã đồng bộ tiêu đề, sapo, nội dung và hình ảnh từ Google Docs.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const saveMetadata = async (event) => {
    event?.preventDefault?.();
    if (!form || busy) return;

    if (form.status === 'scheduled' && !form.scheduledAt) {
      toast.error('Hãy chọn thời gian xuất bản cho bài lên lịch.');
      return;
    }

    if (form.coverMode === 'custom' && !customCoverId) {
      toast.error('Hãy chọn ảnh đại diện tùy chọn hoặc chuyển về ảnh đầu tiên từ Google Docs.');
      return;
    }

    setBusy('save');
    try {
      const updated = await adminApi.updateArticleMetadata(id, {
        articleType: form.articleType,
        primaryCategoryId: idOf(form.primaryCategoryId),
        primaryAreaId: idOf(form.primaryAreaId),
        tagIds: form.tagIds.map(idOf).filter(Boolean),
        visibility: form.visibility,
        allowComments: Boolean(form.allowComments),
        isFeatured: Boolean(form.isFeatured),
        isSponsored: Boolean(form.isSponsored),
        status: published ? 'published' : form.status,
        scheduledAt: form.status === 'scheduled' ? form.scheduledAt : null,
        sourceNote: form.sourceNote.trim(),
        coverMode: form.coverMode,
        ...(form.coverMode === 'custom' ? { thumbnailMediaId: customCoverId } : {}),
        changeNote: 'Cập nhật Article Workspace',
      });
      setItem(updated);
      setForm(formFromItem(updated));
      setCoverMedia(updated?.thumbnailMediaId || coverMedia);
      toast.success('Đã lưu thuộc tính bài viết.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const publish = async () => {
    if (busy) return;

    const accepted = window.confirm(
      published
        ? 'Đồng bộ Google Docs mới nhất và cập nhật bài đang xuất bản?'
        : 'Đồng bộ Google Docs mới nhất và xuất bản bài này?',
    );
    if (!accepted) return;

    setBusy('publish');
    try {
      const result = await adminApi.publishGoogleDoc(id);
      const finalItem = await restoreCustomCover(result?.item || item);
      setItem(finalItem);
      setForm(formFromItem(finalItem));
      setCoverMedia(finalItem?.thumbnailMediaId || coverMedia);
      toast.success(published ? 'Đã cập nhật bài đang xuất bản.' : 'Đã xuất bản bài viết.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const coverPreview = useMemo(() => item?.thumbnailMediaId || null, [item]);

  if (loading) return <LoadingBlock />;

  if (!item || !form) {
    return <div className="admin-alert error">Không tải được Article Workspace.</div>;
  }

  return (
    <main className="article-workspace-page">
      <Seo title={`Content Studio · ${item.title}`} />

      <header className="article-workspace-hero">
        <div className="article-workspace-hero__main">
          <div className="article-workspace-badges">
            <Badge tone={published ? 'success' : 'soft'}>{CONTENT_STATUS[item.status] || item.status}</Badge>
            <span>{item?.article?.documentCode || 'Chưa có mã Docs'}</span>
          </div>
          <h1>{item.title}</h1>
          <p>{item.summary || 'Chưa có sapo. Website sẽ đi thẳng vào thân bài.'}</p>
          <small>
            {item?.article?.googleDocSyncedAt
              ? `Đồng bộ Docs lần cuối ${formatDateTime(item.article.googleDocSyncedAt)}`
              : 'Chưa đồng bộ Google Docs'}
          </small>
        </div>

        <div className="article-workspace-hero__actions">
          <Link to="/quan-tri/bai-viet" className="admin-secondary">Danh sách bài</Link>
          {docUrl ? (
            <a href={docUrl} target="_blank" rel="noopener noreferrer" className="admin-secondary">
              <FileText size={15} /> Mở Google Docs ↗
            </a>
          ) : (
            <button type="button" className="admin-secondary" disabled={Boolean(busy)} onClick={ensureDocs}>
              <FileText size={15} /> Tạo Google Docs
            </button>
          )}
          {published && publicUrl ? (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="admin-secondary">
              <ExternalLink size={15} /> Xem bài ↗
            </a>
          ) : null}
          <button type="button" className="admin-primary" disabled={Boolean(busy)} onClick={publish}>
            <Send size={15} />
            {busy === 'publish' ? 'Đang xử lý…' : published ? 'Đồng bộ & cập nhật' : 'Đồng bộ & xuất bản'}
          </button>
        </div>
      </header>

      <nav className="article-workspace-tabs" aria-label="Khu vực Article Workspace">
        {TABS.map(([value, label, Icon]) => (
          <button
            type="button"
            key={value}
            className={tab === value ? 'is-active' : ''}
            onClick={() => setTab(value)}
          >
            <Icon size={17} /> {label}
          </button>
        ))}
      </nav>

      {tab === 'content' ? (
        <section className="article-workspace-grid">
          <article className="article-workspace-card article-workspace-card--wide">
            <div className="article-workspace-card__head">
              <FileText size={19} />
              <div>
                <h2>Google Docs là phòng soạn</h2>
                <p>DTHL CMS giữ quyền phân loại, ảnh đại diện, kiểm duyệt và xuất bản.</p>
              </div>
            </div>

            <div className="article-doc-panel">
              <div>
                <strong>{item?.article?.googleDocFileName || 'Chưa tạo tài liệu Google Docs'}</strong>
                <span>{docUrl ? 'Tài liệu đã liên kết với bài viết này.' : 'Tạo tài liệu để bắt đầu soạn.'}</span>
              </div>
              <div>
                {docUrl ? (
                  <a href={docUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={16} /> Mở Docs
                  </a>
                ) : (
                  <button type="button" onClick={ensureDocs} disabled={Boolean(busy)}>Tạo Docs</button>
                )}
                {docUrl ? (
                  <button type="button" onClick={syncDocs} disabled={Boolean(busy)}>
                    <RefreshCw size={16} /> {busy === 'sync' ? 'Đang đồng bộ…' : 'Đồng bộ ngay'}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="article-workspace-preview">
              <div className="article-workspace-preview__label"><Eye size={16} /> Bản xem nội dung đã đồng bộ</div>
              <h2>{item.title}</h2>
              {item.summary ? <p className="article-workspace-preview__summary">{item.summary}</p> : null}
              <ArticleBody html={item?.body?.bodyHtml || ''} />
            </div>
          </article>

          <aside className="article-workspace-card">
            <div className="article-workspace-card__head">
              <ImageIcon size={19} />
              <div>
                <h2>Ảnh đại diện hiện tại</h2>
                <p>Ảnh dùng cho thẻ bài và SEO.</p>
              </div>
            </div>
            {coverPreview ? (
              <ContentImage media={coverPreview} alt={item.title} ratio="card" />
            ) : (
              <div className="article-cover-empty">Chưa có ảnh đại diện</div>
            )}
            <small className="article-workspace-note">
              Ảnh trong thân bài vẫn nằm đúng vị trí trong Google Docs; ảnh đại diện không bị chèn thêm lên đầu bài chi tiết.
            </small>
          </aside>
        </section>
      ) : null}

      {tab === 'taxonomy' ? (
        <form className="article-workspace-grid" onSubmit={saveMetadata}>
          <section className="article-workspace-card article-workspace-card--wide">
            <div className="article-workspace-card__head">
              <Settings2 size={19} />
              <div>
                <h2>Phân loại nội dung</h2>
                <p>Những trường này thuộc CMS và không lấy từ Google Docs.</p>
              </div>
            </div>

            <div className="form-grid form-grid--2">
              <FormField label="Loại tin">
                <select value={form.articleType} onChange={(event) => apply('articleType', event.target.value)}>
                  {ARTICLE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </FormField>
              <FormField label="Quyền xem">
                <select value={form.visibility} onChange={(event) => apply('visibility', event.target.value)}>
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

          <aside className="article-workspace-card">
            <div className="article-workspace-card__head">
              <ImageIcon size={19} />
              <div>
                <h2>Quy tắc ảnh đại diện</h2>
                <p>Không còn cơ chế ngầm mà người biên tập không nhìn thấy.</p>
              </div>
            </div>

            <label className="article-cover-mode">
              <input
                type="radio"
                name="coverMode"
                checked={form.coverMode === 'first_doc_image'}
                onChange={() => apply('coverMode', 'first_doc_image')}
              />
              <span><strong>Dùng ảnh đầu tiên trong Google Docs</strong><small>Tự cập nhật sau mỗi lần đồng bộ.</small></span>
            </label>
            <label className="article-cover-mode">
              <input
                type="radio"
                name="coverMode"
                checked={form.coverMode === 'custom'}
                onChange={() => apply('coverMode', 'custom')}
              />
              <span><strong>Chọn ảnh đại diện riêng</strong><small>Giữ ảnh này kể cả khi đồng bộ Docs.</small></span>
            </label>

            {form.coverMode === 'custom' ? (
              <MediaUploader
                value={coverMedia}
                onChange={(media) => {
                  setCoverMedia(media);
                  apply('thumbnailMediaId', idOf(media));
                }}
                label="Ảnh đại diện tùy chọn"
                required
              />
            ) : null}
          </aside>

          <footer className="article-workspace-savebar">
            <button type="submit" className="admin-primary" disabled={Boolean(busy)}>
              <Save size={15} /> {busy === 'save' ? 'Đang lưu…' : 'Lưu phân loại & SEO'}
            </button>
          </footer>
        </form>
      ) : null}

      {tab === 'publish' ? (
        <form className="article-workspace-grid" onSubmit={saveMetadata}>
          <section className="article-workspace-card article-workspace-card--wide">
            <div className="article-workspace-card__head">
              <ShieldCheck size={19} />
              <div>
                <h2>Quy trình xuất bản</h2>
                <p>Chọn trạng thái, lịch đăng và thiết lập hiển thị trước khi xuất bản.</p>
              </div>
            </div>

            <FormField label="Trạng thái">
              {published ? (
                <select disabled value="published"><option value="published">Đã xuất bản</option></select>
              ) : (
                <select value={form.status} onChange={(event) => apply('status', event.target.value)}>
                  {WORKFLOW_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              )}
            </FormField>

            {form.status === 'scheduled' ? (
              <FormField label="Thời gian đăng" required>
                <input type="datetime-local" value={form.scheduledAt} onChange={(event) => apply('scheduledAt', event.target.value)} />
              </FormField>
            ) : null}

            <div className="article-workspace-checks">
              <label><input type="checkbox" checked={form.allowComments} onChange={(event) => apply('allowComments', event.target.checked)} /> Cho phép bình luận</label>
              <label><input type="checkbox" checked={form.isFeatured} onChange={(event) => apply('isFeatured', event.target.checked)} /> Bài nổi bật</label>
              <label><input type="checkbox" checked={form.isSponsored} onChange={(event) => apply('isSponsored', event.target.checked)} /> Nội dung tài trợ</label>
            </div>
          </section>

          <aside className="article-workspace-card">
            <div className="article-workspace-card__head">
              <CheckCircle2 size={19} />
              <div>
                <h2>Nguồn & ghi chú</h2>
                <p>Dành cho ban biên tập, không hiển thị trong thân bài.</p>
              </div>
            </div>
            <FormField label="Nguồn / ghi chú biên tập">
              <textarea rows={10} maxLength={2000} value={form.sourceNote} onChange={(event) => apply('sourceNote', event.target.value)} />
            </FormField>
          </aside>

          <footer className="article-workspace-savebar">
            <button type="submit" className="admin-secondary" disabled={Boolean(busy)}>
              <Save size={15} /> {busy === 'save' ? 'Đang lưu…' : 'Lưu thiết lập'}
            </button>
            <button type="button" className="admin-primary" disabled={Boolean(busy)} onClick={publish}>
              <Send size={15} /> {published ? 'Đồng bộ & cập nhật' : 'Đồng bộ & xuất bản'}
            </button>
          </footer>
        </form>
      ) : null}
    </main>
  );
}
