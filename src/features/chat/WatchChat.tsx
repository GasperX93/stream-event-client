import { lazy, Suspense, useEffect, useState } from 'react';

import type { ChatConfig } from '@/config/runtimeConfig';
import { Spinner } from '@/shared/components/Spinner/Spinner';

import './WatchChat.scss';

/**
 * The chat, the chat library and its own Bee client are a file of their own, fetched once the video is
 * playing so the first frame never waits for them.
 */
const Chat = lazy(() => import('./Chat/Chat'));

/** A player that has not started by then is not waited for any longer. */
export const CHAT_LOAD_FALLBACK_MS = 5_000;

interface WatchChatProps {
  chat: ChatConfig;
  owner: string;
  topic: string;
  /** False while a player is on the page and has not played yet. */
  isPlayerSettled: boolean;
}

function ChatPlaceholder() {
  return (
    <div className="watch-chat-placeholder" role="status">
      <p className="watch-chat-placeholder-title">Chat</p>
      <p className="watch-chat-placeholder-detail">
        <Spinner /> Loading the chat…
      </p>
    </div>
  );
}

export function WatchChat({ chat, owner, topic, isPlayerSettled }: WatchChatProps) {
  const [hasWaitedLongEnough, setHasWaitedLongEnough] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasWaitedLongEnough(true), CHAT_LOAD_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!isPlayerSettled && !hasWaitedLongEnough) {
    return <ChatPlaceholder />;
  }

  return (
    <Suspense fallback={<ChatPlaceholder />}>
      <Chat chat={chat} owner={owner} topic={topic} />
    </Suspense>
  );
}
