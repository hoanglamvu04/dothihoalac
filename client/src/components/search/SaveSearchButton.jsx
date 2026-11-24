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
  const [savedState, setSavedState] = useState(null);
  const [checkedKey, setCheckedKey] = useState('');
  const [busy, setBusy] = useState(false);
  const normalizedQuery = String(query || '').trim();
  const normalizedArea = String(area || '').trim();
  const canSave = Boolean(normalizedQuery || normalizedArea);

  const userId = String(user?._id || user?.id || '');
  const loggedIn = Boolean(user);
  const criteriaKey = JSON.stringify([userId, normalizedQuery, contentType, normalizedArea]);
  const saved = savedState?.key === criteriaKey ? savedState.item : null;
  useEffect(() => {
    if (!loggedIn || !canSave) return undefined;

    let active = true;
    savedSearchApi.list().then((items) => {
      if (!active) return;
      setSavedState({
        key: criteriaKey,
        item: findSavedSearch(items, {
          query: normalizedQuery,
          contentType,
          area: normalizedArea,
        }),
      });
      setCheckedKey(criteriaKey);
    }).catch(() => {
      if (!active) return;
      setSavedState({ key: criteriaKey, item: null });
      setCheckedKey(criteriaKey);
    });
    return () => { active = false; };
  }, [loggedIn, canSave, criteriaKey, normalizedQuery, contentType, normalizedArea]);

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
        setSavedState({ key: criteriaKey, item: null });
        toast.success('Đã bỏ theo dõi tìm kiếm.');
      } else {
        const item = await savedSearchApi.create({
          query: normalizedQuery,
          contentType,
          area: normalizedArea,
        });
        setSavedState({ key: criteriaKey, item: item || null });
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
      disabled={busy || checkedKey !== criteriaKey}
      aria-pressed={Boolean(saved?.isActive)}
      title="Tin mới sẽ được thông báo trong tài khoản. Bạn có thể tắt bất cứ lúc nào."
    >
      {saved?.isActive ? <BellOff size={16} /> : <BellPlus size={16} />}
      {saved?.isActive ? 'Bỏ theo dõi' : saved ? 'Bật lại theo dõi' : 'Theo dõi tin mới'}
    </button>
  );
}
