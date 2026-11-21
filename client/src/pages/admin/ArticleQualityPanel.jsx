import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';

import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';

export default function ArticleQualityPanel({ articleId, refreshKey }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    adminApi.articleQuality(articleId)
      .then((value) => {
        if (!active) return;
        setReport(value);
        setError('');
      })
      .catch((requestError) => {
        if (!active) return;
        setError(apiErrorMessage(requestError, 'Không thể đánh giá bài viết.'));
      });

    return () => { active = false; };
  }, [articleId, refreshKey, retry]);

  return (
    <section className="article-workspace-card article-quality-panel" aria-label="Kiểm tra bài trước xuất bản">
      <div className="article-workspace-card__head">
        <ShieldCheck size={19} />
        <div>
          <h2>Kiểm tra chất lượng trước đăng</h2>
          <p>Phát hiện sớm nội dung lỗi, thiếu ảnh và vấn đề SEO cơ bản.</p>
        </div>
      </div>

      <button type="button" className="article-quality-refresh" onClick={() => setRetry((value) => value + 1)}>
        <RefreshCw size={14} /> Kiểm tra lại
      </button>

      {error ? <p className="article-quality-error">{error}</p> : null}
      {!report && !error ? <p>Đang kiểm tra bài viết…</p> : null}

      {report ? (
        <>
          <p className={report.ready ? 'article-quality-status is-ready' : 'article-quality-status is-blocked'}>
            {report.ready ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
            {report.ready
              ? 'Không phát hiện lỗi nghiêm trọng · ' + report.warnings + ' lưu ý'
              : 'Có ' + report.blockers + ' lỗi cần sửa · ' + report.warnings + ' lưu ý'}
          </p>
          <ul className="article-quality-checks">
            {report.checks?.map((check) => (
              <li className={'is-' + check.level} key={check.code}>
                {check.level === 'pass' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{check.message}</span>
              </li>
            ))}
          </ul>
          <small>
            Đây là kiểm tra cấu trúc nội dung trên CMS, chưa thay thế kiểm chứng thông tin,
            bản quyền hình ảnh hoặc xác minh URL ảnh qua mạng.
          </small>
        </>
      ) : null}
    </section>
  );
}
