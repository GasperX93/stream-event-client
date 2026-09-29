import { describe, expect, it } from 'vitest';

import { displayedStreams } from '../src/features/catalog/StreamList/displayedStreams';
import {
  type Stream,
  STREAM_STATUS_LIVE,
  STREAM_STATUS_SCHEDULED,
  STREAM_STATUS_VOD,
} from '../src/features/catalog/stream';

function entry(index: number, state: string, timestamp: number): Stream {
  return {
    owner: '0x' + '1'.repeat(40),
    topic: `topic-${index}`,
    title: `Stage ${index}`,
    timestamp,
    mediatype: 'video',
    state,
    index,
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

  it('puts live streams first, then the rest newest first', () => {
    const catalog = [
      entry(0, STREAM_STATUS_VOD, 1_000),
      entry(1, STREAM_STATUS_LIVE, 1_001),
      entry(2, STREAM_STATUS_SCHEDULED, 1_002),
      entry(3, STREAM_STATUS_LIVE, 1_003),
      entry(4, STREAM_STATUS_VOD, 1_004),
    ];

    expect(displayedStreams(catalog).map((stream) => stream.topic)).toEqual([
      'topic-3',
      'topic-1',
      'topic-4',
      'topic-2',
      'topic-0',
    ]);
  });

  it('leaves the catalog it was handed as it was', () => {
    const catalog = [entry(0, STREAM_STATUS_VOD, 1_000), entry(1, STREAM_STATUS_LIVE, 1_001)];
    const before = catalog.map((stream) => stream.topic);

    displayedStreams(catalog);

    expect(catalog.map((stream) => stream.topic)).toEqual(before);
  });
});
