import './MessageReaction.scss';

interface MessageReactionProps {
  emoji: string;
  count: number;
  isUserReaction: boolean;
  isSending: boolean;
  onClick: () => void;
}

/** A reaction under a message, pressed when it is the viewer's own, which a click takes back. */
export function MessageReaction({ emoji, count, isUserReaction, isSending, onClick }: MessageReactionProps) {
  return (
    <button
      type="button"
      className={['message-reaction', isUserReaction && 'user-reaction'].filter(Boolean).join(' ')}
      aria-pressed={isUserReaction}
      aria-label={`${emoji} ${count}`}
      title={`${count} ${count === 1 ? 'reaction' : 'reactions'}`}
      disabled={isSending}
      onClick={onClick}
    >
      <span className="reaction-emoji" aria-hidden="true">
        {emoji}
      </span>
      <span className="reaction-count" aria-hidden="true">
        {count}
      </span>
    </button>
  );
}
