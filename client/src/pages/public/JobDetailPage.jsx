import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BriefcaseBusiness, CalendarDays, Mail, MapPin, Phone, Users } from 'lucide-react';
import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import ArticleBody from '../../components/content/ArticleBody';
import ReactionBar from '../../components/content/ReactionBar';
import CommentsSection from '../../components/content/CommentsSection';
import ErrorState from '../../components/common/ErrorState';
import { PageLoading } from '../../components/common/Loading';
import { jobApi } from '../../api/content.api';
import { EXPERIENCE_LEVELS, JOB_TYPES } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function JobDetailPage() {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { jobApi.detail(slug).then(setItem).catch(setError); }, [slug]);
  if (!item && !error) return <PageLoading />;
  if (error) return <section className="page-section"><div className="container"><ErrorState error={error} /></div></section>;
  const job = item.job || {};
  const salary = job.salaryUnit === 'negotiable' || (!job.salaryMin && !job.salaryMax) ? 'Thỏa thuận' : `${formatCurrency(job.salaryMin || 0)} - ${formatCurrency(job.salaryMax || job.salaryMin || 0)}`;

  return (
    <section className="page-section page-section--muted">
      <Seo title={item.title} description={item.summary} />
      <div className="container job-detail-layout">
        <article className="job-detail">
          <div className="job-detail__top"><div className="job-detail__logo"><BriefcaseBusiness size={34} /></div><div><Badge tone="soft">{JOB_TYPES[job.jobType] || 'Việc làm'}</Badge><h1>{item.title}</h1><strong>{job.companyName}</strong></div></div>
          <div className="job-facts"><div><MapPin size={20} /><span>Địa điểm</span><strong>{job.workLocation}</strong></div><div><BriefcaseBusiness size={20} /><span>Kinh nghiệm</span><strong>{EXPERIENCE_LEVELS[job.experienceLevel] || 'Không yêu cầu'}</strong></div><div><Users size={20} /><span>Số lượng</span><strong>{job.positionsCount || 1}</strong></div><div><CalendarDays size={20} /><span>Hạn nộp</span><strong>{formatDate(job.deadline)}</strong></div></div>
          <h2>Mô tả công việc</h2><ArticleBody html={item.body?.bodyHtml} />
          {job.applicationMethod ? <div className="source-note"><strong>Cách ứng tuyển</strong><p>{job.applicationMethod}</p></div> : null}
          <ReactionBar content={item} />
          <CommentsSection contentId={item._id} allowComments={item.allowComments} />
        </article>
        <aside className="job-apply-card"><span>Mức lương</span><strong>{salary}</strong><hr /><h3>Thông tin ứng tuyển</h3>{job.contactEmail ? <a href={`mailto:${job.contactEmail}`}><Mail size={18} /> {job.contactEmail}</a> : null}{job.contactPhone ? <a href={`tel:${job.contactPhone}`}><Phone size={18} /> {job.contactPhone}</a> : null}<small>Không chuyển tiền hoặc đóng phí trước khi xác minh nhà tuyển dụng.</small></aside>
      </div>
    </section>
  );
}
