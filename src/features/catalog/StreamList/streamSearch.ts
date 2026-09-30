import type { Stream } from '@/features/catalog/stream';

type Searchable = Pick<Stream, 'title' | 'description' | 'tags'>;

function normalized(query: string): string {
  return query.trim().toLowerCase();
}

/** Whether a query asks for anything, since a box holding only spaces is still an empty box. */
export function isSearching(query: string): boolean {
  return normalized(query) !== '';
}

function matches(stream: Searchable, needle: string): boolean {
  return (
    stream.title.toLowerCase().includes(needle) ||
    Boolean(stream.description?.toLowerCase().includes(needle)) ||
    Boolean(stream.tags?.some((tag) => tag.toLowerCase().includes(needle)))
  );
}

/** The streams whose title, description or a tag contains the query, in the order they were handed. */
export function searchStreams<T extends Searchable>(streams: readonly T[], query: string): T[] {
  const needle = normalized(query);
  return streams.filter((stream) => matches(stream, needle));
}
