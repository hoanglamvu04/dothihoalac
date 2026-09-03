import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import CommunityQuickComposerDesktop from './CommunityQuickComposerDesktop';
import CommunityQuickComposerMobile from './CommunityQuickComposerMobile';
import { useAuth } from '../../context/AuthContext';
import { isPersistedContentId } from '../../utils/content';

const COMMUNITY_CREATE_ROUTE = '/cong-dong/create';
const MOBILE_COMPOSER_QUERY = '(max-width: 640px)';
const UNSAVED_MESSAGE =
  'Bạn có thay đổi chưa được lưu. Bạn vẫn muốn thoát khỏi trang?';

function readComposerTarget(anchor) {
  if (!anchor?.getAttribute) return null;

  const rawHref = anchor.getAttribute('href');
  if (!rawHref) return null;

  try {
    const url = new URL(rawHref, window.location.origin);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const bases = [
      '/dang-bai/cong-dong',
      '/studio/cong-dong',
      COMMUNITY_CREATE_ROUTE,
    ];

    for (const base of bases) {
      if (pathname === base) {
        const queryId = url.searchParams.get('edit') || '';
        return {
          editId: isPersistedContentId(queryId) ? queryId : '',
        };
      }

      if (pathname.startsWith(`${base}/`)) {
        const rawId = decodeURIComponent(pathname.slice(base.length + 1));
        return {
          editId: isPersistedContentId(rawId) ? rawId : '',
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

function composerState(editId = '') {
  return {
    communityComposerRoute: COMMUNITY_CREATE_ROUTE,
    communityComposerEditId: isPersistedContentId(editId) ? editId : '',
  };
}

function useMobileComposer() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(MOBILE_COMPOSER_QUERY).matches
      : false,
  );

  useEffect(() => {
    const media = window.matchMedia(MOBILE_COMPOSER_QUERY);
    const sync = () => setIsMobile(media.matches);

    sync();
    media.addEventListener?.('change', sync);

    return () => {
      media.removeEventListener?.('change', sync);
    };
  }, []);

  return isMobile;
}

function isComposerTarget(target) {
  return Boolean(
    target?.closest?.(
      '.community-mobile-composer, .community-desktop-composer',
    ),
  );
}

export default function DeferredCommunityQuickComposer() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMobileComposer();
  const dirtyRef = useRef(false);
  const restoringHistoryRef = useRef(false);

  const activeComposerState =
    location.state?.communityComposerRoute === COMMUNITY_CREATE_ROUTE
      ? location.state
      : null;

  useEffect(() => {
    if (loading || !isAuthenticated) return undefined;

    const handleCreateLink = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest('a[href]');
      const composerTarget = readComposerTarget(anchor);

      if (!composerTarget) return;

      event.preventDefault();
      event.stopPropagation();

      const destination =
        location.pathname === '/cong-dong'
          ? `${location.pathname}${location.search}`
          : '/cong-dong';

      dirtyRef.current = false;

      navigate(destination, {
        replace: true,
        state: composerState(composerTarget.editId),
      });
    };

    window.addEventListener('click', handleCreateLink, true);

    return () => {
      window.removeEventListener('click', handleCreateLink, true);
    };
  }, [isAuthenticated, loading, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (loading || !isAuthenticated || !activeComposerState) {
      return undefined;
    }

    dirtyRef.current = false;

    const timer = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('dthl:open-community-composer', {
          detail: {
            editId: activeComposerState.communityComposerEditId || '',
          },
        }),
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeComposerState, isAuthenticated, isMobile, loading]);

  useEffect(() => {
    if (!activeComposerState) return undefined;

    const markDirtyFromInput = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (isComposerTarget(target)) dirtyRef.current = true;
    };

    const markDirtyFromComposerClick = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!isComposerTarget(target)) return;

      if (
        target.closest(
          '.community-mobile-composer__back, .community-desktop-composer__header > button:first-child, .community-mobile-composer__preview, .community-desktop-composer__footer-preview',
        )
      ) {
        return;
      }

      if (target.closest('button, [role="button"]')) {
        dirtyRef.current = true;
      }
    };

    const handleBeforeUnload = (event) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };

    const handlePopState = () => {
      if (restoringHistoryRef.current) {
        restoringHistoryRef.current = false;
        return;
      }

      if (!dirtyRef.current) return;

      const leave = window.confirm(UNSAVED_MESSAGE);
      if (leave) {
        dirtyRef.current = false;
        return;
      }

      restoringHistoryRef.current = true;
      window.history.forward();
    };

    document.addEventListener('input', markDirtyFromInput, true);
    document.addEventListener('change', markDirtyFromInput, true);
    document.addEventListener('click', markDirtyFromComposerClick, true);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('input', markDirtyFromInput, true);
      document.removeEventListener('change', markDirtyFromInput, true);
      document.removeEventListener('click', markDirtyFromComposerClick, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeComposerState]);

  useEffect(() => {
    if (!activeComposerState) return undefined;

    const handleClosed = () => {
      dirtyRef.current = false;

      const nextState = { ...(location.state || {}) };
      delete nextState.communityComposerRoute;
      delete nextState.communityComposerEditId;

      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: Object.keys(nextState).length ? nextState : null,
      });
    };

    const handleSaved = () => {
      dirtyRef.current = false;
    };

    window.addEventListener('dthl:community-composer-closed', handleClosed);
    window.addEventListener('dthl:community-composer-saved', handleSaved);

    return () => {
      window.removeEventListener('dthl:community-composer-closed', handleClosed);
      window.removeEventListener('dthl:community-composer-saved', handleSaved);
    };
  }, [
    activeComposerState,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ]);

  if (loading || !isAuthenticated) {
    return null;
  }

  return isMobile
    ? <CommunityQuickComposerMobile />
    : <CommunityQuickComposerDesktop />;
}
