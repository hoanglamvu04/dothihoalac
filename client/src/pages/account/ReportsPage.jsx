import { useEffect, useState } from 'react';
import { Flag, ShieldCheck } from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { userApi } from '../../api/user.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { REPORT_REASONS } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';

import './AccountPages.css';

export default function ReportsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    userApi
      .myReports({ page, limit: 15 })
      .then((result) => {
        if (!active) return;
        setItems(result.items || []);
        setMeta(result.meta || {});
      })
      .catch((error) => {
        if (active) toast.error(apiErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, toast]);

  return (
    <div className="account-page-view">
      <Seo title="Báo cáo đã gửi" />

      <div className="account-page-heading">
        <div>
          <span className="account-page-heading__eyebrow">
            <Flag size={15} />
            An toàn cộng đồng
          </span>
          <h2>Báo cáo đã gửi</h2>
          <p>Theo dõi trạng thái xử lý những nội dung bạn đã báo cáo.</p>
        </div>
      </div>

      <section className="account-page-card">
        {loading ? (
          <LoadingBlock />
        ) : items.length ? (
          <div className="account-report-list">
            {items.map((item) => (
              <article className="account-report-item" key={item._id}>
                <div className="account-report-item__top">
                  <Badge tone={item.status === 'resolved' ? 'success' : 'soft'}>
                    {item.status}
                  </Badge>
                  <span className="account-verification-status is-verified">
                    <ShieldCheck size={13} /> {formatDateTime(item.createdAt)}
                  </span>
                </div>

                <strong>{REPORT_REASONS[item.reason] || item.reason}</strong>
                <p>Loại nội dung: {item.targetType}</p>
                {item.description ? <p>{item.description}</p> : null}
                {item.resolutionNote ? <blockquote>{item.resolutionNote}</blockquote> : null}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Bạn chưa gửi báo cáo nào"
            description="Các báo cáo nội dung vi phạm sẽ được lưu và cập nhật trạng thái tại đây."
          />
        )}
      </section>

      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}
