import { useEffect, useId, useRef, useState } from 'react';

import { Button, ButtonVariant } from '@/shared/components/Button/Button';
import { Dialog } from '@/shared/components/Dialog/Dialog';

import { useChatUser } from '../User';

import '../LoginModal/LoginModal.scss';
import './LoginButton.scss';

const KEY_ESCAPE = 'Escape';

/** The chat name in the header: an offer to join when there is none, the name and a menu when there is. */
export function LoginButton() {
  const { session, setIsLoginModalOpen, logout } = useChatUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    const closeOnOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === KEY_ESCAPE) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMenuOpen]);

  if (!session) {
    return (
      <Button variant={ButtonVariant.SECONDARY} className="login-button" onClick={() => setIsLoginModalOpen(true)}>
        Join chat
      </Button>
    );
  }

  const confirmLogout = () => {
    logout();
    setIsConfirmingLogout(false);
  };

  return (
    <div className="login-button-container" ref={containerRef}>
      <Button
        variant={ButtonVariant.SECONDARY}
        className="login-button"
        aria-haspopup="true"
        aria-expanded={isMenuOpen}
        aria-controls={menuId}
        onClick={() => setIsMenuOpen((open) => !open)}
      >
        <span className="login-button-name">{session.username}</span>
        <span className="login-button-chevron" aria-hidden="true">
          ▾
        </span>
      </Button>

      {isMenuOpen && (
        <div id={menuId} className="login-dropdown">
          <button
            type="button"
            className="login-dropdown-item"
            onClick={() => {
              setIsMenuOpen(false);
              setIsConfirmingLogout(true);
            }}
          >
            Log out
          </button>
        </div>
      )}

      {isConfirmingLogout && (
        <Dialog title="Log out of the chat?" onClose={() => setIsConfirmingLogout(false)}>
          <p className="login-modal-content">
            If you log out, your display name won&apos;t be saved. You&apos;ll need to choose one again next time.
          </p>
          <div className="login-modal-actions">
            <Button variant={ButtonVariant.SECONDARY} onClick={() => setIsConfirmingLogout(false)}>
              Cancel
            </Button>
            <Button onClick={confirmLogout}>Log out</Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
