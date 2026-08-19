import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  Link,
  useLocation,
} from 'react-router-dom';

import { useTaxonomy } from '../../context/TaxonomyContext';

import './HeaderNavigationUpgrade.css';

const navigationItems = [
  {
    key: 'home',
    to: '/',
    label: 'Trang chủ',
    match: 'home',
  },
  {
    key: 'news',
    to: '/tin-tuc',
    label: 'Tin tức',
    match: 'news',
    submenu: {
      scope: 'article',
      mode: 'scope',
    },
  },
  {
    key: 'planning',
    to: '/tin-tuc?category=quy-hoach',
    label: 'Quy hoạch',
    category: 'quy-hoach',
    submenu: {
      scope: 'article',
      mode: 'children',
      parentSlug: 'quy-hoach',
    },
  },
  {
    key: 'infrastructure',
    to: '/tin-tuc?category=ha-tang-giao-thong',
    label: 'Hạ tầng',
    category: 'ha-tang-giao-thong',
    submenu: {
      scope: 'article',
      mode: 'children',
      parentSlug: 'ha-tang-giao-thong',
    },
  },
  {
    key: 'investment-projects',
    to: '/tin-tuc?category=du-an-dtxd',
    label: 'Dự án ĐTXD',
    category: 'du-an-dtxd',
    submenu: {
      scope: 'article',
      mode: 'children',
      parentSlug: 'du-an-dtxd',
    },
  },
  {
    key: 'property',
    to: '/bat-dong-san',
    label: 'Bất động sản',
    match: 'property',
    alignRight: true,
    submenu: {
      scope: 'property',
      mode: 'scope',
    },
  },
  {
    key: 'community',
    to: '/cong-dong',
    label: 'Cộng đồng',
    match: 'community',
    alignRight: true,
    submenu: {
      scope: 'community',
      mode: 'scope',
    },
  },
  {
    key: 'job',
    to: '/viec-lam',
    label: 'Việc làm',
    match: 'job',
  },
];

const HEADER_CATEGORY_SLUGS = new Set(
  navigationItems
    .map((item) => item.category)
    .filter(Boolean),
);

const SCOPE_PATHS = {
  article: '/tin-tuc',
  property: '/bat-dong-san',
  community: '/cong-dong',
};

function idString(value) {
  return String(value?._id || value || '');
}

function categoryValue(category, scope) {
  if (scope === 'article') {
    return String(category?.slug || category?._id || '');
  }

  return idString(category);
}

function categoryTarget(category, scope) {
  const basePath = SCOPE_PATHS[scope] || '/tin-tuc';
  const value = categoryValue(category, scope);

  if (!value) return basePath;
  return `${basePath}?category=${encodeURIComponent(value)}`;
}

function buildScopeTree(categories, scope) {
  const scopedItems = categories.filter(
    (item) =>
      item?.isActive !== false &&
      (item?.contentScope === scope || item?.contentScope === 'all'),
  );

  const byId = new Map(
    scopedItems.map((item) => [idString(item), item]),
  );

  const childrenByParent = new Map();

  scopedItems.forEach((item) => {
    const parentId = idString(item?.parentId);
    if (!parentId || !byId.has(parentId)) return;

    const children = childrenByParent.get(parentId) || [];
    children.push(item);
    childrenByParent.set(parentId, children);
  });

  const toNode = (item, lineage = new Set()) => {
    const itemId = idString(item);

    if (!itemId || lineage.has(itemId)) {
      return {
        category: item,
        children: [],
      };
    }

    const nextLineage = new Set(lineage);
    nextLineage.add(itemId);

    return {
      category: item,
      children: (childrenByParent.get(itemId) || []).map((child) =>
        toNode(child, nextLineage),
      ),
    };
  };

  const roots = scopedItems.filter((item) => {
    const parentId = idString(item?.parentId);
    return !parentId || !byId.has(parentId);
  });

  return {
    roots: roots.map((item) => toNode(item)),
    bySlug: new Map(
      scopedItems
        .filter((item) => item?.slug)
        .map((item) => [String(item.slug), toNode(item)]),
    ),
  };
}

function submenuNodesFor(item, trees) {
  const submenu = item?.submenu;
  if (!submenu) return [];

  const tree = trees[submenu.scope];
  if (!tree) return [];

  if (submenu.mode === 'children') {
    return tree.bySlug.get(submenu.parentSlug)?.children || [];
  }

  return tree.roots || [];
}

function countNodes(nodes = []) {
  return nodes.reduce(
    (total, node) => total + 1 + countNodes(node.children),
    0,
  );
}

