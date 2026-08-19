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

    const enable = () => setReady(true);

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(enable, { timeout: 1500 });
    } else {
      timer = window.setTimeout(enable, 700);
    }

    return () => {
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timer !== null) {
        window.clearTimeout(timer);
      }
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
