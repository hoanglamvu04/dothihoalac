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
  Check,
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
  Search,
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

import './CommunityQuickComposerMobile.css';

const DEFAULT_TYPE = 'discussion';
const MAX_CHARACTERS = 3000;
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

function Sheet({ title, onClose, children, className = '' }) {
  return (
    <div
      className="community-mobile-sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`community-mobile-sheet${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="community-mobile-sheet__handle" aria-hidden="true" />
        <header className="community-mobile-sheet__header">
          <strong>{title}</strong>
          <button type="button" aria-label="Đóng" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <div className="community-mobile-sheet__body">{children}</div>
      </section>
    </div>
  );
}

function SettingRow({ icon: Icon, title, value, onClick }) {
  return (
    <button
      type="button"
      className="community-mobile-setting-row"
      onClick={onClick}
    >
      <span className="community-mobile-setting-row__icon">
        <Icon size={23} />
      </span>
      <span className="community-mobile-setting-row__copy">
        <strong>{title}</strong>
        <small>{value}</small>
      </span>
      <ChevronRight size={21} />
    </button>
  );
}

export default function CommunityQuickComposerMobile() {
  const { user, isAuthenticated } = useAuth();
  const { categoriesFor, areas = [] } = useTaxonomy();
  const toast = useToast();
  const editorWrapRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState('');
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
  const [tipVisible, setTipVisible] = useState(true);
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

  const avatarSrc =
    user?.profile?.avatarMediaId ||
    user?.avatarMediaId ||
    null;

  const selectedArea = useMemo(
    () => areas.find((item) => String(item._id) === String(areaId)) || null,
    [areaId, areas],
  );

  const selectedCategory = useMemo(
    () => categories.find((item) => String(item._id) === String(categoryId)) || null,
    [categories, categoryId],
  );

  const plainText = useMemo(() => stripHtml(bodyHtml), [bodyHtml]);
  const characterCount = plainText.length;
  const hasInlineMedia = /data-media-id=|<img\b/i.test(bodyHtml);
  const hasContent = Boolean(plainText || hasInlineMedia);
  const withinLimit = characterCount <= MAX_CHARACTERS;
  const isEditing = Boolean(draftId);
  const canEditCurrent =
    !isEditing || EDITABLE_STATUSES.has(editStatus || 'draft');

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
    setActiveSheet('');
    setTipVisible(true);
    setAreaQuery('');
    setCategoryQuery('');
  }, []);

  const closeComposer = useCallback(() => {
    setOpen(false);
    resetComposer();
    window.dispatchEvent(new CustomEvent('dthl:community-composer-closed'));
  }, [resetComposer]);

  const openComposer = useCallback(async (editId = '') => {
    resetComposer();
    setOpen(true);

    if (!isPersistedContentId(editId)) {
      const params = new URLSearchParams(window.location.search);
      const filteredType = params.get('type') || '';
      const filteredArea = params.get('area') || '';
      const filteredCategory = params.get('category') || '';

      if (COMMUNITY_TYPES[filteredType]) setPostType(filteredType);
      if (filteredArea && areas.some((item) => String(item._id) === filteredArea)) {
        setAreaId(filteredArea);
      }
      if (
        filteredCategory &&
        categories.some((item) => String(item._id) === filteredCategory)
      ) {
        setCategoryId(filteredCategory);
      }
      return;
    }

    setLoadingEdit(true);
    setDraftId(editId);

    try {
      const source = await communityApi.editDetail(editId);
      const status = String(source?.status || 'draft');

      setEditStatus(status);
      setPostType(source?.community?.postType || source?.postType || DEFAULT_TYPE);
      setCategoryId(normalizeId(source?.primaryCategoryId));
      setAreaId(normalizeId(source?.primaryAreaId));
      setBodyHtml(source?.body?.bodyHtml || source?.bodyHtml || '');
      setAllowComments(source?.allowComments !== false);

      if (!EDITABLE_STATUSES.has(status)) {
        setFormError('Bài đang chờ kiểm duyệt nên chưa thể chỉnh sửa.');
      }
    } catch (error) {
      setFormError(apiErrorMessage(error, 'Không thể tải bài viết để chỉnh sửa.'));
    } finally {
      setLoadingEdit(false);
    }
  }, [areas, categories, resetComposer]);

  const requestClose = useCallback((force = false) => {
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
  }, [closeComposer, hasContent, isEditing, loadingEdit, saving]);

  useEffect(() => {
    const handleOpenEvent = (event) => {
      if (isAuthenticated) {
        void openComposer(event?.detail?.editId || '');
      }
    };

    window.addEventListener('dthl:open-community-composer', handleOpenEvent);
    return () => window.removeEventListener('dthl:open-community-composer', handleOpenEvent);
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
      if (activeSheet) {
        setActiveSheet('');
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
  }, [activeSheet, loadingEdit, open, requestClose]);

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
    if (!hasContent || !withinLimit || saving || loadingEdit || !canEditCurrent) return;

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

      toast.success(editStatus === 'published' ? 'Đã lưu thay đổi.' : 'Đã lưu bản nháp.');
    } catch (error) {
      setFormError(apiErrorMessage(error, 'Không thể lưu bản nháp. Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!hasContent || !withinLimit || saving || loadingEdit || !canEditCurrent) return;

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
        toast.success(isEditing
          ? 'Đã lưu thay đổi và gửi bài đi duyệt lại.'
          : 'Đã đăng bài vào hàng chờ kiểm duyệt.');
      }

      closeComposer();
      window.dispatchEvent(new CustomEvent('dthl:community-post-submitted', {
        detail: { id, updated: isEditing },
      }));
    } catch (error) {
      setFormError(apiErrorMessage(
        error,
        isEditing
          ? 'Không thể lưu thay đổi. Vui lòng thử lại.'
          : 'Không thể đăng bài. Vui lòng thử lại.',
      ));
    } finally {
      setSaving(false);
    }
  };

  const openImagePicker = () => {
    editorWrapRef.current?.querySelector('input[type="file"]')?.click();
  };

  if (!open || typeof document === 'undefined') return null;

  const publishDisabled =
    !hasContent || !withinLimit || saving || loadingEdit || !canEditCurrent;

  return createPortal(
    <div className="community-mobile-composer-backdrop">
      <section
        className="community-mobile-composer"
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Chỉnh sửa bài viết' : 'Bài viết mới'}
      >
        <header className="community-mobile-composer__header">
          <button
            type="button"
            className="community-mobile-composer__back"
            aria-label="Quay lại"
            onClick={() => requestClose()}
          >
            <ArrowLeft size={24} />
          </button>
          <strong>{isEditing ? 'Chỉnh sửa bài viết' : 'Bài viết mới'}</strong>
          <button
            type="button"
            className="community-mobile-composer__header-publish"
            disabled={publishDisabled}
            onClick={publish}
          >
            {saving ? 'Đang lưu' : 'Đăng'}
          </button>
        </header>

        <div className="community-mobile-composer__scroll">
          <section className="community-mobile-composer__author">
            <Avatar src={avatarSrc} name={displayName} size="md" />
            <div>
              <strong>{displayName}</strong>
              <button
                type="button"
                className="community-mobile-composer__audience-pill"
                onClick={() => setActiveSheet('audience')}
              >
                <Globe2 size={17} />
                Công khai
                <ChevronDown size={16} />
              </button>
            </div>
          </section>

          <section className="community-mobile-composer__writing-card">
            {loadingEdit ? (
              <div className="community-mobile-composer__loading">
                <LoaderCircle size={22} className="community-mobile-composer__spin" />
                Đang tải bài viết...
              </div>
            ) : (
              <div ref={editorWrapRef} className="community-mobile-composer__editor-wrap">
                <CommunitySocialEditor
                  className="community-mobile-composer__editor"
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
              </div>
            )}

            <button
              type="button"
              className="community-mobile-composer__image-shortcut"
              aria-label="Thêm ảnh hoặc video"
              disabled={loadingEdit || !canEditCurrent}
              onClick={openImagePicker}
            >
              <ImagePlus size={23} />
            </button>

            <span className={`community-mobile-composer__counter${withinLimit ? '' : ' is-over'}`}>
              {characterCount}/{MAX_CHARACTERS}
            </span>
          </section>

          <section className="community-mobile-composer__add-card">
            <h2>Thêm vào bài viết</h2>
            <div className="community-mobile-composer__quick-actions">
              <button type="button" onClick={openImagePicker}>
                <span className="is-green"><ImagePlus size={25} /></span>
                <small>Ảnh/Video</small>
              </button>
              <button type="button" onClick={() => setActiveSheet('location')}>
                <span className="is-coral"><MapPin size={25} /></span>
                <small>Địa điểm</small>
              </button>
              <button type="button" onClick={() => setActiveSheet('topic')}>
                <span className="is-blue"><Tags size={25} /></span>
                <small>Chủ đề</small>
              </button>
              <button type="button" onClick={() => setActiveSheet('type')}>
                <span className="is-amber"><FileText size={25} /></span>
                <small>Dạng bài</small>
              </button>
              <button type="button" onClick={() => setActiveSheet('more')}>
                <span className="is-gray"><MoreHorizontal size={25} /></span>
                <small>Khác</small>
              </button>
            </div>
          </section>

          <section className="community-mobile-composer__settings-list">
            <SettingRow
              icon={MapPin}
              title="Vị trí"
              value={selectedArea?.name || 'Thêm vị trí vào bài viết'}
              onClick={() => setActiveSheet('location')}
            />
            <SettingRow
              icon={UsersRound}
              title="Đối tượng"
              value="Công khai"
              onClick={() => setActiveSheet('audience')}
            />
            <SettingRow
              icon={Tags}
              title="Chủ đề"
              value={selectedCategory?.name || 'Chọn chủ đề phù hợp'}
              onClick={() => setActiveSheet('topic')}
            />
          </section>

          {tipVisible ? (
            <aside className="community-mobile-composer__tip">
              <span><ShieldCheck size={22} /></span>
              <div>
                <strong>Gợi ý</strong>
                <p>Chia sẻ nội dung hữu ích, tích cực và tuân thủ quy định cộng đồng.</p>
              </div>
              <button type="button" aria-label="Ẩn gợi ý" onClick={() => setTipVisible(false)}>
                <X size={20} />
              </button>
            </aside>
          ) : null}

          {formError ? (
            <div className="community-mobile-composer__error" role="alert">
              {formError}
            </div>
          ) : null}
        </div>

        <footer className="community-mobile-composer__footer">
          <button
            type="button"
            className="community-mobile-composer__save"
            disabled={publishDisabled}
            onClick={saveDraft}
          >
            <Save size={20} />
            <span>{editStatus === 'published' ? 'Lưu' : 'Lưu nháp'}</span>
          </button>

          <button
            type="button"
            className="community-mobile-composer__preview"
            disabled={!hasContent}
            onClick={() => setActiveSheet('preview')}
          >
            <Eye size={23} />
            <small>Xem trước</small>
          </button>

          <button
            type="button"
            className="community-mobile-composer__publish"
            disabled={publishDisabled}
            onClick={publish}
          >
            {saving ? (
              <LoaderCircle size={20} className="community-mobile-composer__spin" />
            ) : (
              <Send size={21} />
            )}
            <span>{editStatus === 'published' ? 'Lưu thay đổi' : 'Đăng bài'}</span>
          </button>
        </footer>

        {activeSheet === 'location' ? (
          <Sheet title="Chọn vị trí" onClose={() => setActiveSheet('')}>
            <label className="community-mobile-sheet__search">
              <Search size={18} />
              <input
                value={areaQuery}
                onChange={(event) => setAreaQuery(event.target.value)}
                placeholder="Tìm kiếm địa điểm"
                autoFocus
              />
            </label>

            <button
              type="button"
              className={`community-mobile-sheet__choice${areaId ? '' : ' is-selected'}`}
              onClick={() => {
                setAreaId('');
                setActiveSheet('');
              }}
            >
              <span className="community-mobile-sheet__choice-icon"><Globe2 size={20} /></span>
              <span><strong>Tất cả khu vực</strong><small>Không gắn vị trí cụ thể</small></span>
              {!areaId ? <Check size={20} /> : null}
            </button>

            <div className="community-mobile-sheet__section-title">Khu vực Hòa Lạc</div>
            {filteredAreas.map((item) => {
              const selected = String(item._id) === String(areaId);
              return (
                <button
                  type="button"
                  key={item._id}
                  className={`community-mobile-sheet__choice${selected ? ' is-selected' : ''}`}
                  onClick={() => {
                    setAreaId(String(item._id));
                    setActiveSheet('');
                  }}
                >
                  <span className="community-mobile-sheet__choice-icon"><MapPin size={20} /></span>
                  <span><strong>{item.name}</strong><small>Đô Thị Hòa Lạc</small></span>
                  {selected ? <Check size={20} /> : <ChevronRight size={18} />}
                </button>
              );
            })}
          </Sheet>
        ) : null}

        {activeSheet === 'audience' ? (
          <Sheet title="Chọn đối tượng" onClose={() => setActiveSheet('')}>
            <button
              type="button"
              className="community-mobile-sheet__choice is-selected is-large"
              onClick={() => setActiveSheet('')}
            >
              <span className="community-mobile-sheet__choice-icon"><Globe2 size={22} /></span>
              <span>
                <strong>Công khai</strong>
                <small>Bất kỳ ai trên Đô Thị Hòa Lạc đều có thể xem</small>
              </span>
              <Check size={20} />
            </button>
            <p className="community-mobile-sheet__note">
              Community hiện dùng chế độ công khai để nội dung có thể được kiểm duyệt và phân phối thống nhất.
            </p>
          </Sheet>
        ) : null}

        {activeSheet === 'topic' ? (
          <Sheet title="Chọn chủ đề" onClose={() => setActiveSheet('')}>
            <label className="community-mobile-sheet__search">
              <Search size={18} />
              <input
                value={categoryQuery}
                onChange={(event) => setCategoryQuery(event.target.value)}
                placeholder="Tìm kiếm chủ đề"
                autoFocus
              />
            </label>

            <div className="community-mobile-sheet__section-title">Chủ đề phổ biến</div>
            <div className="community-mobile-sheet__chips">
              {categories.slice(0, 6).map((item) => {
                const selected = String(item._id) === String(categoryId);
                return (
                  <button
                    type="button"
                    key={item._id}
                    className={selected ? 'is-selected' : ''}
                    onClick={() => {
                      setCategoryId(String(item._id));
                      setActiveSheet('');
                    }}
                  >
                    <Tags size={15} /> {item.name}
                  </button>
                );
              })}
            </div>

            <div className="community-mobile-sheet__section-title">Tất cả chủ đề</div>
            <button
              type="button"
              className={`community-mobile-sheet__choice${categoryId ? '' : ' is-selected'}`}
              onClick={() => {
                setCategoryId('');
                setActiveSheet('');
              }}
            >
              <span className="community-mobile-sheet__choice-icon"><Tags size={20} /></span>
              <span><strong>Không chọn chủ đề</strong><small>Để hệ thống phân loại chung</small></span>
              {!categoryId ? <Check size={20} /> : null}
            </button>
            {filteredCategories.map((item) => {
              const selected = String(item._id) === String(categoryId);
              return (
                <button
                  type="button"
                  key={item._id}
                  className={`community-mobile-sheet__choice${selected ? ' is-selected' : ''}`}
                  onClick={() => {
                    setCategoryId(String(item._id));
                    setActiveSheet('');
                  }}
                >
                  <span className="community-mobile-sheet__choice-icon"><Tags size={20} /></span>
                  <span><strong>{item.name}</strong></span>
                  {selected ? <Check size={20} /> : <ChevronRight size={18} />}
                </button>
              );
            })}
          </Sheet>
        ) : null}

        {activeSheet === 'type' ? (
          <Sheet title="Chọn dạng bài" onClose={() => setActiveSheet('')}>
            <div className="community-mobile-sheet__chips is-type-grid">
              {Object.entries(COMMUNITY_TYPES).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={postType === value ? 'is-selected' : ''}
                  onClick={() => {
                    setPostType(value);
                    setActiveSheet('');
                  }}
                >
                  <MessageCircle size={16} /> {label}
                </button>
              ))}
            </div>
          </Sheet>
        ) : null}

        {activeSheet === 'more' ? (
          <Sheet title="Tùy chọn bài viết" onClose={() => setActiveSheet('')}>
            <button
              type="button"
              className="community-mobile-sheet__toggle-row"
              onClick={() => setAllowComments((value) => !value)}
            >
              <span className="community-mobile-sheet__choice-icon"><MessageCircle size={21} /></span>
              <span>
                <strong>Cho phép bình luận</strong>
                <small>Người đọc có thể trao đổi bên dưới bài viết</small>
              </span>
              <span className={`community-mobile-sheet__switch${allowComments ? ' is-on' : ''}`}>
                <i />
              </span>
            </button>
            <button
              type="button"
              className="community-mobile-sheet__toggle-row"
              onClick={() => setActiveSheet('type')}
            >
              <span className="community-mobile-sheet__choice-icon"><SlidersHorizontal size={21} /></span>
              <span>
                <strong>Dạng bài</strong>
                <small>{COMMUNITY_TYPES[postType] || 'Thảo luận'}</small>
              </span>
              <ChevronRight size={18} />
            </button>
          </Sheet>
        ) : null}

        {activeSheet === 'preview' ? (
          <Sheet title="Xem trước bài viết" onClose={() => setActiveSheet('')} className="is-preview">
            <article className="community-mobile-preview">
              <header>
                <Avatar src={avatarSrc} name={displayName} size="sm" />
                <div>
                  <strong>{displayName}</strong>
                  <small>{COMMUNITY_TYPES[postType] || 'Thảo luận'} · {selectedArea?.name || 'Tất cả khu vực'}</small>
                </div>
              </header>
              <p>{plainText || 'Bài viết có nội dung hình ảnh.'}</p>
              {hasInlineMedia ? <span className="community-mobile-preview__media-note"><ImagePlus size={17} /> Có ảnh đính kèm</span> : null}
            </article>
          </Sheet>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
