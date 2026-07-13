import { Link } from 'react-router-dom';
import { BriefcaseBusiness, CalendarDays, MapPin } from 'lucide-react';
import Badge from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { JOB_TYPES } from '../../utils/constants';

export default function JobCard({ item }) {
  const job = item.job || {};
  const salary = job.salaryUnit === 'negotiable' || (!job.salaryMin && !job.salaryMax)
    ? 'Lương thỏa thuận'
    : `${formatCurrency(job.salaryMin || 0)} - ${formatCurrency(job.salaryMax || job.salaryMin || 0)}`;
  return (
    <article className="job-card">
      <div className="job-card__icon"><BriefcaseBusiness size={25} /></div>
      <div className="job-card__body">
        <Badge tone="soft">{JOB_TYPES[job.jobType] || 'Việc làm'}</Badge>
        <h3><Link to={`/viec-lam/${item.slug}`}>{item.title}</Link></h3>
        <strong>{job.companyName || 'Nhà tuyển dụng'}</strong>
        <p className="job-card__salary">{salary}</p>
        <div><span><MapPin size={15} /> {job.workLocation || 'Hòa Lạc'}</span><span><CalendarDays size={15} /> Hạn {formatDate(job.deadline)}</span></div>
      </div>
    </article>
  );
}
