import { Link } from 'react-router-dom';
import { BriefcaseBusiness, CalendarDays, MapPin } from 'lucide-react';
import Badge from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { JOB_TYPES } from '../../utils/constants';
import { contentPath } from '../../utils/content';

function companySlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function JobCard({ item }) {
  const job = item.job || {};
  const href = contentPath(item);
  const employerName = job.companyName || 'Nhà tuyển dụng';
  const employerSlug = companySlug(job.companyName);
  const salary =
    job.salaryUnit === 'negotiable' || (!job.salaryMin && !job.salaryMax)
      ? 'Lương thỏa thuận'
      : `${formatCurrency(job.salaryMin || 0)} - ${formatCurrency(
          job.salaryMax || job.salaryMin || 0,
        )}`;

  return (
    <article className="job-card">
      <div className="job-card__icon"><BriefcaseBusiness size={25} /></div>
      <div className="job-card__body">
        <Badge tone="soft">{JOB_TYPES[job.jobType] || 'Việc làm'}</Badge>
        <h3><Link to={href}>{item.title}</Link></h3>
        <strong>
          {employerSlug ? (
            <Link to={`/viec-lam/cong-ty/${employerSlug}`}>{employerName}</Link>
          ) : employerName}
        </strong>
        <p className="job-card__salary">{salary}</p>
        <div>
          <span><MapPin size={15} /> {job.workLocation || 'Hòa Lạc'}</span>
          <span><CalendarDays size={15} /> Hạn {formatDate(job.deadline)}</span>
        </div>
      </div>
    </article>
  );
}