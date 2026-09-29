import { Session } from '../auth/login';

const STORAGE_NAME = 'msrs_session';

export const persistUserSession = (session: Session): boolean => {
  const data = JSON.stringify(session);

  try {
    localStorage.setItem(STORAGE_NAME, data);
    return true;
  } catch (error) {
    console.error('Failed to save session to localStorage:', error);
    return false;
  }
};

export const restoreUserSession = (): Session | null => {
  try {
    const data = localStorage.getItem(STORAGE_NAME);

    if (!data) return null;

    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load session from localStorage:', error);
    purgeUserSession();
    return null;
  }
};

export const purgeUserSession = (): void => {
  try {
    localStorage.removeItem(STORAGE_NAME);
  } catch (error) {
    console.error('Failed to clear session from localStorage:', error);
  }
};
