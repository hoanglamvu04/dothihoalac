import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Globe2,
  ImagePlus,
  Lightbulb,
  MapPin,
  MessageCircle,
  RotateCcw,
  Save,
  Send,
  SlidersHorizontal,
  Tag,
  UsersRound,
  X,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Avatar from '../../components/common/Avatar';
import CommunitySocialEditor from '../../components/community/CommunitySocialEditor';
import TaxonomyFields from '../../components/forms/TaxonomyFields';
import { LoadingBlock } from '../../components/common/Loading';
import CommunityPage from '../public/CommunityPage';
import { communityApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { useToast } from '../../context/ToastContext';
import { CONTENT_STATUS } from '../../utils/constants';

import './CommunityStudioPage.css';

const PLACEHOLDER_TITLE = 'Bản nháp cộng đồng';
const RECOVERY_PREFIX = 'dthl:studio-recovery:community:';
const EDITABLE_STATUSES = new Set(['draft', 'needs_revision', 'rejected']);

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

const POST_TYPE_LABELS = Object.fromEntries(POST_TYPES);

function idOf(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasInlineMedia(value) {
  return /<(img|video)\b/i.test(String(value || ''));
}

function generatedTitle(form) {
  const manual = String(form?.title || '').trim();
  if (manual.length >= 5) return manual;

  const text = stripHtml(form?.bodyHtml);
  if (text.length >= 5) {
    return text.length > 120
      ? `${text.slice(0, 117).trim()}…`
      : text;
  }

  return 'Bài viết cộng đồng';
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

  if (stripHtml(form.bodyHtml) || hasInlineMedia(form.bodyHtml)) {
    payload.bodyHtml = form.bodyHtml;
  }

  return payload;
}

function SettingCard({
  icon: Icon,
  title,
  value,
  tone = 'green',
  onClick,
}) {
  const className = `community-composer-setting-card community-composer-setting-card--${tone}`;
  const inner = (
    <>
      <span className="community-composer-setting-card__icon">
        <Icon size={20} />
      </span>
      <span className="community-composer-setting-card__copy">
        <strong>{title}</strong>
        <small>{value}</small>
      </span>
      {onClick ? <ChevronRight size={19} className="community-composer-setting-card__arrow" /> : null}
    </>
  );

  if (!onClick) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {inner}
    </button>
  );
}

export default function CommunityStudioPage() {
  const { editorId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { areas = [], categoriesFor } = useTaxonomy();
  const autoSaveRef = useRef(null);
  const editorWrapRef = useRef(null);

  const [source, setSource] = useState(null);
  const [form, setForm] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [error, setError] = useState('');
  const [hasRecovery, setHasRecovery] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [tipVisible, setTipVisible] = useState(true);

  const recoveryKey = `${RECOVERY_PREFIX}${editorId}`;
  const communityCategories = useMemo(
    () => categoriesFor?.('community') || [],
    [categoriesFor],
  );

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
  const locked = Boolean(source) && !EDITABLE_STATUSES.has(source.status);

  const composerName =
    source?.authorId?.displayName ||
    source?.author?.displayName ||
    user?.displayName ||
    user?.profile?.displayName ||
    user?.username ||
    'Thành viên';

  const composerAvatar =
    source?.authorId?.profile?.avatarMediaId ||
    source?.author?.profile?.avatarMediaId ||
    user?.profile?.avatarMediaId ||
    user?.avatarMediaId ||
    null;

  const areaLabel = useMemo(() => {
    if (!form?.primaryAreaId) return 'Tất cả khu vực';

    const area = areas.find(
      (item) => String(item?._id || item?.id) === String(form.primaryAreaId),
    );

    return area?.name || 'Khu vực đã chọn';
  }, [areas, form?.primaryAreaId]);

  const categoryLabel = useMemo(() => {
    if (!form?.primaryCategoryId) return 'Chưa chọn chủ đề';

    const category = communityCategories.find(
      (item) => String(item?._id || item?.id) === String(form.primaryCategoryId),
    );

    return category?.name || 'Chủ đề đã chọn';
  }, [communityCategories, form?.primaryCategoryId]);

  const postTypeLabel = POST_TYPE_LABELS[form?.postType] || 'Thảo luận';
  const moderationNote = source?.lastModeration?.note || '';
  const plainText = stripHtml(form?.bodyHtml || '');
  const hasPostContent = Boolean(
    form && (plainText || hasInlineMedia(form.bodyHtml)),
  );

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
    if (!form || saving || submitting || locked) return null;

    if (!quiet) setSaving(true);
    setSaveState('saving');
    persistRecovery(form);

    try {
      const result = await communityApi.update(editorId, serverPayload(form));
      setSavedSnapshot(JSON.stringify(form));
      setSource((current) => ({ ...(current || {}), ...(result || {}) }));
      setSaveState('saved');
      clearRecovery();
      if (!quiet) toast.success('Đã lưu bản nháp.');
      return result;
    } catch (requestError) {
      setSaveState('error');
      if (!quiet) {
        toast.error(apiErrorMessage(requestError, 'Chưa thể lưu bản nháp.'));
      }
      return null;
    } finally {
      if (!quiet) setSaving(false);
    }
  }, [
    clearRecovery,
    editorId,
    form,
    locked,
    persistRecovery,
    saving,
    submitting,
    toast,
  ]);

  useEffect(() => {
    if (!dirty || !form || saving || submitting || locked) return undefined;

    persistRecovery(form);
    setSaveState('saving');
    window.clearTimeout(autoSaveRef.current);

    autoSaveRef.current = window.setTimeout(() => {
      void saveNow({ quiet: true });
    }, 1200);

    return () => window.clearTimeout(autoSaveRef.current);
  }, [dirty, form, locked, persistRecovery, saveNow, saving, submitting]);

  useEffect(() => {
    const beforeUnload = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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

  const closeComposer = useCallback(async () => {
    if (closing || submitting) return;

    setClosing(true);
    window.clearTimeout(autoSaveRef.current);

    if (dirty && form && !locked) {
      persistRecovery(form);
      await saveNow({ quiet: true });
    }

    navigate('/cong-dong', { replace: true });
  }, [
    closing,
    dirty,
    form,
    locked,
    navigate,
    persistRecovery,
    saveNow,
    submitting,
  ]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      void closeComposer();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeComposer]);

  const submit = async () => {
    if (!form || submitting || saving || locked) return;

    const text = stripHtml(form.bodyHtml);
    const mediaOnly = hasInlineMedia(form.bodyHtml);

    if (!text && !mediaOnly) {
      toast.error('Hãy nhập nội dung hoặc thêm ảnh cho bài viết.');
      return;
    }

    const title = generatedTitle(form);
    const summary = form.summary.trim() || (
      text
        ? text.slice(0, 500)
        : 'Bài viết có hình ảnh từ cộng đồng Hòa Lạc.'
    );

    setSubmitting(true);
    window.clearTimeout(autoSaveRef.current);

    try {
      await communityApi.update(editorId, {
        ...serverPayload(form),
        title,
        summary,
        bodyHtml: form.bodyHtml,
      });
      await communityApi.submit(editorId);
      clearRecovery();
      toast.success('Đã gửi bài đi duyệt.');
      navigate('/cong-dong', { replace: true });
    } catch (requestError) {
      toast.error(apiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const openOptions = useCallback(() => {
    setOptionsOpen(true);
    window.setTimeout(() => {
      document.querySelector('.community-composer-options')?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 60);
  }, []);

  const openImagePicker = useCallback(() => {
    if (locked) return;
    editorWrapRef.current?.querySelector('input[type="file"]')?.click();
  }, [locked]);

  const saveLabel = saveState === 'saving'
    ? 'Đang tự lưu…'
    : saveState === 'error'
      ? 'Chưa lưu được'
      : dirty
        ? 'Đang chờ tự lưu'
        : 'Đã lưu';

  return (
    <div className="community-composer-scene">
      <Seo title={source?.title === PLACEHOLDER_TITLE ? 'Bài viết mới' : 'Chỉnh sửa bài cộng đồng'} />

      <div className="community-composer-scene__background" aria-hidden="true">
        <CommunityPage />
      </div>

      <div className="community-composer-overlay">
        <section
          className="community-composer-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Soạn bài cộng đồng"
        >
          {loading ? (
            <div className="community-composer-loading">
              <LoadingBlock />
              <p>Đang mở bản nháp…</p>
            </div>
          ) : error ? (
            <div className="community-composer-error">
              <strong>Không mở được bài viết</strong>
              <p>{error}</p>
              <div>
                <button type="button" onClick={() => void closeComposer()}>Đóng</button>
                <button type="button" onClick={() => void load()}>Tải lại</button>
              </div>
            </div>
          ) : form ? (
            <>
              <header className="community-composer-header">
                <button
                  type="button"
                  className="community-composer-cancel"
                  disabled={closing || submitting}
                  onClick={() => void closeComposer()}
                >
                  <ArrowLeft size={21} />
                  <span>Hủy</span>
                </button>

                <strong>
                  {source?.title === PLACEHOLDER_TITLE ? 'Bài viết mới' : 'Chỉnh sửa bài viết'}
                </strong>

                <button
                  type="button"
                  className="community-composer-header-submit"
                  disabled={locked || saving || submitting || closing || !hasPostContent}
                  onClick={submit}
                >
                  {submitting ? 'Đang gửi…' : source?.status === 'needs_revision' ? 'Gửi lại' : 'Đăng'}
                </button>
              </header>

              {hasRecovery ? (
                <div className="community-composer-recovery">
                  <RotateCcw size={16} />
                  <span>Có bản khôi phục trên thiết bị.</span>
                  <button type="button" onClick={restoreRecovery}>Khôi phục</button>
                  <button
                    type="button"
                    aria-label="Bỏ thông báo khôi phục"
                    onClick={clearRecovery}
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : null}

              {moderationNote && ['needs_revision', 'rejected'].includes(source?.status) ? (
                <div className="community-composer-moderation-note">
                  <strong>Ghi chú kiểm duyệt</strong>
                  <p>{moderationNote}</p>
                </div>
              ) : null}

              {locked ? (
                <div className="community-composer-locked">
                  Bài đang ở trạng thái <strong>{CONTENT_STATUS[source?.status] || source?.status}</strong> nên không thể chỉnh sửa.
                </div>
              ) : null}

              <div className="community-composer-body">
                <div className="community-composer-author">
                  <Avatar src={composerAvatar} name={composerName} size="md" />
                  <div>
                    <strong>{composerName}</strong>
                    <button
                      type="button"
                      className="community-composer-public-pill"
                      onClick={openOptions}
                      disabled={locked}
                    >
                      <Globe2 size={16} />
                      Công khai
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>

                <section className="community-composer-writing-card">
                  <div ref={editorWrapRef} className="community-composer-editor-wrap">
                    <CommunitySocialEditor
                      value={form.bodyHtml}
                      disabled={locked}
                      onChange={(value) => change('bodyHtml', value)}
                      placeholder="Bạn đang nghĩ gì?"
                      className="community-composer-editor"
                    />
                  </div>
                  <span className="community-composer-character-count">
                    {plainText.length.toLocaleString('vi-VN')} ký tự
                  </span>
                </section>

                <section className="community-composer-add-card" aria-label="Thêm vào bài viết">
                  <h2>Thêm vào bài viết</h2>
                  <div className="community-composer-add-grid">
                    <button type="button" onClick={openImagePicker} disabled={locked}>
                      <span className="is-media"><ImagePlus size={22} /></span>
                      <small>Ảnh/Video</small>
                    </button>
                    <button type="button" onClick={openOptions} disabled={locked}>
                      <span className="is-location"><MapPin size={22} /></span>
                      <small>Vị trí</small>
                    </button>
                    <button type="button" onClick={openOptions} disabled={locked}>
                      <span className="is-topic"><Tag size={22} /></span>
                      <small>Chủ đề</small>
                    </button>
                    <button type="button" onClick={openOptions} disabled={locked}>
                      <span className="is-type"><FileText size={22} /></span>
                      <small>Dạng bài</small>
                    </button>
                    <button
                      type="button"
                      onClick={() => change('allowComments', !form.allowComments)}
                      disabled={locked}
                    >
                      <span className="is-comments"><MessageCircle size={22} /></span>
                      <small>Bình luận</small>
                    </button>
                  </div>
                </section>

                <section className="community-composer-setting-grid" aria-label="Thiết lập nhanh">
                  <SettingCard
                    icon={MapPin}
                    title="Vị trí"
                    value={form.locationText || areaLabel}
                    tone="location"
                    onClick={openOptions}
                  />
                  <SettingCard
                    icon={UsersRound}
                    title="Đối tượng"
                    value="Công khai"
                    tone="audience"
                  />
                  <SettingCard
                    icon={Tag}
                    title="Chủ đề"
                    value={categoryLabel}
                    tone="topic"
                    onClick={openOptions}
                  />
                  <SettingCard
                    icon={FileText}
                    title="Dạng bài"
                    value={postTypeLabel}
                    tone="type"
                    onClick={openOptions}
                  />
                </section>

                {tipVisible ? (
                  <aside className="community-composer-tip">
                    <span><Lightbulb size={20} /></span>
                    <div>
                      <strong>Gợi ý</strong>
                      <p>Chia sẻ thông tin hữu ích, tích cực và tránh đăng dữ liệu cá nhân nhạy cảm.</p>
                    </div>
                    <button type="button" aria-label="Ẩn gợi ý" onClick={() => setTipVisible(false)}>
                      <X size={18} />
                    </button>
                  </aside>
                ) : null}

                {optionsOpen ? (
                  <section className="community-composer-options" aria-label="Lựa chọn về bài viết">
                    <div className="community-composer-options__heading">
                      <div>
                        <strong>Lựa chọn về bài viết</strong>
                        <p>Phân loại để bài xuất hiện đúng khu vực và chủ đề.</p>
                      </div>
                      <button
                        type="button"
                        aria-label="Đóng lựa chọn bài viết"
                        onClick={() => setOptionsOpen(false)}
                      >
                        <X size={17} />
                      </button>
                    </div>

                    <div className="community-composer-options__grid">
                      <label>
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

                      <label>
                        <span>Địa điểm cụ thể</span>
                        <div className="community-composer-location-input">
                          <MapPin size={16} />
                          <input
                            value={form.locationText}
                            maxLength={500}
                            disabled={locked}
                            onChange={(event) => change('locationText', event.target.value)}
                            placeholder="Ví dụ: Khu CNC Hòa Lạc"
                          />
                        </div>
                      </label>
                    </div>

                    <fieldset disabled={locked} className="community-composer-taxonomy">
                      <TaxonomyFields
                        scope="community"
                        categoryId={form.primaryCategoryId}
                        areaId={form.primaryAreaId}
                        tagIds={form.tagIds}
                        onChange={change}
                      />
                    </fieldset>

                    <label className="community-composer-optional-title">
                      <span>Tiêu đề riêng <small>không bắt buộc</small></span>
                      <input
                        value={form.title}
                        maxLength={250}
                        disabled={locked}
                        onChange={(event) => change('title', event.target.value)}
                        placeholder="Để trống, hệ thống sẽ lấy nội dung đầu bài làm tiêu đề"
                      />
                    </label>

                    <label className="community-composer-summary">
                      <span>Mô tả ngắn <small>không bắt buộc</small></span>
                      <textarea
                        rows={2}
                        maxLength={1000}
                        disabled={locked}
                        value={form.summary}
                        onChange={(event) => change('summary', event.target.value)}
                        placeholder="Dùng khi bài dài và cần tóm tắt"
                      />
                    </label>

                    <label className="community-composer-comments">
                      <input
                        type="checkbox"
                        checked={form.allowComments}
                        disabled={locked}
                        onChange={(event) => change('allowComments', event.target.checked)}
                      />
                      <span>
                        <strong>Cho phép bình luận</strong>
                        <small>{form.allowComments ? 'Thành viên có thể trao đổi dưới bài viết.' : 'Bình luận đang được tắt cho bài này.'}</small>
                      </span>
                    </label>
                  </section>
                ) : null}
              </div>

              <footer className="community-composer-footer">
                <button
                  type="button"
                  className="community-composer-save-draft"
                  disabled={locked || saving || submitting || !dirty}
                  onClick={() => void saveNow()}
                >
                  <Save size={18} />
                  <span>{saving ? 'Đang lưu…' : 'Lưu nháp'}</span>
                </button>

                <div className="community-composer-save-state" aria-live="polite">
                  {saveState === 'saving' ? <Clock3 size={14} /> : <CheckCircle2 size={14} />}
                  <span>{saveLabel}</span>
                  <small>Bài sẽ được kiểm duyệt trước khi hiển thị.</small>
                </div>

                <button
                  type="button"
                  className="community-composer-submit"
                  disabled={locked || saving || submitting || closing || !hasPostContent}
                  onClick={submit}
                >
                  <Send size={18} />
                  {submitting ? 'Đang gửi…' : source?.status === 'needs_revision' ? 'Gửi lại' : 'Đăng bài'}
                </button>
              </footer>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
