import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { checkDisplayName, type DisplayNameCheck, nicknameLogin, type Session } from './auth/login';
import { persistUserSession, purgeUserSession, restoreUserSession } from './auth/persistence';
import { LoginModal } from './LoginModal/LoginModal';

interface ChatUserContextValue {
  /** Null for a viewer who has not chosen a name, who can read the chat and not write to it. */
  session: Session | null;
  /** Signs in and closes the dialog, or hands back why the name was refused. */
  loginAsUser: (name: string) => DisplayNameCheck;
  logout: () => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
}

const ChatUserContext = createContext<ChatUserContextValue | undefined>(undefined);

export function useChatUser(): ChatUserContextValue {
  const context = useContext(ChatUserContext);
  if (!context) {
    throw new Error('useChatUser must be used within ChatUserProvider');
  }
  return context;
}

/** Who the viewer is in the chat, remembered by this browser, and the dialog that asks for a name. */
export function ChatUserProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(restoreUserSession);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const loginAsUser = useCallback((name: string): DisplayNameCheck => {
    const checked = checkDisplayName(name);
    if (!checked.ok) {
      return checked;
    }
    const next = nicknameLogin(checked.name);
    persistUserSession(next);
    setSession(next);
    setIsLoginModalOpen(false);
    return checked;
  }, []);

  const logout = useCallback(() => {
    purgeUserSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, loginAsUser, logout, isLoginModalOpen, setIsLoginModalOpen }),
    [session, loginAsUser, logout, isLoginModalOpen],
  );

  return (
    <ChatUserContext.Provider value={value}>
      {children}
      {isLoginModalOpen && <LoginModal />}
    </ChatUserContext.Provider>
  );
}
