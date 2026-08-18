import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Eye,
  MessageCircle,
  Newspaper,
  Snowflake,
  Sun,
  TrendingUp,
  Wind,
} from 'lucide-react';

import { articleApi, communityApi } from '../../api/content.api';
import { getHoaLacForecast } from '../../api/weather.api';
import { contentPath } from '../../utils/content';
import { mediaUrl } from '../../utils/media';

const CONTEXT_BY_CATEGORY = {
  'quy-hoach': {
    category: 'du-an-dtxd',
    title: 'Dự án & tiến độ',
    label: 'Theo dõi triển khai',
  },
  'ha-tang-giao-thong': {
    category: 'du-an-dtxd',
    title: 'Dự án & tiến độ',
    label: 'Liên quan hạ tầng',
  },
  'du-an-dtxd': {
    category: 'ha-tang-giao-thong',
    title: 'Hạ tầng liên quan',
    label: 'Kết nối dự án',
  },
  'bat-dong-san-hoa-lac': {
    category: 'chinh-sach',
    title: 'Chính sách mới',
    label: 'Pháp lý & thị trường',
  },
  'hanh-chinh': {
    category: 'chinh-sach',
    title: 'Chính sách mới',
    label: 'Quy định cần biết',
  },
  'chinh-sach': {
    category: 'hanh-chinh',
    title: 'Hành chính mới',
    label: 'Thủ tục & quản lý',
  },
  'giao-duc': {
    category: 'khoa-hoc-cong-nghe',
    title: 'Khoa học - Công nghệ',
    label: 'Nghiên cứu & đổi mới',
  },
  'khoa-hoc-cong-nghe': {
    category: 'giao-duc',
    title: 'Giáo dục & nghiên cứu',
    label: 'Đào tạo tại Hòa Lạc',
  },
  'kinh-te-doanh-nghiep': {
    category: 'bat-dong-san-hoa-lac',
    title: 'BĐS Hòa Lạc',
    label: 'Thị trường mới',
  },
  'doi-song-dan-cu': {
    category: 'moi-truong-do-thi',
    title: 'Môi trường - Đô thị',
    label: 'Dân sinh khu vực',
  },
  'moi-truong-do-thi': {
    category: 'doi-song-dan-cu',
    title: 'Đời sống dân cư',
    label: 'Thông tin gần dân',
  },
};

const DEFAULT_CONTEXT = {
  category: 'du-an-dtxd',
  title: 'Dự án & tiến độ',
  label: 'Đang được quan tâm',
};

function idOf(item) {
  return String(item?._id || item?.id || '');
}

function filterExcluded(items, excluded) {
  return (items || []).filter((item) => !excluded.has(idOf(item)));
}

function weatherVisual(code) {
  const value = Number(code);

  if (value === 0) return { Icon: Sun, label: 'Trời quang' };
  if ([1, 2, 3].includes(value)) return { Icon: CloudSun, label: 'Có mây' };
  if ([45, 48].includes(value)) return { Icon: Cloud, label: 'Sương mù' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(value)) {
    return { Icon: CloudRain, label: 'Có mưa' };
  }
  if ([71, 73, 75, 77, 85, 86].includes(value)) {
    return { Icon: Snowflake, label: 'Mưa tuyết' };
  }
  if ([95, 96, 99].includes(value)) {
    return { Icon: CloudLightning, label: 'Dông' };
  }

  return { Icon: Cloud, label: 'Nhiều mây' };
}

function dayLabel(value, index) {
  if (index === 0) return 'Hôm nay';

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
  }).format(date);
}

