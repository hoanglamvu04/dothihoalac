import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useSearchParams,
} from 'react-router-dom';
import {
  Activity,
  ChevronRight,
  Heart,
  MessageCircle,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import ContentImage from '../../components/content/ContentImage';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import { LoadingBlock } from '../../components/common/Loading';
import { userApi } from '../../api/user.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { formatRelativeTime } from '../../utils/formatters';

import './ActivityPage.css';

const PAGE_SIZE = 20;

const MODE_CONFIG = {
  all: {
    seo: 'Nhật ký hoạt động',
    eyebrow: 'Hoạt động tài khoản',
    title: 'Nhật ký hoạt động',
    description:
      'Xem lại những thao tác gần đây như tìm kiếm, bình luận và bài viết đã thích.',
    emptyTitle: 'Chưa có hoạt động gần đây',
  },
  search: {
    seo: 'Lịch sử tìm kiếm',
    eyebrow: 'Nhật ký hoạt động',
    title: 'Lịch sử tìm kiếm',
    description:
      'Các từ khóa bạn đã tìm khi đang đăng nhập trên Đô Thị Hòa Lạc.',
    emptyTitle: 'Chưa có lịch sử tìm kiếm',
  },
  comment: {
    seo: 'Bình luận đã gửi',
    eyebrow: 'Nhật ký hoạt động',
    title: 'Bình luận đã gửi',
    description:
      'Xem lại bình luận và phản hồi bạn đã đăng trên các nội dung.',
    emptyTitle: 'Bạn chưa gửi bình luận nào',
  },
  like: {
    seo: 'Bài viết đã thích',
    eyebrow: 'Nhật ký hoạt động',
    title: 'Bài viết đã thích',
    description:
      'Các bài viết và nội dung bạn đã bấm thích gần đây.',
    emptyTitle: 'Bạn chưa thích bài viết nào',
  },
};

const SEARCH_TYPE_LABELS = {
  all: 'Toàn hệ thống',
  article: 'Tin tức',
  community: 'Cộng đồng',
  property: 'Bất động sản',
  job: 'Việc làm',
  user: 'Thành viên',
  area: 'Khu vực',
};

function ActivityIcon({ type }) {
  if (type === 'search') return <Search size={18} />;
  if (type === 'comment') return <MessageCircle size={18} />;
  if (type === 'like') return <Heart size={18} />;
  return <Activity size={18} />;
}

function activityTitle(item) {
  if (item.activityType === 'search') return `Tìm kiếm “${item.query}”`;
  if (item.activityType === 'comment') return 'Đã gửi bình luận';
  if (item.activityType === 'like') return 'Đã thích một bài viết';
  return 'Hoạt động tài khoản';
}

function activityDescription(item) {
  if (item.activityType === 'search') {
    return SEARCH_TYPE_LABELS[item.searchType] || 'Tìm kiếm';
  }

  if (item.activityType === 'comment') {
    return item.body || 'Bình luận';
  }

  return item.content?.summary || item.content?.title || '';
}

function activityHref(item) {
  if (item.activityType === 'search') {
    const query = encodeURIComponent(item.query || '');
    const type = encodeURIComponent(item.searchType || 'all');
    return query ? `/tim-kiem?q=${query}&type=${type}` : '';
  }

  return item.content?.publicUrl || '';
}

function ActivityRow({ item }) {
  const href = activityHref(item);
  const content = item.content;
  const description = activityDescription(item);

  const body = (
    <>
      <span className={`activity-row__icon activity-row__icon--${item.activityType || 'default'}`}>
        <ActivityIcon type={item.activityType} />
      </span>

      <div className="activity-row__content">
        <div className="activity-row__topline">
          <strong>{activityTitle(item)}</strong>
          <time>{formatRelativeTime(item.occurredAt)}</time>
        </div>

        {content?.title ? (
          <div className="activity-row__target">
            <ContentImage
              media={content.thumbnailMediaId}
              alt=""
              className="activity-row__thumb"
              fallback={<span className="activity-row__thumb activity-row__thumb--empty" />}
            />
            <span>
              <b>{content.title}</b>
              {content.primaryCategoryId?.name ? (
                <small>{content.primaryCategoryId.name}</small>
              ) : null}
            </span>
          </div>
        ) : null}

        {description ? (
          <p>{description}</p>
        ) : null}
      </div>

      {href ? (
        <span className="activity-row__arrow" aria-hidden="true">
          <ChevronRight size={18} />
        </span>
      ) : null}
    </>
  );

  return href ? (
    <Link className="activity-row" to={href}>
      {body}
    </Link>
  ) : (
    <article className="activity-row">
      {body}
    </article>
  );
}

export default function ActivityPage({ mode = 'all' }) {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(Number(searchParams.get('page')) || 1, 1);
  const config = MODE_CONFIG[mode] || MODE_CONFIG.all;

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await userApi.myActivity({
        type: mode,
        page,
        limit: PAGE_SIZE,
      });
      setItems(result?.items || []);
      setMeta(result?.meta || {});
    } catch (error) {
      toast.error(apiErrorMessage(error));
      setItems([]);
      setMeta({});
    } finally {
      setLoading(false);
    }
  }, [mode, page, toast]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const summary = meta?.summary || {};

  const summaryCards = useMemo(
    () => [
      {
        to: '/tai-khoan/hoat-dong/tim-kiem',
        label: 'Tìm kiếm',
        value: Number(summary.searches || 0),
        icon: Search,
      },
      {
        to: '/tai-khoan/hoat-dong/binh-luan',
        label: 'Bình luận',
        value: Number(summary.comments || 0),
        icon: MessageCircle,
      },
      {
        to: '/tai-khoan/hoat-dong/da-thich',
        label: 'Đã thích',
        value: Number(summary.likes || 0),
        icon: Heart,
      },
    ],
    [summary.comments, summary.likes, summary.searches],
  );

  const clearSearchHistory = async () => {
    if (clearing || !Number(summary.searches || 0)) return;

    const accepted = window.confirm('Xóa toàn bộ lịch sử tìm kiếm của tài khoản?');
    if (!accepted) return;

    setClearing(true);
    try {
      await userApi.clearSearchActivity();
      toast.success('Đã xóa lịch sử tìm kiếm.');
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete('page');
        return next;
      });
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="activity-page">
      <Seo title={config.seo} />

      <header className="activity-page__heading">
        <div>
          <span>
            <Activity size={14} />
            {config.eyebrow}
          </span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>

        <div className="activity-page__actions">
          {mode === 'search' && Number(summary.searches || 0) > 0 ? (
            <button
              type="button"
              className="is-danger"
              onClick={clearSearchHistory}
              disabled={clearing}
            >
              <Trash2 size={15} />
              {clearing ? 'Đang xóa…' : 'Xóa lịch sử'}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Làm mới
          </button>
        </div>
      </header>

      {mode === 'all' ? (
        <section className="activity-summary" aria-label="Tổng quan hoạt động">
          {summaryCards.map(({ to, label, value, icon: Icon }) => (
            <Link key={to} to={to}>
              <span><Icon size={18} /></span>
              <div>
                <strong>{value.toLocaleString('vi-VN')}</strong>
                <small>{label}</small>
              </div>
              <ChevronRight size={16} />
            </Link>
          ))}
        </section>
      ) : null}

      <section className="activity-card">
        <div className="activity-card__heading">
          <div>
            <strong>{mode === 'all' ? 'Hoạt động gần đây' : config.title}</strong>
            <span>
              {mode === 'all'
                ? 'Các thao tác mới nhất được gộp theo thời gian.'
                : `${Number(meta?.total || 0).toLocaleString('vi-VN')} hoạt động`}
            </span>
          </div>
        </div>

        {loading ? (
          <LoadingBlock />
        ) : items.length ? (
          <div className="activity-list">
            {items.map((item) => (
              <ActivityRow key={`${item.activityType}-${item._id}`} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={config.emptyTitle}
            description="Những hoạt động mới sẽ xuất hiện tại đây khi bạn sử dụng hệ thống."
          />
        )}
      </section>

      {mode !== 'all' && Number(meta?.totalPages || 1) > 1 ? (
        <Pagination
          meta={{ ...meta, page }}
          onPageChange={(nextPage) => {
            const next = new URLSearchParams(searchParams);
            if (Number(nextPage) > 1) next.set('page', String(nextPage));
            else next.delete('page');
            setSearchParams(next);
          }}
        />
      ) : null}
    </div>
  );
}
