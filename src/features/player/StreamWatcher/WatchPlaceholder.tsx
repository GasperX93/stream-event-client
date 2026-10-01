import {
  WATCH_VIEW_LOADING,
  WATCH_VIEW_NOT_STARTED,
  WATCH_VIEW_UNAVAILABLE,
  type WatchPageView,
} from '@/features/catalog/watchPageView';
import { Spinner } from '@/shared/components/Spinner/Spinner';

import { ScheduledPlaceholder } from './ScheduledPlaceholder';

interface WatchPlaceholderProps {
  view: WatchPageView;
  /** The announced start in epoch milliseconds, or null when the entry names none. */
  scheduledStart: number | null;
  /** The picture the publisher gave the stream, or null when there is none. */
  thumbnailUrl: string | null;
}

/**
 * What the watch page says in place of the player, and nothing once the player is showing. A shared link opens
 * before the catalog has been read, and a first read over a cold gateway takes a while.
 */
export function WatchPlaceholder({ view, scheduledStart, thumbnailUrl }: WatchPlaceholderProps) {
  if (view === WATCH_VIEW_LOADING) {
    return (
      <WatchNotice>
        <Spinner />
        <p className="watch-notice-title">Loading this stream…</p>
      </WatchNotice>
    );
  }
  if (view === WATCH_VIEW_NOT_STARTED) {
    return <ScheduledPlaceholder scheduledStart={scheduledStart} thumbnailUrl={thumbnailUrl} />;
  }
  if (view === WATCH_VIEW_UNAVAILABLE) {
    return (
      <WatchNotice>
        <p className="watch-notice-title">This stream is no longer available.</p>
      </WatchNotice>
    );
  }
  return null;
}

/**
 * Stands where the player would, in the player's shape, so a viewer who followed a link to a stream
 * that is loading or gone lands on the page they expected.
 */
export function WatchNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="watch-notice" role="status">
      {children}
    </div>
  );
}
