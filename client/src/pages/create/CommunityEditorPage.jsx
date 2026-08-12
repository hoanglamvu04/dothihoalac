import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CircleHelp,
  Ellipsis,
  Eye,
  FileText,
  Globe2,
  ImagePlus,
  LifeBuoy,
  MapPin,
  MessagesSquare,
  Save,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  TriangleAlert,
  UsersRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Avatar from '../../components/common/Avatar';
import RichTextEditor from '../../components/forms/RichTextEditor';
import MediaUploader from '../../components/forms/MediaUploader';
import TaxonomyFields from '../../components/forms/TaxonomyFields';
import { PageLoading } from '../../components/common/Loading';

import { communityApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { COMMUNITY_TYPES } from '../../utils/constants';
import {
  editorPath,
  isPersistedContentId,
} from '../../utils/content';

import './CommunityEditorPage.css';

const POST_TYPE_META = {
  discussion: {
    icon: MessagesSquare,
    description: 'Trao đổi một vấn đề hoặc góc nhìn với cộng đồng.',
  },
  question: {
    icon: CircleHelp,
    description: 'Đặt câu hỏi để nhận chia sẻ và hỗ trợ.',
  },
  report: {
    icon: TriangleAlert,
    description: 'Phản ánh sự việc hoặc hiện trạng tại địa phương.',
  },
  sharing: {
    icon: Sparkles,
    description: 'Chia sẻ kinh nghiệm, hình ảnh hoặc câu chuyện hữu ích.',
  },
  review: {
    icon: Star,
    description: 'Đánh giá địa điểm, dịch vụ hoặc trải nghiệm thực tế.',
  },
  support: {
    icon: LifeBuoy,
    description: 'Tìm thông tin, người hỗ trợ hoặc kinh nghiệm xử lý.',
  },
  marketplace: {
    icon: ShoppingBag,
    description: 'Trao đổi, mua bán nhỏ trong cộng đồng địa phương.',
  },
  community_event: {
    icon: CalendarDays,
    description: 'Chia sẻ hoạt động hoặc sự kiện cộng đồng.',
  },
  other: {
    icon: Ellipsis,
    description: 'Nội dung cộng đồng chưa phù hợp với các nhóm trên.',
  },
};

const EMPTY_FORM = {
  title: '',
  summary: '',
  bodyHtml: '',
  postType: 'discussion',
  primaryCategoryId: null,
  primaryAreaId: null,
  tagIds: [],
  allowComments: true,
  incidentTime: '',
  locationText: '',
  rating: '',
};

function normalizeId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value._id || value.id || null;
}

function normalizeIds(values) {
  if (!Array.isArray(values)) return [];
  return values.map(normalizeId).filter(Boolean);
}

function getMediaId(value) {
  return normalizeId(value);
}

