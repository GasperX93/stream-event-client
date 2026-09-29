import { createContext, ReactChild, ReactElement, useContext, useEffect, useMemo, useState } from 'react';

import { nicknameLogin, Session } from './auth/login';
import { persistUserSession, purgeUserSession, restoreUserSession } from './auth/persistence';

interface ContextInterface {
  keys: {
    private: string;
    public: string;
  };
  loginAsUser: (username: string) => Promise<void>;
  logout: () => void;
  nickname: string;
  isUserLoggedIn: boolean;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (isLoginModalOpen: boolean) => void;
  session: Session | null;
  isLoading: boolean;
}

const initialValues: ContextInterface = {
  keys: {
    private: '',
    public: '',
  },
  loginAsUser: async () => {},
  logout: () => {},
  nickname: '',
  isUserLoggedIn: false,
  isLoginModalOpen: false,
  setIsLoginModalOpen: () => {},
  session: null,
  isLoading: true,
};

export const Context = createContext<ContextInterface>(initialValues);
export const Consumer = Context.Consumer;

export const useUserContext = () => {
  const context = useContext(Context);
  if (!context) throw new Error('useAppContext must be used within AppContextProvider');
  return context;
};

interface Props {
  children: ReactChild;
}

export function Provider({ children }: Props): ReactElement {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedSession = restoreUserSession();
    if (savedSession) {
      setSession(savedSession);
    }
    setIsLoading(false);
  }, []);

  const loginAsUser = async (username: string) => {
    const trimmedUsername = username.trim();
    const res = await nicknameLogin(trimmedUsername);

    if (res.session) {
      setSession(res.session);
      persistUserSession(res.session);
      setIsLoginModalOpen(false);
    } else {
      console.error('User login failed:', res.error);
    }
  };

  const logout = () => {
    setSession(null);
    purgeUserSession();
  };

  const nickname = useMemo(() => session?.username || '', [session]);

  const isUserLoggedIn = useMemo(() => !!session, [session]);

  const keys = useMemo(() => {
    if (!session) {
      return { private: '', public: '' };
    }

    return {
      private: session.userSecret.toLocaleLowerCase(),
      public: session.userId.toLocaleLowerCase(),
    };
  }, [session]);

  return (
    <Context.Provider
      value={{
        keys,
        loginAsUser,
        logout,
        nickname,
        isUserLoggedIn,
        isLoginModalOpen,
        setIsLoginModalOpen,
        session,
        isLoading,
      }}
    >
      {children}
    </Context.Provider>
  );
}
