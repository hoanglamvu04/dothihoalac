import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from 'react';

const SiteFooter = lazy(() => import('./SiteFooter'));

export default function DeferredSiteFooter() {
  const anchorRef = useRef(null);
  const [ready, setReady] = useState(
    () =>
      typeof window === 'undefined' ||
      !('IntersectionObserver' in window),
  );

  useEffect(() => {
    if (ready) return undefined;

    const anchor = anchorRef.current;
    if (!anchor) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReady(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '1200px 0px',
        threshold: 0,
      },
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, [ready]);

  if (!ready) {
    return (
      <span
        ref={anchorRef}
        aria-hidden="true"
        style={{ display: 'block', width: '100%', height: 1 }}
      />
    );
  }

  return (
    <Suspense fallback={null}>
      <SiteFooter />
    </Suspense>
  );
}
