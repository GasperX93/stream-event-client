import type { Stream } from '@/features/catalog/stream';

/** The watch page of a stream, matching `ROUTES.STREAM_WATCH`. */
export function watchPath({ mediatype, owner, topic }: Pick<Stream, 'mediatype' | 'owner' | 'topic'>): string {
  return `/watch/${mediatype}/${owner}/${topic}`;
}
