import { useEffect, useState } from 'react';

import type { ReactionSummary } from '../../reactions';
import type { VisibleMessage } from '../../useSwarmChat';
import { nameColor } from '../nameColor';

import { MessageActions } from './MessageActions/MessageActions';
import { MessageReactionsWrapper } from './MessageReactionsWrapper/MessageReactionsWrapper';
import { MessageThreadWrapper } from './MessageThreadWrapper/MessageThreadWrapper';
import { ProfilePicture, shortAddress } from './ProfilePicture/ProfilePicture';

import './ChatMessage.scss';

interface ChatMessageProps {
  message: VisibleMessage;
  ownMessage: boolean;
  reactions: ReactionSummary[];
  /** The emoji of this message's reaction still being sent, if any. */
  pendingReaction?: string | null;
  replyCount?: number;
  onReact: (emoji: string) => void;
  /** Left out where the message is itself the thread being read. */
  onOpenThread?: () => void;
  onRetry: () => void;
  onHeightChange?: () => void;
}

/**
 * How long an own message may sit written but unread from the chat feed before it is offered again.
 * Past this the aggregator has most likely missed it rather than being slow.
 */
const UNCONFIRMED_AFTER_MS = 20_000;

/** True once an own message has waited too long to be read back from the chat feed. */
function useIsUnconfirmed(waiting: boolean, onHeightChange?: () => void): boolean {
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);

  useEffect(() => {
    if (!waiting) {
      setIsUnconfirmed(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsUnconfirmed(true);
      onHeightChange?.();
    }, UNCONFIRMED_AFTER_MS);
    return () => clearTimeout(timer);
  }, [waiting, onHeightChange]);

  return isUnconfirmed;
}

export function ChatMessage({
  message,
  ownMessage,
  reactions,
  pendingReaction = null,
  replyCount = 0,
  onReact,
  onOpenThread,
  onRetry,
  onHeightChange,
}: ChatMessageProps) {
  const { error = false, received = false, uploaded = false, requested = false } = message;
  const isSending = !received && !error && (requested || uploaded);
  const isUnconfirmed = useIsUnconfirmed(ownMessage && uploaded && !received && !error, onHeightChange);
  const color = nameColor(message.username);

  const classes = [
    'chat-message',
    ownMessage && 'own-message',
    error && 'chat-message-error',
    isSending && 'not-received',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={classes}>
      <ProfilePicture name={message.username} address={message.address} color={color} />

      <div className="chat-message-body">
        <p className="chat-message-author">
          <span className="chat-message-name">{message.username}</span>{' '}
          <span className="chat-message-id">{shortAddress(message.address)}</span>
        </p>

        <div className="chat-message-text">
          <span className="message">{message.message}</span>
        </div>

        {error && (
          <p className="chat-message-status error">
            Not sent.{' '}
            <button type="button" className="chat-message-retry" onClick={onRetry}>
              Retry
            </button>
          </p>
        )}
        {isSending && !isUnconfirmed && <p className="chat-message-status">Sending…</p>}
        {isSending && isUnconfirmed && (
          <p className="chat-message-status">
            Not confirmed yet.{' '}
            <button type="button" className="chat-message-retry" onClick={onRetry}>
              Resend
            </button>
          </p>
        )}

        <MessageReactionsWrapper reactions={reactions} pendingReaction={pendingReaction} onReact={onReact} />

        {onOpenThread && <MessageThreadWrapper replyCount={replyCount} onOpenThread={onOpenThread} />}
      </div>

      {received && !error && (
        <MessageActions onReact={onReact} onOpenThread={onOpenThread} disabled={pendingReaction !== null} />
      )}
    </li>
  );
}
