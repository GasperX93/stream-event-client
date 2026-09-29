// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { nicknameLogin } from '../../src/features/chat/auth/login';
import {
  persistUserSession,
  purgeUserSession,
  restoreUserSession,
  SESSION_STORAGE_KEY,
} from '../../src/features/chat/auth/persistence';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function stored(value: unknown) {
  localStorage.setItem(SESSION_STORAGE_KEY, typeof value === 'string' ? value : JSON.stringify(value));
}

describe('the chat session in local storage', () => {
  it('is kept under a key named for this app', () => {
    expect(SESSION_STORAGE_KEY).toMatch(/^stream-event-client/);
  });

  it('comes back as it was saved', () => {
    const session = nicknameLogin('Ada');
    expect(persistUserSession(session)).toBe(true);
    expect(restoreUserSession()).toEqual(session);
  });

  it('is gone after a log out', () => {
    persistUserSession(nicknameLogin('Ada'));
    purgeUserSession();
    expect(restoreUserSession()).toBeNull();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('is nothing when nothing was saved', () => {
    expect(restoreUserSession()).toBeNull();
  });

  it('drops an entry that is not JSON', () => {
    stored('{not json');
    expect(restoreUserSession()).toBeNull();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('drops an entry of the wrong shape', () => {
    const session = nicknameLogin('Ada');
    for (const bad of [
      null,
      [],
      'Ada',
      { ...session, privateKey: 'xyz' },
      { ...session, address: '0x1234' },
      { ...session, username: '' },
      { ...session, username: 'd'.repeat(21) },
      { username: 'Ada' },
    ]) {
      stored(bad);
      expect(restoreUserSession()).toBeNull();
      expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    }
  });

  it('drops an entry whose address is not the one its key signs as', () => {
    const one = nicknameLogin('Ada');
    const other = nicknameLogin('Ada');
    stored({ ...one, address: other.address });
    expect(restoreUserSession()).toBeNull();
  });

  it('is nothing, and never throws, when the browser refuses storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(restoreUserSession()).toBeNull();
  });

  it('says so when it cannot be saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(persistUserSession(nicknameLogin('Ada'))).toBe(false);
  });
});
