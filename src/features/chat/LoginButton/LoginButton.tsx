import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button/Button';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useUserContext } from '@/providers/User';
import { ROUTES } from '@/routes';

import { ConfirmationModal } from '../ConfirmationModal/ConfirmationModal';

import './LoginButton.scss';

export const LoginButton = () => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { isUserLoggedIn, setIsLoginModalOpen, nickname, logout } = useUserContext();

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useClickOutside([dropdownRef], () => setIsDropdownOpen(false), isDropdownOpen);

  const handleButtonClick = () => {
    if (isUserLoggedIn) {
      setIsDropdownOpen(!isDropdownOpen);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleLogout = () => {
    setLogoutModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleLogoutModalConfirm = () => {
    logout();
    setIsDropdownOpen(false);
    setLogoutModalOpen(false);
    navigate(ROUTES.STREAM_BROWSER);
  };

  const handleLogoutModalCancel = () => {
    setLogoutModalOpen(false);
  };

  const handleBrowser = () => {
    navigate(ROUTES.STREAM_BROWSER);
    setIsDropdownOpen(false);
  };

  if (isUserLoggedIn) {
    return (
      <div className="login-button-container" ref={dropdownRef}>
        <ConfirmationModal
          isOpen={logoutModalOpen}
          title="Are you sure?"
          message="If you log out, your display name won't be saved. You'll need to choose one again next time."
          confirmText="Log out"
          cancelText="Cancel"
          onConfirm={handleLogoutModalConfirm}
          onCancel={handleLogoutModalCancel}
        />

        <Button className="login-button" onClick={handleButtonClick}>
          {nickname}
        </Button>

        {isDropdownOpen && (
          <div className="login-dropdown">
            <button className="login-dropdown-item" onClick={handleBrowser}>
              Browse streams
            </button>
            <div className="login-dropdown-divider" />
            <button className="login-dropdown-item" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button className="login-button" onClick={handleButtonClick}>
      Log in
    </Button>
  );
};
