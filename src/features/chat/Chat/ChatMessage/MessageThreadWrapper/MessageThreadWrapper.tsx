import './MessageThreadWrapper.scss';

interface MessageThreadWrapperProps {
  replyCount: number;
  onOpenThread: () => void;
}

export function MessageThreadWrapper({ replyCount, onOpenThread }: MessageThreadWrapperProps) {
  if (replyCount === 0) {
    return null;
  }

  return (
    <button type="button" className="thread-reply-button" onClick={onOpenThread}>
      {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
    </button>
  );
}
