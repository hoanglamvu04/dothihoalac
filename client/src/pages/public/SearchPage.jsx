import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Search, UserRound } from 'lucide-react';
import Seo from '../../components/common/Seo';
import PageHeader from '../../components/common/PageHeader';
import GenericContentCard from '../../components/content/GenericContentCard';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { LoadingBlock } from '../../components/common/Loading';
import Avatar from '../../components/common/Avatar';
import { searchApi } from '../../api/content.api';
import { saveRecentSearch, getRecentSearches } from '../../utils/storage';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [result, setResult] = useState({ data: { contents: [], users: [], areas: [] }, meta: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'all';
  const page = searchParams.get('page') || '1';

  useEffect(() => {
    if (!q) return;
    setLoading(true); setError(null); saveRecentSearch(q);
    searchApi.run({ q, type, page, limit: 12 }).then(setResult).catch(setError).finally(() => setLoading(false));
  }, [q, type, page]);

  const submit = (event) => { event.preventDefault(); if (query.trim()) setSearchParams({ q: query.trim(), type, page: '1' }); };
  const changeType = (value) => setSearchParams({ q, type: value, page: '1' });
  const changePage = (value) => setSearchParams({ q, type, page: String(value) });

  return (
    <section className="page-section">
      <Seo title={q ? `Tìm kiếm: ${q}` : 'Tìm kiếm'} />
      <div className="container container--narrow">
        <PageHeader eyebrow="Tìm kiếm" title="Tìm trên Đô Thị Hòa Lạc" description="Tìm tin tức, cộng đồng, bất động sản, việc làm, thành viên và khu vực." />
        <form className="search-page-form" onSubmit={submit}><Search size={21} /><input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="Nhập từ khóa tìm kiếm" /><button type="submit">Tìm kiếm</button></form>
        {!q ? <div className="recent-searches"><strong>Tìm kiếm gần đây</strong>{getRecentSearches().map((term) => <button type="button" key={term} onClick={() => { setQuery(term); setSearchParams({ q: term, type: 'all' }); }}>{term}</button>)}</div> : null}
        {q ? <div className="search-tabs">{[['all','Tất cả'],['article','Tin tức'],['community','Cộng đồng'],['property','Bất động sản'],['job','Việc làm'],['user','Thành viên'],['area','Khu vực']].map(([value,label]) => <button type="button" key={value} className={type === value ? 'is-active' : ''} onClick={() => changeType(value)}>{label}</button>)}</div> : null}
        {loading ? <LoadingBlock /> : error ? <ErrorState error={error} /> : q ? (
          <div className="search-results">
            {result.data.contents?.length ? <div className="generic-list">{result.data.contents.map((item) => <GenericContentCard key={item._id} item={item} />)}</div> : null}
            {result.data.users?.length ? <section><h2>Thành viên</h2><div className="people-grid">{result.data.users.map((user) => <Link key={user._id} to={`/thanh-vien/${user.username}`}><Avatar name={user.displayName} /><div><strong>{user.displayName}</strong><span>@{user.username}</span></div><UserRound size={18} /></Link>)}</div></section> : null}
            {result.data.areas?.length ? <section><h2>Khu vực</h2><div className="area-chip-grid">{result.data.areas.map((area) => <Link key={area._id} to={`/khu-vuc/${area.slug}`}><MapPin size={18} /> {area.name}</Link>)}</div></section> : null}
            {!result.data.contents?.length && !result.data.users?.length && !result.data.areas?.length ? <EmptyState title="Không tìm thấy kết quả" description={`Không có dữ liệu phù hợp với “${q}”.`} /> : null}
            <Pagination meta={result.meta} onPageChange={changePage} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
