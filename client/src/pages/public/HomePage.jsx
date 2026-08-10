import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Clock3,
  FilePenLine,
  MapPin,
  MessageSquareText,
  Newspaper,
  RefreshCw,
  Search,
  Send,
  TrendingUp,
  UsersRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import ArticleCard from '../../components/content/ArticleCard';
import CommunityCard from '../../components/content/CommunityCard';
import PropertyCard from '../../components/content/PropertyCard';
import JobCard from '../../components/content/JobCard';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';

import {
  articleApi,
  communityApi,
  jobApi,
  propertyApi,
} from '../../api/content.api';

import './HomePage.css';

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

const FOCUS_AREAS = [
  'Hòa Lạc',
  'Thạch Thất',
  'Tây Phương',
  'Hạ Bằng',
  'Yên Xuân',
  'Phú Cát',
];

const TOPIC_LINKS = [
  {
    label: 'Quy hoạch',
    to: '/tin-tuc?category=quy-hoach',
  },
  {
    label: 'Hạ tầng - Giao thông',
    to: '/tin-tuc?category=ha-tang',
  },
  {
    label: 'Khoa học - Công nghệ',
    to: '/tin-tuc?category=khoa-hoc-cong-nghe',
  },
  {
    label: 'Đời sống địa phương',
    to: '/tin-tuc',
  },
  {
    label: 'Việc làm',
    to: '/viec-lam',
  },
  {
    label: 'Nhà đất',
    to: '/nha-dat',
  },
];

const PROPERTY_FILTERS = [
  {
    label: 'Tất cả',
    to: '/nha-dat',
  },
  {
    label: 'Đất bán',
    to: '/nha-dat?transactionType=sale',
  },
  {
    label: 'Cho thuê',
    to: '/nha-dat?transactionType=rent',
  },
  {
    label: 'Cần mua',
    to: '/nha-dat?transactionType=wanted_buy',
  },
  {
    label: 'Cần thuê',
    to: '/nha-dat?transactionType=wanted_rent',
  },
];

