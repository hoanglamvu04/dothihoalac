import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bath,
  BedDouble,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Clock3,
  Eye,
  FilePenLine,
  GraduationCap,
  Heart,
  MapPin,
  Maximize2,
  MessageCircle,
  MessageSquareText,
  MoreHorizontal,
  Newspaper,
  RefreshCw,
  Send,
  UsersRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Avatar from '../../components/common/Avatar';
import ContentImage from '../../components/content/ContentImage';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { systemApi } from '../../api/system.api';
import {
  formatCurrency,
  formatNumber,
  formatRelativeTime,
  truncate,
} from '../../utils/formatters';
import { contentPath } from '../../utils/content';
import { COMMUNITY_TYPES, JOB_TYPES } from '../../utils/constants';
import { getPropertyTypeLabel } from '../../utils/propertyPosting';

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

const INITIAL_LOADING = {
  articles: true,
  community: true,
  properties: true,
  jobs: true,
};

const RESOLVED_LOADING = {
  articles: false,
  community: false,
  properties: false,
  jobs: false,
};

const HOME_FEED_CACHE_KEY = 'dthl:home-feed:v2';
const HOME_FEED_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

const MOBILE_SHORTCUTS = [
  { to: '/tin-tuc', label: 'Tin tức', icon: Newspaper },
  { to: '/viec-lam', label: 'Việc làm', icon: BriefcaseBusiness },
  { to: '/nha-dat', label: 'Bất động sản', icon: Building2 },
  { to: '/cong-dong', label: 'Cộng đồng', icon: UsersRound },
  { to: '/tin-tuc?category=giao-duc', label: 'Giáo dục', icon: GraduationCap },
  { to: '/tim-kiem', label: 'Xem thêm', icon: MoreHorizontal },
];

const COMMUNITY_TABS = [
  { label: 'Mới nhất', to: '/cong-dong' },
  { label: 'Quan tâm', to: '/cong-dong?sort=popular' },
  { label: 'Thảo luận', to: '/cong-dong?type=discussion' },
  { label: 'Sự kiện', to: '/cong-dong?type=community_event' },
];

const PROPERTY_TABS = [
  { label: 'Tất cả', to: '/nha-dat' },
  { label: 'Nhà ở', to: '/nha-dat?propertyType=house' },
  { label: 'Đất nền', to: '/nha-dat?propertyType=land' },
  { label: 'Căn hộ', to: '/nha-dat?propertyType=apartment' },
  { label: 'Shophouse', to: '/nha-dat?propertyType=shophouse' },
];

function normalizeHomeFeed(value) {
  return {
    articles: Array.isArray(value?.articles) ? value.articles : [],
    community: Array.isArray(value?.community) ? value.community : [],
    properties: Array.isArray(value?.properties) ? value.properties : [],
    jobs: Array.isArray(value?.jobs) ? value.jobs : [],
  };
}

function hasHomeFeedData(value) {
  return Boolean(
    value?.articles?.length ||
    value?.community?.length ||
    value?.properties?.length ||
    value?.jobs?.length,
  );
}

function readHomeFeedCache() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(HOME_FEED_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt || 0);

    if (!savedAt || Date.now() - savedAt > HOME_FEED_CACHE_MAX_AGE_MS) {
      window.localStorage.removeItem(HOME_FEED_CACHE_KEY);
      return null;
    }

    const normalized = normalizeHomeFeed(parsed?.data);
    return hasHomeFeedData(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

function writeHomeFeedCache(value) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      HOME_FEED_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), data: value }),
    );
  } catch {
    // Storage can be unavailable in private/restricted browsing.
  }
}

function isCanceled(error) {
  return error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
}

function getItemKey(item, prefix, index) {
  return String(item?._id || item?.id || item?.slug || `${prefix}-${index}`);
}

function articleCategory(item) {
  return item?.primaryCategoryId?.name || 'Tin Hòa Lạc';
}

function itemTime(item) {
  return formatRelativeTime(item?.publishedAt || item?.createdAt);
}