function RailArticleList({ items, emptyText = 'Chưa có dữ liệu phù hợp.' }) {
  if (!items.length) {
    return <p className="news-rail-empty">{emptyText}</p>;
  }

  return (
    <div className="news-rail-article-list">
      {items.map((item) => {
        const image = mediaUrl(item?.thumbnailMediaId);

        return (
          <Link className="news-rail-article" to={contentPath(item)} key={idOf(item)}>
            <span className="news-rail-article__thumb">
              {image ? (
                <img src={image} alt="" loading="lazy" />
              ) : (
                <Newspaper size={20} aria-hidden="true" />
              )}
            </span>
            <span className="news-rail-article__copy">
              <strong>{item.title}</strong>
              <small>
                <Eye size={12} aria-hidden="true" />
                {Number(item?.viewCount || 0).toLocaleString('vi-VN')} lượt xem
              </small>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function WeatherCard({ forecast }) {
  const current = forecast?.current;
  const daily = forecast?.daily;

  if (!current || !Array.isArray(daily?.time) || !daily.time.length) return null;

  const currentMeta = weatherVisual(current.weather_code);
  const CurrentIcon = currentMeta.Icon;

  return (
    <section className="news-rail-card news-weather-card">
      <header className="news-rail-card__head">
        <div>
          <span>Tiện ích địa phương</span>
          <h2>Thời tiết Hòa Lạc</h2>
        </div>
      </header>

      <div className="news-weather-current">
        <CurrentIcon size={42} strokeWidth={1.55} aria-hidden="true" />
        <div>
          <strong>{Math.round(Number(current.temperature_2m || 0))}°C</strong>
          <span>{currentMeta.label}</span>
        </div>
        <dl>
          <div>
            <dt><Droplets size={13} /> Độ ẩm</dt>
            <dd>{Math.round(Number(current.relative_humidity_2m || 0))}%</dd>
          </div>
          <div>
            <dt><Wind size={13} /> Gió</dt>
            <dd>{Math.round(Number(current.wind_speed_10m || 0))} km/h</dd>
          </div>
        </dl>
      </div>

      <div className="news-weather-days">
        {daily.time.slice(0, 4).map((date, index) => {
          const meta = weatherVisual(daily.weather_code?.[index]);
          const DayIcon = meta.Icon;
          const high = Math.round(Number(daily.temperature_2m_max?.[index] || 0));
          const low = Math.round(Number(daily.temperature_2m_min?.[index] || 0));

          return (
            <div key={date}>
              <span>{dayLabel(date, index)}</span>
              <DayIcon size={20} strokeWidth={1.6} aria-hidden="true" />
              <strong>{high}° / {low}°</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DiscussionsCard({ items }) {
  if (!items.length) return null;

  return (
    <section className="news-rail-card news-discussions-card">
      <header className="news-rail-card__head">
        <div>
          <span>Cộng đồng Hòa Lạc</span>
          <h2>Chủ đề thảo luận nổi bật</h2>
        </div>
        <Link to="/cong-dong">Xem tất cả</Link>
      </header>

      <div className="news-discussion-list">
        {items.map((item) => (
          <Link key={idOf(item)} to={contentPath(item)}>
            <span>{item.title}</span>
            <b>
              <MessageCircle size={12} aria-hidden="true" />
              {Number(item?.commentCount || 0)}
            </b>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function NewsContextRail({ category = '', excludeIds = [] }) {
  const contextConfig = CONTEXT_BY_CATEGORY[category] || DEFAULT_CONTEXT;
  const excluded = useMemo(
    () => new Set(excludeIds.filter(Boolean).map(String)),
    [excludeIds],
  );

  const [state, setState] = useState({
    loading: true,
    related: [],
    contextItems: [],
    discussions: [],
    forecast: null,
  });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const load = async () => {
      setState((current) => ({ ...current, loading: true }));

      const [relatedResult, contextResult, discussionResult] = await Promise.allSettled([
        articleApi.list({
          sort: 'popular',
          limit: 7,
          ...(category ? { category } : {}),
        }),
        articleApi.list({
          category: contextConfig.category,
          limit: 5,
        }),
        communityApi.list({
          sort: 'popular',
          limit: 5,
        }),
      ]);

      if (!active) return;

      const related = filterExcluded(
        relatedResult.status === 'fulfilled' ? relatedResult.value?.items : [],
        excluded,
      ).slice(0, 4);

      const contextItems = filterExcluded(
        contextResult.status === 'fulfilled' ? contextResult.value?.items : [],
        excluded,
      ).slice(0, 4);

      const discussions = (
        discussionResult.status === 'fulfilled' ? discussionResult.value?.items : []
      ).slice(0, 4);

      let forecast = null;

      if (!contextItems.length) {
        try {
          forecast = await getHoaLacForecast({ signal: controller.signal });
        } catch {
          forecast = null;
        }
      }

      if (!active) return;

      setState({
        loading: false,
        related,
        contextItems,
        discussions,
        forecast,
      });
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [category, contextConfig.category, excluded]);

  return (
    <aside className="news-context-rail" aria-label="Thông tin liên quan">
      <section className="news-rail-card">
        <header className="news-rail-card__head">
          <div>
            <span><TrendingUp size={13} /> Đọc nhiều</span>
            <h2>Tin liên quan</h2>
          </div>
          <Link to={category ? `/tin-tuc?category=${encodeURIComponent(category)}` : '/tin-tuc'}>
            Xem tất cả
          </Link>
        </header>

        {state.loading ? (
          <div className="news-rail-loading" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => <i key={index} />)}
          </div>
        ) : (
          <RailArticleList items={state.related} />
        )}
      </section>

      {!state.loading && state.contextItems.length ? (
        <section className="news-rail-card news-context-card">
          <header className="news-rail-card__head">
            <div>
              <span><Building2 size={13} /> {contextConfig.label}</span>
              <h2>{contextConfig.title}</h2>
            </div>
            <Link to={`/tin-tuc?category=${encodeURIComponent(contextConfig.category)}`}>
              <ArrowRight size={15} aria-label="Xem chuyên mục" />
            </Link>
          </header>
          <RailArticleList items={state.contextItems} />
        </section>
      ) : null}

      {!state.loading && !state.contextItems.length ? (
        <>
          <WeatherCard forecast={state.forecast} />
          <DiscussionsCard items={state.discussions} />
        </>
      ) : null}
    </aside>
  );
}
