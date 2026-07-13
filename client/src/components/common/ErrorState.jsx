import { CircleAlert, RefreshCcw } from 'lucide-react';
import Button from './Button';
import { apiErrorMessage } from '../../api/http';

export default function ErrorState({ error, onRetry, compact = false }) {
  return (
    <div className={`error-state ${compact ? 'error-state--compact' : ''}`}>
      <CircleAlert size={compact ? 24 : 36} />
      <div>
        <strong>Không thể tải dữ liệu</strong>
        <p>{apiErrorMessage(error)}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCcw size={16} /> Thử lại
        </Button>
      ) : null}
    </div>
  );
}
