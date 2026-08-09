import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Cloud, RefreshCw, Save, Send, X } from 'lucide-react';

import Seo from '../../components/common/Seo';
import TaxonomyFields from '../../components/forms/TaxonomyFields';
import MediaUploader from '../../components/forms/MediaUploader';
import ArticleComposer from '../../components/admin/ArticleComposer';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

const emptyForm = () => ({
  title: '',
  summary: '',
  bodyHtml: '<p></p>',
  articleType: 'news',
  primaryCategoryId: null,
  primaryAreaId: null,
  tagIds: [],
  thumbnailMediaId: null,
  status: 'draft',
  scheduledAt: '',
  sourceNote: '',
  googleDocId: '',
  googleDocUrl: '',
  googleDocSyncedAt: null,
});

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

function formFromArticle(item) {
  return {
    ...emptyForm(),
    title: item?.title || '',
    summary: item?.summary || '',
    bodyHtml: item?.body?.bodyHtml || '<p></p>',
    articleType: item?.article?.articleType || 'news',
    primaryCategoryId: idOf(item?.primaryCategoryId),
    primaryAreaId: idOf(item?.primaryAreaId),
    tagIds: Array.isArray(item?.tagIds) ? item.tagIds.map(idOf).filter(Boolean) : [],
    thumbnailMediaId: item?.thumbnailMediaId || null,
    status: item?.status || 'draft',
    scheduledAt: localDateTime(item?.scheduledAt),
    sourceNote: item?.article?.sourceNote || '',
    googleDocId: item?.article?.googleDocId || '',
    googleDocUrl: item?.article?.googleDocUrl || '',
    googleDocSyncedAt: item?.article?.googleDocSyncedAt || null,
  };
}

function draftKey(id = 'new') {
  return `dthl-admin-article-draft:${id || 'new'}`;
}

