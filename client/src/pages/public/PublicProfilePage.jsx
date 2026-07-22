import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Globe2,
  Home,
  MapPin,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Avatar from '../../components/common/Avatar';
import ErrorState from '../../components/common/ErrorState';
import { PageLoading } from '../../components/common/Loading';
import { userApi } from '../../api/user.api';
import { formatDate, formatNumber } from '../../utils/formatters';
import { mediaUrl } from '../../utils/media';

import './PublicProfilePage.css';

export default function PublicProfilePage() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);

    userApi
      .publicProfile(username)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      });

    return () => {
      active = false;
    };
  }, [username]);

  if (!data && !error) return <PageLoading />;

  if (error) {
    return (
      <section className="page-section">
        <div className="container">
          <ErrorState error={error} />
        </div>
      </section>
    );
  }

  const { user, profile, counts = {} } = data;
  const coverUrl = mediaUrl(profile?.coverMediaId);
  const verified = Boolean(user?.emailVerifiedAt || user?.phoneVerifiedAt);

  return (
    <main className="public-member-page">
      <Seo title={user.displayName} description={profile?.bio} />

      <div className="public-member-container">
        <section className="public-member-header">
          <div className="public-member-cover">
            {coverUrl ? (
              <img src={coverUrl} alt={`Ảnh bìa của ${user.displayName}`} />
            ) : (
              <div className="public-member-cover__fallback" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            )}
            <div className="public-member-cover__shade" />
          </div>

          <div className="public-member-identity">
            <div className="public-member-avatar">
              <Avatar src={profile?.avatarMediaId} name={user.displayName} size="lg" />
            </div>

            <div className="public-member-name">
              <div>
                <h1>{user.displayName}</h1>
                {verified ? (
                  <span title="Tài khoản đã xác thực">
                    <ShieldCheck size={18} />
                  </span>
                ) : null}
              </div>
              <p>@{user.username}</p>

              <div className="public-member-meta">
                {profile?.occupation ? (
                  <span><BriefcaseBusiness size={15} /> {profile.occupation}</span>
                ) : null}
                {profile?.areaId?.name ? (
                  <span><MapPin size={15} /> {profile.areaId.name}</span>
                ) : null}
                <span><CalendarDays size={15} /> Tham gia {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="public-member-tabs">
            <span className="is-active">Tổng quan</span>
            <span>Giới thiệu</span>
            <span>Hoạt động công khai</span>
          </div>
        </section>

        <div className="public-member-layout">
          <aside className="public-member-sidebar">
            <section className="public-member-card">
              <h2>Giới thiệu</h2>

              {profile?.bio ? (
                <p className="public-member-bio">{profile.bio}</p>
              ) : null}

              <div className="public-member-detail-list">
                {profile?.occupation ? (
                  <div>
                    <span><BriefcaseBusiness size={19} /></span>
                    <p><strong>{profile.occupation}</strong><small>Nghề nghiệp</small></p>
                  </div>
                ) : null}

                {profile?.areaId?.name ? (
                  <div>
                    <span><Home size={19} /></span>
                    <p><strong>{profile.areaId.name}</strong><small>Khu vực</small></p>
                  </div>
                ) : null}

                {profile?.website ? (
                  <div>
                    <span><Globe2 size={19} /></span>
                    <p>
                      <a href={profile.website} target="_blank" rel="noopener noreferrer">
                        {profile.website}
                      </a>
                      <small>Website</small>
                    </p>
                  </div>
                ) : null}

                <div>
                  <span><UserRound size={19} /></span>
                  <p><strong>{user.displayName}</strong><small>Thành viên cộng đồng</small></p>
                </div>
              </div>
            </section>

            <section className="public-member-card public-member-counts">
              <div>
                <strong>{formatNumber(counts.postCount)}</strong>
                <span>Bài công khai</span>
              </div>
              <div>
                <strong>{formatNumber(counts.listingCount)}</strong>
                <span>Tin nhà đất</span>
              </div>
            </section>
          </aside>

          <section className="public-member-card public-member-activity">
            <div className="public-member-activity__icon">
              <FileText size={30} />
            </div>
            <h2>Hoạt động công khai</h2>
            <p>
              Các bài viết và nội dung công khai của thành viên sẽ được hiển thị tại đây khi API danh sách theo tác giả được bổ sung.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
