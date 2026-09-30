import { describe, expect, it } from 'vitest';

import { countdownTo, twoDigits } from '../src/features/catalog/FeaturedStream/countdown';

const START = Date.parse('2026-11-04T12:00:00Z');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('the countdown to a scheduled start', () => {
  it('counts the whole days, hours and minutes left', () => {
    expect(countdownTo(START, START - (2 * DAY + 3 * HOUR + 4 * MINUTE + 59_000))).toEqual({
      kind: 'counting',
      days: 2,
      hours: 3,
      minutes: 4,
    });
  });

  it('counts down under a minute as zero minutes, not as started', () => {
    expect(countdownTo(START, START - 30_000)).toEqual({ kind: 'counting', days: 0, hours: 0, minutes: 0 });
  });

  it('says it is starting soon once the start time has come', () => {
    expect(countdownTo(START, START)).toEqual({ kind: 'starting-soon' });
    expect(countdownTo(START, START + HOUR)).toEqual({ kind: 'starting-soon' });
  });

  it('writes each figure with two digits', () => {
    expect(twoDigits(3)).toBe('03');
    expect(twoDigits(28)).toBe('28');
    expect(twoDigits(120)).toBe('120');
  });
});
