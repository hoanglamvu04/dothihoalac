import { Link } from 'react-router-dom';
import emptyCity from '../../assets/empty-city.svg';

export default function EmptyState({
  title = 'Chưa có dữ liệu',
  description = 'Nội dung sẽ được cập nhật trong thời gian sớm nhất.',
  actionLabel,
  actionTo,
}) {
  return (
    <div className="empty-state">
      <img src={emptyCity} alt="" />
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && actionTo ? (
        <Link className="btn btn--primary btn--md" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
