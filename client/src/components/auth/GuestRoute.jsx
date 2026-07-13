import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoading } from '../common/Loading';

export default function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoading />;
  return isAuthenticated ? <Navigate to="/tai-khoan" replace /> : children;
}
