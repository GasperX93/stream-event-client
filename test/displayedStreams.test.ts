import { describe, expect, it } from 'vitest';

import { displayedStreams, streamGroups } from '../src/features/catalog/StreamList/displayedStreams';
import {
  type Stream,
  STREAM_STATUS_LIVE,
  STREAM_STATUS_SCHEDULED,
  STREAM_STATUS_VOD,
} from '../src/features/catalog/stream';

function entry(index: number, state: string, timestamp: number, scheduledStartTime?: string | null): Stream {
  return {
    owner: '0x' + '1'.repeat(40),
    topic: `topic-${index}`,
    title: `Stage ${index}`,
    timestamp,
    mediatype: 'video',
    state,
    index,
    ...(scheduledStartTime !== undefined && { scheduledStartTime }),
  };
}

describe('the streams the browse page shows', () => {
  it('shows every entry of a catalog of twelve', () => {
    const catalog = Array.from({ length: 12 }, (_, i) => entry(i, STREAM_STATUS_VOD, 1_000 + i));

    expect(displayedStreams(catalog)).toHaveLength(12);
  });

  it('keeps the oldest entry of a long catalog', () => {
    const catalog = Array.from({ length: 30 }, (_, i) => entry(i, STREAM_STATUS_VOD, 1_000 + i));

    expect(displayedStreams(catalog).map((stream) => stream.topic)).toContain('topic-0');
  });

  it('puts live streams first, then upcoming soonest first, then finished newest first', () => {
    const catalog = [
      entry(0, STREAM_STATUS_VOD, 1_000),
      entry(1, STREAM_STATUS_LIVE, 1_001),
      entry(2, STREAM_STATUS_SCHEDULED, 1_002, '2026-11-05T10:00:00Z'),
      entry(3, STREAM_STATUS_LIVE, 1_003),
      entry(4, STREAM_STATUS_VOD, 1_004),
      entry(5, STREAM_STATUS_SCHEDULED, 1_005, '2026-11-03T09:00:00Z'),
      entry(6, STREAM_STATUS_SCHEDULED, 1_006, '2026-11-04T09:00:00Z'),
    ];

    expect(displayedStreams(catalog).map((stream) => stream.topic)).toEqual([
      'topic-3',
      'topic-1',
      'topic-5',
      'topic-6',
      'topic-2',
      'topic-4',
      'topic-0',
    ]);
  });

  it('puts an upcoming stream with no start time after the ones that have one', () => {
    const catalog = [
      entry(0, STREAM_STATUS_SCHEDULED, 1_000, null),
      entry(1, STREAM_STATUS_SCHEDULED, 1_001, '2026-11-06T09:00:00Z'),
      entry(2, STREAM_STATUS_SCHEDULED, 1_002, 'not a time'),
    ];

    expect(displayedStreams(catalog).map((stream) => stream.topic)).toEqual(['topic-1', 'topic-2', 'topic-0']);
  });

  it('files a state it does not know with the finished streams', () => {
    const catalog = [entry(0, 'archived', 1_000), entry(1, STREAM_STATUS_SCHEDULED, 1_001, '2026-11-03T09:00:00Z')];

    expect(streamGroups(catalog)).toEqual({ live: [], upcoming: [catalog[1]], finished: [catalog[0]] });
  });

  it('leaves the catalog it was handed as it was', () => {
    const catalog = [entry(0, STREAM_STATUS_VOD, 1_000), entry(1, STREAM_STATUS_LIVE, 1_001)];
    const before = catalog.map((stream) => stream.topic);

    displayedStreams(catalog);

    expect(catalog.map((stream) => stream.topic)).toEqual(before);
  });
});
