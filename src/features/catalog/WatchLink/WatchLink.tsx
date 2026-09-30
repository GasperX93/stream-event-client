import { Link } from 'react-router';

import { type Stream, STREAM_STATUS_LIVE } from '@/features/catalog/stream';
import { callToAction } from '@/features/catalog/streamLabels';
import { watchPath } from '@/features/catalog/watchPath';

import './WatchLink.scss';

/** The outlined call to open a stream under its thumbnail, filled in orange while the stream is live. */
export function WatchLink({ stream }: { stream: Pick<Stream, 'mediatype' | 'owner' | 'topic' | 'state'> }) {
  const isLive = stream.state === STREAM_STATUS_LIVE;

  return (
    <Link className={`watch-link${isLive ? ' live' : ''}`} to={watchPath(stream)}>
      {callToAction(stream.state)}
    </Link>
  );
}
