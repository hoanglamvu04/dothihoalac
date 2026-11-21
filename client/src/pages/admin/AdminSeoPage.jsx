import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, RefreshCw, Search } from 'lucide-react';

import Seo from '../../components/common/Seo';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { formatDateTime } from '../../utils/formatters';

import './AdminSeoPage.css';

export default function AdminSeoPage() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyIssues, setOnlyIssues] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    adminApi.articlesSeoOverview()
      .then((result) => {
        if (!active) return;
        setReport(result);
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(apiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reload]);

  const results = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('vi');
    return (report?.items || []).filter((item) => {
      if (onlyIssues && !item.issueCount) return false;
      return !needle || String(item.title || '').toLocaleLowerCase('vi').includes(needle);
    });
  }, [report, search, onlyIssues]);

  return (
    <main className="admin-seo-page">
      <Seo title="SEO Center — Đô Thị Hòa Lạc" />
      <header className="admin-seo-heading">
        <div>
          <h1>SEO Center</h1>
          <p>Phát hiện bài viết công khai thiếu mô tả, ảnh hoặc nội dung đủ chất lượng.</p>
        </div>
        <button type="button" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>
          <RefreshCw size={16} /> Quét lại
        </button>
      </header>

      {error ? <div className="admin-alert error">{error}</div> : null}
      {loading ? <p>Đang kiểm tra bài viết…</p> : null}

      {report ? (
        <>
          <div className="admin-seo-stats">
            <div><strong>{report.totalPublished}</strong><span>Bài công khai</span></div>
            <div><strong>{report.scanned}</strong><span>Bài được kiểm tra</span></div>
            <div><strong>{report.withIssues}</strong><span>Bài cần cải thiện</span></div>
            <div><strong>{report.missingCover}</strong><span>Thiếu ảnh đại diện</span></div>
            <div><strong>{report.missingDescription}</strong><span>Thiếu mô tả phù hợp</span></div>
          </div>

          <p className="admin-seo-note">{report.note}</p>

          <div className="admin-seo-filter">
            <label className="admin-seo-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tiêu đề bài báo..."
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={onlyIssues}
                onChange={(event) => setOnlyIssues(event.target.checked)}
              />
              Chỉ hiện bài cần sửa
            </label>
          </div>

          <div className="admin-seo-list">
            {results.length === 0 ? <p>Không có bài nào phù hợp bộ lọc.</p> : null}
            {results.map((item) => (
              <article key={item._id} className="admin-seo-item">
                <div className="admin-seo-item__main">
                  <h2><Link to={'/quan-tri/bai-viet/' + item._id}>{item.title}</Link></h2>
                  <small>{formatDateTime(item.publishedAt)}</small>
                  {item.issues.length ? (
                    <ul>
                      {item.issues.map((issue) => (
                        <li key={issue.code}><AlertCircle size={14} /> {issue.label}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="admin-seo-ok"><CheckCircle2 size={16} /> Không phát hiện lỗi trong bộ quy tắc hiện tại.</p>
                  )}
                </div>
                <Link className="admin-seo-open" to={'/quan-tri/bai-viet/' + item._id}>Mở bài</Link>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}
