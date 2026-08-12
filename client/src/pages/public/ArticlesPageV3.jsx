import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useSearchParams } from 'react-router-dom';

import {
  CalendarDays,
  Clock3,
  Grid3X3,
  List,
  MapPin,
  Newspaper,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tags,
  TrendingUp,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import ArticleCard from '../../components/content/ArticleCard';
import Pagination from '../../components/common/Pagination';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';

import { articleApi } from '../../api/content.api';
import { useListPage } from '../../hooks/useListPage';
import { useTaxonomy } from '../../context/TaxonomyContext';

import './ArticlesPageV3.css';

const VIEW_MODE_KEY = 'dothihoalac.article-view-mode';
const PAGE_SIZE = 12;

const CATEGORY_RAIL = [
  {
    slug: 'quy-hoach',
    label: 'Quy hoạch',
  },
  {
    slug: 'ha-tang-giao-thong',
    label: 'Hạ tầng',
  },
  {
    slug: 'du-an-dtxd',
    label: 'Dự án ĐTXD',
  },
  {
    slug: 'bat-dong-san',
    label: 'BĐS',
  },
  {
    slug: 'khu-cong-nghe-cao',
    label: 'Khu Công nghệ cao',
  },
  {
    slug: 'giao-duc',
    label: 'Giáo dục',
  },
  {
    slug: 'doi-song-cu-dan',
    label: 'Đời sống',
  },
  {
    slug: 'chinh-sach-hanh-chinh',
    label: 'Chính sách',
  },
];

const DEFAULT_PAGE_COPY = {
  theme: 'news',
  seoTitle: 'Tin tức Đô Thị Hòa Lạc',
  seoDescription:
    'Tin mới tại Hòa Lạc, Thạch Thất, Tây Phương, Hạ Bằng, Yên Xuân và Phú Cát về quy hoạch, hạ tầng, bất động sản, chính sách và đời sống.',
  eyebrow: 'Tin tức 6 xã',
  title: 'Tin mới quanh Đô Thị Hòa Lạc',
  description:
    'Theo dõi những chuyển động đáng chú ý tại Hòa Lạc, Thạch Thất, Tây Phương, Hạ Bằng, Yên Xuân và Phú Cát, được sắp xếp rõ theo chuyên mục và địa bàn.',
  searchPlaceholder: 'Tìm tin, địa bàn, dự án...',
  resultsEyebrow: 'Dòng tin cập nhật',
  latestTitle: 'Tin mới nhất',
  filteredTitle: 'Tin tức theo bộ lọc',
};

const CATEGORY_PAGE_COPY = {
  'quy-hoach': {
    theme: 'planning',
    seoTitle: 'Quy hoạch Hòa Lạc và khu vực 6 xã',
    seoDescription:
      'Cập nhật đồ án, điều chỉnh quy hoạch, sử dụng đất và định hướng phát triển không gian tại Hòa Lạc và 5 xã lân cận.',
    eyebrow: 'Quy hoạch & không gian đô thị',
    title: 'Cập nhật quy hoạch khu vực Hòa Lạc',
    description:
      'Theo dõi đồ án, điều chỉnh quy hoạch, chỉ tiêu sử dụng đất, định hướng phát triển không gian và các thông tin quản lý quy hoạch liên quan 6 xã.',
    searchPlaceholder: 'Tìm đồ án, khu vực, chỉ tiêu quy hoạch...',
    resultsEyebrow: 'Thông tin quy hoạch',
    latestTitle: 'Cập nhật quy hoạch mới nhất',
    filteredTitle: 'Quy hoạch theo bộ lọc',
  },
  'ha-tang-giao-thong': {
    theme: 'infrastructure',
    seoTitle: 'Hạ tầng - Giao thông khu vực Hòa Lạc',
    seoDescription:
      'Theo dõi tiến độ đường giao thông, hạ tầng kỹ thuật, kết nối liên vùng và các công trình hạ tầng tại khu vực Hòa Lạc.',
    eyebrow: 'Hạ tầng & giao thông',
    title: 'Theo dõi tiến độ hạ tầng khu vực',
    description:
      'Cập nhật các tuyến đường, hạ tầng kỹ thuật, công trình kết nối và những thay đổi có ảnh hưởng trực tiếp đến việc đi lại, phát triển đô thị và đời sống cư dân.',
    searchPlaceholder: 'Tìm tuyến đường, công trình, tiến độ...',
    resultsEyebrow: 'Tiến độ hạ tầng',
    latestTitle: 'Tin hạ tầng - giao thông mới nhất',
    filteredTitle: 'Hạ tầng theo bộ lọc',
  },
  'du-an-dtxd': {
    theme: 'projects',
    seoTitle: 'Dự án đầu tư xây dựng tại Hòa Lạc',
    seoDescription:
      'Thông tin các dự án đầu tư xây dựng, tiến độ triển khai, chủ trương và tác động dự án tại khu vực Hòa Lạc và 6 xã trọng tâm.',
    eyebrow: 'Dự án đầu tư xây dựng',
    title: 'Theo dõi dự án ĐTXD tại khu vực Hòa Lạc',
    description:
      'Tổng hợp thông tin về chủ trương đầu tư, tiến độ triển khai, quy mô, hạng mục và các thay đổi đáng chú ý của những dự án đầu tư xây dựng trong khu vực.',
    searchPlaceholder: 'Tìm tên dự án, chủ đầu tư, địa điểm...',
    resultsEyebrow: 'Dự án đang được quan tâm',
    latestTitle: 'Dự án ĐTXD mới cập nhật',
    filteredTitle: 'Dự án theo bộ lọc',
  },
  'bat-dong-san': {
    theme: 'property',
    seoTitle: 'Bất động sản Hòa Lạc',
    seoDescription:
      'Tin thị trường, dự án, pháp lý và chuyển động bất động sản tại Hòa Lạc, Thạch Thất và các xã lân cận.',
    eyebrow: 'Thị trường bất động sản',
    title: 'Bất động sản Hòa Lạc dưới góc nhìn địa phương',
    description:
      'Theo dõi thông tin thị trường, dự án, pháp lý, hạ tầng tác động đến giá trị khu vực và những chuyển động đáng chú ý của bất động sản quanh Hòa Lạc.',
    searchPlaceholder: 'Tìm dự án, khu đất, pháp lý, thị trường...',
    resultsEyebrow: 'Chuyển động thị trường',
    latestTitle: 'Tin bất động sản mới nhất',
    filteredTitle: 'Bất động sản theo bộ lọc',
  },
  'khu-cong-nghe-cao': {
    theme: 'technology',
    seoTitle: 'Khu Công nghệ cao Hòa Lạc',
    seoDescription:
      'Thông tin đầu tư, doanh nghiệp, hạ tầng, nghiên cứu và hoạt động tại Khu Công nghệ cao Hòa Lạc.',
    eyebrow: 'Khu Công nghệ cao Hòa Lạc',
    title: 'Nhịp phát triển của Khu Công nghệ cao',
    description:
      'Cập nhật hoạt động đầu tư, doanh nghiệp, nghiên cứu, đổi mới sáng tạo và những thay đổi hạ tầng liên quan đến Khu Công nghệ cao Hòa Lạc.',
    searchPlaceholder: 'Tìm doanh nghiệp, dự án, nghiên cứu...',
    resultsEyebrow: 'Khu Công nghệ cao',
    latestTitle: 'Tin Khu Công nghệ cao mới nhất',
    filteredTitle: 'Khu Công nghệ cao theo bộ lọc',
  },
  'giao-duc': {
    theme: 'education',
    seoTitle: 'Giáo dục - Đại học tại khu vực Hòa Lạc',
    seoDescription:
      'Tin giáo dục, Đại học Quốc gia Hà Nội, trường học, đào tạo và hoạt động học thuật tại khu vực Hòa Lạc.',
    eyebrow: 'Giáo dục & đào tạo',
    title: 'Giáo dục và đại học tại khu vực Hòa Lạc',
    description:
      'Theo dõi trường học, Đại học Quốc gia Hà Nội, cơ sở đào tạo, nghiên cứu và những hoạt động giáo dục đáng chú ý trong khu vực.',
    searchPlaceholder: 'Tìm trường học, chương trình, tuyển sinh...',
    resultsEyebrow: 'Giáo dục khu vực',
    latestTitle: 'Tin giáo dục mới nhất',
    filteredTitle: 'Giáo dục theo bộ lọc',
  },
  'doi-song-cu-dan': {
    theme: 'community-news',
    seoTitle: 'Đời sống cư dân khu vực Hòa Lạc',
    seoDescription:
      'Tin dân sinh, cộng đồng, văn hóa và đời sống hằng ngày tại 6 xã khu vực Đô Thị Hòa Lạc.',
    eyebrow: 'Đời sống cư dân',
    title: 'Những câu chuyện gần với người dân khu vực',
    description:
      'Tổng hợp các thông tin dân sinh, cộng đồng, văn hóa và những thay đổi thường ngày có ảnh hưởng trực tiếp đến cư dân tại 6 xã.',
    searchPlaceholder: 'Tìm dân sinh, cộng đồng, địa bàn...',
    resultsEyebrow: 'Đời sống địa phương',
    latestTitle: 'Tin đời sống mới nhất',
    filteredTitle: 'Đời sống theo bộ lọc',
  },
  'chinh-sach-hanh-chinh': {
    theme: 'policy',
    seoTitle: 'Chính sách - Hành chính khu vực Hòa Lạc',
    seoDescription:
      'Cập nhật chính sách, thủ tục hành chính, tổ chức bộ máy và thông tin quản lý nhà nước liên quan khu vực Hòa Lạc.',
    eyebrow: 'Chính sách & hành chính',
    title: 'Thông tin chính sách liên quan khu vực',
    description:
      'Theo dõi các quyết định, thủ tục, thay đổi hành chính và thông tin quản lý nhà nước có tác động đến người dân, doanh nghiệp và hoạt động đầu tư trong khu vực.',
    searchPlaceholder: 'Tìm quyết định, thủ tục, cơ quan...',
    resultsEyebrow: 'Chính sách mới',
    latestTitle: 'Tin chính sách - hành chính mới nhất',
    filteredTitle: 'Chính sách theo bộ lọc',
  },
  'kinh-te-doanh-nghiep': {
    theme: 'technology',
    seoTitle: 'Kinh tế - Doanh nghiệp Hòa Lạc',
    seoDescription:
      'Tin doanh nghiệp, đầu tư, sản xuất kinh doanh và hoạt động kinh tế tại khu vực Hòa Lạc.',
    eyebrow: 'Kinh tế & doanh nghiệp',
    title: 'Chuyển động kinh tế tại khu vực Hòa Lạc',
    description:
      'Cập nhật doanh nghiệp, đầu tư, sản xuất kinh doanh và các hoạt động kinh tế đáng chú ý đang diễn ra quanh khu vực Hòa Lạc.',
    searchPlaceholder: 'Tìm doanh nghiệp, đầu tư, kinh doanh...',
    resultsEyebrow: 'Kinh tế khu vực',
    latestTitle: 'Tin kinh tế - doanh nghiệp mới nhất',
    filteredTitle: 'Kinh tế theo bộ lọc',
  },
  'su-kien': {
    theme: 'community-news',
    seoTitle: 'Sự kiện khu vực Hòa Lạc',
    seoDescription:
      'Thông tin hội nghị, chương trình, sự kiện cộng đồng và hoạt động nổi bật tại khu vực Hòa Lạc.',
    eyebrow: 'Sự kiện khu vực',
    title: 'Sự kiện đáng chú ý quanh Hòa Lạc',
    description:
      'Theo dõi hội nghị, chương trình cộng đồng, hoạt động văn hóa và các sự kiện đáng chú ý đang diễn ra trong khu vực.',
    searchPlaceholder: 'Tìm sự kiện, chương trình, địa điểm...',
    resultsEyebrow: 'Lịch sự kiện',
    latestTitle: 'Sự kiện mới cập nhật',
    filteredTitle: 'Sự kiện theo bộ lọc',
  },
  'an-ninh-canh-bao': {
    theme: 'policy',
    seoTitle: 'An ninh - Cảnh báo khu vực Hòa Lạc',
    seoDescription:
      'Thông tin an ninh, cảnh báo, an toàn và các lưu ý cần biết tại khu vực Hòa Lạc.',
    eyebrow: 'An ninh & cảnh báo',
    title: 'Thông tin cần biết để chủ động hơn',
    description:
      'Cập nhật các cảnh báo, vấn đề an toàn, tình hình an ninh và những thông tin người dân cần lưu ý trong khu vực.',
    searchPlaceholder: 'Tìm cảnh báo, địa điểm, sự việc...',
    resultsEyebrow: 'Thông tin cảnh báo',
    latestTitle: 'Tin an ninh - cảnh báo mới nhất',
    filteredTitle: 'Cảnh báo theo bộ lọc',
  },
  'kien-truc-xay-dung': {
    theme: 'projects',
    seoTitle: 'Kiến trúc - Xây dựng Hòa Lạc',
    seoDescription:
      'Tin kiến trúc, xây dựng, công trình và phát triển không gian tại khu vực Hòa Lạc.',
    eyebrow: 'Kiến trúc & xây dựng',
    title: 'Không gian xây dựng đang thay đổi ra sao?',
    description:
      'Theo dõi công trình, xu hướng kiến trúc, hoạt động xây dựng và những thay đổi không gian đô thị đáng chú ý tại khu vực.',
    searchPlaceholder: 'Tìm công trình, kiến trúc, xây dựng...',
    resultsEyebrow: 'Kiến trúc - xây dựng',
    latestTitle: 'Tin kiến trúc - xây dựng mới nhất',
    filteredTitle: 'Kiến trúc - xây dựng theo bộ lọc',
  },
  'du-lich-nghi-duong': {
    theme: 'community-news',
    seoTitle: 'Du lịch - Nghỉ dưỡng Hòa Lạc',
    seoDescription:
      'Tin du lịch, nghỉ dưỡng, trải nghiệm địa phương và điểm đến quanh khu vực Hòa Lạc.',
    eyebrow: 'Du lịch & nghỉ dưỡng',
    title: 'Khám phá những trải nghiệm quanh Hòa Lạc',
    description:
      'Gợi mở các điểm đến, hoạt động trải nghiệm, dịch vụ lưu trú và câu chuyện du lịch đáng chú ý trong khu vực.',
    searchPlaceholder: 'Tìm điểm đến, lưu trú, trải nghiệm...',
    resultsEyebrow: 'Du lịch khu vực',
    latestTitle: 'Tin du lịch - nghỉ dưỡng mới nhất',
    filteredTitle: 'Du lịch theo bộ lọc',
  },
};

function itemValue(item) {
  return String(item?.slug || item?._id || item?.id || '');
}

function findItem(items, value) {
  return items.find(
    (item) =>
      itemValue(item) === String(value) ||
      String(item?._id || item?.id || '') === String(value),
  );
}

function getDateRange(dateValue) {
  if (!dateValue) return null;

  const start = new Date(`${dateValue}T00:00:00`);
  const end = new Date(`${dateValue}T23:59:59.999`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return null;
  }

  return {
    publishedFrom: start.toISOString(),
    publishedTo: end.toISOString(),
  };
}

function getPageCopy(category, categoryName) {
  if (!category) {
    return DEFAULT_PAGE_COPY;
  }

  if (CATEGORY_PAGE_COPY[category]) {
    return CATEGORY_PAGE_COPY[category];
  }

  const safeName = categoryName || 'Chuyên mục tin tức';

  return {
    ...DEFAULT_PAGE_COPY,
    seoTitle: `${safeName} | Đô Thị Hòa Lạc`,
    seoDescription: `Tin tức và cập nhật mới thuộc chuyên mục ${safeName} tại khu vực Đô Thị Hòa Lạc.`,
    eyebrow: safeName,
    title: `${safeName} tại khu vực Đô Thị Hòa Lạc`,
    description:
      `Tổng hợp thông tin mới thuộc chuyên mục ${safeName}, ưu tiên dữ liệu gắn với địa bàn và những thay đổi có ảnh hưởng trực tiếp đến khu vực.`,
    searchPlaceholder: `Tìm trong chuyên mục ${safeName}...`,
    resultsEyebrow: safeName,
    latestTitle: `${safeName} mới nhất`,
    filteredTitle: `${safeName} theo bộ lọc`,
  };
}

export default function ArticlesPageV3() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories = [], areas = [] } = useTaxonomy();
  const resultsRef = useRef(null);

  const articleCategories = useMemo(
    () =>
      categories.filter((item) =>
        ['article', 'all'].includes(item.contentScope),
      ),
    [categories],
  );

  const selectedCategory = searchParams.get('category') || '';
  const selectedArea = searchParams.get('area') || '';
  const selectedDate = searchParams.get('date') || '';
  const selectedSort = searchParams.get('sort') || '';
  const currentQuery = searchParams.get('q') || '';

  const [searchDraft, setSearchDraft] = useState(currentQuery);
  const [categoryDraft, setCategoryDraft] = useState(selectedCategory);
  const [areaDraft, setAreaDraft] = useState(selectedArea);
  const [dateDraft, setDateDraft] = useState(selectedDate);
  const [sortDraft, setSortDraft] = useState(selectedSort);

  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) === 'list'
        ? 'list'
        : 'grid';
    } catch {
      return 'grid';
    }
  });

  useEffect(() => {
    setSearchDraft(currentQuery);
    setCategoryDraft(selectedCategory);
    setAreaDraft(selectedArea);
    setDateDraft(selectedDate);
    setSortDraft(selectedSort);
  }, [
    currentQuery,
    selectedCategory,
    selectedArea,
    selectedDate,
    selectedSort,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // Không chặn hiển thị nếu localStorage bị vô hiệu hóa.
    }
  }, [viewMode]);

  const categoryApiValue = useMemo(() => {
    const item = findItem(articleCategories, selectedCategory);
    return item?._id || selectedCategory;
  }, [articleCategories, selectedCategory]);

  const areaApiValue = useMemo(() => {
    const item = findItem(areas, selectedArea);
    return item?._id || selectedArea;
  }, [areas, selectedArea]);

  const selectedCategoryName = useMemo(() => {
    const taxonomyName = findItem(
      articleCategories,
      selectedCategory,
    )?.name;

    if (taxonomyName) {
      return taxonomyName;
    }

    return CATEGORY_RAIL.find(
      (item) => item.slug === selectedCategory,
    )?.label || '';
  }, [articleCategories, selectedCategory]);

  const selectedAreaName =
    findItem(areas, selectedArea)?.name || '';

  const pageCopy = useMemo(
    () => getPageCopy(selectedCategory, selectedCategoryName),
    [selectedCategory, selectedCategoryName],
  );

  const listParams = useMemo(() => {
    const params = {
      limit: PAGE_SIZE,
    };

    const page = searchParams.get('page');
    const range = getDateRange(selectedDate);

    if (categoryApiValue) params.category = categoryApiValue;
    if (areaApiValue) params.area = areaApiValue;
    if (selectedSort) params.sort = selectedSort;
    if (currentQuery) params.q = currentQuery;
    if (page) params.page = page;

    if (range) {
      params.publishedFrom = range.publishedFrom;
      params.publishedTo = range.publishedTo;
    }

    return params;
  }, [
    searchParams,
    categoryApiValue,
    areaApiValue,
    selectedSort,
    currentQuery,
    selectedDate,
  ]);

  const result = useListPage(articleApi.list, listParams);

  const updateUrl = useCallback(
    (values, { replace = false } = {}) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);

          Object.entries(values).forEach(([key, value]) => {
            if (
              value === '' ||
              value === null ||
              value === undefined
            ) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });

          next.delete('categories');
          next.delete('areas');
          next.delete('page');
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  const handleSearchSubmit = useCallback(
    (event) => {
      event.preventDefault();
      updateUrl({ q: searchDraft.trim() });
    },
    [searchDraft, updateUrl],
  );

  const applyFilters = useCallback(() => {
    updateUrl({
      category: categoryDraft,
      area: areaDraft,
      date: dateDraft,
      sort: sortDraft,
    });
  }, [
    categoryDraft,
    areaDraft,
    dateDraft,
    sortDraft,
    updateUrl,
  ]);

  const clearFilters = useCallback(() => {
    setAreaDraft('');
    setDateDraft('');
    setSortDraft('');

    updateUrl({
      area: '',
      date: '',
      sort: '',
    });
  }, [updateUrl]);

  const clearActiveFilters = useCallback(() => {
    setSearchDraft('');
    setAreaDraft('');
    setDateDraft('');
    setSortDraft('');

    updateUrl({
      q: '',
      area: '',
      date: '',
      sort: '',
    });
  }, [updateUrl]);

  const clearEverything = useCallback(() => {
    setSearchDraft('');
    setCategoryDraft('');
    setAreaDraft('');
    setDateDraft('');
    setSortDraft('');
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const handleCategoryRail = useCallback(
    (value) => {
      setCategoryDraft(value);
      updateUrl({ category: value });
    },
    [updateUrl],
  );

  const handlePageChange = useCallback(
    (page) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);

        if (Number(page) <= 1) {
          next.delete('page');
        } else {
          next.set('page', String(page));
        }

        return next;
      });

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 30);
    },
    [setSearchParams],
  );

  const total = Number(result.meta?.total || 0);
  const currentPage = Number(result.meta?.page || 1);
  const totalPages = Math.max(
    1,
    Number(result.meta?.totalPages || 1),
  );
  const pageLimit = Number(result.meta?.limit || PAGE_SIZE);
  const pageStart = total
    ? (currentPage - 1) * pageLimit + 1
    : 0;
  const pageEnd = total
    ? Math.min(total, currentPage * pageLimit)
    : 0;

  const hasSecondaryFilter = Boolean(
    selectedArea ||
      selectedDate ||
      selectedSort ||
      currentQuery,
  );

  const railCategories = useMemo(
    () => CATEGORY_RAIL.map((definition) => {
      const taxonomyItem = articleCategories.find(
        (item) => itemValue(item) === definition.slug,
      );

      return {
        ...definition,
        _id: taxonomyItem?._id,
      };
    }),
    [articleCategories],
  );

  const resultTitle = currentQuery
    ? `Kết quả cho “${currentQuery}”`
    : hasSecondaryFilter
      ? pageCopy.filteredTitle
      : pageCopy.latestTitle;

  return (
    <section
      className={`articles-page articles-page-v3 articles-page--${pageCopy.theme}`}
    >
      <Seo
        title={pageCopy.seoTitle}
        description={pageCopy.seoDescription}
      />

      <div className="articles-page__container">
        <header className="articles-hero articles-v3-hero">
          <div className="articles-hero__content">
            <span className="articles-hero__eyebrow">
              <Newspaper size={15} />
              {pageCopy.eyebrow}
            </span>

            <h1>{pageCopy.title}</h1>

            <p>{pageCopy.description}</p>
          </div>

          <form
            className="articles-hero__search articles-v3-search"
            onSubmit={handleSearchSubmit}
          >
            <Search size={19} />

            <input
              type="search"
              value={searchDraft}
              onChange={(event) =>
                setSearchDraft(event.target.value)
              }
              placeholder={pageCopy.searchPlaceholder}
              aria-label={`Tìm kiếm trong ${pageCopy.eyebrow}`}
            />

            <button
              type="submit"
              className="articles-hero__search-submit"
              disabled={!searchDraft.trim()}
            >
              <Search size={16} />
              Tìm kiếm
            </button>
          </form>
        </header>

        <div className="articles-v3-category-shell">
          <span className="articles-v3-category-label">
            Theo chuyên mục
          </span>

          <nav
            className="articles-category-rail articles-v3-category-rail"
            aria-label="Chuyên mục tin tức"
          >
            <button
              type="button"
              className={!selectedCategory ? 'is-active' : ''}
              onClick={() => handleCategoryRail('')}
            >
              Tin mới
            </button>

            {railCategories.map((item) => (
              <button
                type="button"
                key={item.slug}
                className={
                  selectedCategory === item.slug
                    ? 'is-active'
                    : ''
                }
                onClick={() => handleCategoryRail(item.slug)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <section
          className="articles-v3-filterbar"
          aria-label="Bộ lọc tin tức"
        >
          <div className="articles-v3-filterbar__title">
            <SlidersHorizontal size={17} />
            <strong>Lọc nội dung</strong>
          </div>

          <label className="articles-v3-field">
            <span>Chuyên mục</span>
            <div>
              <Tags size={16} />
              <select
                value={categoryDraft}
                onChange={(event) =>
                  setCategoryDraft(event.target.value)
                }
              >
                <option value="">Tất cả</option>
                {articleCategories.map((item) => (
                  <option
                    key={item._id || itemValue(item)}
                    value={itemValue(item)}
                  >
                    {item.name}
                  </option>
                ))}
                {!findItem(articleCategories, 'du-an-dtxd') ? (
                  <option value="du-an-dtxd">
                    Dự án ĐTXD
                  </option>
                ) : null}
              </select>
            </div>
          </label>

          <label className="articles-v3-field">
            <span>Khu vực</span>
            <div>
              <MapPin size={16} />
              <select
                value={areaDraft}
                onChange={(event) =>
                  setAreaDraft(event.target.value)
                }
              >
                <option value="">Tất cả</option>
                {areas.map((item) => (
                  <option
                    key={item._id || itemValue(item)}
                    value={itemValue(item)}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="articles-v3-field articles-v3-date-field">
            <span>Ngày đăng</span>
            <div>
              <CalendarDays size={16} />
              <input
                type="date"
                value={dateDraft}
                onChange={(event) =>
                  setDateDraft(event.target.value)
                }
              />
            </div>
          </label>

          <label className="articles-v3-field">
            <span>Sắp xếp</span>
            <div>
              {sortDraft === 'popular' ? (
                <TrendingUp size={16} />
              ) : (
                <Clock3 size={16} />
              )}

              <select
                value={sortDraft}
                onChange={(event) =>
                  setSortDraft(event.target.value)
                }
              >
                <option value="">Mới nhất</option>
                <option value="popular">Đọc nhiều</option>
              </select>
            </div>
          </label>

          <div className="articles-v3-filterbar__actions">
            <button
              type="button"
              className="is-primary"
              onClick={applyFilters}
            >
              <SlidersHorizontal size={16} />
              Lọc tin
            </button>

            {hasSecondaryFilter ? (
              <button
                type="button"
                className="is-reset"
                onClick={clearFilters}
              >
                <RotateCcw size={15} />
                Xóa lọc
              </button>
            ) : null}
          </div>
        </section>

        {hasSecondaryFilter ? (
          <div className="articles-v3-active-filter">
            <span>Đang xem:</span>

            {selectedAreaName ? (
              <b>{selectedAreaName}</b>
            ) : null}

            {selectedDate ? (
              <b>{selectedDate.split('-').reverse().join('/')}</b>
            ) : null}

            {selectedSort === 'popular' ? (
              <b>Đọc nhiều</b>
            ) : null}

            {currentQuery ? (
              <b>“{currentQuery}”</b>
            ) : null}

            <button
              type="button"
              onClick={clearActiveFilters}
            >
              Xóa tất cả bộ lọc phụ
            </button>
          </div>
        ) : null}

        <section
          ref={resultsRef}
          className="articles-results articles-v3-results"
        >
          <header className="articles-results__header articles-v3-results__header">
            <div>
              <span className="articles-results__eyebrow">
                <Newspaper size={14} />
                {pageCopy.resultsEyebrow}
              </span>

              <h2>
                {resultTitle}

                {!result.loading && !result.error ? (
                  <small>
                    {total.toLocaleString('vi-VN')} bài viết
                  </small>
                ) : null}
              </h2>
            </div>

            <div className="articles-view-switch">
              <button
                type="button"
                className={viewMode === 'grid' ? 'is-active' : ''}
                aria-label="Xem dạng lưới"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 size={17} />
              </button>

              <button
                type="button"
                className={viewMode === 'list' ? 'is-active' : ''}
                aria-label="Xem dạng danh sách"
                onClick={() => setViewMode('list')}
              >
                <List size={18} />
              </button>
            </div>
          </header>

          <div className="articles-results__body articles-v3-results__body">
            {result.loading ? (
              <LoadingBlock />
            ) : result.error ? (
              <ErrorState
                error={result.error}
                onRetry={result.reload}
              />
            ) : result.items.length ? (
              <div
                className={`articles-content-grid is-${viewMode}`}
              >
                {result.items.map((item) => (
                  <article
                    className="articles-content-item"
                    key={item._id}
                  >
                    <ArticleCard item={item} />
                  </article>
                ))}
              </div>
            ) : (
              <div className="articles-empty-state">
                <span>
                  <Newspaper size={34} />
                </span>

                <h3>Chưa có bài viết phù hợp</h3>

                <p>
                  Thử đổi từ khóa, ngày đăng, khu vực hoặc chuyển
                  sang một chuyên mục khác.
                </p>

                <button
                  type="button"
                  onClick={
                    selectedCategory
                      ? clearActiveFilters
                      : clearEverything
                  }
                >
                  <RotateCcw size={16} />
                  Làm mới bộ lọc
                </button>
              </div>
            )}
          </div>
        </section>

        {!result.loading &&
        !result.error &&
        result.items.length ? (
          <div className="articles-pagination">
            <div className="articles-pagination__summary">
              Hiển thị <strong>{pageStart}-{pageEnd}</strong> trong
              {' '}<strong>{total.toLocaleString('vi-VN')}</strong> bài viết
              {totalPages > 1 ? (
                <> · Trang <strong>{currentPage}/{totalPages}</strong></>
              ) : null}
            </div>

            <Pagination
              meta={result.meta}
              onPageChange={handlePageChange}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
