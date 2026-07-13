import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ meta, onPageChange }) {
  const page = Number(meta?.page || 1);
  const totalPages = Math.max(1, Number(meta?.totalPages || 1));
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let value = start; value <= end; value += 1) pages.push(value);

  return (
    <nav className="pagination" aria-label="Phân trang">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft size={18} />
      </button>
      {start > 1 ? (
        <>
          <button type="button" onClick={() => onPageChange(1)}>1</button>
          {start > 2 ? <span>…</span> : null}
        </>
      ) : null}
      {pages.map((value) => (
        <button
          type="button"
          className={value === page ? 'is-active' : ''}
          key={value}
          onClick={() => onPageChange(value)}
          aria-current={value === page ? 'page' : undefined}
        >
          {value}
        </button>
      ))}
      {end < totalPages ? (
        <>
          {end < totalPages - 1 ? <span>…</span> : null}
          <button type="button" onClick={() => onPageChange(totalPages)}>{totalPages}</button>
        </>
      ) : null}
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
