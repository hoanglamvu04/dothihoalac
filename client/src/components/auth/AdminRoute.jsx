import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_ROLES } from '../../utils/constants';
import { PageLoading } from '../common/Loading';

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading />;
  const allowed = user?.roles?.some((role) => ADMIN_ROLES.includes(role));
  return allowed ? children : <Navigate to="/" replace />;
}
