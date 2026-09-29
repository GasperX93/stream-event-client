import { PrivateKey } from '@ethersphere/bee-js';
import { z } from 'zod';

import { checkDisplayName, Session, sessionFromKey } from './login';

export const SESSION_STORAGE_KEY = 'stream-event-client:chat-session';

const storedSessionSchema = z.object({
  username: z.string(),
  privateKey: z.string().regex(/^[0-9a-f]{64}$/),
  address: z.string().regex(/^[0-9a-f]{40}$/),
});

/**
 * Anything else in the browser can write this entry, so it is read as untrusted: the name must pass the
 * rule a new name passes, and the address must be the one the key signs as.
 */
function toSession(raw: unknown): Session | null {
  const parsed = storedSessionSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  const name = checkDisplayName(parsed.data.username);
  if (!name.ok || name.name !== parsed.data.username) {
    return null;
  }
  const session = sessionFromKey(name.name, new PrivateKey(parsed.data.privateKey));
  return session.address === parsed.data.address ? session : null;
}

export function persistUserSession(session: Session): boolean {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

/** A stored entry that does not check out is removed, so it is not read again on the next load. */
export function restoreUserSession(): Session | null {
  let data: string | null;
  try {
    data = localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!data) {
    return null;
  }

  let session: Session | null = null;
  try {
    session = toSession(JSON.parse(data));
  } catch {
    session = null;
  }
  if (!session) {
    purgeUserSession();
  }
  return session;
}

export function purgeUserSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Storage the browser refuses holds nothing to remove.
  }
}
