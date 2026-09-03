import { ChevronLeft, ChevronRight } from 'lucide-react';

import './Pagination.css';

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
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Trang trước"
      >
        <ChevronLeft size={18} />
      </button>

      {start > 1 ? (
        <>
          <button type="button" onClick={() => onPageChange(1)} aria-label="Trang 1">
            1
          </button>
          {start > 2 ? <span aria-hidden="true">…</span> : null}
        </>
      ) : null}

      {pages.map((value) => (
        <button
          type="button"
          className={value === page ? 'is-active' : ''}
          key={value}
          onClick={() => onPageChange(value)}
          aria-current={value === page ? 'page' : undefined}
          aria-label={`Trang ${value}${value === page ? ', trang hiện tại' : ''}`}
        >
          <span>{value}</span>
        </button>
      ))}

      {end < totalPages ? (
        <>
          {end < totalPages - 1 ? <span aria-hidden="true">…</span> : null}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            aria-label={`Trang ${totalPages}`}
          >
            {totalPages}
          </button>
        </>
      ) : null}

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Trang sau"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
