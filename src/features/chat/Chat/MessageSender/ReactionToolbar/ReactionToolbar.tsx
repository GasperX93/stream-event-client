import { useState } from 'react';

import { EmojiPickerDialog } from '../../EmojiPicker/EmojiPickerDialog';

import './ReactionToolbar.scss';

interface ReactionToolbarProps {
  onEmojiSelect: (emoji: string) => void;
}

/** The emoji button beside the message field. The picker behind it downloads the first time it opens. */
export function ReactionToolbar({ onEmojiSelect }: ReactionToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="reaction-toolbar-button"
        aria-label="Add an emoji"
        onClick={() => setIsOpen(true)}
      >
        <span aria-hidden="true">🙂</span>
      </button>
      {isOpen && <EmojiPickerDialog title="Add an emoji" onPick={onEmojiSelect} onClose={() => setIsOpen(false)} />}
    </>
  );
}