function resolveSelectedCategory(selectedCategory, categories, scope = 'article') {
  if (!selectedCategory) return null;

  return categories.find(
    (item) =>
      (item?.contentScope === scope || item?.contentScope === 'all') &&
      (
        idString(item) === String(selectedCategory) ||
        String(item?.slug || '') === String(selectedCategory)
      ),
  ) || null;
}

function isItemActive(item, pathname, searchParams, categories) {
  const selectedCategory = searchParams.get('category');

  if (item.match === 'home') {
    return pathname === '/';
  }

  if (item.category) {
    const resolved = resolveSelectedCategory(
      selectedCategory,
      categories,
      'article',
    );

    return (
      pathname === '/tin-tuc' &&
      (
        selectedCategory === item.category ||
        resolved?.slug === item.category
      )
    );
  }

  if (item.match === 'news') {
    const resolved = resolveSelectedCategory(
      selectedCategory,
      categories,
      'article',
    );

    const selectedSlug = resolved?.slug || selectedCategory;

    return (
      pathname.startsWith('/tin-tuc') &&
      !HEADER_CATEGORY_SLUGS.has(selectedSlug)
    );
  }

  if (item.match === 'community') {
    return pathname.startsWith('/cong-dong');
  }

  if (item.match === 'property') {
    return (
      pathname.startsWith('/bat-dong-san') ||
      pathname.startsWith('/nha-dat')
    );
  }

  if (item.match === 'job') {
    return pathname.startsWith('/viec-lam');
  }

  return false;
}

function isCategoryActive(category, scope, pathname, searchParams) {
  const basePath = SCOPE_PATHS[scope];

  if (!basePath || !pathname.startsWith(basePath)) {
    return false;
  }

  const selectedCategory = searchParams.get('category');
  if (!selectedCategory) return false;

  return (
    String(selectedCategory) === idString(category) ||
    String(selectedCategory) === String(category?.slug || '')
  );
}