function readDraft(id) {
  try {
    const raw = window.localStorage.getItem(draftKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(id, form) {
  try {
    window.localStorage.setItem(draftKey(id), JSON.stringify({ savedAt: Date.now(), form }));
  } catch {
    // Local storage có thể bị trình duyệt chặn; server save vẫn hoạt động.
  }
}

function removeDraft(id) {
  try { window.localStorage.removeItem(draftKey(id)); } catch { /* ignore */ }
}

function hasContent(html = '') {
  const value = String(html || '');
  return /<figure\b/i.test(value) || value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim().length > 0;
}

function saveLabel(state) {
  if (state.kind === 'saving') return 'Đang tự lưu…';
  if (state.kind === 'server') return `Đã lưu trên máy chủ${state.time ? ` · ${state.time}` : ''}`;
  if (state.kind === 'error') return 'Đã lưu trên máy · máy chủ chưa nhận';
  return 'Bản nháp an toàn trên máy này';
}

export default function ArticleEditorPage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const serverIdRef = useRef(routeId || '');
  const savingRef = useRef(false);
  const formRef = useRef(emptyForm());
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(Boolean(routeId));
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const [saveState, setSaveState] = useState({ kind: 'local', time: '', message: '' });

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      setLoading(Boolean(routeId));
      try {
        if (!routeId) {
          const local = readDraft('new');
          const next = local?.form ? { ...emptyForm(), ...local.form } : emptyForm();
          if (local?.form) setNotice('Đã khôi phục bản nháp gần nhất trên máy này.');
          serverIdRef.current = '';
          formRef.current = next;
          if (active) setForm(next);
          return;
        }

        const item = await adminApi.articleDetail(routeId);
        if (!active) return;
        const serverForm = formFromArticle(item);
        const local = readDraft(routeId);
        const serverTime = new Date(item?.updatedAt || 0).getTime();
        const useLocal = local?.form && Number(local.savedAt || 0) > serverTime;
        const next = useLocal ? { ...serverForm, ...local.form } : serverForm;
        if (useLocal) setNotice('Đã khôi phục thay đổi bạn đang soạn dở trước khi đóng trang.');
        serverIdRef.current = routeId;
        formRef.current = next;
        setForm(next);
        setSaveState({ kind: 'server', time: '', message: '' });
      } catch (error) {
        if (active) {
          setSaveState({ kind: 'error', time: '', message: apiErrorMessage(error) });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    hydrate();
    return () => { active = false; };
  }, [routeId]);

  const apply = useCallback((key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      formRef.current = next;
      writeDraft(serverIdRef.current || 'new', next);
      return next;
    });
    setSaveState((current) => current.kind === 'saving' ? current : { kind: 'local', time: '', message: '' });
    setRevision((value) => value + 1);
  }, []);

  const payloadOf = useCallback((current, requestedStatus) => ({
    title: String(current.title || '').trim(),
    summary: String(current.summary || '').trim(),
    bodyHtml: current.bodyHtml || '<p></p>',
    articleType: current.articleType || 'news',
    primaryCategoryId: idOf(current.primaryCategoryId),
    primaryAreaId: idOf(current.primaryAreaId),
    tagIds: Array.isArray(current.tagIds) ? current.tagIds.map(idOf).filter(Boolean) : [],
    thumbnailMediaId: idOf(current.thumbnailMediaId),
    status: requestedStatus || current.status || 'draft',
    scheduledAt: (requestedStatus || current.status) === 'scheduled' ? current.scheduledAt || null : null,
    sourceNote: String(current.sourceNote || '').trim(),
  }), []);

  const saveToServer = useCallback(async ({ status, manual = false } = {}) => {
    const current = formRef.current;
    if (String(current.title || '').trim().length < 5 || !hasContent(current.bodyHtml)) {
      if (manual) {
        setSaveState({ kind: 'error', time: '', message: 'Hãy nhập tiêu đề tối thiểu 5 ký tự và nội dung bài viết.' });
      }
      return null;
    }
    if (savingRef.current) return null;

    savingRef.current = true;
    setSaveState({ kind: 'saving', time: '', message: '' });

    try {
      const payload = payloadOf(current, status);
      const item = serverIdRef.current
        ? await adminApi.updateArticle(serverIdRef.current, payload)
        : await adminApi.createArticle(payload);
      const savedId = String(item?._id || serverIdRef.current || '');
      const next = {
        ...current,
        ...formFromArticle(item),
        thumbnailMediaId: item?.thumbnailMediaId || current.thumbnailMediaId,
      };

      formRef.current = next;
      setForm(next);
      if (savedId) {
        if (!serverIdRef.current) removeDraft('new');
        serverIdRef.current = savedId;
        writeDraft(savedId, next);
        if (!routeId) navigate(`/quan-tri/bai-viet/${savedId}/sua`, { replace: true });
      }

      const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setSaveState({ kind: 'server', time, message: payload.status === 'published' ? 'Bài viết đã được xuất bản.' : 'Bản nháp đã được lưu.' });
      if (manual) toast.success(payload.status === 'published' ? 'Đã xuất bản bài viết.' : 'Đã lưu bài viết.');
      return item;
    } catch (error) {
      writeDraft(serverIdRef.current || 'new', current);
      const message = apiErrorMessage(error);
      setSaveState({ kind: 'error', time: '', message });
      if (manual) toast.error(message);
      return null;
    } finally {
      savingRef.current = false;
    }
  }, [navigate, payloadOf, routeId, toast]);

  useEffect(() => {
    if (loading || !revision || formRef.current.status === 'published') return undefined;
    const timer = window.setTimeout(() => saveToServer({ status: formRef.current.status || 'draft' }), 1800);
    return () => window.clearTimeout(timer);
  }, [loading, revision, saveToServer]);

  useEffect(() => {
    const preserve = () => writeDraft(serverIdRef.current || 'new', formRef.current);
    const onVisibility = () => { if (document.visibilityState === 'hidden') preserve(); };
    window.addEventListener('pagehide', preserve);
    window.addEventListener('beforeunload', preserve);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', preserve);
      window.removeEventListener('beforeunload', preserve);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const openDocs = async () => {
    let id = serverIdRef.current;
    if (!id) {
      const saved = await saveToServer({ status: 'draft', manual: true });
      id = saved?._id || serverIdRef.current;
    }
    if (id) navigate(`/quan-tri/bai-viet/${id}/docs`);
  };

  const syncDocs = async () => {
    const id = serverIdRef.current;
    if (!id || !formRef.current.googleDocId || savingRef.current) return;
    savingRef.current = true;
    setSaveState({ kind: 'saving', time: '', message: 'Đang đọc nội dung Google Docs…' });
    try {
      const item = await adminApi.syncGoogleDoc(id);
      const next = formFromArticle(item);
      formRef.current = next;
      setForm(next);
      writeDraft(id, next);
      const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setSaveState({ kind: 'server', time, message: 'Đã đồng bộ Google Docs về website.' });
      toast.success('Đã đồng bộ nội dung mới nhất từ Google Docs.');
    } catch (error) {
      const message = apiErrorMessage(error);
      setSaveState({ kind: 'error', time: '', message });
      toast.error(message);
    } finally {
      savingRef.current = false;
    }
  };

  const metaDescription = useMemo(
    () => `${String(form.summary || '').length}/160 ký tự gợi ý`,
    [form.summary],
  );

  if (loading) {
    return <main className="admin-doc-launcher"><section className="admin-doc-launcher-card"><div className="admin-doc-launcher-orb">ĐT</div><h1>Đang mở phòng soạn bài…</h1></section></main>;
  }

  return (
    <main className="admin-article-studio">
      <Seo title={serverIdRef.current ? 'Chỉnh sửa bài viết' : 'Bài viết mới'} />
      <header className="admin-article-studio-bar">
        <button type="button" className="admin-article-studio-back" onClick={() => navigate('/quan-tri/bai-viet')}><X size={15} /> Đóng phòng soạn</button>
        <div className={`admin-article-save-state ${saveState.kind}`}><span />{saveLabel(saveState)}</div>
        <div className="admin-article-studio-actions">
          {form.googleDocId ? <button type="button" className="admin-secondary" onClick={syncDocs}><RefreshCw size={14} /> Đồng bộ Docs</button> : null}
          <button type="button" className="admin-secondary" onClick={openDocs}><Cloud size={14} /> Google Docs</button>
          <button type="button" className="admin-secondary" disabled={saveState.kind === 'saving'} onClick={() => saveToServer({ status: 'draft', manual: true })}><Save size={14} /> Lưu nháp</button>
          <button type="button" className="admin-primary" disabled={saveState.kind === 'saving'} onClick={() => saveToServer({ status: 'published', manual: true })}><Send size={14} /> {form.status === 'published' ? 'Cập nhật' : 'Xuất bản'}</button>
        </div>
      </header>

      <div className="admin-article-studio-canvas">
        {notice ? <div className="admin-article-recovery">↻ {notice}</div> : null}
        {saveState.message ? <div className={`admin-alert ${saveState.kind === 'error' ? 'error' : 'success'}`}>{saveState.message}</div> : null}

        <section className="admin-article-basics">
          <div className="admin-article-title-wrap">
            <p className="admin-kicker">{serverIdRef.current ? 'Chỉnh sửa bài viết' : 'Bài viết mới'}</p>
            <textarea rows={2} value={form.title} onChange={(event) => apply('title', event.target.value)} placeholder="Nhập tiêu đề bài viết thật rõ ràng…" aria-label="Tiêu đề bài viết" />
          </div>

          <div className="admin-article-compact-fields">
            <label><span>Loại bài</span><select value={form.articleType} onChange={(event) => apply('articleType', event.target.value)}><option value="news">Tin tức</option><option value="analysis">Phân tích</option><option value="guide">Hướng dẫn</option><option value="interview">Phỏng vấn</option><option value="photo">Ảnh</option><option value="sponsored">Tài trợ</option></select></label>
            <label><span>Trạng thái</span><select value={form.status} onChange={(event) => apply('status', event.target.value)}><option value="draft">Bản nháp</option><option value="pending_review">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="scheduled">Lên lịch</option><option value="published">Đã xuất bản</option></select></label>
            <label><span>Lịch xuất bản</span><input type="datetime-local" value={form.scheduledAt} disabled={form.status !== 'scheduled'} onChange={(event) => apply('scheduledAt', event.target.value)} /></label>
          </div>

          <label className="admin-article-excerpt">
            <span>Mô tả ngắn</span>
            <textarea rows={3} value={form.summary} onChange={(event) => apply('summary', event.target.value)} placeholder="Tóm tắt ngắn giúp người đọc và công cụ tìm kiếm hiểu bài viết…" />
            <small>{metaDescription}</small>
          </label>
        </section>

        <section className="admin-article-writing-area">
          <div className="admin-article-writing-heading">
            <div><p className="admin-kicker">Nội dung chi tiết</p><h2>Không gian soạn bài TipTap</h2></div>
            <p>Dán nội dung từ Word/Docs, Ctrl + V hoặc kéo thả ảnh, tạo bảng, căn lề, heading, liên kết và danh sách ngay trong bài.</p>
          </div>
          <ArticleComposer value={form.bodyHtml} onChange={(value) => apply('bodyHtml', value)} uploadFolder="articles/inline" />
        </section>

        <section className="admin-article-meta-panel">
          <div className="admin-article-taxonomy">
            <TaxonomyFields scope="article" categoryId={form.primaryCategoryId} areaId={form.primaryAreaId} tagIds={form.tagIds} onChange={apply} />
          </div>
          <div className="wide"><MediaUploader value={form.thumbnailMediaId} onChange={(value) => apply('thumbnailMediaId', value)} /></div>
          <label className="wide"><span>Nguồn và ghi chú biên tập</span><textarea rows={4} value={form.sourceNote} onChange={(event) => apply('sourceNote', event.target.value)} /></label>
        </section>
      </div>
    </main>
  );
}
