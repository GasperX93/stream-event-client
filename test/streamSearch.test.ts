import { describe, expect, it } from 'vitest';

import { isSearching, searchStreams } from '../src/features/catalog/StreamList/streamSearch';
import { type Stream, STREAM_STATUS_VOD } from '../src/features/catalog/stream';

function entry(topic: string, fields: Partial<Stream>): Stream {
  return {
    owner: '0x' + '1'.repeat(40),
    topic,
    title: '',
    timestamp: 1_000,
    mediatype: 'video',
    state: STREAM_STATUS_VOD,
    ...fields,
  };
}

const CATALOG = [
  entry('a', { title: 'Opening Ceremony' }),
  entry('b', { title: 'Main stage', description: 'Keynote on Swarm storage' }),
  entry('c', { title: 'Workshop', tags: ['Rust', 'bee'] }),
];

const topics = (streams: Stream[]) => streams.map((stream) => stream.topic);

describe('searching the streams', () => {
  it('matches the title, the description and the tags, whatever the case', () => {
    expect(topics(searchStreams(CATALOG, 'ceremony'))).toEqual(['a']);
    expect(topics(searchStreams(CATALOG, 'SWARM'))).toEqual(['b']);
    expect(topics(searchStreams(CATALOG, 'rust'))).toEqual(['c']);
  });

  it('matches part of a word, and ignores the spaces around the query', () => {
    expect(topics(searchStreams(CATALOG, '  sta '))).toEqual(['b']);
  });

  it('keeps the order it was handed', () => {
    expect(topics(searchStreams(CATALOG, 'o'))).toEqual(['a', 'b', 'c']);
  });

  it('finds nothing when nothing matches', () => {
    expect(searchStreams(CATALOG, 'devcon')).toEqual([]);
  });

  it('counts only a query with something other than spaces in it as a search', () => {
    expect(isSearching('')).toBe(false);
    expect(isSearching('   ')).toBe(false);
    expect(isSearching(' a ')).toBe(true);
  });
});
