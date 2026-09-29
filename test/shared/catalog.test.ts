import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
  viewerCatalogEntrySchema,
  viewerCatalogRungSchema,
  viewerCatalogSchema,
} from '../../src/shared/contracts/catalog.js';

const RUNG = {
  name: '720p',
  width: 1280,
  height: 720,
  topic: 'rung-topic',
  bandwidth: 2_800_000,
  avgBandwidth: 2_500_000,
};
const ENTRY = { owner: '0xowner', topic: 'topic', title: 'A broadcast', timestamp: 1, mediatype: 'video' };

const accepts = (schema: { safeParse(value: unknown): { success: boolean } }, value: unknown): boolean =>
  schema.safeParse(value).success;

describe('a rung, as the viewer reads it off the catalog', () => {
  it('takes the six fields every rung carries, an index and a duration each alone, and fields it does not know', () => {
    assert.equal(accepts(viewerCatalogRungSchema, RUNG), true);
    assert.equal(accepts(viewerCatalogRungSchema, { ...RUNG, index: 2 }), true);
    assert.equal(accepts(viewerCatalogRungSchema, { ...RUNG, duration: 2 }), true);
    assert.deepEqual(viewerCatalogRungSchema.parse({ ...RUNG, extra: true }), { ...RUNG, extra: true });
  });

  it('takes an empty name or topic', () => {
    assert.equal(accepts(viewerCatalogRungSchema, { ...RUNG, name: '', topic: '' }), true);
  });

  it('refuses a number that is not finite and a field of the wrong kind', () => {
    for (const change of [
      { width: Infinity },
      { bandwidth: Number.NaN },
      { index: '2' },
      { name: 1 },
      { topic: null },
    ]) {
      assert.equal(accepts(viewerCatalogRungSchema, { ...RUNG, ...change }), false, JSON.stringify(change));
    }
  });
});

describe('a catalog entry, as the viewer reads it', () => {
  it('takes the five fields every entry carries, and every optional one as a writer writes it', () => {
    assert.equal(accepts(viewerCatalogEntrySchema, ENTRY), true);
    assert.equal(
      accepts(viewerCatalogEntrySchema, {
        ...ENTRY,
        state: 'vod',
        index: 3,
        duration: 42,
        thumbnail: '',
        scheduledStartTime: null,
        description: 'about it',
        tags: ['one'],
        group: 'topic',
        renditions: [RUNG],
      }),
      true,
    );
  });

  it('takes a state it does not know, a duration as text, and a start time as text or a number', () => {
    assert.equal(accepts(viewerCatalogEntrySchema, { ...ENTRY, state: 'announced-by-a-future-writer' }), true);
    assert.equal(accepts(viewerCatalogEntrySchema, { ...ENTRY, duration: '42.5' }), true);
    assert.equal(accepts(viewerCatalogEntrySchema, { ...ENTRY, scheduledStartTime: '2026-01-01T00:00:00Z' }), true);
    assert.equal(accepts(viewerCatalogEntrySchema, { ...ENTRY, scheduledStartTime: 1_800_000_000_000 }), true);
  });

  it('refuses an entry of another media type, or with a field of the wrong kind', () => {
    for (const change of [
      { mediatype: 'image' },
      { owner: 12 },
      { timestamp: Infinity },
      { state: 1 },
      { duration: null },
      { index: '2' },
      { thumbnail: 12 },
      { scheduledStartTime: false },
      { renditions: {} },
      { renditions: [{ ...RUNG, width: 'wide' }] },
    ]) {
      assert.equal(accepts(viewerCatalogEntrySchema, { ...ENTRY, ...change }), false, JSON.stringify(change));
    }
  });

  it('keeps the whole entry as written', () => {
    const entry = { ...ENTRY, legacyField: { kept: true } };
    assert.deepEqual(viewerCatalogEntrySchema.parse(entry), entry);
  });
});

describe('the catalog, as the viewer reads it', () => {
  it('is a list of entries, refused whole when any one entry is refused', () => {
    assert.equal(accepts(viewerCatalogSchema, [ENTRY, ENTRY]), true);
    assert.equal(accepts(viewerCatalogSchema, []), true);
    assert.equal(accepts(viewerCatalogSchema, [ENTRY, { ...ENTRY, title: null }]), false);
    assert.equal(accepts(viewerCatalogSchema, { entries: [ENTRY] }), false);
  });
});
