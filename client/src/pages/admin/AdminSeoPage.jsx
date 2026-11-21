import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, RefreshCw, Search } from 'lucide-react';

import Seo from '../../components/common/Seo';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { formatDateTime } from '../../utils/formatters';

import './AdminSeoPage.css';

const PAGE_SIZE = 25;
const issueChoices = [
  ['all', 'Mọi vấn đề'],
  ['missing_cover', 'Thiếu ảnh hợp lệ'],
  ['inactive_cover', 'Ảnh đại diện không khả dụng'],
  ['invalid_inline_images', 'Ảnh nội dung không khả dụng'],
  ['short_description', 'Thiếu mô tả'],
  ['short_content', 'Nội dung ngắn'],
  ['short_title', 'Tiêu đề quá ngắn'],
  ['long_title', 'Tiêu đề quá dài'],
  ['missing_category', 'Thiếu chuyên mục'],
];

export default function AdminSeoPage() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [onlyIssues, setOnlyIssues] = useState(true);
  const [issueCode, setIssueCode] = useState('all');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    adminApi.articlesSeoOverview({
      page,
      limit: PAGE_SIZE,
      ...(query ? { q: query } : {}),
    })
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
  }, [page, query, reload]);

  const results = useMemo(() => (
    (report?.items || []).filter((item) => {
      if (onlyIssues && !item.issueCount) return false;
      return issueCode === 'all' ||
        item.issues?.some((issue) => issue.code === issueCode);
    })
  ), [report, onlyIssues, issueCode]);

  const totalPages = Math.max(1, Number(report?.meta?.totalPages) || 1);
  const currentPage = Number(report?.meta?.page) || page;
  const totalMatching = Number(report?.matchingPublished || 0);

  const runSearch = (event) => {
    event.preventDefault();
    setLoading(true);
    const nextQuery = searchInput.trim();
    setPage(1);
    if (nextQuery === query && page === 1) {
      setReload((value) => value + 1);
    } else {
      setQuery(nextQuery);
    }
  };

  const movePage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || loading) return;
    setLoading(true);
    setPage(nextPage);
  };

  return (
    <main className="admin-seo-page">
      <Seo title="SEO Center — Đô Thị Hòa Lạc" />
      <header className="admin-seo-heading">
        <div>
          <h1>SEO Center</h1>
          <p>Quét từng trang bài công khai, phát hiện lỗi nội dung và ảnh trong Media Library.</p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => { setLoading(true); setReload((value) => value + 1); }}
        >
          <RefreshCw size={16} /> Quét lại
        </button>
      </header>

      {error ? <div className="admin-alert error" role="alert">{error}</div> : null}
      {loading ? <p role="status">Đang kiểm tra bài viết…</p> : null}

      {report ? (
        <>
          <div className="admin-seo-stats">
            <div><strong>{report.totalPublished}</strong><span>Tất cả bài công khai</span></div>
            <div><strong>{report.scanned}</strong><span>Đã quét trong trang này</span></div>
            <div><strong>{report.withIssues}</strong><span>Bài cần sửa (trang này)</span></div>
            <div><strong>{report.missingCover}</strong><span>Thiếu ảnh hợp lệ (trang này)</span></div>
            <div><strong>{report.missingDescription}</strong><span>Thiếu mô tả (trang này)</span></div>
          </div>

          <p className="admin-seo-note">{report.note}</p>

          <form className="admin-seo-filter" onSubmit={runSearch}>
            <label className="admin-seo-search">
              <Search size={16} />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tìm tiêu đề trong toàn bộ bài công khai..."
                maxLength={90}
                aria-label="Tìm tiêu đề bài viết"
              />
            </label>
            <button type="submit" disabled={loading}>Tìm bài</button>
            <label>
              <input
                type="checkbox"
                checked={onlyIssues}
                onChange={(event) => setOnlyIssues(event.target.checked)}
              />
              Chỉ hiện bài cần sửa
            </label>
            <select
              value={issueCode}
              onChange={(event) => setIssueCode(event.target.value)}
              aria-label="Lọc loại vấn đề trên trang hiện tại"
            >
              {issueChoices.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </form>

          <div className="admin-seo-page-info">
            <span>
              {totalMatching} bài khớp tìm kiếm · Trang {currentPage}/{totalPages}.
              Bộ lọc vấn đề áp dụng trên trang hiện tại.
            </span>
            <div className="admin-seo-pager">
              <button type="button" disabled={loading || currentPage <= 1} onClick={() => movePage(currentPage - 1)}>
                Trang trước
              </button>
              <button type="button" disabled={loading || currentPage >= totalPages} onClick={() => movePage(currentPage + 1)}>
                Trang sau
              </button>
            </div>
          </div>

          <div className="admin-seo-list">
            {!loading && results.length === 0 ? <p>Không có bài nào phù hợp bộ lọc trên trang này.</p> : null}
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
