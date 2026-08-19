import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  ArrowUp,
  Bell,
  BellRing,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Minimize2,
  MousePointerClick,
  Newspaper,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  User,
  UserPlus,
  X,
} from 'lucide-react';

import logoMark from '../../assets/logo-mark.svg';
import { useAuth } from '../../context/AuthContext';
import { notificationApi } from '../../api/interaction.api';
import Avatar from '../common/Avatar';
import { ADMIN_ROLES } from '../../utils/constants';

import './SiteHeader.css';

const navItems = [
  {
    to: '/tin-tuc',
    label: 'Tin tức',
    match: 'news',
  },
  {
    to: '/tin-tuc?category=quy-hoach',
    label: 'Quy hoạch',
    match: 'planning',
  },
  {
    to: '/cong-dong',
    label: 'Cộng đồng',
    match: 'community',
  },
  {
    to: '/nha-dat',
    label: 'Nhà đất',
    match: 'property',
  },
  {
    to: '/viec-lam',
    label: 'Việc làm',
    match: 'job',
  },
];

const HEADER_HIDE_START = 120;
const HEADER_HIDE_DOWN_DISTANCE = 44;
const HEADER_SHOW_UP_DISTANCE = 84;
const SCROLL_DELTA_TOLERANCE = 2;

const HEADER_PREFERENCES_STORAGE_KEY =
  'dthl-header-preferences-v1';

const DEFAULT_HEADER_PREFERENCES = {
  mode: 'smart',
  compactOnScroll: true,
};

const HEADER_MODE_OPTIONS = [
  {
    id: 'smart',
    label: 'Thông minh',
    description:
      'Ẩn khi kéo xuống, hiện khi kéo lên hoặc bấm nút gọi.',
    icon: Sparkles,
  },
  {
    id: 'scroll-up',
    label: 'Kéo lên để hiện',
    description:
      'Ẩn khi đọc nội dung và chỉ tự hiện sau khi kéo lên đủ xa.',
    icon: ArrowUp,
  },
  {
    id: 'always',
    label: 'Luôn hiển thị',
    description:
      'Giữ thanh đầu trang luôn ở phía trên màn hình.',
    icon: Pin,
  },
  {
    id: 'manual',
    label: 'Chỉ hiện khi kích hoạt',
    description:
      'Sau khi ẩn, thanh chỉ trở lại khi bạn bấm nút gọi.',
    icon: MousePointerClick,
  },
];

const NOTIFICATION_PREVIEW_LIMIT = 12;

function readHeaderPreferences() {
  if (typeof window === 'undefined') {
    return DEFAULT_HEADER_PREFERENCES;
  }

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(
        HEADER_PREFERENCES_STORAGE_KEY,
      ) || '{}',
    );

    const validMode = HEADER_MODE_OPTIONS.some(
      (item) => item.id === stored?.mode,
    );

    return {
      mode: validMode
        ? stored.mode
        : DEFAULT_HEADER_PREFERENCES.mode,
      compactOnScroll:
        typeof stored?.compactOnScroll === 'boolean'
          ? stored.compactOnScroll
          : DEFAULT_HEADER_PREFERENCES.compactOnScroll,
    };
  } catch {
    return DEFAULT_HEADER_PREFERENCES;
  }
}

function getRoleSlug(role) {
  if (typeof role === 'string') {
    return role;
  }

  return role?.slug || '';
}

function isNavigationActive(
  item,
  pathname,
  searchParams,
) {
  if (item.match === 'planning') {
    return (
      pathname === '/tin-tuc' &&
      searchParams.get('category') === 'quy-hoach'
    );
  }

  if (item.match === 'news') {
    return (
      pathname.startsWith('/tin-tuc') &&
      searchParams.get('category') !== 'quy-hoach'
    );
  }

  if (item.match === 'community') {
    return pathname.startsWith('/cong-dong');
  }

  if (item.match === 'property') {
    return pathname.startsWith('/nha-dat');
  }

  if (item.match === 'job') {
    return pathname.startsWith('/viec-lam');
  }

  return false;
}

function normalizeNotificationResponse(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.items)) {
    return result.items;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (Array.isArray(result?.notifications)) {
    return result.notifications;
  }

  return [];
}

function isNotificationUnread(notification) {
  if (typeof notification?.isRead === 'boolean') {
    return !notification.isRead;
  }

  if (typeof notification?.read === 'boolean') {
    return !notification.read;
  }

  return !notification?.readAt;
}

function getNotificationTitle(notification) {
  return (
    notification?.title ||
    notification?.subject ||
    'Thông báo mới'
  );
}

