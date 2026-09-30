import './Pagination.scss';

interface PaginationProps {
  page: number;
  count: number;
  onChange: (page: number) => void;
}

/** The small orange arrows under the past streams, shown only when there is more than one page. */
export function Pagination({ page, count, onChange }: PaginationProps) {
  if (count <= 1) {
    return null;
  }

  return (
    <nav className="pagination" aria-label="Past streams pages">
      <button
        type="button"
        className="pagination-button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>
      <span className="pagination-info">
        {page} / {count}
      </span>
      <button
        type="button"
        className="pagination-button"
        onClick={() => onChange(page + 1)}
        disabled={page >= count}
        aria-label="Next page"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
      </button>
    </nav>
  );
}
