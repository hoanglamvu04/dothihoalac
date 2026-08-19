import { lazy, Suspense } from 'react';
import { PageLoading } from '../common/Loading';

const AdminLayoutImpl = lazy(() => import('./AdminLayoutImpl'));

export default function AdminLayout() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminLayoutImpl />
    </Suspense>
  );
}