function getNotificationMessage(notification) {
  return (
    notification?.message ||
    notification?.body ||
    notification?.content ||
    ''
  );
}

function getNotificationDestination(notification) {
  return (
    notification?.url ||
    notification?.link ||
    notification?.actionUrl ||
    notification?.targetUrl ||
    '/tai-khoan/thong-bao'
  );
}

function formatRelativeTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const difference = date.getTime() - Date.now();
  const absoluteDifference = Math.abs(difference);

  const formatter = new Intl.RelativeTimeFormat('vi', {
    numeric: 'auto',
  });

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (absoluteDifference < minute) {
    return 'Vừa xong';
  }

  if (absoluteDifference < hour) {
    return formatter.format(
      Math.round(difference / minute),
      'minute',
    );
  }

  if (absoluteDifference < day) {
    return formatter.format(
      Math.round(difference / hour),
      'hour',
    );
  }

  if (absoluteDifference < week) {
    return formatter.format(
      Math.round(difference / day),
      'day',
    );
  }

  return date.toLocaleDateString('vi-VN');
}

function NotificationTypeIcon({ notification }) {
  const type = String(
    notification?.type || '',
  ).toLowerCase();

  if (
    type.includes('comment') ||
    type.includes('reply')
  ) {
    return <MessageCircle size={20} />;
  }

  if (
    type.includes('article') ||
    type.includes('news')
  ) {
    return <Newspaper size={20} />;
  }

  if (
    type.includes('property') ||
    type.includes('listing')
  ) {
    return <Building2 size={20} />;
  }

  if (
    type.includes('job') ||
    type.includes('recruit')
  ) {
    return <BriefcaseBusiness size={20} />;
  }

  return <BellRing size={20} />;
}

