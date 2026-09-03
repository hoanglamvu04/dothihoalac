import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Globe2,
  ImagePlus,
  LoaderCircle,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Save,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  UsersRound,
  X,
} from 'lucide-react';

import Avatar from '../common/Avatar';
import CommunitySocialEditor from './CommunitySocialEditor';
import { communityApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { useToast } from '../../context/ToastContext';
import { COMMUNITY_TYPES } from '../../utils/constants';
import { isPersistedContentId } from '../../utils/content';

import './CommunityQuickComposer.css';

const DEFAULT_TYPE = 'discussion';
const EDITABLE_STATUSES = new Set([
  'draft',
  'needs_revision',
  'rejected',
  'published',
]);

function stripHtml(value = '') {
  if (typeof document === 'undefined') {
    return String(value || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const template = document.createElement('template');
  template.innerHTML = String(value || '');

  return String(template.content.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveTitle(bodyHtml, postType) {
  const text = stripHtml(bodyHtml);

  if (!text) {
    return `${COMMUNITY_TYPES[postType] || 'Chia sẻ'} tại Đô Thị Hòa Lạc`;
  }

  const firstSentence = text.split(/(?<=[.!?])\s+/)[0] || text;
  const compact = firstSentence.trim();

  if (compact.length <= 220) {
    return compact;
  }

  return `${compact.slice(0, 217).trim()}...`;
}

function deriveSummary(bodyHtml) {
  const text = stripHtml(bodyHtml);

  if (!text) return undefined;

  return text.length <= 420
    ? text
    : `${text.slice(0, 417).trim()}...`;
}

function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value._id || value.id || '');
}

function getQuickComposerTarget(anchor) {
  if (!anchor?.getAttribute) return null;

  const rawHref = anchor.getAttribute('href');
  if (!rawHref) return null;

  try {
    const url = new URL(rawHref, window.location.origin);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const bases = [
      '/dang-bai/cong-dong',
      '/studio/cong-dong',
      '/cong-dong/create',
    ];

    for (const base of bases) {
      if (pathname === base) {
        const queryId = url.searchParams.get('edit') || '';
        return {
          editId: isPersistedContentId(queryId) ? queryId : '',
        };
      }

      if (pathname.startsWith(`${base}/`)) {
        const rawId = decodeURIComponent(pathname.slice(base.length + 1));
        return {
          editId: isPersistedContentId(rawId) ? rawId : '',
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export default function CommunityQuickComposer() {
  const { user, isAuthenticated } = useAuth();
  const { categoriesFor, areas = [] } = useTaxonomy();
  const toast = useToast();
  const editorWrapRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tipVisible, setTipVisible] = useState(true);
  const [postType, setPostType] = useState(DEFAULT_TYPE);
  const [categoryId, setCategoryId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [draftId, setDraftId] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [formError, setFormError] = useState('');

  const categories = useMemo(
    () => categoriesFor('community') || [],
    [categoriesFor],
  );

  const displayName =
    user?.displayName ||
    user?.profile?.displayName ||
    user?.username ||
    'Thành viên';

  const composerAvatar =
    user?.profile?.avatarMediaId ||
    user?.avatarMediaId ||
    null;

  const selectedArea = useMemo(
    () =>
      areas.find(
        (item) => String(item._id) === String(areaId),
      ) || null,
    [areaId, areas],
  );

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (item) => String(item._id) === String(categoryId),
      ) || null,
    [categories, categoryId],
  );

  const plainText = useMemo(() => stripHtml(bodyHtml), [bodyHtml]);

  const hasContent = useMemo(() => {
    const hasInlineImage = /data-media-id=/i.test(bodyHtml);
    return Boolean(plainText || hasInlineImage);
  }, [bodyHtml, plainText]);

  const topicSummary = useMemo(() => {
    const parts = [
      COMMUNITY_TYPES[postType] || 'Cộng đồng',
      selectedArea?.name || 'Tất cả khu vực',
      selectedCategory?.name,
    ].filter(Boolean);

    return parts.join(' · ');
  }, [postType, selectedArea, selectedCategory]);

  const isEditing = Boolean(draftId);
  const canEditCurrent =
    !isEditing || EDITABLE_STATUSES.has(editStatus || 'draft');

  const resetComposer = useCallback(() => {
    setPostType(DEFAULT_TYPE);
    setCategoryId('');
    setAreaId('');
    setBodyHtml('');
    setAllowComments(true);
    setSaving(false);
    setLoadingEdit(false);
    setDraftId('');
    setEditStatus('');
    setFormError('');
    setOptionsOpen(false);
    setPreviewOpen(false);
    setTipVisible(true);
  }, []);

  const closeComposer = useCallback(() => {
    setOpen(false);
    resetComposer();

    window.dispatchEvent(
      new CustomEvent('dthl:community-composer-closed'),
    );
  }, [resetComposer]);

  const openComposer = useCallback(
    async (editId = '') => {
      resetComposer();
      setOpen(true);

      if (isPersistedContentId(editId)) {
        setLoadingEdit(true);
        setDraftId(editId);

        try {
          const source = await communityApi.editDetail(editId);
          const status = String(source?.status || 'draft');

          setEditStatus(status);
          setPostType(
            source?.community?.postType ||
              source?.postType ||
              DEFAULT_TYPE,
          );
          setCategoryId(normalizeId(source?.primaryCategoryId));
          setAreaId(normalizeId(source?.primaryAreaId));
          setBodyHtml(
            source?.body?.bodyHtml ||
              source?.bodyHtml ||
              '',
          );
          setAllowComments(source?.allowComments !== false);

          if (!EDITABLE_STATUSES.has(status)) {
            setFormError(
              'Bài đang chờ kiểm duyệt nên chưa thể chỉnh sửa. Hãy đợi kết quả duyệt trước.',
            );
          }
        } catch (error) {
          setFormError(
            apiErrorMessage(
              error,
              'Không thể tải bài viết để chỉnh sửa.',
            ),
          );
        } finally {
          setLoadingEdit(false);
        }

        return;
      }

      const params = new URLSearchParams(window.location.search);
      const filteredType = params.get('type') || '';
      const filteredArea = params.get('area') || '';
      const filteredCategory = params.get('category') || '';

      if (COMMUNITY_TYPES[filteredType]) {
        setPostType(filteredType);
      }

      if (
        filteredArea &&
        areas.some((item) => String(item._id) === filteredArea)
      ) {
        setAreaId(filteredArea);
      }

      if (
        filteredCategory &&
        categories.some((item) => String(item._id) === filteredCategory)
      ) {
        setCategoryId(filteredCategory);
      }
    },
    [areas, categories, resetComposer],
  );

  const requestClose = useCallback(
    (force = false) => {
      if (saving || loadingEdit) return;

      if (
        !force &&
        hasContent &&
        !window.confirm(
          isEditing
            ? 'Đóng trình chỉnh sửa? Các thay đổi chưa lưu sẽ bị mất.'
            : 'Bỏ nội dung bạn đang soạn?',
        )
      ) {
        return;
      }

      closeComposer();
    },
    [closeComposer, hasContent, isEditing, loadingEdit, saving],
  );

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest('a[href]');
      const composerTarget = getQuickComposerTarget(anchor);

      if (!composerTarget || !isAuthenticated) return;

      event.preventDefault();
      event.stopPropagation();
      void openComposer(composerTarget.editId);
    };

    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [isAuthenticated, openComposer]);

  useEffect(() => {
    const handleOpenEvent = (event) => {
      if (isAuthenticated) {
        void openComposer(event?.detail?.editId || '');
      }
    };

    window.addEventListener(
      'dthl:open-community-composer',
      handleOpenEvent,
    );

    return () => {
      window.removeEventListener(
        'dthl:open-community-composer',
        handleOpenEvent,
      );
    };
  }, [isAuthenticated, openComposer]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      if (!loadingEdit) {
        document
          .querySelector('.community-quick-composer__rte .rte-content')
          ?.focus();
      }
    }, 100);

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;

      if (previewOpen) {
        setPreviewOpen(false);
        return;
      }

      if (optionsOpen) {
        setOptionsOpen(false);
        return;
      }

      requestClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loadingEdit, open, optionsOpen, previewOpen, requestClose]);

  const buildPayload = useCallback(() => ({
    title: deriveTitle(bodyHtml, postType),
    summary: deriveSummary(bodyHtml),
    bodyHtml: bodyHtml.trim(),
    postType,
    primaryCategoryId: categoryId || null,
    primaryAreaId: areaId || null,
    tagIds: [],
    thumbnailMediaId: null,
    allowComments,
  }), [allowComments, areaId, bodyHtml, categoryId, postType]);

  const saveDraft = async () => {
    if (!hasContent || saving || loadingEdit || !canEditCurrent) return;

    setSaving(true);
    setFormError('');

    try {
      const payload = buildPayload();
      let id = draftId;

      if (id) {
        await communityApi.update(id, payload);
      } else {
        const created = await communityApi.create(payload);
        id = created?._id || created?.id || '';

        if (!id) {
          throw new Error('Server không trả về ID bài viết.');
        }

        setDraftId(id);
        setEditStatus('draft');
      }

      toast.success(
        editStatus === 'published'
          ? 'Đã lưu thay đổi.'
          : 'Đã lưu bản nháp.',
      );
    } catch (error) {
      setFormError(
        apiErrorMessage(error, 'Không thể lưu bản nháp. Vui lòng thử lại.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!hasContent || saving || loadingEdit || !canEditCurrent) return;

    setSaving(true);
    setFormError('');

    try {
      const payload = buildPayload();
      let id = draftId;

      if (id) {
        await communityApi.update(id, payload);
      } else {
        const created = await communityApi.create(payload);
        id = created?._id || created?.id || '';

        if (!id) {
          throw new Error('Server không trả về ID bài viết.');
        }

        setDraftId(id);
      }

      if (editStatus === 'published') {
        toast.success('Đã cập nhật bài viết.');
      } else {
        await communityApi.submit(id);
        toast.success('Đã gửi bài vào hàng chờ kiểm duyệt.');
      }

      closeComposer();

      window.dispatchEvent(
        new CustomEvent('dthl:community-post-submitted', {
          detail: {
            id,
            updated: Boolean(draftId),
          },
        }),
      );
    } catch (error) {
      setFormError(
        apiErrorMessage(
          error,
          isEditing
            ? 'Không thể lưu thay đổi. Vui lòng thử lại.'
            : 'Không thể đăng bài. Vui lòng thử lại.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const openImagePicker = () => {
    if (loadingEdit || !canEditCurrent) return;

    editorWrapRef.current
      ?.querySelector('input[type="file"]')
      ?.click();
  };

  if (!open || typeof document === 'undefined') {
    return null;
  }

  const saveLabel = isEditing
    ? editStatus === 'published'
      ? 'Lưu thay đổi'
      : 'Lưu & gửi duyệt'
    : 'Đăng';

  const mobilePublishLabel =
    editStatus === 'published' ? 'Lưu' : 'Đăng';

  return createPortal(
    <div
      className="community-quick-composer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <section
        className="community-quick-composer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-quick-composer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="community-quick-composer__header">
          <button
            type="button"
            className="community-quick-composer__cancel"
            onClick={() => requestClose()}
          >
            <ArrowLeft
              size={22}
              className="community-quick-composer__cancel-icon"
            />
            <span>Hủy</span>
          </button>

          <strong id="community-quick-composer-title">
            {isEditing ? 'Chỉnh sửa bài viết' : 'Bài viết mới'}
          </strong>

          <button
            type="button"
            className={`community-quick-composer__settings${
              optionsOpen ? ' is-active' : ''
            }`}
            aria-label="Tùy chọn bài viết"
            aria-expanded={optionsOpen}
            onClick={() => setOptionsOpen((value) => !value)}
          >
            <SlidersHorizontal size={20} />
          </button>

          <button
            type="button"
            className="community-quick-composer__mobile-header-publish"
            disabled={!hasContent || saving || loadingEdit || !canEditCurrent}
            onClick={publish}
          >
            {saving ? 'Đang lưu…' : mobilePublishLabel}
          </button>
        </header>

        <div className="community-quick-composer__mobile-scroll">
          <div className="community-quick-composer__mobile-author">
            <Avatar
              name={displayName}
              src={composerAvatar}
              size="md"
              className="community-quick-composer__mobile-avatar"
            />
            <div>
              <strong>{displayName}</strong>
              <button
                type="button"
                className="community-quick-composer__mobile-public"
                onClick={() => setOptionsOpen(true)}
              >
                <Globe2 size={17} />
                Công khai
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          <div className="community-quick-composer__thread">
            <Avatar
              name={displayName}
              src={composerAvatar}
              size="md"
              className="community-quick-composer__avatar"
            />

            <div className="community-quick-composer__main">
              <div className="community-quick-composer__identity">
                <strong>{displayName}</strong>

                <button
                  type="button"
                  className="community-quick-composer__topic-trigger"
                  aria-expanded={optionsOpen}
                  disabled={loadingEdit}
                  onClick={() => setOptionsOpen((value) => !value)}
                >
                  <span>{topicSummary || 'Cộng đồng hoặc chủ đề'}</span>
                  <ChevronRight size={15} />
                </button>
              </div>

              <div className="community-quick-composer__privacy">
                <Globe2 size={13} />
                Công khai
              </div>

              <div
                ref={editorWrapRef}
                className="community-quick-composer__writing-card"
              >
                {loadingEdit ? (
                  <div className="community-quick-composer__loading">
                    <LoaderCircle
                      size={22}
                      className="community-quick-composer__spin"
                    />
                    Đang tải bài viết...
                  </div>
                ) : (
                  <CommunitySocialEditor
                    className="community-quick-composer__rte"
                    value={bodyHtml}
                    disabled={!canEditCurrent}
                    onChange={(html) => {
                      setBodyHtml(html);
                      setFormError('');
                    }}
                    placeholder="Bạn đang nghĩ gì?"
                    uploadFolder="community/inline"
                    maxImages={12}
                    maxImageSizeMb={10}
                  />
                )}

                <span
                  className={`community-quick-composer__character-count${
                    plainText.length > 3000 ? ' is-over' : ''
                  }`}
                >
                  {plainText.length.toLocaleString('vi-VN')}/3000
                </span>
              </div>
            </div>
          </div>

          <section
            className="community-quick-composer__mobile-add-card"
            aria-label="Thêm vào bài viết"
          >
            <h2>Thêm vào bài viết</h2>
            <div>
              <button type="button" onClick={openImagePicker}>
                <span className="is-media"><ImagePlus size={23} /></span>
                <small>Ảnh/Video</small>
              </button>
              <button type="button" onClick={() => setOptionsOpen(true)}>
                <span className="is-location"><MapPin size={23} /></span>
                <small>Địa điểm</small>
              </button>
              <button type="button" onClick={() => setOptionsOpen(true)}>
                <span className="is-topic"><Tags size={23} /></span>
                <small>Chủ đề</small>
              </button>
              <button type="button" onClick={() => setOptionsOpen(true)}>
                <span className="is-type"><FileText size={23} /></span>
                <small>Dạng bài</small>
              </button>
              <button type="button" onClick={() => setOptionsOpen(true)}>
                <span className="is-more"><MoreHorizontal size={24} /></span>
                <small>Khác</small>
              </button>
            </div>
          </section>

          <div className="community-quick-composer__mobile-setting-stack">
            <button type="button" onClick={() => setOptionsOpen(true)}>
              <span className="community-quick-composer__setting-icon is-location">
                <MapPin size={22} />
              </span>
              <span>
                <strong>Vị trí</strong>
                <small>{selectedArea?.name || 'Thêm khu vực vào bài viết'}</small>
              </span>
              <ChevronRight size={21} />
            </button>

            <div className="community-quick-composer__mobile-setting-static">
              <span className="community-quick-composer__setting-icon is-audience">
                <UsersRound size={22} />
              </span>
              <span>
                <strong>Đối tượng</strong>
                <small>Công khai</small>
              </span>
              <Globe2 size={20} />
            </div>

            <button type="button" onClick={() => setOptionsOpen(true)}>
              <span className="community-quick-composer__setting-icon is-topic">
                <Tags size={22} />
              </span>
              <span>
                <strong>Chủ đề</strong>
                <small>{selectedCategory?.name || 'Chọn chủ đề phù hợp'}</small>
              </span>
              <ChevronRight size={21} />
            </button>
          </div>

          {tipVisible ? (
            <aside className="community-quick-composer__mobile-tip">
              <span><ShieldCheck size={22} /></span>
              <div>
                <strong>Gợi ý</strong>
                <p>
                  Chia sẻ nội dung hữu ích, tích cực và tuân thủ quy định cộng đồng.
                </p>
              </div>
              <button
                type="button"
                aria-label="Ẩn gợi ý"
                onClick={() => setTipVisible(false)}
              >
                <X size={20} />
              </button>
            </aside>
          ) : null}
        </div>

        {optionsOpen ? (
          <button
            type="button"
            className="community-quick-composer__mobile-sheet-backdrop"
            aria-label="Đóng tùy chọn"
            onClick={() => setOptionsOpen(false)}
          />
        ) : null}

        {optionsOpen ? (
          <section className="community-quick-composer__options">
            <div className="community-quick-composer__option-heading">
              <div>
                <Tags size={18} />
                <span>
                  <strong>Cộng đồng hoặc chủ đề</strong>
                  <small>
                    Gắn nhãn để người đọc hiểu nhanh nội dung bài viết.
                  </small>
                </span>
              </div>
            </div>

            <div className="community-quick-composer__type-list">
              {Object.entries(COMMUNITY_TYPES).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  disabled={!canEditCurrent}
                  className={postType === value ? 'is-active' : ''}
                  onClick={() => {
                    setPostType(value);
                    setFormError('');
                  }}
                >
                  <MessageCircle size={14} />
                  {label}
                </button>
              ))}
            </div>

            <div className="community-quick-composer__select-grid">
              <label>
                <span>
                  <MapPin size={15} />
                  Khu vực
                </span>
                <select
                  value={areaId}
                  disabled={!canEditCurrent}
                  onChange={(event) => {
                    setAreaId(event.target.value);
                    setFormError('');
                  }}
                >
                  <option value="">Tất cả khu vực</option>
                  {areas.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>
                  <Tags size={15} />
                  Chủ đề chi tiết
                </span>
                <select
                  value={categoryId}
                  disabled={!canEditCurrent}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  <option value="">Không bắt buộc</option>
                  {categories.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="community-quick-composer__comments-option">
              <input
                type="checkbox"
                checked={allowComments}
                disabled={!canEditCurrent}
                onChange={(event) => setAllowComments(event.target.checked)}
              />
              <span>
                <strong>Cho phép bình luận</strong>
                <small>
                  Người đọc có thể trao đổi bên dưới bài sau khi được duyệt.
                </small>
              </span>
            </label>
          </section>
        ) : null}

        {formError ? (
          <div className="community-quick-composer__error" role="alert">
            {formError}
          </div>
        ) : null}

        <footer className="community-quick-composer__footer">
          <div className="community-quick-composer__desktop-footer">
            <button
              type="button"
              className="community-quick-composer__post-options"
              disabled={loadingEdit}
              onClick={() => setOptionsOpen((value) => !value)}
            >
              <SlidersHorizontal size={17} />
              Lựa chọn về bài viết
            </button>

            <div className="community-quick-composer__publish-group">
              <small>
                {editStatus === 'published'
                  ? 'Thay đổi sẽ cập nhật ngay trên bài đang hiển thị.'
                  : 'Bài sẽ được kiểm duyệt trước khi hiển thị.'}
              </small>

              <button
                type="button"
                className="community-quick-composer__publish"
                disabled={!hasContent || saving || loadingEdit || !canEditCurrent}
                onClick={publish}
              >
                {saving ? (
                  <LoaderCircle
                    size={17}
                    className="community-quick-composer__spin"
                  />
                ) : isEditing ? (
                  <Save size={16} />
                ) : (
                  <Send size={16} />
                )}
                {saving ? 'Đang lưu...' : saveLabel}
              </button>
            </div>
          </div>

          <div className="community-quick-composer__mobile-footer">
            <button
              type="button"
              className="community-quick-composer__mobile-save"
              disabled={!hasContent || saving || loadingEdit || !canEditCurrent}
              onClick={saveDraft}
            >
              <Save size={19} />
              <span>
                {editStatus === 'published' ? 'Lưu thay đổi' : 'Lưu nháp'}
              </span>
            </button>

            <button
              type="button"
              className="community-quick-composer__mobile-preview"
              disabled={!hasContent}
              onClick={() => setPreviewOpen(true)}
            >
              <Eye size={22} />
              <small>Xem trước</small>
            </button>

            <button
              type="button"
              className="community-quick-composer__mobile-publish"
              disabled={!hasContent || saving || loadingEdit || !canEditCurrent}
              onClick={publish}
            >
              {saving ? (
                <LoaderCircle
                  size={19}
                  className="community-quick-composer__spin"
                />
              ) : (
                <Send size={20} />
              )}
              <span>{saving ? 'Đang lưu…' : 'Đăng bài'}</span>
            </button>
          </div>
        </footer>

        {previewOpen ? (
          <div className="community-quick-composer__preview-backdrop">
            <section className="community-quick-composer__preview-card">
              <header>
                <strong>Xem trước bài viết</strong>
                <button
                  type="button"
                  aria-label="Đóng xem trước"
                  onClick={() => setPreviewOpen(false)}
                >
                  <X size={21} />
                </button>
              </header>

              <div className="community-quick-composer__preview-author">
                <Avatar name={displayName} src={composerAvatar} size="md" />
                <span>
                  <strong>{displayName}</strong>
                  <small>{topicSummary}</small>
                </span>
              </div>

              <p className="community-quick-composer__preview-copy">
                {plainText || 'Bài viết có nội dung hình ảnh.'}
              </p>
            </section>
          </div>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
