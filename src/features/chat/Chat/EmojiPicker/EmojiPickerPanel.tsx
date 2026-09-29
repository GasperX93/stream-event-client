import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';

interface EmojiPickerPanelProps {
  onPick: (emoji: string) => void;
}

/** The emoji picker library, in a file of its own so it downloads only when a picker first opens. */
export default function EmojiPickerPanel({ onPick }: EmojiPickerPanelProps) {
  return (
    <EmojiPicker
      theme={Theme.DARK}
      emojiStyle={EmojiStyle.NATIVE}
      previewConfig={{ showPreview: false }}
      lazyLoadEmojis
      skinTonesDisabled
      autoFocusSearch={false}
      width="100%"
      height={360}
      onEmojiClick={(data) => onPick(data.emoji)}
    />
  );
}
