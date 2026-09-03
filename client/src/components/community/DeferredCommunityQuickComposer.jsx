import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import CommunityQuickComposerDesktop from './CommunityQuickComposerDesktop';
import CommunityQuickComposerMobile from './CommunityQuickComposerMobile';
import { useAuth } from '../../context/AuthContext';
import { isPersistedContentId } from '../../utils/content';

const COMMUNITY_CREATE_ROUTE = '/cong-dong/create';
const MOBILE_COMPOSER_QUERY = '(max-width: 640px)';

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

export default function DeferredCommunityQuickComposer() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMobileComposer();

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

      const destination = location.pathname === '/cong-dong'
        ? `${location.pathname}${location.search}`
        : '/cong-dong';

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

    const handleClosed = () => {
      const nextState = { ...(location.state || {}) };
      delete nextState.communityComposerRoute;
      delete nextState.communityComposerEditId;

      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: Object.keys(nextState).length ? nextState : null,
      });
    };

    window.addEventListener('dthl:community-composer-closed', handleClosed);

    return () => {
      window.removeEventListener('dthl:community-composer-closed', handleClosed);
    };
  }, [activeComposerState, location.pathname, location.search, location.state, navigate]);

  if (loading || !isAuthenticated) {
    return null;
  }

  return isMobile
    ? <CommunityQuickComposerMobile />
    : <CommunityQuickComposerDesktop />;
}