function SectionHeader({ title, to, label = 'Xem tất cả' }) {
  return (
    <header className="home-ref-section-header">
      <h2>{title}</h2>
      {to ? (
        <Link to={to}>
          {label}
          <ArrowRight size={13} />
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

function MobileQuickNav() {
  return (
    <nav className="home-mobile-shortcuts" aria-label="Khám phá nhanh">
      {MOBILE_SHORTCUTS.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.to} to={item.to}>
            <span><Icon size={24} /></span>
            <strong>{item.label}</strong>
          </Link>
        );
      })}
    </nav>
  );
}

function MetaLine({ item, showArea = true, showViews = true }) {
  return (
    <div className="home-card-meta">
      {showArea && item?.primaryAreaId?.name ? (
        <span><MapPin size={12} /> {item.primaryAreaId.name}</span>
      ) : null}
      <span><Clock3 size={12} /> {itemTime(item)}</span>
      {showViews ? (
        <span><Eye size={12} /> {formatNumber(item?.viewCount)}</span>
      ) : null}
      {Number(item?.commentCount || 0) > 0 ? (
        <span><MessageCircle size={12} /> {formatNumber(item.commentCount)}</span>
      ) : null}
    </div>
  );
}

function HomeHeroCard({ item }) {
  if (!item) return null;
  const href = contentPath(item);

  return (
    <article className="home-hero-card">
      <Link className="home-hero-card__media" to={href} aria-label={item.title}>
        <ContentImage
          media={item.thumbnailMediaId}
          alt={item.title}
          ratio="hero"
          loading="eager"
          fetchPriority="high"
          sizes="(max-width: 900px) 100vw, 920px"
        />
      </Link>
      <div className="home-hero-card__shade" />
      <div className="home-hero-card__content">
        <span className="home-pill home-pill--gold">{articleCategory(item)}</span>
        <h1><Link to={href}>{item.title}</Link></h1>
        {item.summary ? <p>{truncate(item.summary, 155)}</p> : null}
        <MetaLine item={item} showArea={false} />
      </div>
      <Link className="home-hero-card__more" to={href}>
        Xem chi tiết <ArrowRight size={14} />
      </Link>
      <div className="home-hero-card__dots" aria-hidden="true">
        <span className="is-active" />
        <span />
        <span />
        <span />
      </div>
    </article>
  );
}

function HomeSideStory({ item }) {
  const href = contentPath(item);
  return (
    <article className="home-side-story">
      <Link className="home-side-story__image" to={href}>
        <ContentImage media={item.thumbnailMediaId} alt={item.title} ratio="wide" />
      </Link>
      <div className="home-side-story__body">
        <span className="home-pill">{articleCategory(item)}</span>
        <h3><Link to={href}>{item.title}</Link></h3>
        <MetaLine item={item} />
      </div>
    </article>
  );
}

function HomeLatestStory({ item }) {
  const href = contentPath(item);
  return (
    <article className="home-latest-story">
      <Link to={href} className="home-latest-story__image">
        <ContentImage media={item.thumbnailMediaId} alt={item.title} ratio="wide" />
      </Link>
      <div>
        <h3><Link to={href}>{item.title}</Link></h3>
        <MetaLine item={item} />
      </div>
    </article>
  );
}

function HomeSpotlightStory({ item }) {
  const href = contentPath(item);
  return (
    <article className="home-spotlight-story">
      <Link to={href} className="home-spotlight-story__image">
        <ContentImage media={item.thumbnailMediaId} alt={item.title} ratio="wide" />
      </Link>
      <h3><Link to={href}>{item.title}</Link></h3>
      <MetaLine item={item} />
    </article>
  );
}

function jobSalary(item) {
  const job = item?.job || {};
  if (job.salaryUnit === 'negotiable' || (!job.salaryMin && !job.salaryMax)) {
    return 'Lương thỏa thuận';
  }
  const min = formatCurrency(job.salaryMin || 0);
  const max = formatCurrency(job.salaryMax || job.salaryMin || 0);
  return `${min} – ${max}`;
}

