import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import { scheduledCountdown } from '../src/features/player/StreamWatcher/scheduledCountdown';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 10, 17, 9, 0);

const relative = (startInMs: number) => scheduledCountdown(NOW + startInMs, NOW).relative;

/** The words over the placeholder of an announced broadcast, as msrs-client's `ScheduledPlaceholder` shows them. */
describe('how long until an announced broadcast starts', () => {
  it('counts whole days while it is a day or more away', () => {
    assert.equal(relative(2 * DAY + 5 * HOUR), 'Live in 2 days');
    assert.equal(relative(DAY), 'Live in 1 day');
  });

  it('counts whole hours on its last day', () => {
    assert.equal(relative(3 * HOUR + 59 * MINUTE), 'Live in 3 hours');
    assert.equal(relative(HOUR), 'Live in 1 hour');
  });

  it('counts minutes in its last hour, and never says zero', () => {
    assert.equal(relative(45 * MINUTE), 'Live in 45 minutes');
    assert.equal(relative(MINUTE), 'Live in 1 minute');
    assert.equal(relative(20_000), 'Live in 1 minute');
  });

  it('says it is starting soon once the time has come and the stream has not', () => {
    assert.equal(relative(0), 'Starting soon');
    assert.equal(relative(-10 * MINUTE), 'Starting soon');
  });

  it('names the day and the time it starts, in the reader’s own clock', () => {
    const { absolute } = scheduledCountdown(NOW + DAY, NOW);
    const expected = new Date(NOW + DAY).toLocaleString(undefined, {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    assert.equal(absolute, expected);
  });
});
