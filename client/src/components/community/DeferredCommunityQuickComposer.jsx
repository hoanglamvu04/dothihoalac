import CommunityQuickComposer from './CommunityQuickComposer';
import { useAuth } from '../../context/AuthContext';

export default function DeferredCommunityQuickComposer() {
  const { isAuthenticated, loading } = useAuth();

  if (loading || !isAuthenticated) {
    return null;
  }

  return <CommunityQuickComposer />;
}
