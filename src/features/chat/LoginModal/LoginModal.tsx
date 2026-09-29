import { useState } from 'react';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { useUserContext } from '@/providers/User';

import './LoginModal.scss';

export function LoginModal() {
  const { nickname, loginAsUser, setIsLoginModalOpen } = useUserContext();
  const [localName, setLocalName] = useState(nickname || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUsernameLogin = async () => {
    const trimmedName = localName.trim();
    if (trimmedName && trimmedName.length > 0 && trimmedName.length <= 20) {
      setIsLoading(true);
      setError(null);

      try {
        await loginAsUser(trimmedName);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed');
      } finally {
        setIsLoginModalOpen(false);
        setIsLoading(false);
      }
    } else {
      setError('Username must be between 1 and 20 characters');
    }
  };

  const renderUsernameLogin = () => (
    <>
      <div className="login-modal-header">Log in</div>
      <div className="login-modal-content">Choose a display name to join the chat</div>

      {error && <div className="login-modal-error">{error}</div>}

      <div className="login-modal-input-container">
        <input
          value={localName || ''}
          className="login-modal-input"
          placeholder="Display name"
          aria-label="Display name"
          onChange={(e) => setLocalName(e.target.value)}
          disabled={isLoading}
          maxLength={20}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleUsernameLogin();
            }
          }}
        />
      </div>
      <div className="login-modal-button-container">
        <Button className="login-modal-button" onClick={() => setIsLoginModalOpen(false)} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          className="login-modal-button"
          variant={ButtonVariant.SECONDARY}
          onClick={handleUsernameLogin}
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Join'}
        </Button>
      </div>
    </>
  );

  return (
    <div className="login-modal-container" role="main-layout">
      <div className="login-modal">{renderUsernameLogin()}</div>
    </div>
  );
}
