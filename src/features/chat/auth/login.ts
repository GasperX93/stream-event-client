import { getSigner } from '@/utils/crypto';

export interface Session {
  userId: string;
  userSecret: string;
  username: string;
  createdAt: number;
}

export interface LoginResult {
  session?: Session;
  error?: string;
}

export const nicknameLogin = async (nickname: string): Promise<LoginResult> => {
  const id = crypto.randomUUID();

  const signer = getSigner(id);
  if (!signer) {
    return { error: 'Invalid nickname' };
  }

  const privKey = signer.toHex();
  const pubKey = signer.publicKey().address().toHex();

  const session: Session = {
    userId: pubKey,
    userSecret: privKey,
    username: nickname,
    createdAt: Date.now(),
  };

  return {
    session,
  };
};
