import './StreamSearch.scss';

interface StreamSearchProps {
  query: string;
  onChange: (query: string) => void;
}

/** The search box above the stream list, filtering as the viewer types. */
export function StreamSearch({ query, onChange }: StreamSearchProps) {
  return (
    <div className="stream-search">
      <div className="stream-search-wrapper">
        <svg className="stream-search-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="search"
          className="stream-search-input"
          value={query}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search..."
          aria-label="Search streams"
          autoComplete="off"
        />
        {query && (
          <button type="button" className="stream-search-clear" onClick={() => onChange('')} aria-label="Clear search">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
