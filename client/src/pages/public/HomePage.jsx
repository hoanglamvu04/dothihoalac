import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Clock3,
  FilePenLine,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Send,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import ArticleCard from '../../components/content/ArticleCard';
import HomeCommunityCard from '../../components/content/HomeCommunityCard';
import PropertyCard from '../../components/content/PropertyCard';
import AdSlot from '../../components/ads/AdSlot';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { systemApi } from '../../api/system.api';
import { contentPath } from '../../utils/content';
import { formatRelativeTime } from '../../utils/formatters';

import './HomePage.css';
import './HomePageCards.css';

const INITIAL_DATA = {
  articles: [],
  community: [],
  properties: [],
  jobs: [],
};

const INITIAL_ERRORS = {
  articles: false,
  community: false,
  properties: false,
  jobs: false,
};

const INITIAL_LOADING = {
  articles: true,
  community: true,
  properties: true,
  jobs: true,
};

function normalizeHomeFeed(value) {
  return {
    articles: Array.isArray(value?.articles) ? value.articles : [],
    community: Array.isArray(value?.community) ? value.community : [],
    properties: Array.isArray(value?.properties) ? value.properties : [],
    jobs: Array.isArray(value?.jobs) ? value.jobs : [],
  };
}

function isCanceled(error) {
  return error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
}

function getItemKey(item, prefix, index) {
  return String(item?._id || item?.id || item?.slug || `${prefix}-${index}`);
}

function SectionHeader({ title, to, label = 'Xem tất cả' }) {
  return (
    <header className="home-ref-section-header">
      <h2>{title}</h2>
      {to ? (
        <Link to={to}>
          {label}
          <ArrowRight size={14} />
        </Link>
      ) : null}
    </header>
  );
}

function SectionState({ loading, error, items, onRetry, children, emptyTitle }) {
  if (loading) {
    return (
      <div className="home-ref-state">
        <LoadingBlock />
      </div>
    );
  }

  if (error && !items.length) {
    return (
      <div className="home-ref-state home-ref-state--error">
        <RefreshCw size={24} />
        <strong>Chưa thể tải dữ liệu</strong>
        <button type="button" onClick={onRetry}>Thử lại</button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="home-ref-state">
        <EmptyState
          title={emptyTitle || 'Chưa có nội dung'}
          description="Nội dung mới sẽ được cập nhật tại đây."
        />
      </div>
    );
  }

  return children;
}

function JobPreview({ item }) {
  const href = contentPath(item);
  const area = item?.primaryAreaId?.name || item?.job?.workLocation || 'Khu vực Hòa Lạc';
  const relative = formatRelativeTime(item?.publishedAt || item?.createdAt);

  return (
    <Link className="home-ref-job" to={href}>
      <span className="home-ref-job__icon">
        <BriefcaseBusiness size={20} />
      </span>
      <div>
        <strong>{item?.title || 'Cơ hội việc làm mới'}</strong>
        <small>
          <MapPin size={12} />
          {area}
        </small>
        {relative ? <time>{relative}</time> : null}
      </div>
      <ArrowRight size={15} />
    </Link>
  );
}

