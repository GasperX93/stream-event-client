import { useEffect, useState } from 'react';

/** How often the browse page reads the clock, so a page left open moves its countdown and feature on. */
export const BROWSE_CLOCK_TICK_MS = 30_000;

/** The time now, read again every `intervalMs`. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
