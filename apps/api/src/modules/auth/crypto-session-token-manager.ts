import { createHash, randomBytes } from 'node:crypto';

import type {
  GeneratedSessionToken,
  SessionTokenManager,
} from './session-token-manager.ts';

const SESSION_TOKEN_BYTES = 32;

export class CryptoSessionTokenManager implements SessionTokenManager {
  generate(): GeneratedSessionToken {
    const token = randomBytes(SESSION_TOKEN_BYTES).toString('base64url');

    return {
      token,
      tokenHash: this.hash(token),
    };
  }

  hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
