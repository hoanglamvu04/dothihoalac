import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoading } from '../common/Loading';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoading />;
  if (!isAuthenticated) return <Navigate to="/dang-nhap" replace state={{ from: location }} />;
  return children;
}
