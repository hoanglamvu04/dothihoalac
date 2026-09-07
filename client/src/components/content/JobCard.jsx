import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  MapPin,
} from 'lucide-react';
import Badge from '../common/Badge';
import ContentImage from './ContentImage';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { JOB_TYPES } from '../../utils/constants';
import { contentPath } from '../../utils/content';

export default function JobCard({ item }) {
  const job = item.job || {};
  const href = contentPath(item);
  const companyName = job.companyName || 'Nhà tuyển dụng';
  const jobType = String(job.jobType || 'other')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-');
  const salary =
    job.salaryUnit === 'negotiable' || (!job.salaryMin && !job.salaryMax)
      ? 'Lương thỏa thuận'
      : `${formatCurrency(job.salaryMin || 0)} - ${formatCurrency(
          job.salaryMax || job.salaryMin || 0,
        )}`;

  const companyFallback = <BriefcaseBusiness size={25} aria-hidden="true" />;

  return (
    <article className={`job-card job-card--${jobType}`}>
      <Link
        to={href}
        className={`job-card__icon${item.thumbnailMediaId ? ' has-media' : ''}`}
        aria-label={`Xem ${item.title}`}
      >
        <ContentImage
          media={item.thumbnailMediaId}
          alt={`${companyName} - hình ảnh nhà tuyển dụng`}
          className="job-card__company-image"
          width={72}
          height={72}
          fallback={companyFallback}
        />
      </Link>

      <div className="job-card__body">
        <div className="job-card__topline">
          <Badge tone="soft" className="job-card__type-badge">
            {JOB_TYPES[job.jobType] || 'Việc làm'}
          </Badge>
          <p className="job-card__salary">{salary}</p>
        </div>

        <h3>
          <Link to={href}>{item.title}</Link>
        </h3>

        <strong>{companyName}</strong>

        <div className="job-card__meta">
          <span>
            <MapPin size={15} />
            {job.workLocation || 'Hòa Lạc'}
          </span>
          <span>
            <CalendarDays size={15} />
            Hạn {formatDate(job.deadline)}
          </span>
        </div>

        <Link className="job-card__detail-link" to={href}>
          Xem chi tiết
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
