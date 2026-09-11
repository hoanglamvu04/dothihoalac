import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ExternalLink,
  FileText,
  Image,
  Link2,
  LoaderCircle,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react';

import { adminApi } from '../../api/admin.api';
import {
  importArticleUrl,
  previewArticleUrl,
} from '../../api/articleImport.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

import './ArticleUrlImportButton.css';

function normalizeUrlInput(value = '') {
  const input = String(value || '').trim();
  if (!input) return '';
  if (/^https?:\/\//i.test(input)) return input;
  return `https://${input}`;
}

function formatPublishedAt(value) {
  if (!value) return 'Không xác định';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không xác định';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function sourceHost(value = '') {
  try {
    return new URL(value).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

export default function ArticleUrlImportButton({ disabled = false }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewFor, setPreviewFor] = useState('');
  const [includeImages, setIncludeImages] = useState(true);
  const [forceDuplicate, setForceDuplicate] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);

  const busy = previewing || importing;
  const normalizedUrl = useMemo(() => normalizeUrlInput(url), [url]);
  const previewIsCurrent = Boolean(
    preview && previewFor && previewFor === normalizedUrl,
  );
  const duplicateBlocked = Boolean(
    previewIsCurrent && preview?.duplicate && !forceDuplicate,
  );

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [busy, open]);

  const resetDialog = () => {
    setUrl('');
    setPreview(null);
    setPreviewFor('');
    setIncludeImages(true);
    setForceDuplicate(false);
    setPreviewing(false);
    setImporting(false);
  };

  const openDialog = () => {
    if (disabled) return;
    resetDialog();
    setOpen(true);
  };

  const closeDialog = () => {
    if (busy) return;
    setOpen(false);
  };

  const changeUrl = (event) => {
    setUrl(event.target.value);
    setPreview(null);
    setPreviewFor('');
    setForceDuplicate(false);
  };

  const runPreview = async (event) => {
    event?.preventDefault?.();
    if (!normalizedUrl || previewing || importing) return;

    setPreviewing(true);
    setPreview(null);
    setPreviewFor('');
    setForceDuplicate(false);

    try {
      const result = await previewArticleUrl(normalizedUrl);
      setUrl(normalizedUrl);
      setPreview(result);
      setPreviewFor(normalizedUrl);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không phân tích được URL bài viết.'));
    } finally {
      setPreviewing(false);
    }
  };

  const runImport = async () => {
    if (
      !previewIsCurrent ||
      importing ||
      previewing ||
      duplicateBlocked
    ) {
      return;
    }

    setImporting(true);

    try {
      const imported = await importArticleUrl({
        url: preview.canonicalUrl || normalizedUrl,
        includeImages,
        force: Boolean(preview?.duplicate && forceDuplicate),
      });
      const postId = String(imported?.postId || '');

      if (!postId) {
        throw new Error('Backend chưa trả về ID bài viết vừa nhập.');
      }

      const importedImages = Number(imported?.imageCount || 0);
      const skippedImages = Number(imported?.skippedImageCount || 0);
      toast.success(
        includeImages
          ? `Đã tạo Google Docs từ URL với ${importedImages} ảnh${skippedImages ? `, bỏ qua ${skippedImages} ảnh không tải được` : ''}. Đang đồng bộ về CMS…`
          : 'Đã tạo Google Docs từ URL. Đang đồng bộ về CMS…',
      );

      try {
        await adminApi.syncGoogleDoc(postId);
        toast.success('Đã đồng bộ nội dung và ảnh từ URL về CMS/Media Library.');
      } catch (error) {
        toast.info(
          `Google Docs đã được tạo nhưng chưa đồng bộ xong: ${apiErrorMessage(error)}`,
        );
      }

      window.location.assign(
        `/quan-tri/bai-viet/${encodeURIComponent(postId)}`,
      );
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không nhập được bài viết từ URL.'));
      setImporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="admin-secondary admin-article-import-button"
        disabled={disabled}
        onClick={openDialog}
      >
        <Link2 size={15} />
        Nhập từ URL
      </button>

      {open ? (
        <div
          className="article-url-import-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            className="article-url-import-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="article-url-import-title"
          >
            <header className="article-url-import-head">
              <div>
                <span className="article-url-import-eyebrow">Content Studio</span>
                <h2 id="article-url-import-title">Nhập bài viết từ URL</h2>
                <p>
                  Hệ thống nhận diện bài chính, lọc phần thừa và đưa nội dung qua Google Docs trước khi đồng bộ về CMS.
                </p>
              </div>

              <button
                type="button"
                className="article-url-import-close"
                onClick={closeDialog}
                disabled={busy}
                aria-label="Đóng cửa sổ nhập URL"
              >
                <X size={19} />
              </button>
            </header>

            <form className="article-url-import-form" onSubmit={runPreview}>
              <label htmlFor="article-url-input">URL bài viết</label>
              <div className="article-url-import-input-row">
                <input
                  id="article-url-input"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://example.com/bai-viet..."
                  value={url}
                  onChange={changeUrl}
                  disabled={busy}
                  autoFocus
                />
                <button
                  type="submit"
                  className="admin-primary article-url-import-preview-button"
                  disabled={!normalizedUrl || busy}
                >
                  {previewing ? (
                    <>
                      <LoaderCircle size={15} className="article-url-import-spin" />
                      Đang đọc…
                    </>
                  ) : (
                    'Kiểm tra nội dung'
                  )}
                </button>
              </div>
              <small>
                Hỗ trợ trang HTTP/HTTPS công khai. Trang yêu cầu đăng nhập, CAPTCHA hoặc paywall có thể không đọc được.
              </small>
            </form>

            <div className="article-url-import-options">
              <label className="article-url-import-check">
                <input
                  type="checkbox"
                  checked={includeImages}
                  onChange={(event) => setIncludeImages(event.target.checked)}
                  disabled={busy}
                />
                <span>
                  <strong>Lấy ảnh trong bài</strong>
                  <small>Ảnh hợp lệ sẽ được đưa qua Google Docs rồi lưu chính thức vào Media Library.</small>
                </span>
              </label>

              <div className="article-url-import-source-note">
                <Link2 size={15} />
                URL nguồn, tên miền và ngày đăng gốc được lưu tự động để truy vết và chống nhập trùng.
              </div>
            </div>

            {previewIsCurrent ? (
              <div className="article-url-import-preview">
                <div className="article-url-import-preview-top">
                  <div>
                    <span className="article-url-import-status">Đã nhận diện bài viết</span>
                    <h3>{preview.title}</h3>
                    {preview.summary ? <p>{preview.summary}</p> : null}
                  </div>

                  {preview.url ? (
                    <a
                      href={preview.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Mở nguồn <ExternalLink size={13} />
                    </a>
                  ) : null}
                </div>

                <div className="article-url-import-metrics">
                  <div>
                    <FileText size={17} />
                    <span>
                      <strong>{Number(preview.wordCount || 0).toLocaleString('vi-VN')}</strong>
                      từ
                    </span>
                  </div>
                  <div>
                    <Image size={17} />
                    <span>
                      <strong>{Number(preview.imageCount || 0).toLocaleString('vi-VN')}</strong>
                      ảnh nhận diện
                    </span>
                  </div>
                  <div>
                    <UserRound size={17} />
                    <span>
                      <strong>{preview.author || 'Không xác định'}</strong>
                      tác giả nguồn
                    </span>
                  </div>
                  <div>
                    <CalendarDays size={17} />
                    <span>
                      <strong>{formatPublishedAt(preview.publishedAt)}</strong>
                      ngày đăng nguồn
                    </span>
                  </div>
                </div>

                <div className="article-url-import-origin">
                  <span>Nguồn</span>
                  <strong>
                    {preview.sourceDomain || sourceHost(preview.canonicalUrl) || 'Không xác định'}
                  </strong>
                  <small title={preview.canonicalUrl || preview.url}>
                    {preview.canonicalUrl || preview.url}
                  </small>
                </div>

                {preview.duplicate ? (
                  <div className="article-url-import-duplicate">
                    <TriangleAlert size={19} />
                    <div>
                      <strong>URL này đã có trong hệ thống</strong>
                      <p>
                        {preview.duplicate.title || 'Bài viết hiện có'}
                        {preview.duplicate.status ? ` · ${preview.duplicate.status}` : ''}
                      </p>
                      <div className="article-url-import-duplicate-actions">
                        <a
                          href={`/quan-tri/bai-viet/${encodeURIComponent(preview.duplicate.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Mở bài hiện tại <ExternalLink size={13} />
                        </a>
                        <label>
                          <input
                            type="checkbox"
                            checked={forceDuplicate}
                            onChange={(event) => setForceDuplicate(event.target.checked)}
                            disabled={busy}
                          />
                          Vẫn tạo một bản nhập mới
                        </label>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <footer className="article-url-import-footer">
              <p>
                Ảnh đầu tiên hợp lệ sẽ tiếp tục được dùng làm ảnh bìa theo cơ chế Google Docs hiện tại.
              </p>
              <div>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={closeDialog}
                  disabled={busy}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="admin-primary"
                  onClick={runImport}
                  disabled={!previewIsCurrent || busy || duplicateBlocked}
                >
                  {importing ? (
                    <>
                      <LoaderCircle size={15} className="article-url-import-spin" />
                      Đang tạo Google Docs…
                    </>
                  ) : duplicateBlocked ? (
                    'URL đã tồn tại'
                  ) : (
                    'Nhập & tạo Google Docs'
                  )}
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
