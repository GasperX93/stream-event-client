import { FeedStatus } from '@solarpunkltd/swarm-chat-js';

import './FeedNotice.scss';

/** What the viewer is told while the chat's feed is not live, in the library's own terms for why. */
const NOTICES: Partial<Record<FeedStatus, { title: string; detail: string }>> = {
  [FeedStatus.RECONNECTING]: {
    title: 'Reconnecting to the chat…',
    detail: 'The chat node is not answering. New messages show here once it does.',
  },
  [FeedStatus.STALLED]: {
    title: 'The chat is not updating right now.',
    detail: 'A new message has not loaded yet. It shows here once it does.',
  },
};

export function FeedNotice({ status }: { status: FeedStatus | null }) {
  const notice = status ? NOTICES[status] : undefined;
  if (!notice) {
    return null;
  }
  return (
    <div className="chat-feed-notice" role="status">
      <p className="chat-feed-notice-title">{notice.title}</p>
      <p className="chat-feed-notice-detail">{notice.detail}</p>
    </div>
  );
}
