import { lazy, Suspense } from 'react';

import { Dialog } from '@/shared/components/Dialog/Dialog';
import { Spinner } from '@/shared/components/Spinner/Spinner';

import './EmojiPickerDialog.scss';

const EmojiPickerPanel = lazy(() => import('./EmojiPickerPanel'));

interface EmojiPickerDialogProps {
  title: string;
  onPick: (emoji: string) => void;
  onClose: () => void;
}

/** A picked emoji closes the dialog. */
export function EmojiPickerDialog({ title, onPick, onClose }: EmojiPickerDialogProps) {
  return (
    <Dialog title={title} onClose={onClose}>
      <div className="emoji-picker">
        <Suspense
          fallback={
            <p className="emoji-picker-loading">
              <Spinner /> Loading the emoji…
            </p>
          }
        >
          <EmojiPickerPanel
            onPick={(emoji) => {
              onPick(emoji);
              onClose();
            }}
          />
        </Suspense>
      </div>
    </Dialog>
  );
}
