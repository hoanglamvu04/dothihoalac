import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, UserRound } from 'lucide-react';
import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import ContentImage from '../../components/content/ContentImage';
import ArticleBody from '../../components/content/ArticleBody';
import ReactionBar from '../../components/content/ReactionBar';
import CommentsSection from '../../components/content/CommentsSection';
import ErrorState from '../../components/common/ErrorState';
import { PageLoading } from '../../components/common/Loading';
import LeadForm from '../../components/forms/LeadForm';
import { articleApi } from '../../api/content.api';
import { formatDateTime } from '../../utils/formatters';

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    articleApi.detail(slug).then(setItem).catch(setError);
  }, [slug]);
  if (!item && !error) return <PageLoading />;
  if (error) return <section className="page-section"><div className="container"><ErrorState error={error} /></div></section>;

  return (
    <section className="page-section article-detail-page">
      <Seo title={item.title} description={item.summary} />
      <div className="container article-layout">
        <article className="article-detail">
          <div className="article-detail__labels"><Badge tone="primary">{item.primaryCategoryId?.name || 'Tin tức'}</Badge>{item.isSponsored ? <Badge tone="warning">Nội dung tài trợ</Badge> : null}</div>
          <h1>{item.title}</h1>
          {item.summary ? <p className="article-lead">{item.summary}</p> : null}
          <div className="article-byline"><span><UserRound size={17} /> {item.authorId?.displayName || 'Ban biên tập'}</span><span><CalendarDays size={17} /> {formatDateTime(item.publishedAt)}</span>{item.updatedAt && item.updatedAt !== item.createdAt ? <span>Cập nhật {formatDateTime(item.updatedAt)}</span> : null}</div>
          <ContentImage media={item.thumbnailMediaId} alt={item.title} ratio="hero" />
          <ArticleBody html={item.body?.bodyHtml} />
          {item.article?.sourceNote ? <div className="source-note"><strong>Nguồn và ghi chú:</strong><p>{item.article.sourceNote}</p></div> : null}
          <ReactionBar content={item} />
          <CommentsSection contentId={item._id} allowComments={item.allowComments} />
        </article>
        <aside className="article-sidebar">
          <div className="sidebar-card"><h3>Thông tin bài viết</h3><p>Chuyên mục: <strong>{item.primaryCategoryId?.name || 'Tin tức'}</strong></p><p>Khu vực: <strong>{item.primaryAreaId?.name || 'Hòa Lạc'}</strong></p><p>Lượt xem: <strong>{item.viewCount || 0}</strong></p></div>
          <div className="sidebar-card sidebar-card--accent"><h3>Bạn có đất hoặc nhà cần xây?</h3><p>Gửi thông tin để Kiến Trúc Hòa Lạc tư vấn phương án phù hợp.</p><Link className="btn btn--accent btn--md" to={`/tu-van?type=architecture_design&source=${item._id}`}>Yêu cầu tư vấn</Link></div>
          <div className="sidebar-card"><h3>Tư vấn nhanh</h3><LeadForm compact sourceContentId={item._id} /></div>
        </aside>
      </div>
    </section>
  );
}
