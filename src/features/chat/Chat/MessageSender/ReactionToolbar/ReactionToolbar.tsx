import { useState } from 'react';

import { QUICK_REACTIONS } from '../../../reactions';
import { EmojiPickerDialog } from '../../EmojiPicker/EmojiPickerDialog';

import './ReactionToolbar.scss';

interface ReactionToolbarProps {
  onEmojiSelect: (emoji: string) => void;
}

/**
 * The strip of emoji above the message field, as the Swarm site has it. The common ones are plain
 * buttons, and the picker behind the last one downloads the first time it opens.
 */
export function ReactionToolbar({ onEmojiSelect }: ReactionToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="reaction-toolbar">
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="reaction-toolbar-button"
          aria-label={`Add ${emoji}`}
          onClick={() => onEmojiSelect(emoji)}
        >
          {emoji}
        </button>
      ))}
      <button
        type="button"
        className="reaction-toolbar-button more"
        aria-label="Add an emoji"
        onClick={() => setIsOpen(true)}
      >
        <span aria-hidden="true">＋</span>
      </button>
      {isOpen && <EmojiPickerDialog title="Add an emoji" onPick={onEmojiSelect} onClose={() => setIsOpen(false)} />}
    </div>
  );
}
