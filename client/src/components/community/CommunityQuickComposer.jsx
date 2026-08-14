import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  Globe2,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Save,
  Send,
  SlidersHorizontal,
  Tags,
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

  const firstSentence =
    text.split(/(?<=[.!?])\s+/)[0] || text;
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

    if (pathname === '/dang-bai/cong-dong') {
      return { editId: '' };
    }

    const match = pathname.match(/^\/dang-bai\/cong-dong\/([^/]+)$/);
    const editId = match ? decodeURIComponent(match[1]) : '';

    if (isPersistedContentId(editId)) {
      return { editId };
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

  const [open, setOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
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

  const hasContent = useMemo(() => {
    const text = stripHtml(bodyHtml);
    const hasInlineImage = /data-media-id=/i.test(bodyHtml);

    return Boolean(text || hasInlineImage);
  }, [bodyHtml]);

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
    [
      closeComposer,
      hasContent,
      isEditing,
      loadingEdit,
      saving,
    ],
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

      const target =
        event.target instanceof Element
          ? event.target
          : null;
      const anchor = target?.closest('a[href]');
      const composerTarget = getQuickComposerTarget(anchor);

      if (!composerTarget) return;

      if (!isAuthenticated) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void openComposer(composerTarget.editId);
    };

    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      document.removeEventListener(
        'click',
        handleDocumentClick,
        true,
      );
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
          .querySelector(
            '.community-quick-composer__rte .rte-content',
          )
          ?.focus();
      }
    }, 100);

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      requestClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loadingEdit, open, requestClose]);

  const publish = async () => {
    if (
      !hasContent ||
      saving ||
      loadingEdit ||
      !canEditCurrent
    ) {
      return;
    }

    setSaving(true);
    setFormError('');

    const payload = {
      title: deriveTitle(bodyHtml, postType),
      summary: deriveSummary(bodyHtml),
      bodyHtml: bodyHtml.trim(),
      postType,
      primaryCategoryId: categoryId || null,
      primaryAreaId: areaId || null,
      tagIds: [],
      thumbnailMediaId: null,
      allowComments,
    };

    try {
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
        toast.success(
          isEditing
            ? 'Đã lưu thay đổi và gửi bài đi duyệt lại.'
            : 'Đã đăng bài vào hàng chờ kiểm duyệt.',
        );
      }

      closeComposer();

      window.dispatchEvent(
        new CustomEvent('dthl:community-post-submitted', {
          detail: {
            id,
            updated: isEditing,
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

  if (!open || typeof document === 'undefined') {
    return null;
  }

  const saveLabel = isEditing
    ? editStatus === 'published'
      ? 'Lưu thay đổi'
      : 'Lưu & gửi duyệt'
    : 'Đăng';

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
            Hủy
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
        </header>

        <div className="community-quick-composer__thread">
          <Avatar
            name={displayName}
            src={user?.profile?.avatarMediaId}
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
                <span>
                  {topicSummary || 'Cộng đồng hoặc chủ đề'}
                </span>
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="community-quick-composer__privacy">
              <Globe2 size={13} />
              Công khai
            </div>

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
                placeholder="Có gì mới?"
                uploadFolder="community/inline"
                maxImages={12}
                maxImageSizeMb={10}
              />
            )}
          </div>
        </div>

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
              {Object.entries(COMMUNITY_TYPES).map(
                ([value, label]) => (
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
                ),
              )}
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
                  onChange={(event) =>
                    setCategoryId(event.target.value)
                  }
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
                onChange={(event) =>
                  setAllowComments(event.target.checked)
                }
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
          <div
            className="community-quick-composer__error"
            role="alert"
          >
            {formError}
          </div>
        ) : null}

        <footer className="community-quick-composer__footer">
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
              disabled={
                !hasContent ||
                saving ||
                loadingEdit ||
                !canEditCurrent
              }
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
        </footer>
      </section>
    </div>,
    document.body,
  );
}
