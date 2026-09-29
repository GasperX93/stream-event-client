import { ReactNode } from 'react';

import './WatchLayout.scss';

interface WatchLayoutProps {
  /** The way back to the list, above everything else. */
  back: ReactNode;
  /** The player, or what stands in its place. */
  stage: ReactNode;
  /** The stream's title and state, under the stage. */
  info?: ReactNode;
  /**
   * A panel beside the stage on a desktop and under it on a phone. The chat goes here. Without one
   * the stage takes the whole width.
   */
  side?: ReactNode;
}

export function WatchLayout({ back, stage, info, side }: WatchLayoutProps) {
  return (
    <div className={side ? 'watch-layout with-side' : 'watch-layout'}>
      <div className="watch-layout-back">{back}</div>
      <div className="watch-layout-stage">{stage}</div>
      {info && <div className="watch-layout-info">{info}</div>}
      {side && <aside className="watch-layout-side">{side}</aside>}
    </div>
  );
}
