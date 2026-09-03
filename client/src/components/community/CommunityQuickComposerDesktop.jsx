import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
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
  Search,
  Send,
  ShieldCheck,
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
import './CommunityQuickComposerDesktop.css';

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
  return compact.length <= 220
    ? compact
    : `${compact.slice(0, 217).trim()}...`;
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

export default function CommunityQuickComposerDesktop() {
  const { user, isAuthenticated } = useAuth();
  const { categoriesFor, areas = [] } = useTaxonomy();
  const toast = useToast();
  const editorWrapRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('');
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
  const [areaQuery, setAreaQuery] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');

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
    user?.profile?.avatarMediaId || user?.avatarMediaId || null;

  const selectedArea = useMemo(
    () => areas.find((item) => String(item._id) === String(areaId)) || null,
    [areaId, areas],
  );

  const selectedCategory = useMemo(
    () =>
      categories.find((item) => String(item._id) === String(categoryId)) ||
      null,
    [categories, categoryId],
  );

  const filteredAreas = useMemo(() => {
    const query = areaQuery.trim().toLocaleLowerCase('vi');
    if (!query) return areas;
    return areas.filter((item) =>
      String(item?.name || '').toLocaleLowerCase('vi').includes(query),
    );
  }, [areaQuery, areas]);

  const filteredCategories = useMemo(() => {
    const query = categoryQuery.trim().toLocaleLowerCase('vi');
    if (!query) return categories;
    return categories.filter((item) =>
      String(item?.name || '').toLocaleLowerCase('vi').includes(query),
    );
  }, [categories, categoryQuery]);

  const plainText = useMemo(() => stripHtml(bodyHtml), [bodyHtml]);
  const hasInlineImage = /data-media-id=/i.test(bodyHtml);
  const hasContent = Boolean(plainText || hasInlineImage);
  const isTooLong = plainText.length > 3000;
  const isEditing = Boolean(draftId);
  const canEditCurrent =
    !isEditing || EDITABLE_STATUSES.has(editStatus || 'draft');

  const resetComposer = useCallback(() => {
    setActivePanel('');
    setPreviewOpen(false);
    setTipVisible(true);
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
    setAreaQuery('');
    setCategoryQuery('');
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
            source?.community?.postType || source?.postType || DEFAULT_TYPE,
          );
          setCategoryId(normalizeId(source?.primaryCategoryId));
          setAreaId(normalizeId(source?.primaryAreaId));
          setBodyHtml(source?.body?.bodyHtml || source?.bodyHtml || '');
          setAllowComments(source?.allowComments !== false);

          if (!EDITABLE_STATUSES.has(status)) {
            setFormError(
              'Bài đang chờ kiểm duyệt nên chưa thể chỉnh sửa. Hãy đợi kết quả duyệt trước.',
            );
          }
        } catch (error) {
          setFormError(
            apiErrorMessage(error, 'Không thể tải bài viết để chỉnh sửa.'),
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

      if (COMMUNITY_TYPES[filteredType]) setPostType(filteredType);
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

  const requestClose = useCallback(() => {
    if (saving || loadingEdit) return;
    if (
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
  }, [closeComposer, hasContent, isEditing, loadingEdit, saving]);

  useEffect(() => {
    const handleOpenEvent = (event) => {
      if (isAuthenticated) {
        void openComposer(event?.detail?.editId || '');
      }
    };

    window.addEventListener('dthl:open-community-composer', handleOpenEvent);
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
        editorWrapRef.current?.querySelector('.rte-content')?.focus();
      }
    }, 120);

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (previewOpen) {
        setPreviewOpen(false);
      } else if (activePanel) {
        setActivePanel('');
      } else {
        requestClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePanel, loadingEdit, open, previewOpen, requestClose]);

  const buildPayload = useCallback(
    () => ({
      title: deriveTitle(bodyHtml, postType),
      summary: deriveSummary(bodyHtml),
      bodyHtml: bodyHtml.trim(),
      postType,
      primaryCategoryId: categoryId || null,
      primaryAreaId: areaId || null,
      tagIds: [],
      thumbnailMediaId: null,
      allowComments,
    }),
    [allowComments, areaId, bodyHtml, categoryId, postType],
  );

  const saveDraft = async () => {
    if (
      !hasContent ||
      isTooLong ||
      saving ||
      loadingEdit ||
      !canEditCurrent
    ) {
      return;
    }

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
        if (!id) throw new Error('Server không trả về ID bài viết.');
        setDraftId(id);
        setEditStatus('draft');
      }

      toast.success(
        editStatus === 'published' ? 'Đã lưu thay đổi.' : 'Đã lưu bản nháp.',
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
    if (
      !hasContent ||
      isTooLong ||
      saving ||
      loadingEdit ||
      !canEditCurrent
    ) {
      return;
    }

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
        if (!id) throw new Error('Server không trả về ID bài viết.');
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
          detail: { id, updated: Boolean(draftId) },
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
    editorWrapRef.current?.querySelector('input[type="file"]')?.click();
  };

  if (!open || typeof document === 'undefined') return null;

  const actionDisabled =
    !hasContent || isTooLong || saving || loadingEdit || !canEditCurrent;

  const postTypeLabel = COMMUNITY_TYPES[postType] || 'Thảo luận';

  const panelTitle = {
    location: 'Chọn vị trí',
    audience: 'Đối tượng',
    topic: 'Chọn chủ đề',
    type: 'Dạng bài',
    more: 'Tùy chọn khác',
  }[activePanel];

  return createPortal(
    <div
      className="community-desktop-composer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        className="community-desktop-composer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-desktop-composer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="community-desktop-composer__header">
          <button type="button" onClick={requestClose}>Hủy</button>
          <strong id="community-desktop-composer-title">
            {isEditing ? 'Chỉnh sửa bài viết' : 'Bài viết mới'}
          </strong>
          <button
            type="button"
            className="community-desktop-composer__header-publish"
            disabled={actionDisabled}
            onClick={publish}
          >
            {saving ? 'Đang lưu…' : editStatus === 'published' ? 'Lưu' : 'Đăng'}
          </button>
        </header>

        <div className="community-desktop-composer__body">
          <main className="community-desktop-composer__main">
            <div className="community-desktop-composer__author">
              <Avatar name={displayName} src={composerAvatar} size="md" />
              <div>
                <strong>{displayName}</strong>
                <button
                  type="button"
                  className="community-desktop-composer__audience-pill"
                  onClick={() => setActivePanel('audience')}
                >
                  <Globe2 size={16} /> Công khai <ChevronRight size={15} />
                </button>
              </div>
            </div>

            <div
              ref={editorWrapRef}
              className="community-desktop-composer__writing-card"
            >
              {loadingEdit ? (
                <div className="community-desktop-composer__loading">
                  <LoaderCircle className="community-desktop-composer__spin" size={24} />
                  Đang tải bài viết…
                </div>
              ) : (
                <CommunitySocialEditor
                  className="community-desktop-composer__editor"
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

              <div className="community-desktop-composer__writing-meta">
                <button type="button" onClick={openImagePicker}>
                  <ImagePlus size={20} />
                </button>
                <span className={isTooLong ? 'is-over' : ''}>
                  {plainText.length.toLocaleString('vi-VN')}/3000
                </span>
              </div>
            </div>

            <section className="community-desktop-composer__add-card">
              <div>
                <strong>Thêm vào bài viết</strong>
                <small>Gắn thông tin để bài viết rõ ràng và dễ tìm hơn.</small>
              </div>
              <nav aria-label="Tiện ích bài viết">
                <button type="button" onClick={openImagePicker}>
                  <span className="is-media"><ImagePlus size={20} /></span>
                  Ảnh/Video
                </button>
                <button type="button" onClick={() => setActivePanel('location')}>
                  <span className="is-location"><MapPin size={20} /></span>
                  Địa điểm
                </button>
                <button type="button" onClick={() => setActivePanel('topic')}>
                  <span className="is-topic"><Tags size={20} /></span>
                  Chủ đề
                </button>
                <button type="button" onClick={() => setActivePanel('type')}>
                  <span className="is-type"><FileText size={20} /></span>
                  Dạng bài
                </button>
                <button type="button" onClick={() => setActivePanel('more')}>
                  <span className="is-more"><MoreHorizontal size={20} /></span>
                  Khác
                </button>
              </nav>
            </section>

            {tipVisible ? (
              <aside className="community-desktop-composer__tip">
                <span><ShieldCheck size={21} /></span>
                <div>
                  <strong>Gợi ý</strong>
                  <p>
                    Chia sẻ thông tin hữu ích, có ngữ cảnh rõ ràng và tôn trọng quy định cộng đồng.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Ẩn gợi ý"
                  onClick={() => setTipVisible(false)}
                >
                  <X size={18} />
                </button>
              </aside>
            ) : null}
          </main>

          <aside className="community-desktop-composer__side">
            <div className="community-desktop-composer__side-heading">
              <strong>Thông tin bài viết</strong>
              <small>Có thể thay đổi bất cứ lúc nào trước khi đăng.</small>
            </div>

            <button type="button" onClick={() => setActivePanel('location')}>
              <span className="is-location"><MapPin size={20} /></span>
              <span>
                <strong>Vị trí</strong>
                <small>{selectedArea?.name || 'Chưa chọn khu vực'}</small>
              </span>
              <ChevronRight size={18} />
            </button>

            <button type="button" onClick={() => setActivePanel('audience')}>
              <span className="is-audience"><UsersRound size={20} /></span>
              <span>
                <strong>Đối tượng</strong>
                <small>Công khai</small>
              </span>
              <ChevronRight size={18} />
            </button>

            <button type="button" onClick={() => setActivePanel('topic')}>
              <span className="is-topic"><Tags size={20} /></span>
              <span>
                <strong>Chủ đề</strong>
                <small>{selectedCategory?.name || 'Chưa chọn chủ đề'}</small>
              </span>
              <ChevronRight size={18} />
            </button>

            <button type="button" onClick={() => setActivePanel('type')}>
              <span className="is-type"><MessageCircle size={20} /></span>
              <span>
                <strong>Dạng bài</strong>
                <small>{postTypeLabel}</small>
              </span>
              <ChevronRight size={18} />
            </button>

            <button type="button" onClick={() => setActivePanel('more')}>
              <span className="is-more"><MoreHorizontal size={20} /></span>
              <span>
                <strong>Tùy chọn</strong>
                <small>{allowComments ? 'Cho phép bình luận' : 'Đã tắt bình luận'}</small>
              </span>
              <ChevronRight size={18} />
            </button>
          </aside>
        </div>

        {formError ? (
          <div className="community-desktop-composer__error" role="alert">
            {formError}
          </div>
        ) : null}

        <footer className="community-desktop-composer__footer">
          <button
            type="button"
            className="community-desktop-composer__save"
            disabled={actionDisabled}
            onClick={saveDraft}
          >
            <Save size={18} />
            {editStatus === 'published' ? 'Lưu thay đổi' : 'Lưu nháp'}
          </button>

          <button
            type="button"
            className="community-desktop-composer__preview"
            disabled={!hasContent}
            onClick={() => setPreviewOpen(true)}
          >
            <Eye size={19} /> Xem trước
          </button>

          <span className="community-desktop-composer__moderation-note">
            Bài sẽ được kiểm duyệt trước khi hiển thị.
          </span>

          <button
            type="button"
            className="community-desktop-composer__publish"
            disabled={actionDisabled}
            onClick={publish}
          >
            {saving ? (
              <LoaderCircle className="community-desktop-composer__spin" size={18} />
            ) : (
              <Send size={18} />
            )}
            {saving ? 'Đang lưu…' : editStatus === 'published' ? 'Lưu bài' : 'Đăng bài'}
          </button>
        </footer>

        {activePanel ? (
          <>
            <button
              type="button"
              className="community-desktop-composer__drawer-backdrop"
              aria-label="Đóng bảng chọn"
              onClick={() => setActivePanel('')}
            />
            <section className="community-desktop-composer__drawer">
              <header>
                <div>
                  <strong>{panelTitle}</strong>
                  <small>Áp dụng ngay cho bài viết hiện tại.</small>
                </div>
                <button
                  type="button"
                  aria-label="Đóng"
                  onClick={() => setActivePanel('')}
                >
                  <X size={20} />
                </button>
              </header>

              {activePanel === 'location' ? (
                <div className="community-desktop-composer__picker">
                  <label className="community-desktop-composer__search">
                    <Search size={18} />
                    <input
                      value={areaQuery}
                      onChange={(event) => setAreaQuery(event.target.value)}
                      placeholder="Tìm khu vực"
                    />
                  </label>
                  <button
                    type="button"
                    className={!areaId ? 'is-selected' : ''}
                    onClick={() => {
                      setAreaId('');
                      setActivePanel('');
                    }}
                  >
                    <span><MapPin size={18} /></span>
                    <div>
                      <strong>Tất cả khu vực</strong>
                      <small>Không giới hạn theo khu vực</small>
                    </div>
                    {!areaId ? <Check size={18} /> : null}
                  </button>
                  {filteredAreas.map((item) => (
                    <button
                      type="button"
                      key={item._id}
                      className={String(item._id) === String(areaId) ? 'is-selected' : ''}
                      onClick={() => {
                        setAreaId(String(item._id));
                        setActivePanel('');
                      }}
                    >
                      <span><MapPin size={18} /></span>
                      <div>
                        <strong>{item.name}</strong>
                        <small>Khu vực cộng đồng</small>
                      </div>
                      {String(item._id) === String(areaId) ? <Check size={18} /> : null}
                    </button>
                  ))}
                </div>
              ) : null}

              {activePanel === 'topic' ? (
                <div className="community-desktop-composer__picker">
                  <label className="community-desktop-composer__search">
                    <Search size={18} />
                    <input
                      value={categoryQuery}
                      onChange={(event) => setCategoryQuery(event.target.value)}
                      placeholder="Tìm chủ đề"
                    />
                  </label>
                  <button
                    type="button"
                    className={!categoryId ? 'is-selected' : ''}
                    onClick={() => {
                      setCategoryId('');
                      setActivePanel('');
                    }}
                  >
                    <span><Tags size={18} /></span>
                    <div>
                      <strong>Không bắt buộc</strong>
                      <small>Đăng bài không gắn chủ đề</small>
                    </div>
                    {!categoryId ? <Check size={18} /> : null}
                  </button>
                  {filteredCategories.map((item) => (
                    <button
                      type="button"
                      key={item._id}
                      className={String(item._id) === String(categoryId) ? 'is-selected' : ''}
                      onClick={() => {
                        setCategoryId(String(item._id));
                        setActivePanel('');
                      }}
                    >
                      <span><Tags size={18} /></span>
                      <div>
                        <strong>{item.name}</strong>
                        <small>Chủ đề cộng đồng</small>
                      </div>
                      {String(item._id) === String(categoryId) ? <Check size={18} /> : null}
                    </button>
                  ))}
                </div>
              ) : null}

              {activePanel === 'audience' ? (
                <div className="community-desktop-composer__audience-panel">
                  <div className="is-selected">
                    <span><Globe2 size={21} /></span>
                    <div>
                      <strong>Công khai</strong>
                      <small>Bất kỳ ai trên Đô Thị Hòa Lạc đều có thể xem bài viết.</small>
                    </div>
                    <Check size={19} />
                  </div>
                  <p>
                    Community hiện dùng phạm vi công khai. Khi backend có privacy scope riêng,
                    các lựa chọn thành viên/nhóm có thể bổ sung tại đây mà không đổi luồng đăng.
                  </p>
                </div>
              ) : null}

              {activePanel === 'type' ? (
                <div className="community-desktop-composer__type-grid">
                  {Object.entries(COMMUNITY_TYPES).map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={postType === value ? 'is-selected' : ''}
                      onClick={() => {
                        setPostType(value);
                        setActivePanel('');
                      }}
                    >
                      <MessageCircle size={19} />
                      <span>{label}</span>
                      {postType === value ? <Check size={17} /> : null}
                    </button>
                  ))}
                </div>
              ) : null}

              {activePanel === 'more' ? (
                <div className="community-desktop-composer__more-panel">
                  <label>
                    <span>
                      <MessageCircle size={20} />
                      <span>
                        <strong>Cho phép bình luận</strong>
                        <small>Người đọc có thể trao đổi bên dưới bài sau khi được duyệt.</small>
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={allowComments}
                      onChange={(event) => setAllowComments(event.target.checked)}
                    />
                  </label>
                </div>
              ) : null}
            </section>
          </>
        ) : null}

        {previewOpen ? (
          <div className="community-desktop-composer__preview-backdrop">
            <section className="community-desktop-composer__preview-card">
              <header>
                <strong>Xem trước bài viết</strong>
                <button
                  type="button"
                  aria-label="Đóng xem trước"
                  onClick={() => setPreviewOpen(false)}
                >
                  <X size={20} />
                </button>
              </header>
              <div className="community-desktop-composer__preview-author">
                <Avatar name={displayName} src={composerAvatar} size="md" />
                <span>
                  <strong>{displayName}</strong>
                  <small>
                    {postTypeLabel} · {selectedArea?.name || 'Tất cả khu vực'}
                  </small>
                </span>
              </div>
              <div className="community-desktop-composer__preview-copy">
                {plainText || 'Bài viết có nội dung hình ảnh.'}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
