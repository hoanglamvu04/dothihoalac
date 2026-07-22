import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Home,
  MapPin,
  MessageCircle,
  Newspaper,
  RefreshCw,
  Sparkles,
  UsersRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import ArticleCard from '../../components/content/ArticleCard';
import CommunityCard from '../../components/content/CommunityCard';
import PropertyCard from '../../components/content/PropertyCard';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';

import { useTaxonomy } from '../../context/TaxonomyContext';

import {
  articleApi,
  communityApi,
  propertyApi,
} from '../../api/content.api';

import './AreaPage.css';

const EMPTY_COLLECTION = {
  items: [],
  total: 0,
};

const INITIAL_DATA = {
  articles: EMPTY_COLLECTION,
  community: EMPTY_COLLECTION,
  properties: EMPTY_COLLECTION,
};

const AREA_TYPE_LABELS = {
  country: 'Quốc gia',
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

function normalizeCollection(response) {
  const items = Array.isArray(response?.items)
    ? response.items
    : Array.isArray(response?.data?.items)
      ? response.data.items
      : Array.isArray(response?.data)
        ? response.data
        : [];

  const meta =
    response?.meta &&
    typeof response.meta === 'object'
      ? response.meta
      : response?.data?.meta &&
          typeof response.data.meta === 'object'
        ? response.data.meta
        : {};

  const totalValue = Number(
    meta.total ??
      meta.totalItems ??
      meta.itemCount ??
      response?.total ??
      items.length,
  );

  return {
    items,
    total: Number.isFinite(totalValue)
      ? totalValue
      : items.length,
  };
}

function getAreaTypeLabel(areaType) {
  if (!areaType) {
    return 'Khu vực';
  }

  if (AREA_TYPE_LABELS[areaType]) {
    return AREA_TYPE_LABELS[areaType];
  }

  return String(areaType)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function getItemKey(item, prefix, index) {
  return String(
    item?._id ||
      item?.id ||
      item?.slug ||
      `${prefix}-${index}`,
  );
}

export default function AreaPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const {
    areaBySlug,
    loading: taxonomyLoading,
  } = useTaxonomy();

  const area = areaBySlug(slug);

  const [data, setData] =
    useState(INITIAL_DATA);

  const [loading, setLoading] =
    useState(true);

  const [reloadKey, setReloadKey] =
    useState(0);

  const [sectionErrors, setSectionErrors] =
    useState({
      articles: false,
      community: false,
      properties: false,
    });

  useEffect(() => {
    if (taxonomyLoading) {
      return undefined;
    }

    if (!area?._id) {
      setData(INITIAL_DATA);
      setLoading(false);

      return undefined;
    }

    let active = true;

    setLoading(true);

    setSectionErrors({
      articles: false,
      community: false,
      properties: false,
    });

    Promise.allSettled([
      articleApi.list({
        area: area._id,
        page: 1,
        limit: 6,
      }),

      communityApi.list({
        area: area._id,
        page: 1,
        limit: 5,
      }),

      propertyApi.list({
        area: area._id,
        page: 1,
        limit: 4,
      }),
    ])
      .then(
        ([
          articleResult,
          communityResult,
          propertyResult,
        ]) => {
          if (!active) {
            return;
          }

          setData({
            articles:
              articleResult.status ===
              'fulfilled'
                ? normalizeCollection(
                    articleResult.value,
                  )
                : EMPTY_COLLECTION,

            community:
              communityResult.status ===
              'fulfilled'
                ? normalizeCollection(
                    communityResult.value,
                  )
                : EMPTY_COLLECTION,

            properties:
              propertyResult.status ===
              'fulfilled'
                ? normalizeCollection(
                    propertyResult.value,
                  )
                : EMPTY_COLLECTION,
          });

          setSectionErrors({
            articles:
              articleResult.status ===
              'rejected',

            community:
              communityResult.status ===
              'rejected',

            properties:
              propertyResult.status ===
              'rejected',
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
  }, [
    area?._id,
    reloadKey,
    taxonomyLoading,
  ]);

  const areaTypeLabel = useMemo(
    () =>
      getAreaTypeLabel(area?.areaType),
    [area?.areaType],
  );

  const description =
    area?.description ||
    `Theo dõi tin tức, hoạt động cộng đồng và thị trường bất động sản tại ${area?.name || 'khu vực này'}.`;

  const visibleContentCount =
    data.articles.items.length +
    data.community.items.length +
    data.properties.items.length;

  const hasAnyError =
    sectionErrors.articles ||
    sectionErrors.community ||
    sectionErrors.properties;

  const handleBack = useCallback(() => {
    const historyIndex =
      window.history.state?.idx;

    if (
      typeof historyIndex === 'number' &&
      historyIndex > 0
    ) {
      navigate(-1);
      return;
    }

    navigate('/');
  }, [navigate]);

  const handleReload = useCallback(() => {
    setReloadKey(
      (current) => current + 1,
    );
  }, []);

  if (taxonomyLoading || loading) {
    return <AreaPageLoading />;
  }

  if (!area) {
    return (
      <section className="area-page area-page--not-found">
        <Seo title="Không tìm thấy khu vực" />

        <div className="area-page-container">
          <div className="area-not-found-card">
            <span>
              <MapPin size={42} />
            </span>

            <EmptyState
              title="Không tìm thấy khu vực"
              description="Khu vực này có thể đã thay đổi đường dẫn, bị ẩn hoặc không còn tồn tại trên hệ thống."
            />

            <div className="area-not-found-actions">
              <button
                type="button"
                onClick={handleBack}
              >
                <ArrowLeft size={17} />
                Quay lại trang trước
              </button>

              <Link to="/">
                <Home size={17} />
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="area-page">
      <Seo
        title={area.name}
        description={description}
      />

      <div className="area-page-container">
        <nav className="area-breadcrumb">
          <button
            type="button"
            onClick={handleBack}
          >
            <ArrowLeft size={17} />
            Quay lại
          </button>

          <span>/</span>

          <Link to="/">
            Trang chủ
          </Link>

          <span>/</span>

          <span>
            {area.name}
          </span>
        </nav>

        <header className="area-hero">
          <div className="area-hero__content">
            <span className="area-hero__eyebrow">
              <MapPin size={17} />
              Khám phá khu vực
            </span>

            <h1>{area.name}</h1>

            <p>{description}</p>

            <div className="area-hero__actions">
              <a
                href="#area-latest-content"
                className="area-primary-action"
              >
                <Sparkles size={18} />
                Xem nội dung mới
              </a>

              <Link
                to={`/cong-dong?area=${encodeURIComponent(
                  area._id,
                )}`}
                className="area-secondary-action"
              >
                <MessageCircle size={18} />
                Tham gia cộng đồng
              </Link>
            </div>
          </div>

          <div className="area-hero__summary">
            <div className="area-hero__summary-heading">
              <span>
                <MapPin size={25} />
              </span>

              <div>
                <strong>
                  {area.name}
                </strong>

                <small>
                  {areaTypeLabel}
                </small>
              </div>
            </div>

            <div className="area-hero__summary-list">
              <div>
                <Newspaper size={17} />

                <span>
                  Tin tức và thông tin địa phương
                </span>
              </div>

              <div>
                <UsersRound size={17} />

                <span>
                  Thảo luận và chia sẻ cộng đồng
                </span>
              </div>

              <div>
                <Building2 size={17} />

                <span>
                  Tin mua bán và cho thuê nhà đất
                </span>
              </div>
            </div>
          </div>
        </header>

        <section className="area-overview-grid">
          <article>
            <span>
              <MapPin size={22} />
            </span>

            <div>
              <small>
                Loại khu vực
              </small>

              <strong>
                {areaTypeLabel}
              </strong>
            </div>
          </article>

          <article>
            <span>
              <Newspaper size={22} />
            </span>

            <div>
              <small>
                Tin tức
              </small>

              <strong>
                {data.articles.total.toLocaleString(
                  'vi-VN',
                )}
              </strong>
            </div>
          </article>

          <article>
            <span>
              <MessageCircle size={22} />
            </span>

            <div>
              <small>
                Bài cộng đồng
              </small>

              <strong>
                {data.community.total.toLocaleString(
                  'vi-VN',
                )}
              </strong>
            </div>
          </article>

          <article>
            <span>
              <Building2 size={22} />
            </span>

            <div>
              <small>
                Tin bất động sản
              </small>

              <strong>
                {data.properties.total.toLocaleString(
                  'vi-VN',
                )}
              </strong>
            </div>
          </article>
        </section>

        {hasAnyError ? (
          <section className="area-partial-error">
            <div>
              <RefreshCw size={21} />

              <div>
                <strong>
                  Một số dữ liệu chưa tải được
                </strong>

                <p>
                  Trang vẫn hiển thị các nội dung đã tải thành công. Bạn có thể thử tải lại phần còn thiếu.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReload}
            >
              <RefreshCw size={16} />
              Tải lại dữ liệu
            </button>
          </section>
        ) : null}

        <div
          id="area-latest-content"
          className="area-content-sections"
        >
          <AreaContentSection
            icon={Newspaper}
            eyebrow="Tin tức địa phương"
            title="Tin tức mới"
            description={`Các bài viết, thông báo và thông tin đáng chú ý tại ${area.name}.`}
            to={`/tin-tuc?area=${encodeURIComponent(
              area._id,
            )}`}
            count={data.articles.total}
            error={sectionErrors.articles}
            emptyTitle="Chưa có tin tức"
            emptyDescription={`Hiện chưa có bài viết tin tức nào được phân loại tại ${area.name}.`}
            onRetry={handleReload}
          >
            {data.articles.items.length ? (
              <div className="area-article-grid">
                {data.articles.items.map(
                  (item, index) => (
                    <article
                      key={getItemKey(
                        item,
                        'article',
                        index,
                      )}
                    >
                      <ArticleCard
                        item={item}
                      />
                    </article>
                  ),
                )}
              </div>
            ) : null}
          </AreaContentSection>

          <AreaContentSection
            icon={MessageCircle}
            eyebrow="Kết nối người dân"
            title="Cộng đồng khu vực"
            description={`Các câu hỏi, phản ánh, chia sẻ và thảo luận liên quan đến ${area.name}.`}
            to={`/cong-dong?area=${encodeURIComponent(
              area._id,
            )}`}
            count={data.community.total}
            error={sectionErrors.community}
            emptyTitle="Chưa có bài cộng đồng"
            emptyDescription={`Chưa có thành viên nào đăng nội dung cộng đồng tại ${area.name}.`}
            onRetry={handleReload}
          >
            {data.community.items.length ? (
              <div className="area-community-feed">
                {data.community.items.map(
                  (item, index) => (
                    <article
                      key={getItemKey(
                        item,
                        'community',
                        index,
                      )}
                    >
                      <CommunityCard
                        item={item}
                      />
                    </article>
                  ),
                )}
              </div>
            ) : null}
          </AreaContentSection>

          <AreaContentSection
            icon={Building2}
            eyebrow="Thị trường địa phương"
            title="Bất động sản"
            description={`Tin bán, cho thuê, sang nhượng và nhu cầu nhà đất tại ${area.name}.`}
            to={`/nha-dat?area=${encodeURIComponent(
              area._id,
            )}`}
            count={data.properties.total}
            error={sectionErrors.properties}
            emptyTitle="Chưa có tin nhà đất"
            emptyDescription={`Hiện chưa có tin bất động sản nào được đăng tại ${area.name}.`}
            onRetry={handleReload}
          >
            {data.properties.items.length ? (
              <div className="area-property-grid">
                {data.properties.items.map(
                  (item, index) => (
                    <article
                      key={getItemKey(
                        item,
                        'property',
                        index,
                      )}
                    >
                      <PropertyCard
                        item={item}
                      />
                    </article>
                  ),
                )}
              </div>
            ) : null}
          </AreaContentSection>
        </div>

        <section className="area-contribution-card">
          <div>
            <span>
              <MessageCircle size={23} />
            </span>

            <div>
              <small>
                Đóng góp thông tin
              </small>

              <h2>
                Bạn có thông tin mới về {area.name}?
              </h2>

              <p>
                Chia sẻ câu hỏi, phản ánh, hình ảnh hoặc nguồn tin địa phương để cộng đồng cùng theo dõi.
              </p>
            </div>
          </div>

          <div className="area-contribution-card__actions">
            <Link
              to={`/dang-bai/cong-dong?area=${encodeURIComponent(
                area._id,
              )}`}
            >
              Đăng bài cộng đồng
              <ArrowRight size={17} />
            </Link>

            <Link to="/gui-tin">
              Gửi tin Ban biên tập
            </Link>
          </div>
        </section>

        {!visibleContentCount &&
        !hasAnyError ? (
          <section className="area-new-content-note">
            <CheckCircle2 size={20} />

            <p>
              Khu vực đã được tạo trên hệ thống nhưng hiện chưa có nội dung công khai. Các bài viết mới sẽ xuất hiện tại đây sau khi được đăng và kiểm duyệt.
            </p>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function AreaContentSection({
  icon: Icon,
  eyebrow,
  title,
  description,
  to,
  count,
  error,
  emptyTitle,
  emptyDescription,
  onRetry,
  children,
}) {
  const hasContent =
    Boolean(children);

  return (
    <section className="area-content-section">
      <header className="area-content-section__heading">
        <div>
          <span>
            <Icon size={22} />
          </span>

          <div>
            <small>{eyebrow}</small>

            <h2>{title}</h2>

            <p>{description}</p>
          </div>
        </div>

        <div className="area-content-section__heading-actions">
          <strong>
            {Number(count || 0).toLocaleString(
              'vi-VN',
            )}
          </strong>

          <Link to={to}>
            Xem tất cả
            <ArrowRight size={17} />
          </Link>
        </div>
      </header>

      <div className="area-content-section__body">
        {error ? (
          <div className="area-section-error">
            <RefreshCw size={28} />

            <h3>
              Chưa thể tải dữ liệu
            </h3>

            <p>
              Có lỗi xảy ra khi tải nội dung của phần này.
            </p>

            <button
              type="button"
              onClick={onRetry}
            >
              <RefreshCw size={16} />
              Thử lại
            </button>
          </div>
        ) : hasContent ? (
          children
        ) : (
          <div className="area-empty-state">
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              actionLabel="Khám phá nội dung khác"
              actionTo="/"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function AreaPageLoading() {
  return (
    <section className="area-page area-page--loading">
      <div className="area-page-container">
        <div className="area-loading-card">
          <LoadingBlock />

          <p>
            Đang tải thông tin khu vực...
          </p>
        </div>
      </div>
    </section>
  );
}