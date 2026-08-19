import {
  lazy,
  Suspense,
  useEffect,
  useState,
} from 'react';

import { useAuth } from '../../context/AuthContext';

const CommunityQuickComposer = lazy(() => import('./CommunityQuickComposer'));

export default function DeferredCommunityQuickComposer() {
  const { isAuthenticated, loading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading || !isAuthenticated) {
      setReady(false);
      return undefined;
    }

    let timer = null;
    let idleId = null;
    let enabled = false;

    const enable = () => {
      if (enabled) return;
      enabled = true;
      setReady(true);
    };

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(enable, { timeout: 4000 });
    } else {
      timer = window.setTimeout(enable, 2500);
    }

    const enableOnIntent = () => enable();

    window.addEventListener('pointerdown', enableOnIntent, {
      once: true,
      passive: true,
    });
    window.addEventListener('keydown', enableOnIntent, { once: true });

    return () => {
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      window.removeEventListener('pointerdown', enableOnIntent);
      window.removeEventListener('keydown', enableOnIntent);
    };
  }, [isAuthenticated, loading]);

  if (loading || !isAuthenticated || !ready) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <CommunityQuickComposer />
    </Suspense>
  );
}
