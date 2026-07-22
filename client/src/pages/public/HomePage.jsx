import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  ArrowRight,
  BedDouble,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FilePenLine,
  Home,
  Landmark,
  MapPin,
  MapPinned,
  MessageSquareText,
  Newspaper,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trees,
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

import { useTaxonomy } from '../../context/TaxonomyContext';

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

const TRENDING_LINKS = [
  {
    label: 'Quy hoạch Hòa Lạc',
    to: '/tin-tuc?category=quy-hoach',
  },
  {
    label: 'Hạ tầng giao thông',
    to: '/tin-tuc?category=ha-tang',
  },
  {
    label: 'Giá đất khu vực',
    to: '/nha-dat',
  },
  {
    label: 'Việc làm Khu Công nghệ cao',
    to: '/viec-lam',
  },
];

const QUICK_ACTIONS = [
  {
    icon: Landmark,
    title: 'Quy hoạch',
    description: 'Phân khu, dự án và văn bản mới.',
    to: '/tin-tuc?category=quy-hoach',
  },
  {
    icon: Building2,
    title: 'Nhà đất',
    description: 'Tin bán, thuê và nhu cầu địa phương.',
    to: '/nha-dat',
  },
  {
    icon: MessageSquareText,
    title: 'Cộng đồng',
    description: 'Hỏi đáp, phản ánh và chia sẻ.',
    to: '/cong-dong',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Việc làm',
    description: 'Cơ hội tuyển dụng tại Hòa Lạc.',
    to: '/viec-lam',
  },
  {
    icon: MapPinned,
    title: 'Khám phá khu vực',
    description: 'Theo dõi nội dung theo địa bàn.',
    to: '/tim-kiem?type=area',
  },
  {
    icon: Send,
    title: 'Gửi tin',
    description: 'Cung cấp nguồn tin cho Ban biên tập.',
    to: '/gui-tin',
  },
  {
    icon: Home,
    title: 'Tư vấn xây dựng',
    description: 'Thiết kế, thi công và cải tạo.',
    to: '/tu-van?type=architecture_design',
  },
  {
    icon: BedDouble,
    title: 'Tìm homestay',
    description: 'Villa và không gian nghỉ dưỡng.',
    to: '/tu-van?type=homestay_search',
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

const AREA_TYPE_LABELS = {
  province: 'Tỉnh',
  city: 'Thành phố',
  district: 'Quận/Huyện',
  county: 'Huyện',
  town: 'Thị trấn',
  commune: 'Xã',
  ward: 'Phường',
  village: 'Thôn',
  neighborhood: 'Khu dân cư',
  urban_area: 'Khu đô thị',
  industrial_zone: 'Khu công nghiệp',
  technology_zone: 'Khu công nghệ',
};

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

function getAreaTypeLabel(value) {
  if (!value) {
    return 'Khu vực';
  }

  if (AREA_TYPE_LABELS[value]) {
    return AREA_TYPE_LABELS[value];
  }

  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

export default function HomePage() {
  const navigate = useNavigate();
  const taxonomy = useTaxonomy();

  const areas = Array.isArray(taxonomy?.areas)
    ? taxonomy.areas
    : [];

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
        limit: 10,
      }),

      communityApi.list({
        page: 1,
        limit: 6,
        sort: 'popular',
      }),

      propertyApi.list({
        page: 1,
        limit: 4,
      }),

      jobApi.list({
        page: 1,
        limit: 5,
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

  const newsroomSideArticles =
    data.articles.slice(1, 5);

  const latestArticles =
    data.articles.slice(5, 10);

  const communityItems =
    data.community.slice(0, 4);

  const propertyItems =
    data.properties.slice(0, 4);

  const jobItems =
    data.jobs.slice(0, 4);

  const areaItems = useMemo(
    () =>
      areas
        .filter(
          (area) =>
            area &&
            area.slug &&
            area.name,
        )
        .slice(0, 8),
    [areas],
  );

  const localPulseItems = useMemo(
    () => [
      {
        icon: Newspaper,
        value: data.articles.length,
        label: 'Tin mới',
        description: 'Tin tức đang hiển thị',
        to: '/tin-tuc',
      },
      {
        icon: MessageSquareText,
        value: data.community.length,
        label: 'Bài cộng đồng',
        description: 'Thảo luận nổi bật',
        to: '/cong-dong',
      },
      {
        icon: Building2,
        value: data.properties.length,
        label: 'Tin nhà đất',
        description: 'Tin đăng mới',
        to: '/nha-dat',
      },
      {
        icon: BriefcaseBusiness,
        value: data.jobs.length,
        label: 'Việc làm',
        description: 'Cơ hội đang hiển thị',
        to: '/viec-lam',
      },
    ],
    [
      data.articles.length,
      data.community.length,
      data.jobs.length,
      data.properties.length,
    ],
  );

  return (
    <main className="dth-home">
      <Seo
        title="Tin tức, cộng đồng và nhà đất Hòa Lạc"
        description="Đô Thị Hòa Lạc cung cấp tin quy hoạch, hạ tầng, bất động sản, việc làm và kết nối cộng đồng Hòa Lạc."
      />

      <section className="dth-trending">
        <div className="container dth-trending__inner">
          <div className="dth-trending__label">
            <TrendingUp size={17} />
            <strong>Đang được quan tâm</strong>
          </div>

          <div className="dth-trending__links">
            {TRENDING_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
              >
                {item.label}
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
                <Sparkles size={17} />
                Điểm tin Hòa Lạc
              </span>

              <h1>
                Hòa Lạc hôm nay có gì đáng chú ý?
              </h1>

              <p>
                Theo dõi nhanh những thông tin mới về
                quy hoạch, hạ tầng, thị trường và đời
                sống địa phương.
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
                placeholder="Tìm quy hoạch, nhà đất, việc làm..."
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
                description="Các bài viết đáng chú ý tại Hòa Lạc sẽ được hiển thị tại đây."
                actionLabel="Gửi tin cho Ban biên tập"
                actionTo="/gui-tin"
              />
            </div>
          )}

          <div className="dth-newsroom__quick-searches">
            <span>
              <Search size={16} />
              Tìm nhanh:
            </span>

            <Link to="/tin-tuc?category=quy-hoach">
              Quy hoạch
            </Link>

            <Link to="/tin-tuc?category=ha-tang">
              Hạ tầng
            </Link>

            <Link to="/nha-dat?transactionType=sale">
              Đất bán
            </Link>

            <Link to="/cong-dong?type=question">
              Hỏi đáp
            </Link>

            <Link to="/viec-lam">
              Việc làm
            </Link>
          </div>
        </div>
      </section>

      <section className="dth-quick-nav">
        <div className="container">
          <header className="dth-compact-heading">
            <div>
              <span className="dth-eyebrow">
                <MapPinned size={17} />
                Khám phá nhanh
              </span>

              <h2>
                Bạn đang cần tìm thông tin gì?
              </h2>
            </div>
          </header>

          <div className="dth-quick-nav__grid">
            {QUICK_ACTIONS.map(
              ({
                icon: Icon,
                title,
                description,
                to,
              }) => (
                <Link
                  key={to}
                  to={to}
                  className="dth-quick-nav__item"
                >
                  <span>
                    <Icon size={23} />
                  </span>

                  <div>
                    <strong>{title}</strong>
                    <p>{description}</p>
                  </div>

                  <ArrowRight size={17} />
                </Link>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="dth-pulse">
        <div className="container">
          <header className="dth-section-heading">
            <div>
              <span className="dth-section-heading__icon">
                <TrendingUp size={23} />
              </span>

              <div>
                <small>Dữ liệu tổng quan</small>

                <h2>Hôm nay ở Hòa Lạc</h2>

                <p>
                  Một số nhóm nội dung mới đang được
                  hiển thị trên hệ thống.
                </p>
              </div>
            </div>
          </header>

          <div className="dth-pulse__grid">
            {localPulseItems.map(
              ({
                icon: Icon,
                value,
                label,
                description,
                to,
              }) => (
                <Link
                  key={label}
                  to={to}
                  className="dth-pulse-card"
                >
                  <span className="dth-pulse-card__icon">
                    <Icon size={23} />
                  </span>

                  <div>
                    <strong>
                      {Number(value).toLocaleString(
                        'vi-VN',
                      )}
                    </strong>

                    <h3>{label}</h3>

                    <p>{description}</p>
                  </div>

                  <ArrowRight size={17} />
                </Link>
              ),
            )}
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
                  <strong>
                    Một số dữ liệu chưa tải được
                  </strong>

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

      <section className="dth-section dth-section--white">
        <div className="container">
          <HomeSectionHeading
            icon={Newspaper}
            eyebrow="Tin tức mới nhất"
            title="Theo dõi chuyển động Hòa Lạc"
            description="Các bài viết mới về quy hoạch, hạ tầng, giáo dục, kinh tế và đời sống địa phương."
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

      <section className="dth-section dth-section--soft">
        <div className="container">
          <div className="dth-community-jobs">
            <section className="dth-community-panel">
              <HomeSectionHeading
                icon={UsersRound}
                eyebrow="Bảng tin cư dân"
                title="Cộng đồng đang nói gì?"
                description="Câu hỏi, phản ánh và chia sẻ từ người đang sống, học tập và làm việc tại Hòa Lạc."
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
                eyebrow="Cơ hội địa phương"
                title="Việc làm mới"
                description="Các vị trí tuyển dụng và cơ hội việc làm trong khu vực."
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

      <section className="dth-section dth-section--white">
        <div className="container">
          <HomeSectionHeading
            icon={Building2}
            eyebrow="Thị trường địa phương"
            title="Bất động sản mới đăng"
            description="Tin mua bán, cho thuê và nhu cầu nhà đất được trình bày rõ ràng theo khu vực."
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

      <section className="dth-section dth-section--areas">
        <div className="container">
          <HomeSectionHeading
            icon={MapPin}
            eyebrow="Dữ liệu theo địa bàn"
            title="Khám phá theo khu vực"
            description="Theo dõi tin tức, cộng đồng và nhà đất tại từng xã, phường và khu vực quanh Hòa Lạc."
            to="/tim-kiem?type=area"
          />

          {areaItems.length ? (
            <div className="dth-area-grid">
              {areaItems.map((area) => (
                <Link
                  key={area._id || area.slug}
                  to={`/khu-vuc/${area.slug}`}
                  className="dth-area-card"
                >
                  <span>
                    <MapPin size={21} />
                  </span>

                  <div>
                    <strong>{area.name}</strong>

                    <small>
                      {getAreaTypeLabel(
                        area.areaType,
                      )}
                    </small>

                    <p>
                      Xem tin tức và nội dung tại khu vực.
                    </p>
                  </div>

                  <ArrowRight size={17} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="dth-area-empty">
              <EmptyState
                title="Khu vực đang được cập nhật"
                description="Danh sách địa bàn Hòa Lạc sẽ được hiển thị tại đây."
              />
            </div>
          )}
        </div>
      </section>

      <section className="dth-ecosystem">
        <div className="container">
          <header className="dth-ecosystem__heading">
            <span className="dth-eyebrow">
              <Sparkles size={17} />
              Hệ sinh thái XSpace
            </span>

            <h2>
              Từ thông tin địa phương đến giải pháp thực tế
            </h2>

            <p>
              Nhu cầu được chuyển tới đúng đơn vị phụ
              trách khi người dùng chủ động gửi thông tin.
            </p>
          </header>

          <div className="dth-ecosystem__grid">
            <article className="dth-service-card">
              <span className="dth-service-card__icon">
                <Home size={29} />
              </span>

              <small>Kiến Trúc Hòa Lạc</small>

              <h3>
                Thiết kế, thi công và cải tạo
              </h3>

              <p>
                Giải pháp kiến trúc và xây dựng phù hợp
                với điều kiện thực tế tại khu vực Hòa Lạc.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={17} />
                  Thiết kế nhà ở và biệt thự
                </li>

                <li>
                  <CheckCircle2 size={17} />
                  Thi công và giám sát
                </li>

                <li>
                  <CheckCircle2 size={17} />
                  Cải tạo và dự toán
                </li>
              </ul>

              <Link to="/tu-van?type=architecture_design">
                Nhận tư vấn kiến trúc
                <ArrowRight size={18} />
              </Link>
            </article>

            <article className="dth-service-card">
              <span className="dth-service-card__icon">
                <Trees size={29} />
              </span>

              <small>Mely Space</small>

              <h3>
                Villa, homestay và không gian sự kiện
              </h3>

              <p>
                Hỗ trợ tìm không gian phù hợp theo số
                khách, thời gian, tiện ích và ngân sách.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={17} />
                  Villa nghỉ dưỡng cuối tuần
                </li>

                <li>
                  <CheckCircle2 size={17} />
                  Homestay theo nhu cầu
                </li>

                <li>
                  <CheckCircle2 size={17} />
                  Không gian tổ chức sự kiện
                </li>
              </ul>

              <Link to="/tu-van?type=homestay_search">
                Tìm không gian phù hợp
                <ArrowRight size={18} />
              </Link>
            </article>
          </div>

          <div className="dth-ecosystem__privacy">
            <ShieldCheck size={19} />

            <span>
              Thông tin liên hệ chỉ được chuyển khi
              người dùng chủ động gửi yêu cầu tư vấn.
            </span>
          </div>
        </div>
      </section>

      <section className="dth-contribute">
        <div className="container">
          <div className="dth-contribute__inner">
            <div>
              <span className="dth-contribute__icon">
                <Newspaper size={26} />
              </span>

              <div>
                <small>
                  Cùng xây dựng dữ liệu địa phương
                </small>

                <h2>
                  Bạn có thông tin mới về Hòa Lạc?
                </h2>

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

          {description ? (
            <p>{description}</p>
          ) : null}
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

      <p>
        Có lỗi xảy ra khi tải dữ liệu của phần này.
      </p>

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