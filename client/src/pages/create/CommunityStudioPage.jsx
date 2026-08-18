import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  RotateCcw,
  Save,
  Send,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import CommunitySocialEditor from '../../components/community/CommunitySocialEditor';
import TaxonomyFields from '../../components/forms/TaxonomyFields';
import ContentEditorShell from '../../components/studio/ContentEditorShell';
import { LoadingBlock } from '../../components/common/Loading';
import { communityApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

import './CommunityStudioPage.css';

const PLACEHOLDER_TITLE = 'Bản nháp cộng đồng';
const RECOVERY_PREFIX = 'dthl:studio-recovery:community:';

const POST_TYPES = [
  ['discussion', 'Thảo luận'],
  ['question', 'Hỏi đáp'],
  ['sharing', 'Chia sẻ'],
  ['report', 'Phản ánh'],
  ['review', 'Đánh giá'],
  ['support', 'Nhờ hỗ trợ'],
  ['marketplace', 'Trao đổi / mua bán'],
  ['community_event', 'Sự kiện cộng đồng'],
  ['other', 'Khác'],
];

function idOf(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formFromSource(source = {}) {
  const community = source.community || {};
  const title = source.title === PLACEHOLDER_TITLE ? '' : source.title || '';

  return {
    title,
    summary: source.summary || '',
    bodyHtml: source?.body?.bodyHtml || source.bodyHtml || '',
    postType: community.postType || 'discussion',
    primaryCategoryId: idOf(source.primaryCategoryId),
    primaryAreaId: idOf(source.primaryAreaId),
    tagIds: Array.isArray(source.tagIds)
      ? source.tagIds.map(idOf).filter(Boolean)
      : [],
    locationText: community.locationText || '',
    allowComments: source.allowComments !== false,
  };
}

function serverPayload(form) {
  const payload = {
    postType: form.postType,
    summary: form.summary.trim(),
    primaryCategoryId: form.primaryCategoryId || null,
    primaryAreaId: form.primaryAreaId || null,
    tagIds: form.tagIds,
    locationText: form.locationText.trim(),
    allowComments: Boolean(form.allowComments),
  };

  const title = form.title.trim();
  if (title.length >= 5) payload.title = title;

  if (stripHtml(form.bodyHtml)) {
    payload.bodyHtml = form.bodyHtml;
  }

  return payload;
}

export default function CommunityStudioPage() {
  const { editorId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const autoSaveRef = useRef(null);

  const [source, setSource] = useState(null);
  const [form, setForm] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [error, setError] = useState('');
  const [hasRecovery, setHasRecovery] = useState(false);

  const recoveryKey = `${RECOVERY_PREFIX}${editorId}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await communityApi.editDetail(editorId);
      const nextForm = formFromSource(result);
      const nextSnapshot = JSON.stringify(nextForm);
      setSource(result);
      setForm(nextForm);
      setSavedSnapshot(nextSnapshot);

      try {
        setHasRecovery(Boolean(window.localStorage.getItem(recoveryKey)));
      } catch {
        setHasRecovery(false);
      }
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Không thể tải bài cộng đồng.'));
    } finally {
      setLoading(false);
    }
  }, [editorId, recoveryKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const snapshot = useMemo(() => JSON.stringify(form || {}), [form]);
  const dirty = Boolean(form) && snapshot !== savedSnapshot;

  const change = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const persistRecovery = useCallback((nextForm) => {
    try {
      window.localStorage.setItem(
        recoveryKey,
        JSON.stringify({ form: nextForm, savedAt: new Date().toISOString() }),
      );
      setHasRecovery(true);
    } catch {
      // Recovery chỉ là lớp an toàn phụ, không chặn soạn thảo.
    }
  }, [recoveryKey]);

  const clearRecovery = useCallback(() => {
    try {
      window.localStorage.removeItem(recoveryKey);
    } catch {
      // Không ảnh hưởng dữ liệu server.
    }
    setHasRecovery(false);
  }, [recoveryKey]);

  const saveNow = useCallback(async ({ quiet = false } = {}) => {
    if (!form || saving || submitting) return null;

    if (!quiet) setSaving(true);
    setSaveState('saving');
    persistRecovery(form);

    try {
      const result = await communityApi.update(editorId, serverPayload(form));
      setSavedSnapshot(JSON.stringify(form));
      setSource((current) => ({ ...(current || {}), ...(result || {}) }));
      setSaveState('saved');
      clearRecovery();
      if (!quiet) toast.success('Đã lưu bản nháp trên máy chủ.');
      return result;
    } catch (requestError) {
      setSaveState('error');
      if (!quiet) toast.error(apiErrorMessage(requestError));
      return null;
    } finally {
      if (!quiet) setSaving(false);
    }
  }, [clearRecovery, editorId, form, persistRecovery, saving, submitting, toast]);

  useEffect(() => {
    if (!dirty || !form || saving || submitting) return undefined;

    persistRecovery(form);
    setSaveState('saving');
    window.clearTimeout(autoSaveRef.current);

    autoSaveRef.current = window.setTimeout(() => {
      void saveNow({ quiet: true });
    }, 1200);

    return () => window.clearTimeout(autoSaveRef.current);
  }, [dirty, form, persistRecovery, saveNow, saving, submitting]);

  useEffect(() => {
    const beforeUnload = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const restoreRecovery = () => {
    try {
      const raw = window.localStorage.getItem(recoveryKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed?.form) throw new Error('Missing recovery');
      setForm((current) => ({ ...current, ...parsed.form }));
      toast.success('Đã khôi phục bản lưu trên thiết bị.');
    } catch {
      toast.error('Không tìm thấy bản khôi phục hợp lệ.');
    }
  };

  const submit = async () => {
    if (!form || submitting || saving) return;

    const title = form.title.trim();
    const text = stripHtml(form.bodyHtml);

    if (title.length < 5) {
      toast.error('Tiêu đề cần ít nhất 5 ký tự.');
      return;
    }

    if (!text) {
      toast.error('Hãy nhập nội dung bài cộng đồng.');
      return;
    }

    setSubmitting(true);

    try {
      await communityApi.update(editorId, {
        ...serverPayload(form),
        title,
        bodyHtml: form.bodyHtml,
      });
      await communityApi.submit(editorId);
      clearRecovery();
      toast.success('Đã gửi bài cộng đồng đi duyệt.');
      navigate('/tai-khoan/noi-dung?type=community&status=pending_review');
    } catch (requestError) {
      toast.error(apiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ContentEditorShell contentType="community">
      {({ locked }) => (
        <main className="community-studio-page">
          <Seo title="Soạn bài cộng đồng" />

          {loading ? <LoadingBlock /> : error ? (
            <div className="community-studio-error">
              <strong>Không tải được bài viết</strong>
              <p>{error}</p>
              <button type="button" onClick={() => void load()}>Tải lại</button>
            </div>
          ) : form ? (
            <>
              <header className="community-studio-heading">
                <div>
                  <span>Cộng đồng Hòa Lạc</span>
                  <h1>{source?.title === PLACEHOLDER_TITLE ? 'Tạo bài viết mới' : 'Chỉnh sửa bài cộng đồng'}</h1>
                  <p>Viết, thêm ảnh, phân loại và lưu trực tiếp vào bản nháp trên máy chủ.</p>
                </div>

                <div className="community-studio-save-state" aria-live="polite">
                  {saveState === 'saving' ? <Clock3 size={16} /> : <CheckCircle2 size={16} />}
                  {saveState === 'saving'
                    ? 'Đang tự lưu…'
                    : saveState === 'error'
                      ? 'Chưa lưu được lên máy chủ'
                      : dirty
                        ? 'Có thay đổi chưa lưu'
                        : 'Đã lưu'}
                </div>
              </header>

              {hasRecovery ? (
                <div className="community-studio-recovery">
                  <RotateCcw size={17} />
                  <span>Có bản khôi phục trên thiết bị.</span>
                  <button type="button" onClick={restoreRecovery}>Khôi phục</button>
                </div>
              ) : null}

              <section className="community-studio-card">
                <div className="community-studio-card__head">
                  <FileText size={20} />
                  <div>
                    <h2>Nội dung bài viết</h2>
                    <p>Tiêu đề rõ ý, nội dung tự nhiên; ảnh được chèn theo đúng thứ tự bạn chọn.</p>
                  </div>
                </div>

                <label className="community-studio-field">
                  <span>Tiêu đề <em>*</em></span>
                  <input
                    value={form.title}
                    maxLength={250}
                    disabled={locked}
                    onChange={(event) => change('title', event.target.value)}
                    placeholder="Ví dụ: Đường vào khu CNC sáng nay có ùn tắc không?"
                  />
                  <small>{form.title.length}/250</small>
                </label>

                <div className="community-studio-field">
                  <span>Nội dung <em>*</em></span>
                  <CommunitySocialEditor
                    value={form.bodyHtml}
                    disabled={locked}
                    onChange={(value) => change('bodyHtml', value)}
                    placeholder="Chia sẻ điều đang diễn ra tại Hòa Lạc…"
                  />
                </div>

                <label className="community-studio-field">
                  <span>Mô tả ngắn</span>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    disabled={locked}
                    value={form.summary}
                    onChange={(event) => change('summary', event.target.value)}
                    placeholder="Không bắt buộc. Dùng khi cần tóm tắt bài dài."
                  />
                </label>
              </section>

              <section className="community-studio-card">
                <div className="community-studio-card__head">
                  <MapPin size={20} />
                  <div>
                    <h2>Phân loại & khu vực</h2>
                    <p>Giúp bài xuất hiện đúng luồng và dễ tìm kiếm hơn.</p>
                  </div>
                </div>

                <div className="community-studio-grid">
                  <label className="community-studio-field">
                    <span>Loại bài</span>
                    <select
                      value={form.postType}
                      disabled={locked}
                      onChange={(event) => change('postType', event.target.value)}
                    >
                      {POST_TYPES.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="community-studio-field">
                    <span>Địa điểm cụ thể</span>
                    <input
                      value={form.locationText}
                      maxLength={500}
                      disabled={locked}
                      onChange={(event) => change('locationText', event.target.value)}
                      placeholder="Ví dụ: Khu CNC Hòa Lạc, Thạch Thất"
                    />
                  </label>
                </div>

                <fieldset disabled={locked} className="community-studio-taxonomy">
                  <TaxonomyFields
                    scope="community"
                    categoryId={form.primaryCategoryId}
                    areaId={form.primaryAreaId}
                    tagIds={form.tagIds}
                    onChange={change}
                  />
                </fieldset>

                <label className="community-studio-check">
                  <input
                    type="checkbox"
                    checked={form.allowComments}
                    disabled={locked}
                    onChange={(event) => change('allowComments', event.target.checked)}
                  />
                  Cho phép thành viên bình luận
                </label>
              </section>

              <footer className="community-studio-actions">
                <button
                  type="button"
                  className="community-studio-secondary"
                  disabled={locked || saving || submitting || !dirty}
                  onClick={() => void saveNow()}
                >
                  <Save size={17} />
                  {saving ? 'Đang lưu…' : 'Lưu nháp'}
                </button>
                <button
                  type="button"
                  className="community-studio-primary"
                  disabled={locked || saving || submitting}
                  onClick={submit}
                >
                  <Send size={17} />
                  {submitting ? 'Đang gửi…' : 'Gửi duyệt'}
                </button>
              </footer>
            </>
          ) : null}
        </main>
      )}
    </ContentEditorShell>
  );
}