function DesktopCategoryChildren({
  nodes,
  scope,
  pathname,
  searchParams,
  depth = 1,
}) {
  if (!nodes.length) return null;

  return (
    <div className="dthl-header-submenu__children">
      {nodes.map((node) => {
        const category = node.category;
        const active = isCategoryActive(
          category,
          scope,
          pathname,
          searchParams,
        );

        return (
          <div
            className="dthl-header-submenu__child-wrap"
            key={idString(category) || category?.slug}
          >
            <Link
              to={categoryTarget(category, scope)}
              className={[
                'dthl-header-submenu__child',
                `dthl-header-submenu__child--depth-${Math.min(depth, 3)}`,
                active ? 'is-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <ChevronRight size={13} />
              <span>{category?.name || 'Chuyên mục'}</span>
            </Link>

            <DesktopCategoryChildren
              nodes={node.children || []}
              scope={scope}
              pathname={pathname}
              searchParams={searchParams}
              depth={depth + 1}
            />
          </div>
        );
      })}
    </div>
  );
}

function DesktopSubmenu({
  item,
  nodes,
  pathname,
  searchParams,
}) {
  if (!nodes.length) return null;

  const scope = item.submenu.scope;
  const totalNodes = countNodes(nodes);
  const wide = totalNodes >= 8;

  return (
    <div
      className={[
        'dthl-header-submenu',
        wide ? 'dthl-header-submenu--wide' : '',
        item.alignRight ? 'dthl-header-submenu--align-right' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="dthl-header-submenu__head">
        <span>Chuyên mục</span>
        <strong>{item.label}</strong>
      </div>

      <div className="dthl-header-submenu__grid">
        {nodes.map((node) => {
          const category = node.category;
          const active = isCategoryActive(
            category,
            scope,
            pathname,
            searchParams,
          );

          return (
            <div
              className="dthl-header-submenu__group"
              key={idString(category) || category?.slug}
            >
              <Link
                to={categoryTarget(category, scope)}
                className={[
                  'dthl-header-submenu__root',
                  active ? 'is-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span>{category?.name || 'Chuyên mục'}</span>
                <ChevronRight size={14} />
              </Link>

              <DesktopCategoryChildren
                nodes={node.children || []}
                scope={scope}
                pathname={pathname}
                searchParams={searchParams}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MobileCategoryNodes({
  nodes,
  scope,
  pathname,
  searchParams,
  depth = 0,
}) {
  return nodes.map((node) => {
    const category = node.category;
    const active = isCategoryActive(
      category,
      scope,
      pathname,
      searchParams,
    );

    return (
      <div
        className="dthl-mobile-nav-upgrade__category-wrap"
        key={idString(category) || category?.slug}
      >
        <Link
          to={categoryTarget(category, scope)}
          className={[
            'dthl-mobile-nav-upgrade__category',
            `dthl-mobile-nav-upgrade__category--depth-${Math.min(depth, 3)}`,
            active ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span>{category?.name || 'Chuyên mục'}</span>
          <ChevronRight size={14} />
        </Link>

        {node.children?.length ? (
          <MobileCategoryNodes
            nodes={node.children}
            scope={scope}
            pathname={pathname}
            searchParams={searchParams}
            depth={depth + 1}
          />
        ) : null}
      </div>
    );
  });
}

function usePortalTarget(selector) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    let frame = null;

    const resolveTarget = () => {
      const nextTarget = document.querySelector(selector);

      if (nextTarget) {
        setTarget(nextTarget);
        return true;
      }

      return false;
    };

    if (resolveTarget()) {
      return undefined;
    }

    const observer = new MutationObserver(() => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        resolveTarget();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();

      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [selector]);

  return target;
}

function NavigationLinks({ mobile = false }) {
  const location = useLocation();
  const { categories = [] } = useTaxonomy();
  const [openMobileKey, setOpenMobileKey] = useState('');

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const trees = useMemo(
    () => ({
      article: buildScopeTree(categories, 'article'),
      property: buildScopeTree(categories, 'property'),
      community: buildScopeTree(categories, 'community'),
    }),
    [categories],
  );

  useEffect(() => {
    setOpenMobileKey('');
  }, [location.pathname, location.search]);

  return navigationItems.map((item) => {
    const active = isItemActive(
      item,
      location.pathname,
      searchParams,
      categories,
    );

    const submenuNodes = submenuNodesFor(item, trees);
    const hasSubmenu = submenuNodes.length > 0;

    if (mobile) {
      const expanded = hasSubmenu && openMobileKey === item.key;

      return (
        <div
          className={[
            'dthl-mobile-nav-upgrade__item',
            active ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          key={item.key}
        >
          <div className="dthl-mobile-nav-upgrade__row">
            <Link
              to={item.to}
              className={[
                'dthl-mobile-nav-upgrade__link',
                active ? 'is-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {item.label}
            </Link>

            {hasSubmenu ? (
              <button
                type="button"
                className="dthl-mobile-nav-upgrade__toggle"
                aria-label={`${expanded ? 'Thu gọn' : 'Mở'} chuyên mục ${item.label}`}
                aria-expanded={expanded}
                onClick={() =>
                  setOpenMobileKey((current) =>
                    current === item.key ? '' : item.key,
                  )
                }
              >
                <ChevronDown
                  size={18}
                  className={expanded ? 'is-open' : ''}
                />
              </button>
            ) : null}
          </div>

          {expanded ? (
            <div className="dthl-mobile-nav-upgrade__submenu">
              <MobileCategoryNodes
                nodes={submenuNodes}
                scope={item.submenu.scope}
                pathname={location.pathname}
                searchParams={searchParams}
              />
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div
        className={[
          'dthl-header-nav-upgrade__item',
          active ? 'is-active' : '',
          hasSubmenu ? 'has-submenu' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        key={item.key}
      >
        <Link
          to={item.to}
          className={[
            'dthl-header-nav-upgrade__link',
            active ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span>{item.label}</span>
          {hasSubmenu ? (
            <ChevronDown
              className="dthl-header-nav-upgrade__chevron"
              size={14}
            />
          ) : null}
        </Link>

        {hasSubmenu ? (
          <DesktopSubmenu
            item={item}
            nodes={submenuNodes}
            pathname={location.pathname}
            searchParams={searchParams}
          />
        ) : null}
      </div>
    );
  });
}

export default function HeaderNavigationUpgrade() {
  const desktopTarget = usePortalTarget(
    '.dthl-header-nav__inner',
  );

  const mobileTarget = usePortalTarget(
    '.dthl-mobile-nav__links',
  );

  return (
    <>
      {desktopTarget
        ? createPortal(
            <nav
              className="dthl-header-nav-upgrade"
              aria-label="Điều hướng nội dung chính"
            >
              <NavigationLinks />
            </nav>,
            desktopTarget,
          )
        : null}

      {mobileTarget
        ? createPortal(
            <div className="dthl-mobile-nav-upgrade">
              <NavigationLinks mobile />
            </div>,
            mobileTarget,
          )
        : null}
    </>
  );
}
