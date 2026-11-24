import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, PauseCircle, PlayCircle, Search, Sparkles, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Seo from '../../components/common/Seo';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { savedSearchApi } from '../../api/savedSearch.api';
import { searchApi } from '../../api/content.api';
import { contentPath } from '../../utils/content';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import './AccountPages.css';
import './SavedSearchesPage.css';

const LABELS = {
  all: 'Mọi nội dung', article: 'Tin tức', community: 'Cộng đồng',
  property: 'Bất động sản', job: 'Việc làm',
};

export default function SavedSearchesPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [previews, setPreviews] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await savedSearchApi.list() || []);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (item) => {
    setWorkingId(item._id);
    try {
      const updated = await savedSearchApi.setActive(item._id, !item.isActive);
      setItems((old) => old.map((entry) => entry._id === item._id ? updated : entry));
      toast.success(updated.isActive ? 'Đã bật thông báo tin mới.' : 'Đã tạm dừng thông báo.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setWorkingId('');
    }
  };

  const loadSuggestions = async () => {
    if (previewLoading) return;
    setPreviewLoading(true);
    try {
      // Only run after the user's explicit click. No persistent profiling.
      const relevant = items.filter((item) => item.isActive).slice(0, 3);
      const responses = await Promise.allSettled(relevant.map((item) =>
        searchApi.run({
          q: item.query || undefined,
          area: item.areaSlug || undefined,
          type: item.contentType,
          sort: 'newest', page: 1, limit: 6,
        }),
      ));
      const seen = new Set();
      const matched = [];
      for (const response of responses) {
        if (response.status !== 'fulfilled') continue;
        for (const content of response.value.data?.contents || []) {
          if (!content?._id || seen.has(content._id)) continue;
          seen.add(content._id);
          matched.push(content);
        }
      }
      setPreviews(matched.slice(0, 9));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPreviewLoading(false);
    }
  };

  const remove = async (item) => {
    setWorkingId(item._id);
    try {
      await savedSearchApi.remove(item._id);
      setItems((old) => old.filter((entry) => entry._id !== item._id));
      toast.success('Đã xóa tìm kiếm đã lưu.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setWorkingId('');
    }
  };

  return (
    <div className="account-page-view saved-searches-page">
      <Seo title="Tìm kiếm đã lưu" noindex />
      <header className="account-page-heading">
        <div>
          <span className="account-page-heading__eyebrow"><Bell size={15} /> Theo dõi theo nhu cầu</span>
          <h2>Tìm kiếm đã lưu</h2>
          <p>Nhận thông báo trong tài khoản khi có tin tức, nhà đất, việc làm hoặc bài cộng đồng mới phù hợp. Tối đa 20 bộ lọc.</p>
        </div>
        <Link className="account-page-button account-page-button--neutral" to="/tim-kiem">
          <Search size={16} /> Tìm kiếm mới
        </Link>
      </header>

      <section className="account-page-card">
        {loading ? <LoadingBlock /> : items.length ? (
          <div className="saved-searches-list">
            {items.map((item) => {
              const params = new URLSearchParams();
              if (item.query) params.set('q', item.query);
              if (item.areaSlug) params.set('area', item.areaSlug);
              if (item.contentType !== 'all') params.set('type', item.contentType);
              return (
                <article className="saved-searches-item" key={item._id}>
                  <span className="saved-searches-item__icon">{item.isActive ? <Bell size={19} /> : <BellOff size={19} />}</span>
                  <div>
                    <Link to={'/tim-kiem?' + params.toString()}>
                      <strong>{item.query || item.areaName || 'Khu vực đã theo dõi'}</strong>
                    </Link>
                    <p>{LABELS[item.contentType] || 'Mọi nội dung'}{item.areaName && item.query ? ' · ' + item.areaName : ''} · {item.isActive ? 'Đang thông báo' : 'Đã tạm dừng'}</p>
                  </div>
                  <div className="saved-searches-item__actions">
                    <button type="button" disabled={workingId === item._id} onClick={() => toggle(item)} title={item.isActive ? 'Tạm dừng' : 'Bật lại'}>
                      {item.isActive ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                    </button>
                    <button type="button" disabled={workingId === item._id} onClick={() => remove(item)} title="Xóa" aria-label="Xóa tìm kiếm">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Chưa theo dõi tìm kiếm nào" description="Hãy tìm kiếm chủ đề hoặc ghé trang khu vực và chọn Theo dõi tin mới." actionLabel="Khám phá" actionTo="/tim-kiem" />
        )}
      </section>
      {items.some((item) => item.isActive) ? (
        <section className="account-page-card saved-searches-suggestions">
          <div className="saved-searches-suggestions__heading">
            <div>
              <h3><Sparkles size={19} /> Gợi ý từ bộ lọc đã lưu</h3>
              <p>Chỉ lấy nội dung công khai khi bạn bấm xem. Không tự theo dõi hành vi hay gửi dữ liệu tới bên thứ ba.</p>
            </div>
            <button type="button" disabled={previewLoading} onClick={loadSuggestions}>
              {previewLoading ? 'Đang tải…' : 'Xem gợi ý'}
            </button>
          </div>
          {previews !== null ? (
            previews.length ? (
              <ul className="saved-searches-suggestions__results">
                {previews.map((item) => (
                  <li key={item._id}>
                    <Link to={contentPath(item)}>{item.title}</Link>
                    <small>{LABELS[item.contentType] || 'Nội dung'}</small>
                  </li>
                ))}
              </ul>
            ) : <p>Chưa có nội dung công khai phù hợp lúc này.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
