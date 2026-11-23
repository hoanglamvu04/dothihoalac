import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellPlus, BellOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/http';
import { savedSearchApi } from '../../api/savedSearch.api';
import { findSavedSearch } from '../../utils/savedSearchMatch.mjs';
import './SaveSearchButton.css';

export default function SaveSearchButton({ query = '', contentType = 'all', area = '' }) {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const normalizedQuery = String(query || '').trim();
  const normalizedArea = String(area || '').trim();
  const canSave = Boolean(normalizedQuery || normalizedArea);

  const userId = String(user?._id || user?.id || '');
  useEffect(() => {
    setSaved(null);
    if (!user || !canSave) return undefined;

    let active = true;
    savedSearchApi.list().then((items) => {
      if (active) {
        setSaved(findSavedSearch(items, {
          query: normalizedQuery,
          contentType,
          area: normalizedArea,
        }));
      }
    }).catch(() => {
      if (active) setSaved(null);
    });
    return () => { active = false; };
  }, [userId, Boolean(user), canSave, normalizedQuery, contentType, normalizedArea]);

  if (!canSave || authLoading) return null;

  if (!user) {
    return <Link className="save-search-button" to="/dang-nhap"><BellPlus size={16} /> Đăng nhập để theo dõi</Link>;
  }

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (saved?.isActive) {
        await savedSearchApi.remove(saved._id);
        setSaved(null);
        toast.success('Đã bỏ theo dõi tìm kiếm.');
      } else {
        const item = await savedSearchApi.create({
          query: normalizedQuery,
          contentType,
          area: normalizedArea,
        });
        setSaved(item || null);
        toast.success('Đã theo dõi. Tin mới phù hợp sẽ có trong Thông báo.');
      }
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={'save-search-button' + (saved?.isActive ? ' is-saved' : '')}
      onClick={handleClick}
      disabled={busy}
      aria-pressed={Boolean(saved?.isActive)}
      title="Tin mới sẽ được thông báo trong tài khoản. Bạn có thể tắt bất cứ lúc nào."
    >
      {saved?.isActive ? <BellOff size={16} /> : <BellPlus size={16} />}
      {saved?.isActive ? 'Bỏ theo dõi' : saved ? 'Bật lại theo dõi' : 'Theo dõi tin mới'}
    </button>
  );
}
