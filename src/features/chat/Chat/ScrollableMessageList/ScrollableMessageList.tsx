import { ReactNode, useCallback, useEffect, useRef } from 'react';

import type { VisibleMessage } from '../../useSwarmChat';

import './ScrollableMessageList.scss';

interface ScrollableMessageListProps {
  items: VisibleMessage[];
  label: string;
  renderItem: (item: VisibleMessage, onHeightChange: () => void) => ReactNode;
}

/** How near the bottom, in pixels, still counts as reading the newest messages. */
const NEAR_BOTTOM_PX = 50;

/**
 * Follows new messages while the viewer is at the bottom, and leaves them where they are when they have
 * scrolled up to read.
 */
export function ScrollableMessageList({ items, label, renderItem }: ScrollableMessageListProps) {
  const containerRef = useRef<HTMLOListElement>(null);
  const previousCountRef = useRef(0);

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  const isNearBottom = () => {
    const container = containerRef.current;
    if (!container) {
      return true;
    }
    return container.scrollTop + container.clientHeight >= container.scrollHeight - NEAR_BOTTOM_PX;
  };

  const handleHeightChange = useCallback(() => {
    if (isNearBottom()) {
      requestAnimationFrame(scrollToBottom);
    }
  }, []);

  useEffect(() => {
    const count = items.length;
    const isFirstFill = previousCountRef.current === 0 && count > 0;
    if (isFirstFill || (count > previousCountRef.current && isNearBottom())) {
      requestAnimationFrame(scrollToBottom);
    }
    previousCountRef.current = count;
  }, [items]);

  return (
    <ol className="chat-messages-container" ref={containerRef} aria-label={label}>
      {items.map((item) => renderItem(item, handleHeightChange))}
    </ol>
  );
}