function normalizeItems(response) {
  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

function getItemKey(item, prefix, index) {
  return String(
    item?._id ||
      item?.id ||
      item?.slug ||
      `${prefix}-${index}`,
  );
}

function areaSearchUrl(name) {
  return `/tim-kiem?q=${encodeURIComponent(name)}&type=all`;
}

export default function HomePage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [data, setData] = useState(INITIAL_DATA);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setErrors(INITIAL_ERRORS);

    Promise.allSettled([
      articleApi.list({
        page: 1,
        limit: 12,
      }),
      communityApi.list({
        page: 1,
        limit: 4,
        sort: 'popular',
      }),
      propertyApi.list({
        page: 1,
        limit: 4,
      }),
      jobApi.list({
        page: 1,
        limit: 4,
      }),
    ])
      .then(
        ([
          articlesResult,
          communityResult,
          propertiesResult,
          jobsResult,
        ]) => {
          if (!active) {
            return;
          }

          setData({
            articles:
              articlesResult.status === 'fulfilled'
                ? normalizeItems(articlesResult.value)
                : [],
            community:
              communityResult.status === 'fulfilled'
                ? normalizeItems(communityResult.value)
                : [],
            properties:
              propertiesResult.status === 'fulfilled'
                ? normalizeItems(propertiesResult.value)
                : [],
            jobs:
              jobsResult.status === 'fulfilled'
                ? normalizeItems(jobsResult.value)
                : [],
          });

          setErrors({
            articles:
              articlesResult.status === 'rejected',
            community:
              communityResult.status === 'rejected',
            properties:
              propertiesResult.status === 'rejected',
            jobs:
              jobsResult.status === 'rejected',
          });
        },
      )
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const submitSearch = useCallback(
    (event) => {
      event.preventDefault();

      const normalizedQuery = query.trim();

      if (!normalizedQuery) {
        return;
      }

      navigate(
        `/tim-kiem?q=${encodeURIComponent(
          normalizedQuery,
        )}&type=all`,
      );
    },
    [navigate, query],
  );

  const retryLoad = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  const hasAnyError =
    errors.articles ||
    errors.community ||
    errors.properties ||
    errors.jobs;

  const visibleContentCount =
    data.articles.length +
    data.community.length +
    data.properties.length +
    data.jobs.length;

  const leadArticle = data.articles[0] || null;
  const newsroomSideArticles = data.articles.slice(1, 5);
  const latestArticles = data.articles.slice(5, 11);
  const communityItems = data.community.slice(0, 4);
  const propertyItems = data.properties.slice(0, 4);
  const jobItems = data.jobs.slice(0, 4);

  return (
    <main className="dth-home dth-home--six-areas">
      <Seo
        title="Tin tức 6 xã khu vực Đô Thị Hòa Lạc"
        description="Đô Thị Hòa Lạc cập nhật tin tức, quy hoạch, hạ tầng, cộng đồng, nhà đất và việc làm tại Hòa Lạc, Thạch Thất, Tây Phương, Hạ Bằng, Yên Xuân và Phú Cát."
      />

      <section className="dth-trending dth-area-ribbon">
        <div className="container dth-trending__inner">
          <div className="dth-trending__label">
            <MapPin size={17} />
            <strong>6 xã trọng tâm</strong>
          </div>

          <div className="dth-trending__links">
            {FOCUS_AREAS.map((area) => (
              <Link
                key={area}
                to={areaSearchUrl(area)}
              >
                {area}
              </Link>
            ))}
          </div>

          <Link
            className="dth-trending__submit"
            to="/gui-tin"
          >
            <Send size={16} />
            Gửi tin
          </Link>
        </div>
      </section>

      <section className="dth-newsroom">
        <div className="container">
          <header className="dth-newsroom__header">
            <div>
              <span className="dth-eyebrow">
                <TrendingUp size={17} />
                Tin mới cập nhật
              </span>

              <h1>Chuyển động khu vực Đô Thị Hòa Lạc</h1>

              <p>
                Theo dõi thông tin mới tại Hòa Lạc,
                Thạch Thất, Tây Phương, Hạ Bằng,
                Yên Xuân và Phú Cát theo một luồng tin
                địa phương rõ ràng, dễ kiểm tra.
              </p>
            </div>

            <form
              className="dth-newsroom-search"
              onSubmit={submitSearch}
            >
              <Search size={21} />

              <input
                value={query}
                aria-label="Tìm kiếm trên Đô Thị Hòa Lạc"
                autoComplete="off"
                placeholder="Tìm tin, địa bàn, quy hoạch..."
                onChange={(event) =>
                  setQuery(event.target.value)
                }
              />

              <button type="submit">
                Tìm kiếm
              </button>
            </form>
          </header>

          {loading ? (
            <div className="dth-newsroom__loading">
              <LoadingBlock />
            </div>
          ) : errors.articles &&
            !data.articles.length ? (
            <HomeErrorState
              title="Chưa thể tải tin nổi bật"
              onRetry={retryLoad}
            />
          ) : data.articles.length ? (
            <div className="dth-newsroom__grid">
              <div className="dth-newsroom__lead">
                <ArticleCard
                  item={leadArticle}
                  featured
                />
              </div>

              <div className="dth-newsroom__side">
                {newsroomSideArticles.map(
                  (item, index) => (
                    <div
                      className="dth-newsroom__side-item"
                      key={getItemKey(
                        item,
                        'newsroom',
                        index,
                      )}
                    >
                      <ArticleCard item={item} />
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : (
            <div className="dth-newsroom__empty">
              <EmptyState
                title="Chưa có tin tức mới"
                description="Tin tức tại 6 xã sẽ được hiển thị tại đây."
                actionLabel="Gửi tin cho Ban biên tập"
                actionTo="/gui-tin"
              />
            </div>
          )}

          <div className="dth-newsroom__quick-searches">
            <span>
              <Newspaper size={16} />
              Theo chủ đề:
            </span>

            {TOPIC_LINKS.map((item) => (
              <Link
                key={item.label}
                to={item.to}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="dth-section dth-section--areas dth-focus-areas">
        <div className="container">
          <HomeSectionHeading
            icon={MapPin}
            eyebrow="6 xã trọng tâm"
            title="Chọn địa bàn bạn muốn theo dõi"
            description="Mỗi địa bàn dẫn tới luồng tìm kiếm riêng để người đọc nhanh chóng lọc tin, cộng đồng và thông tin liên quan."
          />

          <div className="dth-area-grid dth-focus-areas__grid">
            {FOCUS_AREAS.map((area, index) => (
              <Link
                key={area}
                to={areaSearchUrl(area)}
                className="dth-area-card dth-focus-area-card"
              >
                <span>
                  <MapPin size={20} />
                </span>

                <div>
                  <small>
                    Địa bàn {String(index + 1).padStart(2, '0')}
                  </small>
                  <strong>{area}</strong>
                  <p>Tin tức · cộng đồng · dữ liệu địa phương</p>
                </div>

                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {hasAnyError ? (
        <section className="dth-data-warning">
          <div className="container">
            <div className="dth-data-warning__inner">
              <div>
                <RefreshCw size={21} />
                <div>
                  <strong>Một số dữ liệu chưa tải được</strong>
                  <p>
                    Trang vẫn hiển thị các nội dung đã
                    tải thành công.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={retryLoad}
              >
                <RefreshCw size={17} />
                Tải lại
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="dth-section dth-section--white dth-home-latest">
        <div className="container">
          <HomeSectionHeading
            icon={Newspaper}
            eyebrow="Tin mới"
            title="Mới cập nhật"
            description="Tin tức mới nhất về hành chính, quy hoạch, hạ tầng, giáo dục, công nghệ và đời sống trong 6 xã."
            to="/tin-tuc"
          />

          <HomeContentState
            loading={loading}
            error={errors.articles}
            hasContent={latestArticles.length > 0}
            errorTitle="Chưa thể tải tin tức"
            emptyTitle="Chưa có thêm tin tức"
            emptyDescription="Các bài viết mới sẽ được cập nhật tại đây."
            emptyActionLabel="Xem toàn bộ tin tức"
            emptyActionTo="/tin-tuc"
            onRetry={retryLoad}
          >
            <div className="dth-latest-news">
              {latestArticles.map(
                (item, index) => (
                  <div
                    key={getItemKey(
                      item,
                      'latest',
                      index,
                    )}
                    className="dth-latest-news__item"
                  >
                    <ArticleCard item={item} />
                  </div>
                ),
              )}
            </div>
          </HomeContentState>
        </div>
      </section>

      <section className="dth-section dth-section--soft dth-home-community-jobs">
        <div className="container">
          <div className="dth-community-jobs">
            <section className="dth-community-panel">
              <HomeSectionHeading
                icon={UsersRound}
                eyebrow="Cộng đồng"
                title="Người dân đang quan tâm"
                description="Câu hỏi, phản ánh và chia sẻ mới từ cộng đồng trong khu vực."
                to="/cong-dong"
                compact
              />

              <HomeContentState
                loading={loading}
                error={errors.community}
                hasContent={communityItems.length > 0}
                errorTitle="Chưa thể tải cộng đồng"
                emptyTitle="Chưa có bài cộng đồng"
                emptyDescription="Hãy trở thành người đầu tiên chia sẻ thông tin."
                emptyActionLabel="Đăng bài cộng đồng"
                emptyActionTo="/dang-bai/cong-dong"
                onRetry={retryLoad}
              >
                <div className="dth-community-list">
                  {communityItems.map(
                    (item, index) => (
                      <div
                        key={getItemKey(
                          item,
                          'community',
                          index,
                        )}
                      >
                        <CommunityCard item={item} />
                      </div>
                    ),
                  )}
                </div>
              </HomeContentState>

              <Link
                className="dth-panel-action"
                to="/dang-bai/cong-dong"
              >
                <FilePenLine size={18} />
                Đăng bài cộng đồng
              </Link>
            </section>

            <section className="dth-jobs-panel">
              <HomeSectionHeading
                icon={BriefcaseBusiness}
                eyebrow="Việc làm"
                title="Cơ hội mới trong khu vực"
                description="Tin tuyển dụng và cơ hội việc làm mới."
                to="/viec-lam"
                compact
              />

              <HomeContentState
                loading={loading}
                error={errors.jobs}
                hasContent={jobItems.length > 0}
                errorTitle="Chưa thể tải việc làm"
                emptyTitle="Chưa có tin việc làm"
                emptyDescription="Các cơ hội mới sẽ được cập nhật tại đây."
                emptyActionLabel="Đăng tin tuyển dụng"
                emptyActionTo="/dang-bai/viec-lam"
                onRetry={retryLoad}
              >
                <div className="dth-job-list">
                  {jobItems.map(
                    (item, index) => (
                      <div
                        key={getItemKey(
                          item,
                          'job',
                          index,
                        )}
                      >
                        <JobCard item={item} />
                      </div>
                    ),
                  )}
                </div>
              </HomeContentState>
            </section>
          </div>
        </div>
      </section>

      <section className="dth-section dth-section--white dth-home-property">
        <div className="container">
          <HomeSectionHeading
            icon={Building2}
            eyebrow="Nhà đất"
            title="Bất động sản mới đăng"
            description="Tin mua bán, cho thuê và nhu cầu nhà đất trong khu vực."
            to="/nha-dat"
          />

          <div className="dth-property-filters">
            {PROPERTY_FILTERS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <HomeContentState
            loading={loading}
            error={errors.properties}
            hasContent={propertyItems.length > 0}
            errorTitle="Chưa thể tải tin nhà đất"
            emptyTitle="Chưa có tin bất động sản"
            emptyDescription="Các tin mua bán và cho thuê mới sẽ được hiển thị tại đây."
            emptyActionLabel="Đăng tin nhà đất"
            emptyActionTo="/dang-bai/nha-dat"
            onRetry={retryLoad}
          >
            <div className="dth-property-grid">
              {propertyItems.map(
                (item, index) => (
                  <div
                    key={getItemKey(
                      item,
                      'property',
                      index,
                    )}
                  >
                    <PropertyCard item={item} />
                  </div>
                ),
              )}
            </div>
          </HomeContentState>
        </div>
      </section>

      <section className="dth-contribute dth-home-contribute">
        <div className="container">
          <div className="dth-contribute__inner">
            <div>
              <span className="dth-contribute__icon">
                <MessageSquareText size={26} />
              </span>

              <div>
                <small>Cùng xây dựng dữ liệu 6 xã</small>
                <h2>Bạn có thông tin mới tại địa phương?</h2>
                <p>
                  Gửi sự kiện, hình ảnh, thông báo hoặc
                  vấn đề đáng chú ý tới Ban biên tập.
                </p>
              </div>
            </div>

            <div className="dth-contribute__actions">
              <Link to="/gui-tin">
                <Send size={18} />
                Gửi tin địa phương
              </Link>

              <Link to="/dang-bai">
                <FilePenLine size={18} />
                Đăng nội dung
              </Link>
            </div>
          </div>
        </div>
      </section>

      {!loading &&
      !visibleContentCount &&
      !hasAnyError ? (
        <section className="dth-system-note">
          <div className="container">
            <div>
              <Clock3 size={20} />
              <p>
                Hệ thống hiện chưa có nội dung công khai.
                Các bài viết mới sẽ xuất hiện sau khi
                được đăng và kiểm duyệt.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function HomeSectionHeading({
  icon: Icon,
  eyebrow,
  title,
  description,
  to,
  compact = false,
}) {
  return (
    <header
      className={[
        'dth-section-heading',
        compact
          ? 'dth-section-heading--compact'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div>
        <span className="dth-section-heading__icon">
          <Icon size={23} />
        </span>

        <div>
          <small>{eyebrow}</small>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>

      {to ? (
        <Link to={to}>
          Xem tất cả
          <ArrowRight size={17} />
        </Link>
      ) : null}
    </header>
  );
}

function HomeContentState({
  loading,
  error,
  hasContent,
  errorTitle,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  emptyActionTo,
  onRetry,
  children,
}) {
  if (loading) {
    return (
      <div className="dth-content-state">
        <LoadingBlock />
      </div>
    );
  }

  if (error && !hasContent) {
    return (
      <HomeErrorState
        title={errorTitle}
        onRetry={onRetry}
      />
    );
  }

  if (!hasContent) {
    return (
      <div className="dth-content-state">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          actionTo={emptyActionTo}
        />
      </div>
    );
  }

  return children;
}

function HomeErrorState({
  title,
  onRetry,
}) {
  return (
    <div className="dth-error-state">
      <RefreshCw size={33} />
      <h3>{title}</h3>
      <p>Có lỗi xảy ra khi tải dữ liệu của phần này.</p>
      <button
        type="button"
        onClick={onRetry}
      >
        <RefreshCw size={17} />
        Thử lại
      </button>
    </div>
  );
}