function HomeJobStory({ item }) {
  const job = item?.job || {};
  const href = contentPath(item);
  return (
    <article className="home-job-story">
      <span className="home-job-story__icon"><BriefcaseBusiness size={18} /></span>
      <div className="home-job-story__body">
        <span className="home-job-story__type">{JOB_TYPES[job.jobType] || 'Việc làm'}</span>
        <h3><Link to={href}>{item.title}</Link></h3>
        <p>{job.companyName || 'Nhà tuyển dụng'}</p>
        <div className="home-job-story__meta">
          <span><MapPin size={11} /> {job.workLocation || item.primaryAreaId?.name || 'Hòa Lạc'}</span>
        </div>
      </div>
      <strong className="home-job-story__salary">{jobSalary(item)}</strong>
    </article>
  );
}

function communityMedia(item) {
  const media = [];
  const seen = new Set();
  const append = (value) => {
    if (!value) return;
    const key = String(value?._id || value?.id || value?.secureUrl || value?.url || value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    media.push(value);
  };
  append(item?.thumbnailMediaId);
  (item?.body?.inlineMediaIds || []).forEach(append);
  return media;
}

function HomeCommunityStory({ item }) {
  const href = contentPath(item);
  const author = item.authorId || item.author || {};
  const authorName = author.displayName || author.username || 'Thành viên';
  const media = communityMedia(item).slice(0, 2);
  const text = String(item?.body?.bodyText || item?.summary || item?.title || '').trim();

  return (
    <article className={`home-community-story${media.length ? '' : ' is-text-only'}`}>
      <div className="home-community-story__head">
        <Avatar
          src={author?.profile?.avatarMediaId || author?.avatarMediaId || null}
          name={authorName}
          size="xs"
        />
        <div>
          <strong>{authorName}</strong>
          <span>{itemTime(item)}</span>
        </div>
        <span className="home-community-story__type">
          {COMMUNITY_TYPES[item?.community?.postType] || 'Cộng đồng'}
        </span>
      </div>
      <p><Link to={href}>{truncate(text, 100)}</Link></p>
      {media.length ? (
        <Link className={`home-community-story__media is-${media.length}`} to={href}>
          {media.map((image, index) => (
            <ContentImage
              key={String(image?._id || image?.id || image?.secureUrl || image?.url || index)}
              media={image}
              alt={item.title || 'Ảnh cộng đồng'}
              ratio="wide"
            />
          ))}
        </Link>
      ) : (
        <Link className="home-community-story__placeholder" to={href}>
          <MessageSquareText size={28} />
          <span>Xem cuộc trò chuyện</span>
        </Link>
      )}
      <div className="home-community-story__stats">
        <span><Heart size={15} /> {formatNumber(item.reactionCount)}</span>
        <span><MessageCircle size={15} /> {formatNumber(item.commentCount)}</span>
        <span className="home-community-story__bookmark"><Bookmark size={15} /></span>
      </div>
    </article>
  );
}

function HomePropertyStory({ item }) {
  const property = item.property || {};
  const href = contentPath(item);
  return (
    <article className="home-property-story">
      <Link className="home-property-story__image" to={href}>
        <ContentImage media={item.thumbnailMediaId} alt={item.title} ratio="property" />
        <span className="home-property-story__type">
          {getPropertyTypeLabel(property.propertyType, 'Bất động sản')}
        </span>
      </Link>
      <div className="home-property-story__body">
        <h3><Link to={href}>{item.title}</Link></h3>
        <div className="home-property-story__row">
          <span><MapPin size={11} /> {item.primaryAreaId?.name || property.addressText || 'Hòa Lạc'}</span>
          <strong>{formatCurrency(property.price, property.priceUnit)}</strong>
        </div>
        <div className="home-property-story__facts">
          {property.landArea ? <span><Maximize2 size={11} /> {formatNumber(property.landArea)} m²</span> : null}
          {property.bedrooms !== null && property.bedrooms !== undefined ? <span><BedDouble size={11} /> {property.bedrooms} PN</span> : null}
          {property.bathrooms !== null && property.bathrooms !== undefined ? <span><Bath size={11} /> {property.bathrooms} WC</span> : null}
        </div>
      </div>
    </article>
  );
}

function HomeCta({ tone, icon: Icon, eyebrow, title, text, to, action }) {
  return (
    <article className={`home-reference-cta home-reference-cta--${tone}`}>
      <span className="home-reference-cta__icon"><Icon size={28} /></span>
      <div>
        <small>{eyebrow}</small>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <Link to={to}>{action}<ArrowRight size={14} /></Link>
    </article>
  );
}

export default function HomePage() {
  const [cachedFeedAtMount] = useState(() => readHomeFeedCache());
  const [data, setData] = useState(() => cachedFeedAtMount || INITIAL_DATA);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [loading, setLoading] = useState(() =>
    hasHomeFeedData(cachedFeedAtMount) ? RESOLVED_LOADING : INITIAL_LOADING,
  );
  const [reloadKey, setReloadKey] = useState(0);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const alreadyHasContent = hasHomeFeedData(dataRef.current);

    if (!alreadyHasContent) {
      setLoading(INITIAL_LOADING);
    }
    setErrors(INITIAL_ERRORS);

    systemApi
      .homeFeed({ signal: controller.signal })
      .then((response) => {
        if (!active) return;
        const nextData = normalizeHomeFeed(response);
        dataRef.current = nextData;
        setData(nextData);
        writeHomeFeedCache(nextData);
        setErrors(INITIAL_ERRORS);
      })
      .catch((error) => {
        if (!active || isCanceled(error)) return;
        if (!hasHomeFeedData(dataRef.current)) {
          dataRef.current = INITIAL_DATA;
          setData(INITIAL_DATA);
        }
        setErrors({ articles: true, community: true, properties: true, jobs: true });
      })
      .finally(() => {
        if (!active) return;
        setLoading(RESOLVED_LOADING);
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
  const latestArticles = data.articles.slice(4, 8);
  const spotlightArticles = data.articles.slice(8, 12);
  const communityItems = data.community.slice(0, 4);
  const propertyItems = data.properties.slice(0, 4);
  const jobItems = data.jobs.slice(0, 4);
  const hasAnyError = Object.values(errors).some(Boolean);
  const hasAnyLoading = Object.values(loading).some(Boolean);
  const visibleContentCount =
    data.articles.length + data.community.length + data.properties.length + data.jobs.length;

  return (
    <main className="dth-home home-ref home-reference-v2">
      <Seo
        title="Đô Thị Hòa Lạc - Tin tức, cộng đồng và dữ liệu địa phương"
        description="Tin mới Hòa Lạc về quy hoạch, hạ tầng, bất động sản, cộng đồng và việc làm trong khu vực."
      />

      <section className="home-reference-main">
        <div className="container">
          <SectionState
            loading={loading.articles}
            error={errors.articles}
            items={data.articles}
            onRetry={retryLoad}
            emptyTitle="Chưa có tin nổi bật"
          >
            <div className="home-reference-hero">
              <HomeHeroCard item={leadArticle} />
              <div className="home-reference-side-list">
                {sideArticles.map((item, index) => (
                  <HomeSideStory key={getItemKey(item, 'side', index)} item={item} />
                ))}
              </div>
            </div>
          </SectionState>

          <MobileQuickNav />

          <div className="home-reference-dashboard">
            <section className="home-reference-panel home-reference-panel--latest">
              <SectionHeader title="Tin nổi bật" to="/tin-tuc" />
              <SectionState
                loading={loading.articles}
                error={errors.articles}
                items={latestArticles}
                onRetry={retryLoad}
                emptyTitle="Chưa có tin mới"
              >
                <div className="home-reference-latest-list">
                  {latestArticles.map((item, index) => (
                    <HomeLatestStory key={getItemKey(item, 'latest', index)} item={item} />
                  ))}
                </div>
              </SectionState>
            </section>

            <section className="home-reference-panel home-reference-panel--spotlight">
              <SectionHeader title="Tiêu điểm phát triển đô thị" to="/tin-tuc?category=quy-hoach" />
              <SectionState
                loading={loading.articles}
                error={errors.articles}
                items={spotlightArticles}
                onRetry={retryLoad}
                emptyTitle="Chưa có tiêu điểm mới"
              >
                <div className="home-reference-spotlight-grid">
                  {spotlightArticles.map((item, index) => (
                    <HomeSpotlightStory key={getItemKey(item, 'spotlight', index)} item={item} />
                  ))}
                </div>
              </SectionState>
            </section>

            <section className="home-reference-panel home-reference-panel--jobs">
              <SectionHeader title="Cơ hội việc làm" to="/viec-lam" />
              <SectionState
                loading={loading.jobs}
                error={errors.jobs}
                items={jobItems}
                onRetry={retryLoad}
                emptyTitle="Chưa có tin việc làm"
              >
                <div className="home-reference-job-list">
                  {jobItems.map((item, index) => (
                    <HomeJobStory key={getItemKey(item, 'job', index)} item={item} />
                  ))}
                </div>
              </SectionState>
            </section>
          </div>

          <section className="home-reference-community">
            <header className="home-reference-wide-heading">
              <h2>Cộng đồng Hòa Lạc</h2>
              <nav aria-label="Bộ lọc cộng đồng">
                {COMMUNITY_TABS.map((tab, index) => (
                  <Link className={index === 0 ? 'is-active' : ''} key={tab.label} to={tab.to}>{tab.label}</Link>
                ))}
              </nav>
              <Link className="home-reference-heading-action" to="/cong-dong/create">
                <UsersRound size={14} /> Tham gia cộng đồng
              </Link>
            </header>
            <SectionState
              loading={loading.community}
              error={errors.community}
              items={communityItems}
              onRetry={retryLoad}
              emptyTitle="Chưa có chia sẻ cộng đồng"
            >
              <div className="home-reference-community-grid">
                {communityItems.map((item, index) => (
                  <HomeCommunityStory key={getItemKey(item, 'community', index)} item={item} />
                ))}
              </div>
            </SectionState>
          </section>

          <section className="home-reference-properties">
            <header className="home-reference-wide-heading home-reference-wide-heading--property">
              <h2>Bất động sản Hòa Lạc</h2>
              <nav aria-label="Loại bất động sản">
                {PROPERTY_TABS.map((tab, index) => (
                  <Link className={index === 0 ? 'is-active' : ''} key={tab.label} to={tab.to}>{tab.label}</Link>
                ))}
              </nav>
              <Link className="home-reference-heading-link" to="/nha-dat">
                Xem tất cả <ArrowRight size={13} />
              </Link>
            </header>
            <SectionState
              loading={loading.properties}
              error={errors.properties}
              items={propertyItems}
              onRetry={retryLoad}
              emptyTitle="Chưa có tin bất động sản"
            >
              <div className="home-reference-property-grid">
                {propertyItems.map((item, index) => (
                  <HomePropertyStory key={getItemKey(item, 'property', index)} item={item} />
                ))}
              </div>
            </SectionState>
          </section>

          <section className="home-reference-cta-grid">
            <HomeCta
              tone="community"
              icon={UsersRound}
              eyebrow="Kết nối cộng đồng"
              title="Kết nối – Chia sẻ – Phát triển cùng Hòa Lạc"
              text="Tham gia cộng đồng, cập nhật tin tức, sự kiện và cơ hội mới mỗi ngày."
              to="/cong-dong"
              action="Tham gia ngay"
            />
            <HomeCta
              tone="data"
              icon={Building2}
              eyebrow="Dữ liệu địa phương"
              title="Dữ liệu & Quy hoạch Hòa Lạc"
              text="Tra cứu bản đồ quy hoạch, pháp lý và dữ liệu thị trường trong khu vực."
              to="/quy-hoach"
              action="Khám phá ngay"
            />
          </section>

          <section className="home-reference-tipbar">
            <span><MessageSquareText size={17} /></span>
            <div>
              <small>Đóng góp cho cộng đồng</small>
              <strong>Chia sẻ thông tin hữu ích về Hòa Lạc</strong>
            </div>
            <div>
              <Link to="/dang-bai"><FilePenLine size={14} /> Đăng nội dung</Link>
              <Link to="/gui-tin"><Send size={14} /> Gửi tin</Link>
            </div>
          </section>
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
