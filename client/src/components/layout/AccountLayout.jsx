import { lazy, Suspense } from 'react';
import { PageLoading } from '../common/Loading';

const AccountLayoutImpl = lazy(() => import('./AccountLayoutImpl'));

export default function AccountLayout() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AccountLayoutImpl />
    </Suspense>
  );
}
