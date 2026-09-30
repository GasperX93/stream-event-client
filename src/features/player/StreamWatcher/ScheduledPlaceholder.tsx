import { useEffect, useState } from 'react';

import { scheduledCountdown } from './scheduledCountdown';

import './ScheduledPlaceholder.scss';

/** Often enough that "Live in 1 minute" never stands for long after it stops being true. */
const COUNTDOWN_TICK_MS = 30_000;

function useNow(tickMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(timer);
  }, [tickMs]);

  return now;
}

interface ScheduledPlaceholderProps {
  /** The announced start in epoch milliseconds, or null when the entry names none. */
  scheduledStart: number | null;
  /** The picture the publisher gave the broadcast, or null when there is none. */
  thumbnailUrl: string | null;
}

/**
 * Stands where the player will be for a broadcast that is announced but not live: its picture, and
 * how long until it starts, as the Swarm site shows it.
 */
export function ScheduledPlaceholder({ scheduledStart, thumbnailUrl }: ScheduledPlaceholderProps) {
  const now = useNow(COUNTDOWN_TICK_MS);
  // The reference and not a boolean, so a picture the publisher replaces is tried again.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const picture = thumbnailUrl !== null && thumbnailUrl !== failedUrl ? thumbnailUrl : null;
  const countdown = scheduledStart === null ? null : scheduledCountdown(scheduledStart, now);

  return (
    <div className="scheduled-placeholder" role="status">
      {picture && (
        <>
          <img className="scheduled-placeholder-backdrop" src={picture} alt="" aria-hidden="true" />
          <img
            key={picture}
            className="scheduled-placeholder-image"
            src={picture}
            alt=""
            onError={() => setFailedUrl(picture)}
          />
        </>
      )}
      <div className="scheduled-placeholder-overlay">
        {countdown ? (
          <>
            <span className="scheduled-placeholder-relative">{countdown.relative}</span>
            <span className="scheduled-placeholder-absolute">{countdown.absolute}</span>
          </>
        ) : (
          <span className="scheduled-placeholder-relative">This stream has not started yet.</span>
        )}
      </div>
    </div>
  );
}