export default function SiteHeader() {
  const {
    user,
    isAuthenticated,
    logout,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [userOpen, setUserOpen] =
    useState(false);

  const [
    notificationOpen,
    setNotificationOpen,
  ] = useState(false);

  const [
    notificationTab,
    setNotificationTab,
  ] = useState('all');

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    notificationsLoading,
    setNotificationsLoading,
  ] = useState(false);

  const [
    notificationsError,
    setNotificationsError,
  ] = useState('');

  const [query, setQuery] = useState('');
  const [unread, setUnread] = useState(0);

  const [
    headerHidden,
    setHeaderHidden,
  ] = useState(false);

  const [
    headerScrolled,
    setHeaderScrolled,
  ] = useState(false);

  const [
    headerPreferences,
    setHeaderPreferences,
  ] = useState(readHeaderPreferences);

  const [
    preferencesOpen,
    setPreferencesOpen,
  ] = useState(false);

  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const preferencesRef = useRef(null);

  const headerHiddenRef = useRef(false);
  const overlayOpenRef = useRef(false);

  const headerMode =
    headerPreferences.mode;

  const compactHeader =
    headerPreferences.compactOnScroll &&
    headerScrolled &&
    !headerHidden;

  const currentSearchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const isAdmin = useMemo(() => {
    const userRoles =
      user?.roles?.map(getRoleSlug) || [];

    return userRoles.some((role) =>
      ADMIN_ROLES.includes(role),
    );
  }, [user]);

  const displayName =
    user?.displayName ||
    user?.username ||
    'Tài khoản';

  const filteredNotifications = useMemo(() => {
    if (notificationTab === 'unread') {
      return notifications.filter(
        isNotificationUnread,
      );
    }

    return notifications;
  }, [notifications, notificationTab]);

  const canMarkAllRead =
    typeof notificationApi.markAllRead === 'function' ||
    typeof notificationApi.markAllAsRead === 'function';

  const updateHeaderHidden = useCallback(
    (hidden) => {
      headerHiddenRef.current = hidden;
      setHeaderHidden(hidden);
    },
    [],
  );

  const forceHeaderVisible = useCallback(() => {
    updateHeaderHidden(false);
  }, [updateHeaderHidden]);

  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnread(0);
      return;
    }

    try {
      const result =
        await notificationApi.unreadCount();

      setUnread(Number(result?.count || 0));
    } catch {
      setUnread(0);
    }
  }, [isAuthenticated]);

  const loadNotificationPreview =
    useCallback(async () => {
      if (!isAuthenticated) {
        setNotifications([]);
        return;
      }

      const listMethod =
        notificationApi.list ||
        notificationApi.mine;

      if (typeof listMethod !== 'function') {
        setNotifications([]);
        setNotificationsError(
          'API danh sách thông báo chưa được cấu hình.',
        );
        return;
      }

      setNotificationsLoading(true);
      setNotificationsError('');

      try {
        const result = await listMethod({
          page: 1,
          limit: NOTIFICATION_PREVIEW_LIMIT,
        });

        setNotifications(
          normalizeNotificationResponse(result),
        );
      } catch (error) {
        setNotifications([]);

        setNotificationsError(
          error?.response?.data?.message ||
            error?.message ||
            'Không thể tải thông báo.',
        );
      } finally {
        setNotificationsLoading(false);
      }
    }, [isAuthenticated]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        HEADER_PREFERENCES_STORAGE_KEY,
        JSON.stringify(headerPreferences),
      );
    } catch {
      // Trình duyệt có thể chặn localStorage.
    }
  }, [headerPreferences]);

  useEffect(() => {
    if (headerMode === 'always') {
      forceHeaderVisible();
    }
  }, [
    headerMode,
    forceHeaderVisible,
  ]);

  useEffect(() => {
    loadUnreadCount();

    if (!isAuthenticated) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (
        document.visibilityState === 'visible'
      ) {
        loadUnreadCount();
      }
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isAuthenticated, loadUnreadCount]);

  useEffect(() => {
    if (notificationOpen) {
      loadNotificationPreview();
    }
  }, [
    notificationOpen,
    loadNotificationPreview,
  ]);

  useEffect(() => {
    overlayOpenRef.current =
      mobileOpen ||
      userOpen ||
      notificationOpen ||
      preferencesOpen;

    if (overlayOpenRef.current) {
      forceHeaderVisible();
    }
  }, [
    mobileOpen,
    userOpen,
    notificationOpen,
    preferencesOpen,
    forceHeaderVisible,
  ]);

  useEffect(() => {
    let lastScrollY = Math.max(
      window.scrollY,
      0,
    );

    let upwardDistance = 0;
    let downwardDistance = 0;
    let animationFrame = null;

    const modeConfig =
      headerMode === 'smart'
        ? {
            hideDistance: 50,
            showDistance: 58,
          }
        : {
            hideDistance:
              HEADER_HIDE_DOWN_DISTANCE,
            showDistance:
              HEADER_SHOW_UP_DISTANCE,
          };

    const processScroll = () => {
      const currentScrollY = Math.max(
        window.scrollY,
        0,
      );

      const delta =
        currentScrollY - lastScrollY;

      setHeaderScrolled(currentScrollY > 10);

      if (headerMode === 'always') {
        upwardDistance = 0;
        downwardDistance = 0;

        updateHeaderHidden(false);

        lastScrollY = currentScrollY;
        animationFrame = null;
        return;
      }

      if (overlayOpenRef.current) {
        upwardDistance = 0;
        downwardDistance = 0;

        updateHeaderHidden(false);

        lastScrollY = currentScrollY;
        animationFrame = null;
        return;
      }

      if (currentScrollY <= 18) {
        upwardDistance = 0;
        downwardDistance = 0;

        updateHeaderHidden(false);

        lastScrollY = currentScrollY;
        animationFrame = null;
        return;
      }

      if (
        Math.abs(delta) <=
        SCROLL_DELTA_TOLERANCE
      ) {
        lastScrollY = currentScrollY;
        animationFrame = null;
        return;
      }

      if (delta > 0) {
        downwardDistance += delta;
        upwardDistance = 0;

        if (
          currentScrollY >
            HEADER_HIDE_START &&
          downwardDistance >=
            modeConfig.hideDistance &&
          !headerHiddenRef.current
        ) {
          updateHeaderHidden(true);

          setUserOpen(false);
          setNotificationOpen(false);
          setPreferencesOpen(false);

          downwardDistance = 0;
        }
      } else {
        upwardDistance += Math.abs(delta);
        downwardDistance = 0;

        const autoRevealEnabled =
          headerMode === 'smart' ||
          headerMode === 'scroll-up';

        if (
          autoRevealEnabled &&
          headerHiddenRef.current &&
          upwardDistance >=
            modeConfig.showDistance
        ) {
          updateHeaderHidden(false);
          upwardDistance = 0;
        }
      }

      lastScrollY = currentScrollY;
      animationFrame = null;
    };

    const handleScroll = () => {
      if (animationFrame !== null) {
        return;
      }

      animationFrame =
        window.requestAnimationFrame(
          processScroll,
        );
    };

    window.addEventListener(
      'scroll',
      handleScroll,
      {
        passive: true,
      },
    );

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll,
      );

      if (animationFrame !== null) {
        window.cancelAnimationFrame(
          animationFrame,
        );
      }
    };
  }, [
    headerMode,
    updateHeaderHidden,
  ]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(
          event.target,
        )
      ) {
        setUserOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target,
        )
      ) {
        setNotificationOpen(false);
      }

      if (
        preferencesRef.current &&
        !preferencesRef.current.contains(
          event.target,
        )
      ) {
        setPreferencesOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setUserOpen(false);
        setNotificationOpen(false);
        setPreferencesOpen(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleOutsideClick,
    );

    document.addEventListener(
      'keydown',
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick,
      );

      document.removeEventListener(
        'keydown',
        handleEscape,
      );
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserOpen(false);
    setNotificationOpen(false);
    setPreferencesOpen(false);
  }, [
    location.pathname,
    location.search,
  ]);

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [mobileOpen]);

  const submitSearch = (event) => {
    event.preventDefault();

    const cleanQuery = query.trim();

    if (!cleanQuery) {
      return;
    }

    navigate(
      `/tim-kiem?q=${encodeURIComponent(
        cleanQuery,
      )}&type=all`,
    );

    setMobileOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setUserOpen(false);
      setNotificationOpen(false);
      setPreferencesOpen(false);
      setMobileOpen(false);
      navigate('/');
    }
  };

  const toggleUserMenu = () => {
    forceHeaderVisible();
    setNotificationOpen(false);
    setPreferencesOpen(false);

    setUserOpen(
      (current) => !current,
    );
  };

  const toggleNotificationPanel = () => {
    forceHeaderVisible();
    setUserOpen(false);
    setPreferencesOpen(false);

    setNotificationOpen(
      (current) => !current,
    );
  };

  const togglePreferencesPanel = () => {
    forceHeaderVisible();
    setUserOpen(false);
    setNotificationOpen(false);

    setPreferencesOpen(
      (current) => !current,
    );
  };

  const selectHeaderMode = (mode) => {
    setHeaderPreferences((current) => ({
      ...current,
      mode,
    }));

    if (mode === 'always') {
      forceHeaderVisible();
    }
  };

  const toggleCompactHeader = () => {
    setHeaderPreferences((current) => ({
      ...current,
      compactOnScroll:
        !current.compactOnScroll,
    }));
  };

  const resetHeaderPreferences = () => {
    setHeaderPreferences(
      DEFAULT_HEADER_PREFERENCES,
    );

    forceHeaderVisible();
  };

  const markNotificationRead =
    async (notification) => {
      if (
        !notification?._id ||
        !isNotificationUnread(notification)
      ) {
        return;
      }

      const markMethod =
        notificationApi.markRead ||
        notificationApi.read;

      if (typeof markMethod === 'function') {
        try {
          await markMethod(notification._id);
        } catch {
          return;
        }
      }

      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id
            ? {
                ...item,
                isRead: true,
                read: true,
                readAt:
                  item.readAt ||
                  new Date().toISOString(),
              }
            : item,
        ),
      );

      setUnread((current) =>
        Math.max(0, current - 1),
      );
    };

  const openNotification =
    async (notification) => {
      await markNotificationRead(
        notification,
      );

      const destination =
        getNotificationDestination(
          notification,
        );

      setNotificationOpen(false);

      if (
        /^https?:\/\//i.test(destination)
      ) {
        window.location.assign(destination);
        return;
      }

      navigate(destination);
    };

  const markAllNotificationsRead =
    async () => {
      const markAllMethod =
        notificationApi.markAllRead ||
        notificationApi.markAllAsRead;

      if (
        typeof markAllMethod !== 'function'
      ) {
        return;
      }

      try {
        await markAllMethod();

        setNotifications((current) =>
          current.map((item) => ({
            ...item,
            isRead: true,
            read: true,
            readAt:
              item.readAt ||
              new Date().toISOString(),
          })),
        );

        setUnread(0);
      } catch {
        // Giữ nguyên dữ liệu nếu API thất bại.
      }
    };

  const showHeaderActivator =
    headerHidden &&
    (headerMode === 'smart' ||
      headerMode === 'manual');

  const renderNavLinks = ({
    mobile = false,
  } = {}) =>
    navItems.map((item) => {
      const active = isNavigationActive(
        item,
        location.pathname,
        currentSearchParams,
      );

      return (
        <Link
          key={item.to}
          to={item.to}
          className={[
            mobile
              ? 'dthl-mobile-nav__link'
              : 'dthl-header-nav__link',
            active ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-current={
            active ? 'page' : undefined
          }
          onClick={() => {
            if (mobile) {
              setMobileOpen(false);
            }
          }}
        >
          {item.label}
        </Link>
      );
    });

  return (
    <>
      <header
        className={[
          'dthl-header',
          headerHidden ? 'is-hidden' : '',
          headerScrolled ? 'is-scrolled' : '',
          compactHeader ? 'is-compact' : '',
          `mode-${headerMode}`,
        ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="dthl-header-top">
        <div className="dthl-container dthl-header-top__inner">
          <span>
            Trung Tâm Phát Triển Đô Thị Hòa Lạc
          </span>

          <div className="dthl-header-top__links">
            <Link to="/gioi-thieu">
              Về chúng tôi
            </Link>

            <Link to="/lien-he">
              Liên hệ
            </Link>
          </div>
        </div>
      </div>

      <div className="dthl-header-main">
        <div className="dthl-container dthl-header-main__inner">
          <Link
            className="dthl-brand"
            to="/"
            aria-label="Đô Thị Hòa Lạc - Trang chủ"
          >
            <span className="dthl-brand__mark">
              <img
                src={logoMark}
                alt=""
                aria-hidden="true"
              />
            </span>

            <span className="dthl-brand__content">
              <strong>
                Đô Thị Hòa Lạc
              </strong>

              <small>
                Trung Tâm Phát Triển Đô Thị Hòa Lạc
              </small>
            </span>
          </Link>

          <form
            className="dthl-header-search"
            onSubmit={submitSearch}
            role="search"
          >
            <Search
              className="dthl-header-search__leading-icon"
              size={19}
              aria-hidden="true"
            />

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Tìm quy hoạch, nhà đất, việc làm..."
              aria-label="Từ khóa tìm kiếm"
            />

            {query ? (
              <button
                type="button"
                className="dthl-header-search__clear"
                aria-label="Xóa từ khóa"
                onClick={() => setQuery('')}
              >
                <X size={16} />
              </button>
            ) : null}

            <button
              type="submit"
              className="dthl-header-search__submit"
              aria-label="Tìm kiếm"
              disabled={!query.trim()}
            >
              <Search size={17} />
              <span>Tìm kiếm</span>
            </button>
          </form>

          <div className="dthl-header-actions">
            <Link
              className="dthl-post-button"
              to="/dang-bai"
            >
              <Plus size={18} />
              <span>Đăng bài</span>
            </Link>

            <div
              className="dthl-header-preferences"
              ref={preferencesRef}
            >
              <button
                type="button"
                className={[
                  'dthl-icon-button',
                  'dthl-header-preferences__trigger',
                  preferencesOpen
                    ? 'is-active'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label="Tùy chọn hiển thị thanh đầu trang"
                aria-expanded={preferencesOpen}
                aria-haspopup="dialog"
                onClick={togglePreferencesPanel}
              >
                <SlidersHorizontal size={20} />
              </button>

              {preferencesOpen ? (
                <div
                  className="dthl-header-preferences__panel"
                  role="dialog"
                  aria-label="Tùy chọn thanh đầu trang"
                >
                  <div className="dthl-header-preferences__heading">
                    <div>
                      <strong>
                        Thanh đầu trang
                      </strong>

                      <span>
                        Chọn cách thanh điều hướng xuất hiện khi cuộn.
                      </span>
                    </div>

                    <button
                      type="button"
                      aria-label="Đóng tùy chọn"
                      onClick={() =>
                        setPreferencesOpen(false)
                      }
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="dthl-header-preferences__modes">
                    {HEADER_MODE_OPTIONS.map(
                      ({
                        id,
                        label,
                        description,
                        icon: Icon,
                      }) => {
                        const active =
                          headerMode === id;

                        return (
                          <button
                            type="button"
                            key={id}
                            className={
                              active
                                ? 'is-active'
                                : ''
                            }
                            onClick={() =>
                              selectHeaderMode(id)
                            }
                          >
                            <span className="dthl-header-preferences__mode-icon">
                              <Icon size={19} />
                            </span>

                            <span className="dthl-header-preferences__mode-copy">
                              <strong>
                                {label}
                              </strong>

                              <small>
                                {description}
                              </small>
                            </span>

                            <span className="dthl-header-preferences__check">
                              {active ? (
                                <Check size={16} />
                              ) : null}
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>

                  <button
                    type="button"
                    className="dthl-header-preferences__compact"
                    onClick={toggleCompactHeader}
                    aria-pressed={
                      headerPreferences.compactOnScroll
                    }
                  >
                    <span>
                      <Minimize2 size={19} />
                    </span>

                    <span>
                      <strong>
                        Thu gọn khi cuộn
                      </strong>

                      <small>
                        Giảm chiều cao thanh để dành thêm không gian đọc.
                      </small>
                    </span>

                    <i
                      className={
                        headerPreferences.compactOnScroll
                          ? 'is-on'
                          : ''
                      }
                      aria-hidden="true"
                    >
                      <b />
                    </i>
                  </button>

                  <div className="dthl-header-preferences__footer">
                    <span>
                      Tùy chọn được lưu trên trình duyệt này.
                    </span>

                    <button
                      type="button"
                      onClick={resetHeaderPreferences}
                    >
                      <RotateCcw size={15} />
                      Mặc định
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {isAuthenticated ? (
              <>
                <div
                  className="dthl-notification-wrap"
                  ref={notificationRef}
                >
                  <button
                    type="button"
                    className={[
                      'dthl-icon-button',
                      'dthl-notification-button',
                      notificationOpen
                        ? 'is-active'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-label={
                      unread > 0
                        ? `${unread} thông báo chưa đọc`
                        : 'Thông báo'
                    }
                    aria-expanded={
                      notificationOpen
                    }
                    aria-haspopup="dialog"
                    onClick={
                      toggleNotificationPanel
                    }
                  >
                    <Bell size={21} />

                    {unread > 0 ? (
                      <span className="dthl-notification-badge">
                        {unread > 99
                          ? '99+'
                          : unread}
                      </span>
                    ) : null}
                  </button>

                  {notificationOpen ? (
                    <div
                      className="dthl-notification-panel"
                      role="dialog"
                      aria-label="Thông báo"
                    >
                      <div className="dthl-notification-panel__header">
                        <div>
                          <h3>Thông báo</h3>

                          <span>
                            {unread > 0
                              ? `${unread} chưa đọc`
                              : 'Bạn đã đọc hết'}
                          </span>
                        </div>

                        {canMarkAllRead &&
                        unread > 0 ? (
                          <button
                            type="button"
                            className="dthl-notification-mark-all"
                            onClick={
                              markAllNotificationsRead
                            }
                          >
                            <CheckCheck
                              size={17}
                            />
                            Đọc tất cả
                          </button>
                        ) : null}
                      </div>

                      <div className="dthl-notification-tabs">
                        <button
                          type="button"
                          className={
                            notificationTab ===
                            'all'
                              ? 'is-active'
                              : ''
                          }
                          onClick={() =>
                            setNotificationTab(
                              'all',
                            )
                          }
                        >
                          Tất cả
                        </button>

                        <button
                          type="button"
                          className={
                            notificationTab ===
                            'unread'
                              ? 'is-active'
                              : ''
                          }
                          onClick={() =>
                            setNotificationTab(
                              'unread',
                            )
                          }
                        >
                          Chưa đọc

                          {unread > 0 ? (
                            <span>
                              {unread > 99
                                ? '99+'
                                : unread}
                            </span>
                          ) : null}
                        </button>
                      </div>

                      <div className="dthl-notification-panel__section-title">
                        <strong>
                          {notificationTab ===
                          'unread'
                            ? 'Chưa đọc'
                            : 'Mới'}
                        </strong>

                        <Link
                          to="/tai-khoan/thong-bao"
                          onClick={() =>
                            setNotificationOpen(
                              false,
                            )
                          }
                        >
                          Xem tất cả
                        </Link>
                      </div>

                      <div className="dthl-notification-list">
                        {notificationsLoading ? (
                          <>
                            {[1, 2, 3, 4].map(
                              (item) => (
                                <div
                                  key={item}
                                  className="dthl-notification-skeleton"
                                >
                                  <span />

                                  <div>
                                    <i />
                                    <i />
                                    <i />
                                  </div>
                                </div>
                              ),
                            )}
                          </>
                        ) : notificationsError ? (
                          <div className="dthl-notification-empty">
                            <BellRing
                              size={30}
                            />

                            <strong>
                              Không thể tải thông báo
                            </strong>

                            <span>
                              {notificationsError}
                            </span>

                            <button
                              type="button"
                              onClick={
                                loadNotificationPreview
                              }
                            >
                              Thử lại
                            </button>
                          </div>
                        ) : filteredNotifications.length ? (
                          filteredNotifications.map(
                            (notification) => {
                              const unreadItem =
                                isNotificationUnread(
                                  notification,
                                );

                              return (
                                <button
                                  type="button"
                                  key={
                                    notification._id ||
                                    notification.id
                                  }
                                  className={[
                                    'dthl-notification-item',
                                    unreadItem
                                      ? 'is-unread'
                                      : '',
                                  ]
                                    .filter(Boolean)
                                    .join(' ')}
                                  onClick={() =>
                                    openNotification(
                                      notification,
                                    )
                                  }
                                >
                                  <span className="dthl-notification-item__icon">
                                    <NotificationTypeIcon
                                      notification={
                                        notification
                                      }
                                    />
                                  </span>

                                  <span className="dthl-notification-item__content">
                                    <strong>
                                      {getNotificationTitle(
                                        notification,
                                      )}
                                    </strong>

                                    <span>
                                      {getNotificationMessage(
                                        notification,
                                      )}
                                    </span>

                                    <small>
                                      {formatRelativeTime(
                                        notification.createdAt ||
                                          notification.updatedAt,
                                      )}
                                    </small>
                                  </span>

                                  {unreadItem ? (
                                    <span
                                      className="dthl-notification-item__dot"
                                      aria-label="Chưa đọc"
                                    />
                                  ) : null}
                                </button>
                              );
                            },
                          )
                        ) : (
                          <div className="dthl-notification-empty">
                            <BellRing
                              size={30}
                            />

                            <strong>
                              {notificationTab ===
                              'unread'
                                ? 'Không còn thông báo chưa đọc'
                                : 'Chưa có thông báo'}
                            </strong>

                            <span>
                              Các cập nhật mới sẽ xuất
                              hiện tại đây.
                            </span>
                          </div>
                        )}
                      </div>

                      <Link
                        className="dthl-notification-panel__footer"
                        to="/tai-khoan/thong-bao"
                        onClick={() =>
                          setNotificationOpen(
                            false,
                          )
                        }
                      >
                        Xem tất cả thông báo
                      </Link>
                    </div>
                  ) : null}
                </div>

                <div
                  className="dthl-user-menu"
                  ref={userMenuRef}
                >
                  <button
                    type="button"
                    className="dthl-user-menu__trigger"
                    aria-expanded={userOpen}
                    aria-haspopup="menu"
                    onClick={toggleUserMenu}
                  >
                    <Avatar
                      name={displayName}
                      src={
                        user?.profile
                          ?.avatarMediaId
                      }
                      size="sm"
                    />

                    <span className="dthl-user-menu__name">
                      {displayName}
                    </span>

                    <ChevronDown
                      size={17}
                      className={
                        userOpen
                          ? 'is-rotated'
                          : ''
                      }
                    />
                  </button>

                  {userOpen ? (
                    <div
                      className="dthl-user-menu__panel"
                      role="menu"
                    >
                      <div className="dthl-user-menu__summary">
                        <Avatar
                          name={displayName}
                          src={
                            user?.profile
                              ?.avatarMediaId
                          }
                          size="md"
                        />

                        <div>
                          <strong>
                            {displayName}
                          </strong>

                          <small>
                            {user?.email ||
                              user?.username}
                          </small>
                        </div>
                      </div>

                      <div className="dthl-user-menu__divider" />

                      <Link
                        to="/tai-khoan"
                        role="menuitem"
                      >
                        <User size={18} />
                        Tài khoản của tôi
                      </Link>

                      <Link
                        to="/tai-khoan/ho-so"
                        role="menuitem"
                      >
                        <Settings size={18} />
                        Cài đặt hồ sơ
                      </Link>

                      {isAdmin ? (
                        <Link
                          to="/quan-tri"
                          role="menuitem"
                          className="dthl-user-menu__admin"
                        >
                          <ShieldCheck
                            size={18}
                          />
                          Quản trị hệ thống
                        </Link>
                      ) : null}

                      <div className="dthl-user-menu__divider" />

                      <button
                        type="button"
                        role="menuitem"
                        className="dthl-user-menu__logout"
                        onClick={handleLogout}
                      >
                        <LogOut size={18} />
                        Đăng xuất
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="dthl-auth-actions">
                <Link
                  className="dthl-login-link"
                  to="/dang-nhap"
                >
                  <LogIn size={17} />
                  Đăng nhập
                </Link>

                <Link
                  className="dthl-register-button"
                  to="/dang-ky"
                >
                  <UserPlus size={17} />
                  Đăng ký
                </Link>
              </div>
            )}

            <button
              type="button"
              className="dthl-mobile-menu-button"
              aria-label={
                mobileOpen
                  ? 'Đóng menu'
                  : 'Mở menu'
              }
              aria-expanded={mobileOpen}
              onClick={() => {
                forceHeaderVisible();
                setNotificationOpen(false);
                setUserOpen(false);

                setMobileOpen(
                  (current) => !current,
                );
              }}
            >
              {mobileOpen ? (
                <X size={24} />
              ) : (
                <Menu size={24} />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="dthl-header-nav">
        <div className="dthl-container dthl-header-nav__inner">
          <nav aria-label="Điều hướng chính">
            {renderNavLinks()}
          </nav>

          <div className="dthl-header-nav__quick-links">
            <Link to="/gioi-thieu">
              Khám phá Hòa Lạc
            </Link>

            <Link to="/lien-he">
              Gửi thông tin
            </Link>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="dthl-mobile-nav">
          <button
            type="button"
            className="dthl-mobile-nav__backdrop"
            aria-label="Đóng menu"
            onClick={() =>
              setMobileOpen(false)
            }
          />

          <div className="dthl-mobile-nav__panel">
            <div className="dthl-mobile-nav__header">
              <strong>Danh mục</strong>

              <button
                type="button"
                aria-label="Đóng menu"
                onClick={() =>
                  setMobileOpen(false)
                }
              >
                <X size={22} />
              </button>
            </div>

            <form
              className="dthl-mobile-search"
              onSubmit={submitSearch}
            >
              <Search
                className="dthl-mobile-search__icon"
                size={19}
                aria-hidden="true"
              />

              <input
                type="search"
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Bạn muốn tìm gì?"
                aria-label="Từ khóa tìm kiếm"
              />

              <button
                type="submit"
                aria-label="Tìm kiếm"
                disabled={!query.trim()}
              >
                <Search size={17} />
                <span>Tìm</span>
              </button>
            </form>

            <nav
              className="dthl-mobile-nav__links"
              aria-label="Điều hướng trên điện thoại"
            >
              {renderNavLinks({
                mobile: true,
              })}
            </nav>

            <div className="dthl-mobile-header-settings">
              <div className="dthl-mobile-header-settings__heading">
                <SlidersHorizontal size={18} />

                <div>
                  <strong>
                    Hiển thị thanh đầu trang
                  </strong>

                  <span>
                    Tùy chỉnh cách thanh xuất hiện khi cuộn.
                  </span>
                </div>
              </div>

              <div className="dthl-mobile-header-settings__modes">
                {HEADER_MODE_OPTIONS.map(
                  ({
                    id,
                    label,
                    icon: Icon,
                  }) => (
                    <button
                      type="button"
                      key={id}
                      className={
                        headerMode === id
                          ? 'is-active'
                          : ''
                      }
                      onClick={() =>
                        selectHeaderMode(id)
                      }
                    >
                      <Icon size={17} />
                      <span>{label}</span>

                      {headerMode === id ? (
                        <Check size={15} />
                      ) : null}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                className="dthl-mobile-header-settings__compact"
                onClick={toggleCompactHeader}
                aria-pressed={
                  headerPreferences.compactOnScroll
                }
              >
                <Minimize2 size={17} />
                <span>
                  Thu gọn khi cuộn
                </span>

                <i
                  className={
                    headerPreferences.compactOnScroll
                      ? 'is-on'
                      : ''
                  }
                >
                  <b />
                </i>
              </button>
            </div>

            <div className="dthl-mobile-nav__divider" />

            <Link
              className="dthl-mobile-post-button"
              to="/dang-bai"
              onClick={() =>
                setMobileOpen(false)
              }
            >
              <Plus size={19} />
              Đăng nội dung mới
            </Link>

            {!isAuthenticated ? (
              <div className="dthl-mobile-auth">
                <Link
                  to="/dang-nhap"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                >
                  Đăng nhập
                </Link>

                <Link
                  to="/dang-ky"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                >
                  Đăng ký tài khoản
                </Link>
              </div>
            ) : (
              <div className="dthl-mobile-account">
                <Link
                  to="/tai-khoan/thong-bao"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                >
                  <Bell size={18} />
                  Thông báo

                  {unread > 0 ? (
                    <span>
                      {unread > 99
                        ? '99+'
                        : unread}
                    </span>
                  ) : null}
                </Link>

                <Link
                  to="/tai-khoan"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                >
                  <User size={18} />
                  Tài khoản của tôi
                </Link>

                {isAdmin ? (
                  <Link
                    to="/quan-tri"
                    onClick={() =>
                      setMobileOpen(false)
                    }
                  >
                    <ShieldCheck
                      size={18}
                    />
                    Quản trị hệ thống
                  </Link>
                ) : null}

                <button
                  type="button"
                  onClick={handleLogout}
                >
                  <LogOut size={18} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
      </header>

      {showHeaderActivator ? (
        <button
          type="button"
          className={[
            'dthl-header-activator',
            headerMode === 'manual'
              ? 'is-manual'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label="Hiện thanh đầu trang"
          onClick={forceHeaderVisible}
        >
          <ChevronDown size={18} />

          <span>
            {headerMode === 'manual'
              ? 'Hiện thanh đầu trang'
              : 'Mở thanh điều hướng'}
          </span>
        </button>
      ) : null}
    </>
  );
}
