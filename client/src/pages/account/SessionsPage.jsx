import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Laptop,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { userApi } from '../../api/user.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';

import './AccountPages.css';

const PAGE_SIZE = 8;

function SessionIcon({ session }) {
  const agent = String(session?.userAgent || '').toLowerCase();
  if (/mobile|android|iphone|ipad/.test(agent)) return <Smartphone size={22} />;
  if (/windows|macintosh|linux/.test(agent)) return <Laptop size={22} />;
  return <Monitor size={22} />;
}

export default function SessionsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await userApi.sessions();
      setItems(Array.isArray(result) ? result : result?.items || []);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visibleItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  const revoke = async (session) => {
    const confirmed = window.confirm(
      `Thu hồi phiên đăng nhập “${session.deviceName || 'Trình duyệt web'}”?`,
    );
    if (!confirmed) return;

    setRevokingId(session._id);
    try {
      await userApi.revokeSession(session._id);
      setItems((current) => current.filter((item) => item._id !== session._id));
      toast.success('Đã thu hồi phiên đăng nhập.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setRevokingId('');
    }
  };

  return (
    <div className="account-page-view">
      <Seo title="Phiên đăng nhập" />

      <div className="account-page-heading">
        <div>
          <span className="account-page-heading__eyebrow">
            <ShieldCheck size={15} />
            Thiết bị và phiên hoạt động
          </span>
          <h2>Phiên đăng nhập</h2>
          <p>Kiểm tra và thu hồi các thiết bị bạn không nhận ra hoặc không còn sử dụng.</p>
        </div>

        <button type="button" className="account-page-button account-page-button--soft" onClick={load} disabled={loading}>
          <RefreshCw size={17} />
          Làm mới
        </button>
      </div>

      <section className="account-page-card">
        <div className="account-page-card__header">
          <div>
            <h3>Thiết bị đang đăng nhập</h3>
            <p>
              Mỗi phiên đại diện cho một trình duyệt hoặc thiết bị đã đăng nhập.
              {!loading && items.length ? ` Tổng cộng ${items.length} phiên.` : ''}
            </p>
          </div>
        </div>

        {loading ? (
          <LoadingBlock />
        ) : visibleItems.length ? (
          <div className="account-session-list">
            {visibleItems.map((session) => (
              <article className="account-session-item" key={session._id}>
                <span className="account-session-item__icon">
                  <SessionIcon session={session} />
                </span>

                <div>
                  <strong>{session.deviceName || 'Trình duyệt web'}</strong>
                  <span>{session.ipAddress || 'Không rõ địa chỉ IP'}</span>
                  <small>
                    Hoạt động gần nhất: {formatDateTime(session.lastActiveAt || session.updatedAt)}
                  </small>
                  {session.isCurrent || session.current ? (
                    <span className="account-session-item__current">
                      <CheckCircle2 size={13} /> Phiên hiện tại
                    </span>
                  ) : null}
                </div>

                {session.isCurrent || session.current ? (
                  <span className="account-verification-status is-verified">Đang dùng</span>
                ) : (
                  <button
                    type="button"
                    className="account-page-button account-page-button--danger"
                    onClick={() => revoke(session)}
                    disabled={revokingId === session._id}
                  >
                    <Trash2 size={16} />
                    {revokingId === session._id ? 'Đang thu hồi' : 'Thu hồi'}
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Không có phiên đăng nhập khác"
            description="Tài khoản của bạn hiện không có thiết bị nào khác đang hoạt động."
          />
        )}
      </section>

      {!loading && items.length > PAGE_SIZE ? (
        <Pagination
          meta={{
            page,
            totalPages,
            total: items.length,
            limit: PAGE_SIZE,
          }}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
