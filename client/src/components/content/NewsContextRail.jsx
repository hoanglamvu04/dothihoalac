import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BriefcaseBusiness,
  Building2,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Eye,
  Info,
  MessageCircle,
  Newspaper,
  Snowflake,
  Sparkles,
  Sun,
  TrendingUp,
  Wind,
} from 'lucide-react';

import {
  articleApi,
  communityApi,
  jobApi,
  propertyApi,
} from '../../api/content.api';
import { getHoaLacForecast } from '../../api/weather.api';
import { contentPath } from '../../utils/content';
import { mediaUrl } from '../../utils/media';

function idOf(item) {
  return String(item?._id || item?.id || '');
}

function filterExcluded(items, excluded) {
  return (items || []).filter((item) => !excluded.has(idOf(item)));
}

function takeUnique(items, used, limit) {
  const result = [];

  for (const item of items || []) {
    const id = idOf(item);
    if (!id || used.has(id)) continue;

    used.add(id);
    result.push(item);

    if (result.length >= limit) break;
  }

  return result;
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

function itemMeta(item, mode) {
  if (mode === 'area') {
    return item?.primaryAreaId?.name || 'Khu vực Hòa Lạc';
  }

  if (mode === 'job') {
    return item?.primaryAreaId?.name || item?.job?.workLocation || 'Hòa Lạc';
  }

  return `${Number(item?.viewCount || 0).toLocaleString('vi-VN')} lượt xem`;
}

function RailContentList({
  items,
  emptyText = 'Chưa có dữ liệu phù hợp.',
  metaMode = 'views',
  FallbackIcon = Newspaper,
}) {
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
                <FallbackIcon size={20} aria-hidden="true" />
              )}
            </span>
            <span className="news-rail-article__copy">
              <strong>{item.title}</strong>
              <small>
                {metaMode === 'views' ? <Eye size={12} aria-hidden="true" /> : null}
                {itemMeta(item, metaMode)}
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
          <h2>Thảo luận nổi bật</h2>
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

function LoadingCard() {
  return (
    <section className="news-rail-card" aria-hidden="true">
      <div className="news-rail-loading">
        {Array.from({ length: 4 }).map((_, index) => <i key={index} />)}
      </div>
    </section>
  );
}

