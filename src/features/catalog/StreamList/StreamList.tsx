import { useMemo } from 'react';

import { StreamPreview } from '@/features/catalog/StreamPreview/StreamPreview';
import { useAppContext } from '@/app/AppProvider';

import { displayedStreams } from './displayedStreams';

import './StreamList.scss';

export function StreamList() {
  const { streamList } = useAppContext();

  const shownStreams = useMemo(() => displayedStreams(streamList), [streamList]);

  return (
    <div className="stream-list">
      <div className="stream-list-text">Choose a stream!</div>
      <div className="stream-preview-list">
        {shownStreams.map((stream) => (
          <StreamPreview
            key={stream.topic}
            owner={stream.owner}
            topic={stream.topic}
            state={stream.state}
            duration={stream.duration}
            mediatype={stream.mediatype}
            title={stream.title}
            index={stream.index}
            renditions={stream.renditions}
            thumbnail={stream.thumbnail}
            scheduledStartTime={stream.scheduledStartTime}
          />
        ))}
      </div>
    </div>
  );
}
