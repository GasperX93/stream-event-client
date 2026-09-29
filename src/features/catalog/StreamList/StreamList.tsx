import { useMemo } from 'react';

import { StreamPreview } from '@/features/catalog/StreamPreview/StreamPreview';
import { useAppContext } from '@/app/AppProvider';
import type { Stream } from '@/features/catalog/stream';

import { streamGroups, type StreamGroups } from './displayedStreams';

import './StreamList.scss';

const SECTIONS: Array<{ group: keyof StreamGroups; title: string }> = [
  { group: 'live', title: 'Live now' },
  { group: 'upcoming', title: 'Upcoming' },
  { group: 'finished', title: 'Finished' },
];

export function StreamList() {
  const { streamList } = useAppContext();

  const groups = useMemo(() => streamGroups(streamList), [streamList]);

  return (
    <div className="stream-list">
      {SECTIONS.filter(({ group }) => groups[group].length > 0).map(({ group, title }) => (
        <section key={group} className={`stream-section stream-section-${group}`} aria-labelledby={`streams-${group}`}>
          <h2 id={`streams-${group}`} className="stream-section-title">
            {title}
          </h2>
          <ul className="stream-section-grid">
            {groups[group].map((stream) => (
              <li key={stream.topic}>
                <StreamCard stream={stream} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function StreamCard({ stream }: { stream: Stream }) {
  return (
    <StreamPreview
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
  );
}
