import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  MapPin,
  MessageCircle,
  PenLine,
  ShieldCheck,
  Tags,
  TrendingUp,
} from 'lucide-react';

import { communityApi } from '../../api/content.api';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { COMMUNITY_TYPES } from '../../utils/constants';
import { contentPath } from '../../utils/content';

import './CommunitySideRails.css';

const PRIMARY_DISCOVERY_TYPES = [
  'discussion',
  'question',
  'report',
  'sharing',
  'review',
  'support',
];

function itemId(item) {
  return String(item?._id || item?.id || item?.slug || '');
}

function getMetric(item) {
  return Number(item?.reactionCount || 0) + Number(item?.commentCount || 0);
}

export default function CommunitySideRails() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { areas = [], categoriesFor } = useTaxonomy();
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const currentArea = searchParams.get('area') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentType = searchParams.get('type') || '';

  const communityCategories = useMemo(
    () => (categoriesFor('community') || []).slice(0, 7),
    [categoriesFor],
  );

  const visibleAreas = useMemo(
    () => areas.filter((item) => item?.isActive !== false).slice(0, 8),
    [areas],
  );

  useEffect(() => {
    let active = true;

    setTrendingLoading(true);

    communityApi
      .list({ sort: 'popular', page: 1, limit: 5 })
      .then((result) => {
        if (!active) return;

        const items = Array.isArray(result?.items) ? result.items : [];
        setTrending(
          [...items]
            .sort((a, b) => getMetric(b) - getMetric(a))
            .slice(0, 5),
        );
      })
      .catch(() => {
        if (active) setTrending([]);
      })
      .finally(() => {
        if (active) setTrendingLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const setFilter = (key, value) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      if (value) next.set(key, String(value));
      else next.delete(key);

      next.delete('page');
      return next;
    });
  };

  return (
    <div className="community-side-rails" aria-label="Khám phá cộng đồng">
      <aside className="community-side-rail community-side-rail--left">
        <section className="community-rail-card">
          <header className="community-rail-card__heading">
            <div>
              <span className="community-rail-card__icon">
                <MapPin size={17} />
              </span>
              <div>
                <strong>Khám phá khu vực</strong>
                <small>Theo dõi câu chuyện gần bạn</small>
              </div>
            </div>
          </header>

          <div className="community-rail-list">
            <button
              type="button"
              className={!currentArea ? 'is-active' : ''}
              onClick={() => setFilter('area', '')}
            >
              <span>Tất cả khu vực</span>
              <ChevronRight size={14} />
            </button>

            {visibleAreas.map((area) => {
              const value = area._id || area.slug;
              const active = String(currentArea) === String(value);

              return (
                <button
                  type="button"
                  key={itemId(area)}
                  className={active ? 'is-active' : ''}
                  onClick={() => setFilter('area', active ? '' : value)}
                >
                  <span>{area.name}</span>
                  <ChevronRight size={14} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="community-rail-card">
          <header className="community-rail-card__heading">
            <div>
              <span className="community-rail-card__icon">
                <Tags size={17} />
              </span>
              <div>
                <strong>Chủ đề cộng đồng</strong>
                <small>Lọc nhanh nội dung cần xem</small>
              </div>
            </div>
          </header>

          <div className="community-rail-topic-list">
            {PRIMARY_DISCOVERY_TYPES.map((type) => (
              <button
                type="button"
                key={type}
                className={currentType === type ? 'is-active' : ''}
                onClick={() => setFilter('type', currentType === type ? '' : type)}
              >
                {COMMUNITY_TYPES[type] || type}
              </button>
            ))}

            {communityCategories.slice(0, 4).map((category) => {
              const value = category._id || category.slug;
              const active = String(currentCategory) === String(value);

              return (
                <button
                  type="button"
                  key={itemId(category)}
                  className={active ? 'is-active' : ''}
                  onClick={() => setFilter('category', active ? '' : value)}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </section>
      </aside>

      <aside className="community-side-rail community-side-rail--right">
        <section className="community-rail-card community-rail-card--trending">
          <header className="community-rail-card__heading">
            <div>
              <span className="community-rail-card__icon">
                <TrendingUp size={17} />
              </span>
              <div>
                <strong>Đang được quan tâm</strong>
                <small>Nhiều tương tác trong cộng đồng</small>
              </div>
            </div>
          </header>

          {trendingLoading ? (
            <div className="community-rail-loading" aria-label="Đang tải bài nổi bật">
              <span />
              <span />
              <span />
            </div>
          ) : trending.length ? (
            <ol className="community-trending-list">
              {trending.map((item, index) => (
                <li key={itemId(item)}>
                  <span>{index + 1}</span>
                  <div>
                    <Link to={contentPath(item)}>{item.title || item.summary || 'Bài viết cộng đồng'}</Link>
                    <small>
                      {Number(item.reactionCount || 0).toLocaleString('vi-VN')} cảm xúc ·{' '}
                      {Number(item.commentCount || 0).toLocaleString('vi-VN')} bình luận
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="community-rail-empty">Chưa có đủ dữ liệu tương tác để xếp hạng bài nổi bật.</p>
          )}

          <button
            type="button"
            className="community-rail-more"
            onClick={() => setFilter('sort', 'popular')}
          >
            Xem bảng tin quan tâm
            <ChevronRight size={14} />
          </button>
        </section>

        <section className="community-rail-card community-rail-card--join">
          <span className="community-rail-card__hero-icon">
            <PenLine size={20} />
          </span>
          <strong>Chia sẻ với Hòa Lạc</strong>
          <p>Đăng câu hỏi, phản ánh hiện trường hoặc chia sẻ kinh nghiệm hữu ích cho người dân địa phương.</p>
          <Link to="/dang-bai/cong-dong">
            <PenLine size={15} />
            Viết bài cộng đồng
          </Link>
          <button type="button" onClick={() => setFilter('type', 'report')}>
            <MessageCircle size={15} />
            Xem phản ánh
          </button>
        </section>

        <section className="community-rail-card community-rail-card--rules">
          <header className="community-rail-card__heading">
            <div>
              <span className="community-rail-card__icon">
                <ShieldCheck size={17} />
              </span>
              <div>
                <strong>Nguyên tắc cộng đồng</strong>
                <small>Thông tin hữu ích, trao đổi văn minh</small>
              </div>
            </div>
          </header>

          <ul>
            <li>Tôn trọng thành viên khác.</li>
            <li>Ưu tiên thông tin có thể kiểm chứng.</li>
            <li>Không spam hoặc công khai dữ liệu nhạy cảm.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
