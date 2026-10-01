const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** What the featured block shows before a scheduled start: the time left, or that the start has come. */
export type Countdown = { kind: 'counting'; days: number; hours: number; minutes: number } | { kind: 'starting-soon' };

export function countdownTo(startMs: number, nowMs: number): Countdown {
  const left = startMs - nowMs;
  if (left <= 0) {
    return { kind: 'starting-soon' };
  }
  return {
    kind: 'counting',
    days: Math.floor(left / MS_PER_DAY),
    hours: Math.floor((left % MS_PER_DAY) / MS_PER_HOUR),
    minutes: Math.floor((left % MS_PER_HOUR) / MS_PER_MINUTE),
  };
}

export function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}
