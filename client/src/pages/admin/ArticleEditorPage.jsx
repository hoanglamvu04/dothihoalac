import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  RefreshCw,
  Save,
  Send,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Seo from '../../components/common/Seo';
import FormField from '../../components/common/FormField';
import RichTextEditor from '../../components/forms/RichTextEditor';
import MediaUploader from '../../components/forms/MediaUploader';
import TaxonomyFields from '../../components/forms/TaxonomyFields';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

const DRAFT_PREFIX = 'dthl-content-studio:article:';

const emptyForm = () => ({
  title: '',
  summary: '',
  bodyHtml: '',
  articleType: 'news',
  primaryCategoryId: null,
  primaryAreaId: null,
  tagIds: [],
  thumbnailMediaId: null,
  status: 'draft',
  scheduledAt: '',
  sourceNote: '',
});

function idValue(value) {
  if (!value) return null;
  return String(value?._id || value);
}

function localDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function hydrateForm(item = {}) {
  return {
    ...emptyForm(),
    title: item.title || '',
    summary: item.summary || '',
    bodyHtml: item.body?.bodyHtml || '',
    articleType: item.article?.articleType || 'news',
    primaryCategoryId: idValue(item.primaryCategoryId),
    primaryAreaId: idValue(item.primaryAreaId),
    tagIds: (item.tagIds || []).map(idValue).filter(Boolean),
    thumbnailMediaId: item.thumbnailMediaId && typeof item.thumbnailMediaId === 'object'
      ? item.thumbnailMediaId
      : null,
    status: item.status || 'draft',
    scheduledAt: localDateTime(item.scheduledAt),
    sourceNote: item.article?.sourceNote || '',
  };
}

function draftKey(id) {
  return `${DRAFT_PREFIX}${id || 'new'}`;
}