export default function NewsContextRail({ category = '', excludeIds = [] }) {
  const excludeKey = excludeIds
    .filter(Boolean)
    .map(String)
    .sort()
    .join('|');

  const [state, setState] = useState({
    loading: true,
    featured: [],
    latest: [],
    popular: [],
    needToKnow: [],
    properties: [],
    jobs: [],
    discussions: [],
    forecast: null,
  });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const excluded = new Set(excludeKey ? excludeKey.split('|') : []);

    const load = async () => {
      setState((current) => ({ ...current, loading: true }));

      const [
        featuredResult,
        latestResult,
        popularResult,
        needToKnowResult,
        propertyResult,
        jobResult,
        discussionResult,
        weatherResult,
      ] = await Promise.allSettled([
        articleApi.list({ featured: true, limit: 6 }),
        articleApi.list({
          limit: 8,
          ...(category ? { category } : {}),
        }),
        articleApi.list({
          sort: 'popular',
          limit: 8,
          ...(category ? { category } : {}),
        }),
        articleApi.list({
          category: 'chinh-sach,hanh-chinh',
          limit: 6,
        }),
        propertyApi.list({ limit: 4 }),
        jobApi.list({ limit: 4 }),
        communityApi.list({ sort: 'popular', limit: 5 }),
        getHoaLacForecast({ signal: controller.signal }),
      ]);

      if (!active) return;

      const featuredSource = filterExcluded(
        featuredResult.status === 'fulfilled' ? featuredResult.value?.items : [],
        excluded,
      );
      const latestSource = filterExcluded(
        latestResult.status === 'fulfilled' ? latestResult.value?.items : [],
        excluded,
      );
      const popularSource = filterExcluded(
        popularResult.status === 'fulfilled' ? popularResult.value?.items : [],
        excluded,
      );
      const needToKnowSource = filterExcluded(
        needToKnowResult.status === 'fulfilled' ? needToKnowResult.value?.items : [],
        excluded,
      );

      const used = new Set(excluded);
      const featured = takeUnique(
        featuredSource.length ? featuredSource : popularSource,
        used,
        4,
      );
      const latest = takeUnique(latestSource, used, 4);
      const popular = takeUnique(popularSource, used, 4);
      const needToKnow = takeUnique(needToKnowSource, used, 4);

      setState({
        loading: false,
        featured,
        latest,
        popular,
        needToKnow,
        properties: propertyResult.status === 'fulfilled'
          ? propertyResult.value?.items?.slice(0, 4) ?? []
          : [],
        jobs: jobResult.status === 'fulfilled'
          ? jobResult.value?.items?.slice(0, 4) ?? []
          : [],
        discussions: discussionResult.status === 'fulfilled'
          ? discussionResult.value?.items?.slice(0, 4) ?? []
          : [],
        forecast: weatherResult.status === 'fulfilled'
          ? weatherResult.value
          : null,
      });
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [category, excludeKey]);

  if (state.loading) {
    return (
      <aside className="news-context-rail" aria-label="Hòa Lạc 24H">
        <LoadingCard />
        <LoadingCard />
      </aside>
    );
  }

  return (
    <aside className="news-context-rail" aria-label="Hòa Lạc 24H">
      <section className="news-rail-card news-rail-card--featured">
        <header className="news-rail-card__head">
          <div>
            <span><Sparkles size={13} /> Hòa Lạc 24H</span>
            <h2>Đáng chú ý hôm nay</h2>
          </div>
          <Link to="/tin-tuc">Dòng tin</Link>
        </header>
        <RailContentList
          items={state.featured}
          emptyText="Chưa có bài được biên tập viên chọn nổi bật."
        />
      </section>

      {state.latest.length ? (
        <section className="news-rail-card">
          <header className="news-rail-card__head">
            <div>
              <span><Newspaper size={13} /> Cập nhật</span>
              <h2>Mới nhất</h2>
            </div>
            <Link to={category ? `/tin-tuc?category=${encodeURIComponent(category)}` : '/tin-tuc'}>
              Xem tất cả
            </Link>
          </header>
          <RailContentList items={state.latest} />
        </section>
      ) : null}

      {state.popular.length ? (
        <section className="news-rail-card">
          <header className="news-rail-card__head">
            <div>
              <span><TrendingUp size={13} /> Quan tâm</span>
              <h2>Đọc nhiều</h2>
            </div>
            <Link to="/tin-tuc?sort=popular">Xem thêm</Link>
          </header>
          <RailContentList items={state.popular} />
        </section>
      ) : null}

      {state.needToKnow.length ? (
        <section className="news-rail-card news-context-card">
          <header className="news-rail-card__head">
            <div>
              <span><Info size={13} /> Dành cho cư dân</span>
              <h2>Thông tin cần biết</h2>
            </div>
            <Link to="/tin-tuc?category=chinh-sach">Xem thêm</Link>
          </header>
          <RailContentList items={state.needToKnow} />
        </section>
      ) : null}

      {state.properties.length ? (
        <section className="news-rail-card">
          <header className="news-rail-card__head">
            <div>
              <span><Building2 size={13} /> Thị trường</span>
              <h2>BĐS mới</h2>
            </div>
            <Link to="/bat-dong-san">Xem tất cả</Link>
          </header>
          <RailContentList
            items={state.properties}
            metaMode="area"
            FallbackIcon={Building2}
          />
        </section>
      ) : null}

      {state.jobs.length ? (
        <section className="news-rail-card">
          <header className="news-rail-card__head">
            <div>
              <span><BriefcaseBusiness size={13} /> Cơ hội</span>
              <h2>Việc làm mới</h2>
            </div>
            <Link to="/viec-lam">Xem tất cả</Link>
          </header>
          <RailContentList
            items={state.jobs}
            metaMode="job"
            FallbackIcon={BriefcaseBusiness}
          />
        </section>
      ) : null}

      <DiscussionsCard items={state.discussions} />
      <WeatherCard forecast={state.forecast} />
    </aside>
  );
}
