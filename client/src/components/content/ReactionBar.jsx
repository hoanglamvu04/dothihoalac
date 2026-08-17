import { useState } from 'react';
import { Bookmark, Flag, Navigation, Share2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { bookmarkApi, reactionApi } from '../../api/interaction.api';
import { REACTIONS } from '../../utils/constants';
import ReportModal from './ReportModal';

function propertyDirectionsUrl(content) {
  if (content?.contentType !== 'property') return '';

  const property = content?.property || {};
  const coordinates = property?.location?.coordinates;
  const hasCoordinates =
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]));

  const destination = hasCoordinates
    ? `${Number(coordinates[1])},${Number(coordinates[0])}`
    : String(property.addressText || content?.primaryAreaId?.name || 'Hòa Lạc, Hà Nội').trim();

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export default function ReactionBar({ content }) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [reaction, setReaction] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [count, setCount] = useState(content?.reactionCount || 0);
  const directionsUrl = propertyDirectionsUrl(content);
  const isPreview = Boolean(content?.viewerAccess?.preview);

  const requireLogin = () => {
    if (!isAuthenticated) {
      toast.info('Bạn cần đăng nhập để sử dụng tính năng này.');
      return false;
    }
    return true;
  };

  const react = async (type) => {
    if (!requireLogin()) return;
    try {
      if (reaction === type) {
        await reactionApi.remove('content', content._id);
        setReaction(null);
        setCount((value) => Math.max(0, value - 1));
      } else {
        await reactionApi.put('content', content._id, type);
        setCount((value) => value + (reaction ? 0 : 1));
        setReaction(type);
      }
    } catch {
      toast.error('Không thể cập nhật cảm xúc.');
    }
  };

  const bookmark = async () => {
    if (!requireLogin()) return;
    try {
      if (bookmarked) await bookmarkApi.remove(content._id);
      else await bookmarkApi.put(content._id);
      setBookmarked((value) => !value);
      toast.success(bookmarked ? 'Đã bỏ lưu nội dung.' : 'Đã lưu nội dung.');
    } catch {
      toast.error('Không thể cập nhật nội dung đã lưu.');
    }
  };

  const share = async () => {
    const shareData = { title: content.title, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Đã sao chép liên kết.');
      }
    } catch {
      // Người dùng có thể chủ động đóng hộp chia sẻ.
    }
  };

  if (isPreview) {
    return (
      <div className="reaction-bar reaction-bar--preview">
        <div className="reaction-picker">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <ShieldCheck size={17} />
            Bản xem trước · chỉ tác giả và quản trị viên truy cập được
          </span>
        </div>
        <div className="reaction-actions">
          {directionsUrl ? (
            <button
              type="button"
              onClick={() => window.open(directionsUrl, '_blank', 'noopener,noreferrer')}
            >
              <Navigation size={18} /> Xem đường đi
            </button>
          ) : null}
          <button type="button" onClick={share}><Share2 size={18} /> Sao chép/chia sẻ liên kết xem trước</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="reaction-bar">
        <div className="reaction-picker">
          <span>{count} cảm xúc</span>
          {REACTIONS.map((item) => (
            <button key={item.value} type="button" className={reaction === item.value ? 'is-active' : ''} onClick={() => react(item.value)} title={item.label}>
              <span>{item.emoji}</span><small>{item.label}</small>
            </button>
          ))}
        </div>
        <div className="reaction-actions">
          {directionsUrl ? (
            <button
              type="button"
              onClick={() => window.open(directionsUrl, '_blank', 'noopener,noreferrer')}
            >
              <Navigation size={18} /> Xem đường đi
            </button>
          ) : null}
          <button type="button" className={bookmarked ? 'is-active' : ''} onClick={bookmark}><Bookmark size={18} /> {bookmarked ? 'Đã lưu' : 'Lưu'}</button>
          <button type="button" onClick={share}><Share2 size={18} /> Chia sẻ</button>
          <button type="button" onClick={() => (requireLogin() ? setReportOpen(true) : null)}><Flag size={18} /> Báo cáo</button>
        </div>
      </div>
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType={content.contentType === 'property' ? 'property' : content.contentType === 'job' ? 'job' : 'content'} targetId={content._id} />
    </>
  );
}
