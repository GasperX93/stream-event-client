import { useId, useState } from 'react';

import { Button, ButtonVariant } from '@/shared/components/Button/Button';
import { Dialog } from '@/shared/components/Dialog/Dialog';

import { DISPLAY_NAME_MAX_LENGTH } from '../auth/login';
import { useChatUser } from '../User';

import './LoginModal.scss';

const KEY_ENTER = 'Enter';

/** Asks for the display name a viewer chats under. There is no password and no account. */
export function LoginModal() {
  const { loginAsUser, setIsLoginModalOpen } = useChatUser();
  const [name, setName] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const descriptionId = useId();
  const problemId = useId();

  const close = () => setIsLoginModalOpen(false);

  const join = () => {
    const result = loginAsUser(name);
    setProblem(result.ok ? null : result.problem);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === KEY_ENTER && !event.nativeEvent.isComposing) {
      event.preventDefault();
      join();
    }
  };

  return (
    <Dialog title="Join the chat" onClose={close}>
      <p id={descriptionId} className="login-modal-content">
        Choose a display name of up to {DISPLAY_NAME_MAX_LENGTH} characters. It is shown on your messages, and this
        browser remembers it.
      </p>
      <div className="login-modal-input-container">
        <input
          value={name}
          className="login-modal-input"
          placeholder="Display name"
          aria-label="Display name"
          aria-describedby={`${descriptionId} ${problemId}`}
          aria-invalid={problem !== null}
          autoComplete="nickname"
          onChange={(event) => {
            setName(event.target.value);
            setProblem(null);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>
      <p id={problemId} className="login-modal-error" role="alert">
        {problem}
      </p>
      <div className="login-modal-actions">
        <Button variant={ButtonVariant.SECONDARY} className="login-modal-button cancel" onClick={close}>
          Cancel
        </Button>
        <Button className="login-modal-button" onClick={join}>
          Join
        </Button>
      </div>
    </Dialog>
  );
}
