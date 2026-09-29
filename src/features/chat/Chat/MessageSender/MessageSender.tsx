import { useRef, useState } from 'react';

import { ReactionToolbar } from './ReactionToolbar/ReactionToolbar';

import './MessageSender.scss';

const KEY_ENTER = 'Enter';

/**
 * A message travels as one Swarm chunk of 4 KB, signature and all, and one that does not fit fails
 * only after it was sent. This keeps well inside that.
 */
export const MESSAGE_MAX_LENGTH = 1000;

interface MessageSenderProps {
  onSend: (text: string) => Promise<void>;
  /** Names the field for a screen reader: what is being written, a message or a reply. */
  label: string;
  placeholder: string;
}

export function MessageSender({ onSend, label, placeholder }: MessageSenderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) {
      return;
    }
    setSending(true);
    setProblem(null);
    try {
      await onSend(text);
      setInput('');
    } catch {
      setProblem('The message could not be sent. Try again.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === KEY_ENTER && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div className="message-sender-wrapper">
      <div className="message-sender">
        <ReactionToolbar onEmojiSelect={(emoji) => setInput((previous) => previous + emoji)} />
        <input
          ref={inputRef}
          type="text"
          name="message"
          value={input}
          maxLength={MESSAGE_MAX_LENGTH}
          aria-label={label}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          className="message-sender-input"
        />
        <button
          type="button"
          className="message-sender-send-button"
          aria-label="Send"
          disabled={sending || !input.trim()}
          onClick={() => void send()}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M.344.245A1 1 0 0 1 1.446.105l18 9a1 1 0 0 1 0 1.79l-18 9A1 1 0 0 1 .05 18.684L2.612 11H8a1 1 0 1 0 0-2H2.612L.05 1.316A1 1 0 0 1 .344.245Z"
            />
          </svg>
        </button>
      </div>
      {problem && (
        <p className="message-sender-problem" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
