import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, FileText, Home, MapPin } from 'lucide-react';
import Seo from '../../components/common/Seo';
import Avatar from '../../components/common/Avatar';
import VerifiedMark from '../../components/common/VerifiedMark';
import ErrorState from '../../components/common/ErrorState';
import { PageLoading } from '../../components/common/Loading';
import { userApi } from '../../api/user.api';
import { formatDate } from '../../utils/formatters';
import { mediaUrl } from '../../utils/media';

export default function PublicProfilePage() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { userApi.publicProfile(username).then(setData).catch(setError); }, [username]);
  if (!data && !error) return <PageLoading />;
  if (error) return <section className="page-section"><div className="container"><ErrorState error={error} /></div></section>;
  const { user, profile, counts } = data;
  const coverUrl = mediaUrl(profile.coverMediaId);
  return (
    <section className="page-section page-section--muted">
      <Seo title={user.displayName} description={profile.bio} />
      <div className="container container--narrow">
        <div className="public-profile-card">
          <div className="profile-cover">{coverUrl ? <img src={coverUrl} alt="Ảnh bìa" /> : null}</div>
          <div className="public-profile-card__main">
            <Avatar src={profile.avatarMediaId} name={user.displayName} size="xl" />
            <div className="profile-meta">
              <h1>{user.displayName}</h1>
              <span>@{user.username}</span>
              <VerifiedMark emailVerifiedAt={user.emailVerifiedAt} phoneVerifiedAt={user.phoneVerifiedAt} />
              {profile.bio ? <p>{profile.bio}</p> : null}
              <div className="profile-detail-list">
                {profile.areaId?.name ? <span><MapPin size={17} /> {profile.areaId.name}</span> : null}
                {profile.occupation ? <span><Home size={17} /> {profile.occupation}</span> : null}
                <span><CalendarDays size={17} /> Tham gia {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="profile-counts"><div><strong>{counts.postCount}</strong><span>Bài công khai</span></div><div><strong>{counts.listingCount}</strong><span>Tin nhà đất</span></div></div>
        </div>
        <div className="profile-empty-content"><FileText size={34} /><h2>Hoạt động công khai</h2><p>Server hiện chỉ cung cấp số lượng bài trên hồ sơ. Danh sách bài theo tác giả có thể bổ sung ở API phiên bản sau.</p></div>
      </div>
    </section>
  );
}
