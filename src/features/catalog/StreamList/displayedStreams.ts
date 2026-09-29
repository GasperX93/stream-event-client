import { scheduledStartMs } from '@/features/catalog/scheduledStart';
import { Stream, STREAM_STATUS_LIVE, STREAM_STATUS_SCHEDULED } from '@/features/catalog/stream';

/** The three groups the browse page shows, each already in the order it is shown in. */
export interface StreamGroups {
  live: Stream[];
  upcoming: Stream[];
  finished: Stream[];
}

type Ordered = Pick<Stream, 'timestamp' | 'index' | 'scheduledStartTime'>;

function newestFirst(a: Ordered, b: Ordered): number {
  const aHasTs = typeof a.timestamp === 'number';
  const bHasTs = typeof b.timestamp === 'number';
  if (aHasTs && bHasTs && a.timestamp !== b.timestamp) {
    return b.timestamp - a.timestamp;
  }
  if (aHasTs !== bHasTs) {
    return aHasTs ? -1 : 1;
  }
  return (b.index ?? 0) - (a.index ?? 0);
}

/** Soonest start first. An entry with no usable start time cannot be placed in time, so it goes last. */
function soonestFirst(a: Ordered, b: Ordered): number {
  const aStart = scheduledStartMs(a.scheduledStartTime);
  const bStart = scheduledStartMs(b.scheduledStartTime);
  if (aStart !== null && bStart !== null && aStart !== bStart) {
    return aStart - bStart;
  }
  if ((aStart === null) !== (bStart === null)) {
    return aStart === null ? 1 : -1;
  }
  return newestFirst(a, b);
}

/**
 * Every stream on the catalog, split into live, upcoming and finished.
 *
 * A state this has never heard of is filed as finished, so a status a publisher adds later lands
 * among the recordings rather than above a broadcast that is actually running.
 */
export function streamGroups(streamList: readonly Stream[]): StreamGroups {
  const groups: StreamGroups = { live: [], upcoming: [], finished: [] };
  for (const stream of streamList) {
    if (stream.state === STREAM_STATUS_LIVE) {
      groups.live.push(stream);
    } else if (stream.state === STREAM_STATUS_SCHEDULED) {
      groups.upcoming.push(stream);
    } else {
      groups.finished.push(stream);
    }
  }
  groups.live.sort(newestFirst);
  groups.upcoming.sort(soonestFirst);
  groups.finished.sort(newestFirst);
  return groups;
}

/** Every stream on the catalog, in the order the browse page shows them. */
export function displayedStreams(streamList: readonly Stream[]): Stream[] {
  const { live, upcoming, finished } = streamGroups(streamList);
  return [...live, ...upcoming, ...finished];
}
