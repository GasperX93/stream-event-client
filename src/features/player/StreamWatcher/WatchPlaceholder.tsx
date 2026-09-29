import {
  WATCH_VIEW_LOADING,
  WATCH_VIEW_NOT_STARTED,
  WATCH_VIEW_UNAVAILABLE,
  type WatchPageView,
} from '@/features/catalog/watchPageView';
import { Spinner } from '@/shared/components/Spinner/Spinner';

interface WatchPlaceholderProps {
  view: WatchPageView;
  /** The scheduled start, already worded for a person, or null when the entry names none. */
  startsAt: string | null;
}

/**
 * What the watch page says in place of the player, and nothing once the player is showing. A shared link opens
 * before the catalog has been read, and a first read over a cold gateway takes a while.
 */
export function WatchPlaceholder({ view, startsAt }: WatchPlaceholderProps) {
  if (view === WATCH_VIEW_LOADING) {
    return (
      <WatchNotice>
        <Spinner />
        <p>Loading this stream…</p>
      </WatchNotice>
    );
  }
  if (view === WATCH_VIEW_NOT_STARTED) {
    return (
      <WatchNotice>
        <p className="watch-notice-title">This stream has not started yet.</p>
        {startsAt && <p className="watch-notice-detail">Scheduled for {startsAt}</p>}
      </WatchNotice>
    );
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
 * Stands where the player would, in the player's shape, so a viewer who followed a link to an
 * announced broadcast, or to one unpublished while they waited, lands on the page they expected.
 */
export function WatchNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="watch-notice" role="status">
      {children}
    </div>
  );
}
