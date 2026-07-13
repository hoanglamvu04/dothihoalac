import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import Avatar from '../../components/common/Avatar';
import VerifiedMark from '../../components/common/VerifiedMark';
import ContentImage from '../../components/content/ContentImage';
import ArticleBody from '../../components/content/ArticleBody';
import ReactionBar from '../../components/content/ReactionBar';
import CommentsSection from '../../components/content/CommentsSection';
import ErrorState from '../../components/common/ErrorState';
import { PageLoading } from '../../components/common/Loading';
import { communityApi } from '../../api/content.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/http';
import { COMMUNITY_TYPES } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';

export default function CommunityDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { communityApi.detail(slug).then(setItem).catch(setError); }, [slug]);
  if (!item && !error) return <PageLoading />;
  if (error) return <section className="page-section"><div className="container"><ErrorState error={error} /></div></section>;
  const author = item.authorId || {};
  const isOwner = String(user?.id || '') === String(author._id || author.id || '');
  const accept = async (commentId) => {
    try {
      const community = await communityApi.acceptAnswer(item._id, commentId);
      setItem((current) => ({ ...current, community }));
      toast.success('Đã chọn câu trả lời hữu ích.');
    } catch (err) { toast.error(apiErrorMessage(err)); }
  };

  return (
    <section className="page-section page-section--muted">
      <Seo title={item.title} description={item.summary} />
      <div className="container container--narrow">
        <article className="community-detail">
          <header className="community-detail__author">
            <Avatar name={author.displayName} size="lg" />
            <div><Link to={author.username ? `/thanh-vien/${author.username}` : '#'}>{author.displayName || 'Thành viên'}</Link><VerifiedMark emailVerifiedAt={author.emailVerifiedAt} phoneVerifiedAt={author.phoneVerifiedAt} /><span>{formatDateTime(item.publishedAt)}</span></div>
            <Badge tone="soft">{COMMUNITY_TYPES[item.community?.postType] || 'Cộng đồng'}</Badge>
          </header>
          <h1>{item.title}</h1>
          {item.summary ? <p className="article-lead">{item.summary}</p> : null}
          <div className="community-detail__facts">
            {item.primaryAreaId?.name ? <span><MapPin size={17} /> {item.primaryAreaId.name}</span> : null}
            {item.community?.locationText ? <span>{item.community.locationText}</span> : null}
            {item.community?.rating ? <span><Star size={17} /> {item.community.rating}/5</span> : null}
          </div>
          {item.thumbnailMediaId ? <ContentImage media={item.thumbnailMediaId} alt={item.title} ratio="hero" /> : null}
          <ArticleBody html={item.body?.bodyHtml} />
          <ReactionBar content={item} />
          <CommentsSection contentId={item._id} allowComments={item.allowComments} acceptedCommentId={item.community?.acceptedCommentId} onAcceptAnswer={accept} isQuestionOwner={isOwner && item.community?.postType === 'question'} />
        </article>
      </div>
    </section>
  );
}
