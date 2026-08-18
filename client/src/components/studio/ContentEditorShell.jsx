import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  FilePenLine,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import { draftApi } from '../../api/content.api';
import { apiErrorMessage } from '../../api/http';
import { contentPath, contentTypeLabel } from '../../utils/content';
import { CONTENT_STATUS } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';
import { LoadingBlock } from '../common/Loading';

import './ContentEditorShell.css';

const EDITABLE = new Set(['draft', 'needs_revision', 'rejected']);

export default function ContentEditorShell({ contentType, children }) {
  const { editorId } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async ({ quiet = false } = {}) => {
    if (!editorId) return null;
    if (!quiet) setLoading(true);
    setError('');

    try {
      const next = await draftApi.detail(editorId);
      setItem(next);
      return next;
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Không thể tải bản nháp Content Studio.'));
      return null;
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [editorId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const handleChanged = (event) => {
      const changedId = String(event?.detail?.id || '');
      if (!changedId || changedId === String(editorId || '')) {
        void reload({ quiet: true });
      }
    };

    window.addEventListener('dthl:content-changed', handleChanged);
    return () => window.removeEventListener('dthl:content-changed', handleChanged);
  }, [editorId, reload]);

  const publicUrl = useMemo(() => {
    if (!item?.slug) return '';
    const path = contentPath(item);
    return path === '#' ? '' : path;
  }, [item]);

  if (loading) {
    return <LoadingBlock />;
  }

  if (error || !item) {
    return (
      <section className="content-studio-shell content-studio-shell--error">
        <AlertTriangle size={24} />
        <h1>Không mở được Content Studio</h1>
        <p>{error || 'Không tìm thấy bản nháp.'}</p>
        <button type="button" onClick={() => void reload()}>
          <RefreshCw size={16} /> Tải lại
        </button>
      </section>
    );
  }

  if (item.contentType !== contentType) {
    return (
      <section className="content-studio-shell content-studio-shell--error">
        <AlertTriangle size={24} />
        <h1>Sai loại nội dung</h1>
        <p>Bản nháp này không thuộc {contentTypeLabel(contentType)}.</p>
        <Link to="/tai-khoan/noi-dung">Quay lại Nội dung của tôi</Link>
      </section>
    );
  }

  const locked = !EDITABLE.has(item.status);
  const moderationNote = item?.lastModeration?.note || '';

  return (
    <div className={`content-studio-shell${locked ? ' is-locked' : ''}`}>
      <header className="content-studio-shell__bar">
        <div className="content-studio-shell__identity">
          <Link to="/tai-khoan/noi-dung" className="content-studio-shell__back">
            <ArrowLeft size={18} />
          </Link>
          <span className="content-studio-shell__mark">
            <FilePenLine size={20} />
          </span>
          <div>
            <small>Content Studio · {contentTypeLabel(contentType)}</small>
            <strong>{item.title}</strong>
          </div>
        </div>

        <div className="content-studio-shell__state">
          <span className={`content-studio-status content-studio-status--${item.status}`}>
            {item.status === 'published' ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
            {CONTENT_STATUS[item.status] || item.status}
          </span>
          <small>Cập nhật {formatDateTime(item.updatedAt)}</small>
        </div>

        <div className="content-studio-shell__actions">
          <button type="button" className="content-studio-shell__ghost" onClick={() => void reload()}>
            <RefreshCw size={16} /> Làm mới
          </button>
          {publicUrl && item.previewReady ? (
            <a
              className="content-studio-shell__ghost"
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye size={16} /> Xem trước
            </a>
          ) : null}
        </div>
      </header>

      {moderationNote && ['needs_revision', 'rejected'].includes(item.status) ? (
        <aside className="content-studio-shell__moderation-note">
          <ShieldCheck size={19} />
          <div>
            <strong>
              {item.status === 'needs_revision'
                ? 'Quản trị viên yêu cầu chỉnh sửa'
                : 'Nội dung đã bị từ chối ở lần gửi trước'}
            </strong>
            <p>{moderationNote}</p>
          </div>
        </aside>
      ) : null}

      {locked ? (
        <aside className="content-studio-shell__locked-note">
          <ShieldCheck size={18} />
          <span>
            Nội dung đang ở trạng thái <strong>{CONTENT_STATUS[item.status] || item.status}</strong>.
            Trình soạn được khóa để tránh thay đổi ngoài quy trình kiểm duyệt.
          </span>
        </aside>
      ) : null}

      <div className="content-studio-shell__workspace">
        {typeof children === 'function'
          ? children({ item, reload, locked })
          : children}
      </div>
    </div>
  );
}