function stripHtml(value = '') {
  if (typeof document !== 'undefined') {
    const template = document.createElement('template');
    template.innerHTML = String(value || '');
    return String(template.content.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveTitle(bodyHtml, postType) {
  const text = stripHtml(bodyHtml);

  if (text) {
    const firstSentence = text.split(/(?<=[.!?])\s+/)[0] || text;
    const compact = firstSentence.trim();

    if (compact.length <= 140) {
      return compact;
    }

    return `${compact.slice(0, 137).trim()}...`;
  }

  const label = COMMUNITY_TYPES[postType] || 'Cộng đồng';
  return `${label} tại Đô Thị Hòa Lạc`;
}

function deriveSummary(bodyHtml) {
  const text = stripHtml(bodyHtml);
  if (!text) return '';
  return text.length <= 320
    ? text
    : `${text.slice(0, 317).trim()}...`;
}

function extractInlineImages(bodyHtml = '') {
  if (typeof document === 'undefined' || !bodyHtml) {
    return [];
  }

  const template = document.createElement('template');
  template.innerHTML = String(bodyHtml || '');

  const result = [];
  const seen = new Set();

  template.content
    .querySelectorAll('figure[data-media-id] img, img[data-media-id]')
    .forEach((image) => {
      const figure = image.closest('figure[data-media-id]');
      const id =
        image.getAttribute('data-media-id') ||
        figure?.getAttribute('data-media-id') ||
        '';
      const url = image.getAttribute('src') || '';

      if (!id || !url || seen.has(id)) {
        return;
      }

      seen.add(id);
      result.push({
        _id: id,
        id,
        url,
        secureUrl: url,
        altText: image.getAttribute('alt') || '',
      });
    });

  return result;
}

function buildForm(source = {}) {
  return {
    title: source.title || '',
    summary: source.summary || '',
    bodyHtml:
      source.body?.bodyHtml ||
      source.body?.html ||
      source.bodyHtml ||
      '',
    postType:
      source.community?.postType ||
      source.postType ||
      'discussion',
    primaryCategoryId: normalizeId(source.primaryCategoryId),
    primaryAreaId: normalizeId(source.primaryAreaId),
    tagIds: normalizeIds(source.tagIds),
    allowComments: source.allowComments !== false,
    incidentTime:
      source.community?.incidentTime ||
      source.incidentTime ||
      '',
    locationText:
      source.community?.locationText ||
      source.locationText ||
      '',
    rating:
      source.community?.rating ||
      source.rating ||
      '',
  };
}

function buildSnapshot(form, thumbnailMode, thumbnailMedia) {
  return JSON.stringify({
    form,
    thumbnailMode,
    thumbnailMediaId: getMediaId(thumbnailMedia),
  });
}

function resolveThumbnailState(source, bodyHtml) {
  const thumbnail = source?.thumbnailMediaId || null;
  const thumbnailId = getMediaId(thumbnail);

  if (!thumbnailId) {
    return {
      mode: 'none',
      media: null,
    };
  }

  const inlineImages = extractInlineImages(bodyHtml);
  const inline = inlineImages.find(
    (item) => getMediaId(item) === thumbnailId,
  );

  if (inline) {
    return {
      mode: 'inline',
      media: inline,
    };
  }

  return {
    mode: 'upload',
    media: thumbnail,
  };
}

export default function CommunityEditorPage() {
  const { editorId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const legacyEditId = searchParams.get('edit') || '';
  const persistedId = useMemo(() => {
    if (isPersistedContentId(editorId)) {
      return editorId;
    }

    if (isPersistedContentId(legacyEditId)) {
      return legacyEditId;
    }

    return '';
  }, [editorId, legacyEditId]);

  const sessionKey = editorId || legacyEditId || 'community-draft';
  const storageKey = `dthl-community-composer:${sessionKey}`;

  const stateSource = location.state?.item || {};
  const initialSourceRef = useRef(stateSource);

  const [form, setForm] = useState(() => buildForm(stateSource));
  const initialThumbnail = useMemo(
    () =>
      resolveThumbnailState(
        stateSource,
        buildForm(stateSource).bodyHtml,
      ),
    [stateSource],
  );

  const [thumbnailMode, setThumbnailMode] = useState(
    initialThumbnail.mode,
  );
  const [thumbnailMedia, setThumbnailMedia] = useState(
    initialThumbnail.media,
  );

  const [hydrating, setHydrating] = useState(Boolean(persistedId));
  const [savingAction, setSavingAction] = useState('');
  const [loadError, setLoadError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState('idle');

  const savedSnapshotRef = useRef(
    buildSnapshot(
      buildForm(stateSource),
      initialThumbnail.mode,
      initialThumbnail.media,
    ),
  );

  const inlineImages = useMemo(
    () => extractInlineImages(form.bodyHtml),
    [form.bodyHtml],
  );

  const bodyText = useMemo(
    () => stripHtml(form.bodyHtml),
    [form.bodyHtml],
  );

  const hasBodyContent =
    Boolean(bodyText) || inlineImages.length > 0;

  const dirty =
    buildSnapshot(form, thumbnailMode, thumbnailMedia) !==
    savedSnapshotRef.current;

  const displayName =
    user?.displayName ||
    user?.username ||
    'Thành viên';

  const selectedType =
    POST_TYPE_META[form.postType] || POST_TYPE_META.discussion;

  useEffect(() => {
    if (!persistedId) {
      setHydrating(false);

      try {
        const stored = JSON.parse(
          window.localStorage.getItem(storageKey) || 'null',
        );

        if (stored?.form) {
          setForm({ ...EMPTY_FORM, ...stored.form });
          setThumbnailMode(stored.thumbnailMode || 'none');
          setThumbnailMedia(stored.thumbnailMedia || null);
        }
      } catch {
        // Không chặn trình soạn nếu localStorage bị lỗi.
      }

      return undefined;
    }

    let active = true;
    setHydrating(true);
    setLoadError('');

    communityApi
      .editDetail(persistedId)
      .then((source) => {
        if (!active) return;

        const nextForm = buildForm(source);
        const nextThumbnail = resolveThumbnailState(
          source,
          nextForm.bodyHtml,
        );

        setForm(nextForm);
        setThumbnailMode(nextThumbnail.mode);
        setThumbnailMedia(nextThumbnail.media);
        savedSnapshotRef.current = buildSnapshot(
          nextForm,
          nextThumbnail.mode,
          nextThumbnail.media,
        );
      })
      .catch((error) => {
        if (!active) return;

        if (Object.keys(initialSourceRef.current || {}).length) {
          const fallbackForm = buildForm(initialSourceRef.current);
          const fallbackThumbnail = resolveThumbnailState(
            initialSourceRef.current,
            fallbackForm.bodyHtml,
          );

          setForm(fallbackForm);
          setThumbnailMode(fallbackThumbnail.mode);
          setThumbnailMedia(fallbackThumbnail.media);
          savedSnapshotRef.current = buildSnapshot(
            fallbackForm,
            fallbackThumbnail.mode,
            fallbackThumbnail.media,
          );
          return;
        }

        setLoadError(
          apiErrorMessage(
            error,
            'Không thể tải bản nháp để chỉnh sửa.',
          ),
        );
      })
      .finally(() => {
        if (active) {
          setHydrating(false);
        }
      });

    return () => {
      active = false;
    };
  }, [persistedId, storageKey]);

  useEffect(() => {
    if (hydrating) return undefined;

    setAutosaveStatus('saving');

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            form,
            thumbnailMode,
            thumbnailMedia,
          }),
        );
        setAutosaveStatus('saved');
      } catch {
        setAutosaveStatus('error');
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [
    form,
    hydrating,
    storageKey,
    thumbnailMedia,
    thumbnailMode,
  ]);

  useEffect(() => {
    if (
      thumbnailMode !== 'inline' ||
      !thumbnailMedia
    ) {
      return;
    }

    const selectedId = getMediaId(thumbnailMedia);
    const stillExists = inlineImages.some(
      (item) => getMediaId(item) === selectedId,
    );

    if (!stillExists) {
      setThumbnailMode('none');
      setThumbnailMedia(null);
    }
  }, [inlineImages, thumbnailMedia, thumbnailMode]);

  useEffect(() => {
    if (!dirty) return undefined;

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const change = useCallback((key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [key]: '',
    }));
  }, []);

  const chooseThumbnailMode = (mode) => {
    setThumbnailMode(mode);

    if (mode === 'none') {
      setThumbnailMedia(null);
    }

    if (mode === 'inline' && thumbnailMode !== 'inline') {
      setThumbnailMedia(inlineImages[0] || null);
    }

    if (mode === 'upload' && thumbnailMode !== 'upload') {
      setThumbnailMedia(null);
    }
  };

  const validate = useCallback(
    (submitAfter) => {
      const errors = {};
      const resolvedTitle =
        form.title.trim() ||
        deriveTitle(form.bodyHtml, form.postType);

      if (!hasBodyContent) {
        errors.bodyHtml =
          'Hãy viết nội dung hoặc chèn ít nhất một ảnh.';
      }

      if (resolvedTitle.length < 5) {
        errors.title = 'Tiêu đề cần có ít nhất 5 ký tự.';
      }

      if (resolvedTitle.length > 250) {
        errors.title = 'Tiêu đề không được vượt quá 250 ký tự.';
      }

      if (form.summary.length > 1000) {
        errors.summary =
          'Mô tả ngắn không được vượt quá 1.000 ký tự.';
      }

      if (form.postType === 'review' && !form.rating) {
        errors.rating = 'Chọn điểm đánh giá cho bài Review.';
      }

      if (submitAfter && !form.primaryAreaId) {
        errors.primaryAreaId = 'Chọn khu vực trước khi gửi duyệt.';
      }

      if (submitAfter && !form.primaryCategoryId) {
        errors.primaryCategoryId = 'Chọn chuyên mục trước khi gửi duyệt.';
      }

      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
    }, [form, hasBodyContent],
  );

  const buildPayload = useCallback(() => {
    const resolvedTitle =
      form.title.trim() ||
      deriveTitle(form.bodyHtml, form.postType);

    return {
      title: resolvedTitle,
      summary:
        form.summary.trim() ||
        deriveSummary(form.bodyHtml) ||
        undefined,
      bodyHtml: form.bodyHtml.trim(),
      postType: form.postType,
      primaryCategoryId: form.primaryCategoryId || null,
      primaryAreaId: form.primaryAreaId || null,
      tagIds: normalizeIds(form.tagIds),
      thumbnailMediaId: getMediaId(thumbnailMedia),
      allowComments: Boolean(form.allowComments),
      incidentTime:
        form.postType === 'report' && form.incidentTime
          ? form.incidentTime
          : null,
      locationText:
        form.postType === 'report'
          ? form.locationText.trim()
          : '',
      rating:
        form.postType === 'review' && form.rating
          ? Number(form.rating)
          : null,
    };
  }, [form, thumbnailMedia]);

  const save = useCallback(
    async (submitAfter = false) => {
      if (savingAction || !validate(submitAfter)) {
        return;
      }

      setSavingAction(submitAfter ? 'submit' : 'save');

      try {
        const payload = buildPayload();
        let content;

        if (persistedId) {
          content = await communityApi.update(
            persistedId,
            payload,
          );
        } else {
          content = await communityApi.create(payload);
        }

        const contentId =
          content?._id || content?.id || persistedId;

        if (!contentId) {
          throw new Error('Server không trả về ID bài viết.');
        }

        setForm((current) => ({
          ...current,
          title: payload.title,
          summary: payload.summary || current.summary,
        }));

        const oldStorageKey = storageKey;

        if (!persistedId) {
          navigate(
            editorPath({
              contentType: 'community',
              _id: contentId,
            }),
            {
              replace: true,
              state: {
                item: {
                  ...content,
                  ...payload,
                  body: {
                    bodyHtml: payload.bodyHtml,
                  },
                  community: {
                    postType: payload.postType,
                    incidentTime: payload.incidentTime,
                    locationText: payload.locationText,
                    rating: payload.rating,
                  },
                },
              },
            },
          );
        }

        try {
          window.localStorage.removeItem(oldStorageKey);
        } catch {
          // Không chặn lưu server.
        }

        savedSnapshotRef.current = buildSnapshot(
          {
            ...form,
            title: payload.title,
            summary: payload.summary || form.summary,
          },
          thumbnailMode,
          thumbnailMedia,
        );

        if (submitAfter) {
          await communityApi.submit(contentId);
          toast.success('Đã lưu và gửi bài đi duyệt.');
          navigate('/tai-khoan/bai-viet');
          return;
        }

        toast.success('Đã lưu bản nháp.');
      } catch (error) {
        toast.error(
          apiErrorMessage(
            error,
            'Không thể lưu bài viết. Vui lòng thử lại.',
          ),
        );
      } finally {
        setSavingAction('');
      }
    },
    [
      buildPayload,
      form,
      navigate,
      persistedId,
      savingAction,
      storageKey,
      thumbnailMedia,
      thumbnailMode,
      toast,
      validate,
    ],
  );

  const handleBack = () => {
    if (
      dirty &&
      !window.confirm(
        'Bạn đang có thay đổi chưa lưu lên server. Vẫn rời trang?',
      )
    ) {
      return;
    }

    navigate('/tai-khoan/bai-viet');
  };

  if (hydrating) {
    return <PageLoading />;
  }

  return (
    <main className="community-composer-page">
      <Seo
        title={persistedId ? 'Chỉnh sửa bài cộng đồng' : 'Đăng bài cộng đồng'}
        description="Soạn bài cộng đồng, chèn ảnh trực tiếp và chọn chủ đề tại Đô Thị Hòa Lạc."
      />

      <div className="community-composer-shell">
        <nav className="community-composer-breadcrumb" aria-label="Điều hướng">
          <button type="button" onClick={handleBack}>
            <ArrowLeft size={18} />
            Bài viết của tôi
          </button>
          <span>/</span>
          <Link to="/dang-bai">Trung tâm đăng nội dung</Link>
          <span>/</span>
          <strong>{persistedId ? 'Chỉnh sửa' : 'Bài cộng đồng mới'}</strong>
        </nav>

        {loadError ? (
          <div className="community-composer-alert" role="alert">
            <AlertTriangle size={19} />
            <span>{loadError}</span>
          </div>
        ) : null}

        <section className="community-composer-card">
          <header className="community-composer-author">
            <Avatar
              name={displayName}
              src={user?.profile?.avatarMediaId}
              size="md"
            />

            <div className="community-composer-author__copy">
              <strong>{displayName}</strong>
              <div>
                <span>
                  <Globe2 size={14} />
                  Công khai
                </span>
                <span className="community-composer-autosave">
                  {autosaveStatus === 'saving'
                    ? 'Đang tự lưu...'
                    : autosaveStatus === 'saved'
                      ? 'Đã tự lưu trên thiết bị'
                      : autosaveStatus === 'error'
                        ? 'Không thể tự lưu'
                        : 'Bản nháp'}
                </span>
              </div>
            </div>

            <span className="community-composer-route-id" title={sessionKey}>
              ID: {String(sessionKey).slice(0, 12)}
            </span>
          </header>

          <div className="community-composer-topic-heading">
            <div>
              <span>Cộng đồng hoặc chủ đề</span>
              <p>Chọn nhãn để người đọc hiểu nhanh bài viết thuộc nhóm nào.</p>
            </div>
          </div>

          <div className="community-composer-topics" role="group" aria-label="Chọn loại bài cộng đồng">
            {Object.entries(COMMUNITY_TYPES).map(([value, label]) => {
              const meta = POST_TYPE_META[value] || POST_TYPE_META.other;
              const Icon = meta.icon;
              const selected = form.postType === value;

              return (
                <button
                  type="button"
                  key={value}
                  className={selected ? 'is-selected' : ''}
                  aria-pressed={selected}
                  title={meta.description}
                  onClick={() => change('postType', value)}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  {selected ? <Check size={15} /> : null}
                </button>
              );
            })}
          </div>

          <div className="community-composer-selected-type">
            {(() => {
              const Icon = selectedType.icon;
              return <Icon size={17} />;
            })()}
            <span>{selectedType.description}</span>
          </div>

          <label className="community-composer-title">
            <span>
              Tiêu đề ngắn
              <small>Có thể để trống — hệ thống sẽ lấy câu đầu làm tiêu đề.</small>
            </span>
            <input
              value={form.title}
              maxLength={250}
              placeholder="Ví dụ: Đường vào khu dân cư đang ngập sau mưa lớn"
              onChange={(event) => change('title', event.target.value)}
            />
            {fieldErrors.title ? <em>{fieldErrors.title}</em> : null}
          </label>

          <div className="community-composer-editor-block">
            <div className="community-composer-editor-label">
              <div>
                <strong>Bạn muốn chia sẻ điều gì?</strong>
                <span>
                  Viết như Facebook/Threads; có thể dán ảnh từ clipboard, kéo thả hoặc bấm nút ảnh trong thanh công cụ.
                </span>
              </div>
              <span>{bodyText.length.toLocaleString('vi-VN')} ký tự</span>
            </div>

            <RichTextEditor
              className="community-composer-rte"
              value={form.bodyHtml}
              onChange={(html) => change('bodyHtml', html)}
              placeholder="Chia sẻ thông tin, câu hỏi, phản ánh, hình ảnh hoặc câu chuyện của bạn..."
              uploadFolder="community/inline"
              maxImages={20}
              maxImageSizeMb={10}
            />

            {fieldErrors.bodyHtml ? (
              <p className="community-composer-field-error">
                {fieldErrors.bodyHtml}
              </p>
            ) : null}
          </div>

          <section className="community-composer-thumbnail">
            <header>
              <div>
                <ImagePlus size={21} />
                <div>
                  <strong>Ảnh đại diện bài viết</strong>
                  <p>
                    Không bắt buộc. Có thể tải ảnh riêng hoặc chọn một ảnh đã có trong bài; ảnh được chọn vẫn giữ nguyên trong nội dung.
                  </p>
                </div>
              </div>
            </header>

            <div className="community-composer-thumbnail__modes">
              <button
                type="button"
                className={thumbnailMode === 'none' ? 'is-active' : ''}
                onClick={() => chooseThumbnailMode('none')}
              >
                Không dùng ảnh đại diện
              </button>

              <button
                type="button"
                className={thumbnailMode === 'inline' ? 'is-active' : ''}
                disabled={!inlineImages.length}
                onClick={() => chooseThumbnailMode('inline')}
              >
                Chọn ảnh trong bài
                {inlineImages.length ? ` (${inlineImages.length})` : ''}
              </button>

              <button
                type="button"
                className={thumbnailMode === 'upload' ? 'is-active' : ''}
                onClick={() => chooseThumbnailMode('upload')}
              >
                Tải ảnh riêng
              </button>
            </div>

            {thumbnailMode === 'inline' ? (
              inlineImages.length ? (
                <div className="community-composer-inline-images">
                  {inlineImages.map((image, index) => {
                    const active =
                      getMediaId(image) === getMediaId(thumbnailMedia);

                    return (
                      <button
                        type="button"
                        key={getMediaId(image) || index}
                        className={active ? 'is-selected' : ''}
                        onClick={() => setThumbnailMedia(image)}
                      >
                        <img
                          src={image.secureUrl || image.url}
                          alt={image.altText || `Ảnh ${index + 1}`}
                        />
                        <span>
                          {active ? <Check size={16} /> : null}
                          Ảnh {index + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="community-composer-thumbnail__empty">
                  Chưa có ảnh trong nội dung. Hãy dán, kéo thả hoặc tải ảnh vào phần soạn thảo trước.
                </p>
              )
            ) : null}

            {thumbnailMode === 'upload' ? (
              <div className="community-composer-thumbnail__upload">
                <MediaUploader
                  value={thumbnailMedia}
                  onChange={setThumbnailMedia}
                  label="Tải ảnh đại diện riêng"
                  required={false}
                />
              </div>
            ) : null}
          </section>

          <section className="community-composer-details">
            <button
              type="button"
              className="community-composer-details__toggle"
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((current) => !current)}
            >
              <span>
                <FileText size={19} />
                <strong>Thông tin bổ sung</strong>
                <small>Khu vực, chuyên mục, thẻ, mô tả ngắn và tùy chọn bài viết.</small>
              </span>
              <span>{advancedOpen ? 'Thu gọn' : 'Mở'}</span>
            </button>

            {advancedOpen ? (
              <div className="community-composer-details__body">
                <TaxonomyFields
                  scope="community"
                  categoryId={form.primaryCategoryId}
                  areaId={form.primaryAreaId}
                  tagIds={form.tagIds}
                  onChange={change}
                  categoryRequired={false}
                  areaRequired={false}
                />

                {(fieldErrors.primaryCategoryId || fieldErrors.primaryAreaId) ? (
                  <div className="community-composer-taxonomy-errors">
                    {fieldErrors.primaryCategoryId ? (
                      <span>{fieldErrors.primaryCategoryId}</span>
                    ) : null}
                    {fieldErrors.primaryAreaId ? (
                      <span>{fieldErrors.primaryAreaId}</span>
                    ) : null}
                  </div>
                ) : null}

                <label className="community-composer-summary">
                  <span>Mô tả ngắn <small>Không bắt buộc</small></span>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={form.summary}
                    placeholder="Để trống để hệ thống tự lấy đoạn đầu của bài viết."
                    onChange={(event) => change('summary', event.target.value)}
                  />
                  {fieldErrors.summary ? <em>{fieldErrors.summary}</em> : null}
                </label>

                {form.postType === 'report' ? (
                  <div className="community-composer-specific-grid">
                    <label>
                      <span><CalendarDays size={16} /> Thời điểm xảy ra</span>
                      <input
                        type="datetime-local"
                        value={form.incidentTime ? String(form.incidentTime).slice(0, 16) : ''}
                        onChange={(event) => change('incidentTime', event.target.value)}
                      />
                    </label>

                    <label>
                      <span><MapPin size={16} /> Địa điểm cụ thể</span>
                      <input
                        value={form.locationText}
                        maxLength={500}
                        placeholder="Ví dụ: đoạn gần cổng Khu CNC Hòa Lạc"
                        onChange={(event) => change('locationText', event.target.value)}
                      />
                    </label>
                  </div>
                ) : null}

                {form.postType === 'review' ? (
                  <div className="community-composer-rating">
                    <span>Điểm Review</span>
                    <div>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          type="button"
                          key={value}
                          className={Number(form.rating) === value ? 'is-active' : ''}
                          onClick={() => change('rating', value)}
                        >
                          <Star size={18} />
                          {value}
                        </button>
                      ))}
                    </div>
                    {fieldErrors.rating ? <em>{fieldErrors.rating}</em> : null}
                  </div>
                ) : null}

                <label className="community-composer-comments">
                  <input
                    type="checkbox"
                    checked={form.allowComments}
                    onChange={(event) => change('allowComments', event.target.checked)}
                  />
                  <span>
                    <strong>Cho phép bình luận</strong>
                    <small>Người đọc có thể trao đổi bên dưới bài viết sau khi bài được xuất bản.</small>
                  </span>
                </label>
              </div>
            ) : null}
          </section>

          <footer className="community-composer-actions">
            <div>
              <ShieldCheck size={18} />
              <span>
                Nội dung gửi duyệt cần có chuyên mục và khu vực. Ảnh đại diện là tùy chọn.
              </span>
            </div>

            <div>
              <button
                type="button"
                className="community-composer-save"
                disabled={Boolean(savingAction)}
                onClick={() => save(false)}
              >
                <Save size={18} />
                {savingAction === 'save' ? 'Đang lưu...' : 'Lưu bản nháp'}
              </button>

              <button
                type="button"
                className="community-composer-submit"
                disabled={Boolean(savingAction)}
                onClick={() => save(true)}
              >
                <Send size={18} />
                {savingAction === 'submit' ? 'Đang gửi...' : 'Gửi duyệt'}
              </button>
            </div>
          </footer>
        </section>

        <aside className="community-composer-note">
          <Eye size={18} />
          <p>
            Trải nghiệm soạn bài được thiết kế theo kiểu social composer: chọn chủ đề trước, viết nội dung ở trung tâm, chèn ảnh ngay trong bài và chỉ mở các trường nâng cao khi cần.
          </p>
        </aside>
      </div>
    </main>
  );
}
