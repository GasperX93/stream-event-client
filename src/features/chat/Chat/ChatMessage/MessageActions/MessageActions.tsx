import { useId, useState } from 'react';

import { QUICK_REACTIONS } from '../../../reactions';
import { EmojiPickerDialog } from '../../EmojiPicker/EmojiPickerDialog';

import './MessageActions.scss';

interface MessageActionsProps {
  onReact: (emoji: string) => void;
  onOpenThread?: () => void;
  disabled?: boolean;
}

/**
 * What can be done with a message, folded behind one button in the empty side of its row, so a phone
 * screen is not all buttons.
 */
export function MessageActions({ onReact, onOpenThread, disabled = false }: MessageActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const actionsId = useId();

  const react = (emoji: string) => {
    onReact(emoji);
    setIsOpen(false);
  };

  return (
    <div className="message-actions">
      <button
        type="button"
        className="message-actions-toggle"
        aria-label="Message actions"
        aria-expanded={isOpen}
        aria-controls={actionsId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span aria-hidden="true">⋯</span>
      </button>

      {isOpen && (
        <div id={actionsId} className="message-actions-row">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="message-action"
              aria-label={`React with ${emoji}`}
              disabled={disabled}
              onClick={() => react(emoji)}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            className="message-action"
            aria-label="More reactions"
            disabled={disabled}
            onClick={() => setIsPickerOpen(true)}
          >
            <span aria-hidden="true">😊</span>
          </button>
          {onOpenThread && (
            <button
              type="button"
              className="message-action"
              aria-label="Reply in a thread"
              onClick={() => {
                setIsOpen(false);
                onOpenThread();
              }}
            >
              <span aria-hidden="true">💬</span>
            </button>
          )}
        </div>
      )}

      {isPickerOpen && (
        <EmojiPickerDialog title="React with an emoji" onPick={react} onClose={() => setIsPickerOpen(false)} />
      )}
    </div>
  );
}
