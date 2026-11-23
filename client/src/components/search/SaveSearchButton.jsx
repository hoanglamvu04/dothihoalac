import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellPlus, BellOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/http';
import { savedSearchApi } from '../../api/savedSearch.api';
import './SaveSearchButton.css';

export default function SaveSearchButton({ query = '', contentType = 'all', area = '' }) {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [savedId, setSavedId] = useState('');
  const [busy, setBusy] = useState(false);
  const normalizedQuery = String(query || '').trim();
  const normalizedArea = String(area || '').trim();
  const canSave = Boolean(normalizedQuery || normalizedArea);

  useEffect(() => {
    if (!user?._id || !canSave) return undefined;
    let active = true;
    savedSearchApi.list().then((items) => {
      if (!active) return;
      const match = (items || []).find((item) =>
        item.contentType === contentType &&
        String(item.query || '').trim().toLocaleLowerCase('vi-VN') === normalizedQuery.toLocaleLowerCase('vi-VN') &&
        String(item.areaSlug || '').trim() === normalizedArea,
      );
      setSavedId(match?._id || '');
    }).catch(() => {
      if (active) setSavedId('');
    });
    return () => { active = false; };
  }, [user?._id, canSave, normalizedQuery, contentType, normalizedArea]);

  if (!canSave || authLoading) return null;

  if (!user) {
    return <Link className="save-search-button" to="/dang-nhap"><BellPlus size={16} /> Đăng nhập để theo dõi</Link>;
  }

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (savedId) {
        await savedSearchApi.remove(savedId);
        setSavedId('');
        toast.success('Đã bỏ theo dõi tìm kiếm.');
      } else {
        const item = await savedSearchApi.create({
          query: normalizedQuery,
          contentType,
          area: normalizedArea,
        });
        setSavedId(item?._id || '');
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
      className={'save-search-button' + (savedId ? ' is-saved' : '')}
      onClick={handleClick}
      disabled={busy}
      aria-pressed={Boolean(savedId)}
      title="Tin mới sẽ được thông báo trong tài khoản. Bạn có thể tắt bất cứ lúc nào."
    >
      {savedId ? <BellOff size={16} /> : <BellPlus size={16} />}
      {savedId ? 'Bỏ theo dõi' : 'Theo dõi tin mới'}
    </button>
  );
}