export default function HomePage() {
  const [data, setData] = useState(INITIAL_DATA);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [loading, setLoading] = useState(INITIAL_LOADING);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setLoading(INITIAL_LOADING);
    setErrors(INITIAL_ERRORS);

    systemApi
      .homeFeed({ signal: controller.signal })
      .then((response) => {
        if (!active) return;
        setData(normalizeHomeFeed(response));
        setErrors(INITIAL_ERRORS);
      })
      .catch((error) => {
        if (!active || isCanceled(error)) return;
        setData(INITIAL_DATA);
        setErrors({
          articles: true,
          community: true,
          properties: true,
          jobs: true,
        });
      })
      .finally(() => {
        if (!active) return;
        setLoading({
          articles: false,
          community: false,
          properties: false,
          jobs: false,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  const retryLoad = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  const leadArticle = data.articles[0] || null;
  const sideArticles = data.articles.slice(1, 4);
  const latestArticles = data.articles.slice(4, 7);
  const spotlightArticles = data.articles.slice(7, 10);
  const communityItems = data.community.slice(0, 4);
  const propertyItems = data.properties.slice(0, 4);
  const jobItems = data.jobs.slice(0, 3);
  const hasAnyError = Object.values(errors).some(Boolean);
  const hasAnyLoading = Object.values(loading).some(Boolean);
  const visibleContentCount =
    data.articles.length + data.community.length + data.properties.length + data.jobs.length;

  return (
    <main className="dth-home home-ref">
      <Seo
        title="Đô Thị Hòa Lạc - Tin tức, cộng đồng và dữ liệu địa phương"
        description="Tin mới Hòa Lạc về quy hoạch, hạ tầng, bất động sản, cộng đồng và việc làm trong khu vực."
      />

      <section className="home-ref-top">
        <div className="container">
          <SectionState
            loading={loading.articles}
            error={errors.articles}
            items={data.articles}
            onRetry={retryLoad}
            emptyTitle="Chưa có tin nổi bật"
          >
            <div className="home-ref-hero-grid">
              {leadArticle ? (
                <div className="home-ref-lead">
                  <ArticleCard item={leadArticle} featured />
                </div>
              ) : null}

              <div className="home-ref-side-news">
                {sideArticles.map((item, index) => (
                  <div
                    className="home-ref-side-story"
                    key={getItemKey(item, 'hero-side', index)}
                  >
                    <ArticleCard item={item} />
                  </div>
                ))}
              </div>
            </div>
          </SectionState>

          <div className="home-ref-dashboard">
            <section className="home-ref-panel home-ref-latest-panel">
              <SectionHeader title="Tin mới nhất" to="/tin-tuc" />
              <SectionState
                loading={loading.articles}
                error={errors.articles}
                items={latestArticles}
                onRetry={retryLoad}
                emptyTitle="Chưa có tin mới"
              >
                <div className="home-ref-latest-list">
                  {latestArticles.map((item, index) => (
                    <div
                      className="home-ref-latest-item"
                      key={getItemKey(item, 'latest', index)}
                    >
                      <ArticleCard item={item} />
                    </div>
                  ))}
                </div>
              </SectionState>
            </section>

            <section className="home-ref-panel home-ref-spotlight-panel">
              <SectionHeader
                title="Tiêu điểm phát triển đô thị"
                to="/tin-tuc?category=quy-hoach"
              />
              <SectionState
                loading={loading.articles}
                error={errors.articles}
                items={spotlightArticles}
                onRetry={retryLoad}
                emptyTitle="Chưa có tiêu điểm mới"
              >
                <div className="home-ref-spotlight-grid">
                  {spotlightArticles.map((item, index) => (
                    <div
                      className="home-ref-spotlight-card"
                      key={getItemKey(item, 'spotlight', index)}
                    >
                      <ArticleCard item={item} />
                    </div>
                  ))}
                </div>
              </SectionState>
            </section>

            <section className="home-ref-panel home-ref-jobs-panel">
              <SectionHeader title="Cơ hội việc làm" to="/viec-lam" />
              <SectionState
                loading={loading.jobs}
                error={errors.jobs}
                items={jobItems}
                onRetry={retryLoad}
                emptyTitle="Chưa có tin việc làm"
              >
                <div className="home-ref-job-list">
                  {jobItems.map((item, index) => (
                    <JobPreview key={getItemKey(item, 'job', index)} item={item} />
                  ))}
                </div>
              </SectionState>
            </section>
          </div>
        </div>
      </section>

      <section className="home-ref-community-section">
        <div className="container home-ref-community-shell">
          <SectionHeader title="Cộng đồng Hòa Lạc" to="/cong-dong" />
          <SectionState
            loading={loading.community}
            error={errors.community}
            items={communityItems}
            onRetry={retryLoad}
            emptyTitle="Chưa có chia sẻ cộng đồng"
          >
            <div className="home-ref-community-grid">
              {communityItems.map((item, index) => (
                <HomeCommunityCard
                  key={getItemKey(item, 'community', index)}
                  item={item}
                />
              ))}
            </div>
          </SectionState>
        </div>
      </section>

      <AdSlot slotKey="home_after_community" layout="strip" />

      <section className="home-ref-property-section">
        <div className="container home-ref-property-shell">
          <div className="home-ref-property-title">
            <div>
              <span><Building2 size={18} /> Bất động sản khu vực</span>
              <h2>Tin nhà đất mới đăng</h2>
            </div>
            <Link to="/nha-dat">
              Xem tất cả
              <ArrowRight size={15} />
            </Link>
          </div>

          <SectionState
            loading={loading.properties}
            error={errors.properties}
            items={propertyItems}
            onRetry={retryLoad}
            emptyTitle="Chưa có tin bất động sản"
          >
            <div className="home-ref-property-grid">
              {propertyItems.map((item, index) => (
                <PropertyCard
                  key={getItemKey(item, 'property', index)}
                  item={item}
                />
              ))}
            </div>
          </SectionState>
        </div>
      </section>

      <section className="home-ref-contribute">
        <div className="container">
          <div className="home-ref-contribute__inner">
            <span className="home-ref-contribute__icon">
              <MessageSquareText size={25} />
            </span>
            <div className="home-ref-contribute__copy">
              <small>Đóng góp cho cộng đồng</small>
              <h2>Chia sẻ thông tin hữu ích về Hòa Lạc</h2>
              <p>Đăng bài cộng đồng, tin nhà đất, việc làm hoặc gửi nguồn tin địa phương tới Ban biên tập.</p>
            </div>
            <div className="home-ref-contribute__actions">
              <Link to="/dang-bai">
                <FilePenLine size={17} />
                Đăng nội dung
              </Link>
              <Link to="/gui-tin">
                <Send size={17} />
                Gửi tin
              </Link>
            </div>
          </div>
        </div>
      </section>

      {hasAnyError ? (
        <section className="home-ref-warning">
          <div className="container">
            <RefreshCw size={17} />
            <span>Một số dữ liệu chưa tải được. Các phần còn lại vẫn hoạt động bình thường.</span>
            <button type="button" onClick={retryLoad}>Tải lại</button>
          </div>
        </section>
      ) : null}

      {!hasAnyLoading && !visibleContentCount && !hasAnyError ? (
        <section className="home-ref-empty-note">
          <div className="container">
            <Clock3 size={18} />
            <p>Hệ thống hiện chưa có nội dung công khai. Nội dung mới sẽ xuất hiện sau khi được đăng và kiểm duyệt.</p>
          </div>
        </section>
      ) : null}
    </main>
  );
}