function readDraft(id) {
  try {
    const raw = window.localStorage.getItem(draftKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.form ? parsed : null;
  } catch {
    return null;
  }
}

function writeDraft(id, form) {
  try {
    window.localStorage.setItem(
      draftKey(id),
      JSON.stringify({ form, savedAt: Date.now() }),
    );
  } catch {
    // Local storage can be unavailable in privacy modes.
  }
}

function removeDraft(id) {
  try {
    window.localStorage.removeItem(draftKey(id));
  } catch {
    // Ignore storage cleanup failures.
  }
}

function payloadFrom(form, statusOverride, allowPlaceholder = false) {
  const status = statusOverride || form.status || 'draft';
  const bodyHtml = String(form.bodyHtml || '').trim()
    || (allowPlaceholder ? '<p>Nội dung đang được biên tập trên Google Docs.</p>' : '');
  return {
    title: String(form.title || '').trim(),
    summary: String(form.summary || '').trim(),
    bodyHtml,
    articleType: form.articleType || 'news',
    primaryCategoryId: form.primaryCategoryId || null,
    primaryAreaId: form.primaryAreaId || null,
    tagIds: form.tagIds || [],
    thumbnailMediaId: form.thumbnailMediaId?._id || form.thumbnailMediaId || null,
    status,
    scheduledAt: status === 'scheduled' ? form.scheduledAt || null : null,
    sourceNote: String(form.sourceNote || '').trim(),
  };
}

function validateForm(form, { allowPlaceholder = false } = {}) {
  if (String(form.title || '').trim().length < 5) return 'Tiêu đề cần ít nhất 5 ký tự.';
  if (!allowPlaceholder && !String(form.bodyHtml || '').trim()) return 'Hãy nhập nội dung bài viết hoặc mở phòng soạn Google Docs.';
  if (form.status === 'scheduled' && !form.scheduledAt) return 'Hãy chọn thời gian xuất bản.';
  return '';
}

function saveLabel(state) {
  if (state.kind === 'saving') return 'Đang lưu…';
  if (state.kind === 'server') return state.time ? `Đã lưu · ${state.time}` : 'Đã lưu trên máy chủ';
  if (state.kind === 'error') return 'Chưa lưu được lên máy chủ';
  return 'Bản nháp an toàn trên máy';
}

export default function ArticleEditorPage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [serverId, setServerId] = useState(routeId || '');
  const serverIdRef = useRef(routeId || '');
  const [form, setForm] = useState(emptyForm);
  const formRef = useRef(form);
  const [googleMeta, setGoogleMeta] = useState(null);
  const [loading, setLoading] = useState(Boolean(routeId));
  const [saveState, setSaveState] = useState({ kind: 'local', time: '', message: '' });
  const [revision, setRevision] = useState(0);
  const [googleWorking, setGoogleWorking] = useState('');
  const savingRef = useRef(false);

  const storageId = serverId || routeId || 'new';

  const applyForm = useCallback((fieldOrPatch, value) => {
    const current = formRef.current;
    const patch = typeof fieldOrPatch === 'string'
      ? { [fieldOrPatch]: value }
      : fieldOrPatch;
    const next = { ...current, ...patch };
    formRef.current = next;
    setForm(next);
    writeDraft(serverIdRef.current || 'new', next);
    setSaveState((state) => state.kind === 'saving' ? state : { kind: 'local', time: '', message: '' });
    setRevision((number) => number + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      if (!routeId) {
        const local = readDraft('new');
        if (local?.form) {
          formRef.current = { ...emptyForm(), ...local.form };
          setForm(formRef.current);
          toast.info?.('Đã khôi phục bản nháp gần nhất trên máy này.');
        }
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const item = await adminApi.articleDetail(routeId);
        if (!active) return;
        let next = hydrateForm(item);
        const local = readDraft(routeId);
        const serverTime = new Date(item.updatedAt || 0).getTime();
        if (local?.form && Number(local.savedAt) > serverTime) {
          next = { ...next, ...local.form };
          toast.info?.('Đã khôi phục phần chỉnh sửa chưa kịp gửi lên máy chủ.');
        }
        serverIdRef.current = routeId;
        setServerId(routeId);
        formRef.current = next;
        setForm(next);
        setGoogleMeta(item.article || null);
        writeDraft(routeId, next);
        setSaveState({ kind: 'server', time: '', message: '' });
      } catch (error) {
        if (active) {
          toast.error(apiErrorMessage(error));
          navigate('/quan-tri/bai-viet', { replace: true });
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    hydrate();
    return () => { active = false; };
  }, [navigate, routeId, toast]);

  useEffect(() => {
    const preserve = () => writeDraft(serverIdRef.current || 'new', formRef.current);
    const hidden = () => document.visibilityState === 'hidden' && preserve();
    window.addEventListener('pagehide', preserve);
    window.addEventListener('beforeunload', preserve);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('pagehide', preserve);
      window.removeEventListener('beforeunload', preserve);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);

  const saveToServer = useCallback(async ({ statusOverride, silent = false, allowPlaceholder = false } = {}) => {
    const current = formRef.current;
    const requestedStatus = statusOverride || current.status;
    const errorMessage = validateForm({ ...current, status: requestedStatus }, { allowPlaceholder });
    if (errorMessage) {
      if (!silent) toast.error(errorMessage);
      return null;
    }
    if (savingRef.current) return null;
    savingRef.current = true;
    setSaveState({ kind: 'saving', time: '', message: '' });
    try {
      const payload = payloadFrom(current, requestedStatus, allowPlaceholder);
      const result = serverIdRef.current
        ? await adminApi.updateArticle(serverIdRef.current, payload)
        : await adminApi.createArticle(payload);
      const savedId = String(result?._id || serverIdRef.current || '');
      const next = {
        ...current,
        status: requestedStatus,
        ...(payload.bodyHtml && !current.bodyHtml ? { bodyHtml: payload.bodyHtml } : {}),
      };
      formRef.current = next;
      setForm(next);
      if (!serverIdRef.current && savedId) {
        removeDraft('new');
        serverIdRef.current = savedId;
        setServerId(savedId);
        writeDraft(savedId, next);
        navigate(`/quan-tri/bai-viet/${savedId}`, { replace: true });
      } else {
        writeDraft(savedId, next);
      }
      if (result?.article) setGoogleMeta(result.article);
      const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setSaveState({ kind: 'server', time, message: '' });
      if (!silent) {
        toast.success(requestedStatus === 'published' ? 'Đã xuất bản bài viết.' : 'Đã lưu bài viết.');
      }
      return { item: result, id: savedId };
    } catch (error) {
      writeDraft(serverIdRef.current || 'new', current);
      setSaveState({ kind: 'error', time: '', message: apiErrorMessage(error) });
      if (!silent) toast.error(apiErrorMessage(error));
      return null;
    } finally {
      savingRef.current = false;
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (loading || !revision || !serverId || formRef.current.status !== 'draft') return undefined;
    const timer = window.setTimeout(() => {
      saveToServer({ statusOverride: 'draft', silent: true }).catch(() => null);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [loading, revision, saveToServer, serverId]);

  const openGoogleDocs = async () => {
    setGoogleWorking('open');
    try {
      let id = serverIdRef.current;
      if (!id) {
        const saved = await saveToServer({
          statusOverride: 'draft',
          silent: true,
          allowPlaceholder: true,
        });
        id = saved?.id || serverIdRef.current;
      }
      if (!id) throw new Error('Chưa thể tạo bản nháp để liên kết Google Docs.');
      const result = await adminApi.ensureArticleGoogleDoc(id);
      setGoogleMeta((current) => ({
        ...(current || {}),
        contentSource: 'google-docs',
        googleDocId: result.docId,
        googleDocUrl: result.docUrl,
        googleDocFileName: result.fileName,
        documentCode: result.documentCode,
        googleDocYear: result.year,
      }));
      const opened = window.open(result.docUrl, '_blank', 'noopener,noreferrer');
      if (!opened) window.location.href = result.docUrl;
      toast.success(result.created ? 'Đã tạo Google Docs và mở phòng soạn.' : 'Đã mở lại Google Docs của bài viết.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setGoogleWorking('');
    }
  };

  const syncGoogleDocs = async () => {
    const id = serverIdRef.current;
    if (!id) return;
    setGoogleWorking('sync');
    try {
      const item = await adminApi.syncArticleGoogleDoc(id);
      const next = hydrateForm(item);
      formRef.current = next;
      setForm(next);
      setGoogleMeta(item.article || null);
      writeDraft(id, next);
      setSaveState({ kind: 'server', time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), message: '' });
      toast.success('Đã đồng bộ nội dung và ảnh từ Google Docs về website.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setGoogleWorking('');
    }
  };

  const articleTypes = useMemo(() => [
    ['news', 'Tin tức'],
    ['analysis', 'Phân tích'],
    ['guide', 'Hướng dẫn'],
    ['interview', 'Phỏng vấn'],
    ['photo', 'Ảnh'],
    ['sponsored', 'Tài trợ'],
  ], []);

  if (loading) {
    return (
      <div className="admin-workspace-card">
        <p className="admin-editor-kicker">DTHL Content Studio</p>
        <h1>Đang mở phòng soạn bài…</h1>
      </div>
    );
  }

  return (
    <section className="admin-article-studio-page">
      <Seo title={serverId ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'} />

      <header className="admin-article-studio-bar">
        <button type="button" className="admin-action-secondary" onClick={() => navigate('/quan-tri/bai-viet')}>
          <ArrowLeft size={14} /> Đóng phòng soạn
        </button>

        <div className={`admin-article-studio-status ${saveState.kind}`}>
          {saveLabel(saveState)}
        </div>

        <div className="admin-article-studio-actions">
          <button
            type="button"
            className="admin-action-secondary"
            disabled={saveState.kind === 'saving'}
            onClick={() => saveToServer({ statusOverride: 'draft' })}
          >
            <Save size={14} /> Lưu nháp
          </button>
          <button
            type="button"
            className="admin-action-primary"
            disabled={saveState.kind === 'saving'}
            onClick={() => saveToServer({ statusOverride: 'published' })}
          >
            <Send size={14} /> {form.status === 'published' ? 'Cập nhật' : 'Xuất bản'}
          </button>
        </div>
      </header>

      <div className="admin-article-studio-canvas">
        {saveState.kind === 'error' && saveState.message ? (
          <div className="alert alert--danger">{saveState.message}</div>
        ) : null}

        <section className="admin-editor-intro">
          <p className="admin-editor-kicker">{serverId ? 'Chỉnh sửa bài viết' : 'Bài viết mới'}</p>
          <textarea
            className="admin-editor-title"
            rows={2}
            value={form.title}
            onChange={(event) => applyForm('title', event.target.value)}
            placeholder="Nhập tiêu đề bài viết thật rõ ràng…"
            aria-label="Tiêu đề bài viết"
          />
          <FormField label="Mô tả ngắn" hint={`${String(form.summary || '').length}/1000 ký tự`}>
            <textarea
              rows="3"
              value={form.summary}
              onChange={(event) => applyForm('summary', event.target.value)}
              placeholder="Tóm tắt vấn đề chính để người đọc hiểu bài ngay từ trang danh sách."
            />
          </FormField>
        </section>

        <div className="admin-editor-grid">
          <div className="admin-editor-main">
            <section className="admin-editor-section">
              <div className="admin-editor-section-head">
                <div>
                  <p className="admin-editor-kicker">Nội dung chi tiết</p>
                  <h2>Soạn trực tiếp hoặc đồng bộ từ Google Docs</h2>
                  <p>Trình soạn hiện tại vẫn giữ upload ảnh Cloudinary, caption, heading, link và danh sách. Google Docs là phòng soạn cộng tác; nội dung được kéo về cùng định dạng website.</p>
                </div>
              </div>
              <RichTextEditor
                value={form.bodyHtml}
                onChange={(value) => applyForm('bodyHtml', value)}
                uploadFolder={`articles/${serverId || 'draft'}/inline`}
              />
            </section>

            <section className="admin-editor-section">
              <div className="admin-editor-section-head">
                <div>
                  <p className="admin-editor-kicker">Phân loại nội dung</p>
                  <h2>Chuyên mục, khu vực và thẻ chủ đề</h2>
                </div>
              </div>
              <TaxonomyFields
                scope="article"
                categoryId={form.primaryCategoryId}
                areaId={form.primaryAreaId}
                tagIds={form.tagIds}
                onChange={applyForm}
              />
            </section>

            <section className="admin-editor-section">
              <div className="admin-editor-section-head">
                <div>
                  <p className="admin-editor-kicker">Nguồn & kiểm chứng</p>
                  <h2>Ghi chú nội bộ cho Ban biên tập</h2>
                </div>
              </div>
              <FormField label="Nguồn và ghi chú">
                <textarea
                  rows="5"
                  value={form.sourceNote}
                  onChange={(event) => applyForm('sourceNote', event.target.value)}
                  placeholder="Nguồn tài liệu, đầu mối kiểm chứng, lưu ý khi duyệt bài…"
                />
              </FormField>
            </section>
          </div>

          <aside className="admin-editor-sidebar">
            <section className="admin-editor-sidecard admin-google-card">
              <div className="admin-google-badge"><FileText size={12} /> Google Docs</div>
              <h3>Phòng soạn cộng tác</h3>
              <p>
                Tạo đúng một Google Docs cho mỗi bài. Docs được đặt vào thư mục theo năm và giữ liên kết ổn định với bài viết trong MongoDB.
              </p>

              {googleMeta?.googleDocId ? (
                <div className="admin-doc-state is-linked" style={{ marginTop: 12 }}>
                  <CheckCircle2 size={12} /> {googleMeta.documentCode || 'Đã liên kết'}
                </div>
              ) : (
                <div className="admin-doc-state" style={{ marginTop: 12 }}>Chưa liên kết</div>
              )}

              <div className="admin-google-actions">
                <button
                  type="button"
                  className="admin-action-primary"
                  onClick={openGoogleDocs}
                  disabled={Boolean(googleWorking)}
                >
                  <ExternalLink size={14} />
                  {googleWorking === 'open' ? 'Đang chuẩn bị…' : googleMeta?.googleDocId ? 'Mở Google Docs' : 'Soạn bằng Google Docs'}
                </button>
                {googleMeta?.googleDocId ? (
                  <button
                    type="button"
                    className="admin-action-secondary"
                    onClick={syncGoogleDocs}
                    disabled={Boolean(googleWorking)}
                  >
                    <RefreshCw size={14} />
                    {googleWorking === 'sync' ? 'Đang đồng bộ…' : 'Đồng bộ Docs → Website'}
                  </button>
                ) : null}
              </div>

              {googleMeta?.googleDocLastSyncedAt ? (
                <p>Đồng bộ gần nhất: {new Date(googleMeta.googleDocLastSyncedAt).toLocaleString('vi-VN')}</p>
              ) : null}
              {googleMeta?.googleDocError ? (
                <p style={{ color: '#b42318' }}>{googleMeta.googleDocError}</p>
              ) : null}
            </section>

            <section className="admin-editor-sidecard">
              <h3>Xuất bản</h3>
              <p>Chọn trạng thái nghiệp vụ; nút trên thanh công cụ vẫn cho phép lưu nháp hoặc xuất bản nhanh.</p>
              <FormField label="Trạng thái">
                <select value={form.status} onChange={(event) => applyForm('status', event.target.value)}>
                  <option value="draft">Bản nháp</option>
                  <option value="pending_review">Chờ duyệt</option>
                  <option value="approved">Đã duyệt</option>
                  <option value="scheduled">Lên lịch</option>
                  <option value="published">Xuất bản</option>
                </select>
              </FormField>
              {form.status === 'scheduled' ? (
                <FormField label="Thời gian xuất bản">
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) => applyForm('scheduledAt', event.target.value)}
                  />
                </FormField>
              ) : null}
              <button
                type="button"
                className="admin-action-secondary"
                onClick={() => saveToServer({ statusOverride: form.status })}
                disabled={saveState.kind === 'saving'}
              >
                <Save size={13} /> Lưu trạng thái này
              </button>
            </section>

            <section className="admin-editor-sidecard">
              <h3>Loại bài</h3>
              <FormField label="Định dạng biên tập">
                <select value={form.articleType} onChange={(event) => applyForm('articleType', event.target.value)}>
                  {articleTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </FormField>
            </section>

            <section className="admin-editor-sidecard">
              <h3>Ảnh đại diện</h3>
              <MediaUploader
                value={form.thumbnailMediaId}
                onChange={(value) => applyForm('thumbnailMediaId', value)}
                label="Ảnh thumbnail"
              />
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
