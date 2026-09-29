import { Stream, STREAM_STATUS_LIVE } from '@/features/catalog/stream';

const MAX_DISPLAYED_STREAMS = 10;

/**
 * Live first, then newest first, and that is all this ever tests for.
 *
 * ⭐ It reads `live` rather than switching on the status on purpose, so a status it has never heard
 * of — `scheduled` was one until the admin layer started writing it — lands in the same bucket as a
 * recording and is ordered by timestamp with the rest. An announcement is not more urgent than a
 * broadcast that is actually running, and a comparator that had to be taught each new status would
 * have sorted the unknown one to an arbitrary end of the list instead.
 */
function compareStreams(a: { state?: string; timestamp?: number; index?: number }, b: typeof a): number {
  const aLive = a.state === STREAM_STATUS_LIVE;
  const bLive = b.state === STREAM_STATUS_LIVE;
  if (aLive !== bLive) {
    return aLive ? -1 : 1;
  }

  const aHasTs = typeof a.timestamp === 'number';
  const bHasTs = typeof b.timestamp === 'number';
  if (aHasTs && bHasTs) {
    return b.timestamp! - a.timestamp!;
  }
  if (aHasTs !== bHasTs) {
    return aHasTs ? -1 : 1;
  }

  return (b.index ?? 0) - (a.index ?? 0);
}

/** The streams the browse page shows, in the order it shows them. */
export function displayedStreams(streamList: readonly Stream[]): Stream[] {
  return streamList.slice(-MAX_DISPLAYED_STREAMS).sort(compareStreams);
}
