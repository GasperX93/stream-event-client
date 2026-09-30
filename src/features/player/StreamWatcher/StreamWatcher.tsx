import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { SwarmHlsPlayer } from '@/features/player/SwarmHlsPlayer';
import { useAppContext } from '@/app/AppProvider';
import { watchPageCatalogPollMs } from '@/features/catalog/catalogPoll';
import { useCatalogPoll } from '@/features/catalog/useCatalogPoll';
import { ROUTES } from '@/app/routes';
import {
  MEDIA_TYPE_AUDIO,
  MEDIA_TYPE_VIDEO,
  MediaType,
  STREAM_STATUS_LIVE,
  STREAM_STATUS_SCHEDULED,
} from '@/features/catalog/stream';
import { playableRenditions } from '@/features/player/playableRenditions';
import { scheduledStartLabel } from '@/features/catalog/scheduledStart';
import { WATCH_VIEW_PLAYER, watchPageView } from '@/features/catalog/watchPageView';
import { WatchChat } from '@/features/chat/WatchChat';

import { useIsWaitingForStart } from './useIsWaitingForStart';
import { WatchLayout } from './WatchLayout';
import { WatchNotice, WatchPlaceholder } from './WatchPlaceholder';

import './StreamWatcher.scss';

const VALID_MEDIA_TYPES: MediaType[] = [MEDIA_TYPE_AUDIO, MEDIA_TYPE_VIDEO];

function isMediaType(value: string): value is MediaType {
  return VALID_MEDIA_TYPES.includes(value as MediaType);
}

export function StreamWatcher() {
  const { mediatype, owner, topic } = useParams<{
    mediatype: string;
    owner: string;
    topic: string;
  }>();
  const [searchParams] = useSearchParams();
  const { streamList, isStreamListLoaded, chat } = useAppContext();
  // Which stream's player has played, so a new stream on the same page waits for its own player.
  const [playedStream, setPlayedStream] = useState<string | null>(null);

  // The ladder lives in the catalog, keyed by the primary feed the browser links to. Current
  // entries name the master, older ones the lowest rung. Waiting for the first catalog read
  // rather than rendering without
  // it keeps a deep link from starting single-rendition and rebuilding a second later.
  const stream = streamList.find((entry) => entry.owner === owner && entry.topic === topic);

  // Above the early return, because a hook may not be skipped on some renders.
  const isWaiting = useIsWaitingForStart(`${owner}/${topic}`, stream);
  const view = watchPageView(isStreamListLoaded, stream, isWaiting);
  useCatalogPoll(watchPageCatalogPollMs(view));

  const streamKey = `${owner}/${topic}`;

  const back = (
    <Link className="watch-back" to={ROUTES.STREAM_BROWSER}>
      <span aria-hidden="true">←</span> All streams
    </Link>
  );

  if (!mediatype || !owner || !topic || !isMediaType(mediatype)) {
    return (
      <WatchLayout
        back={back}
        stage={
          <WatchNotice>
            <p className="watch-notice-title">This link does not name a stream.</p>
          </WatchNotice>
        }
      />
    );
  }

  const enableQoeOverlay = searchParams.get('qoe') === '1';
  // ?level=<rung name> pins playback to one rung, ?level=auto hands the choice to ABR. The route
  // carries no ladder of its own, so the rung names come from the catalog entry below.
  const level = searchParams.get('level') ?? undefined;

  // Neither message mounts the player. An announced broadcast has no manifest feed under its topic
  // yet, so a player there polls a slot nobody writes and loads for ever. See `watchPageView`.
  const startsAt = scheduledStartLabel(stream?.scheduledStartTime);

  return (
    <WatchLayout
      back={back}
      stage={
        view === WATCH_VIEW_PLAYER ? (
          <SwarmHlsPlayer
            owner={owner}
            topicString={topic}
            mediaType={mediatype}
            enableQoeOverlay={enableQoeOverlay}
            renditions={playableRenditions(stream)}
            level={level}
            onPlaying={() => setPlayedStream(streamKey)}
          />
        ) : (
          <WatchPlaceholder view={view} startsAt={startsAt} />
        )
      }
      side={
        chat && (
          <WatchChat
            key={streamKey}
            chat={chat}
            topic={topic}
            isPlayerSettled={view !== WATCH_VIEW_PLAYER || playedStream === streamKey}
          />
        )
      }
      info={
        stream && (
          <div className="watch-info">
            {stream.state === STREAM_STATUS_LIVE && <span className="watch-info-state live">Live</span>}
            {stream.state === STREAM_STATUS_SCHEDULED && <span className="watch-info-state upcoming">Upcoming</span>}
            <h1 className="watch-info-title">{stream.title}</h1>
          </div>
        )
      }
    />
  );
}
