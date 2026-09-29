import type { ReactionSummary } from '../../../reactions';
import { MessageReaction } from '../MessageReaction/MessageReaction';

import './MessageReactionsWrapper.scss';

interface MessageReactionsWrapperProps {
  reactions: ReactionSummary[];
  pendingReaction: string | null;
  onReact: (emoji: string) => void;
}

export function MessageReactionsWrapper({ reactions, pendingReaction, onReact }: MessageReactionsWrapperProps) {
  if (reactions.length === 0) {
    return null;
  }

  return (
    <div className="message-reactions-wrapper">
      {reactions.map((reaction) => (
        <MessageReaction
          key={reaction.emoji}
          emoji={reaction.emoji}
          count={reaction.count}
          isUserReaction={reaction.hasUserReacted}
          isSending={pendingReaction === reaction.emoji}
          onClick={() => onReact(reaction.emoji)}
        />
      ))}
    </div>
  );
}
