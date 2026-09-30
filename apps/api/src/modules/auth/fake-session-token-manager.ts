import type {
  GeneratedSessionToken,
  SessionTokenManager,
} from './session-token-manager.ts';

export class FakeSessionTokenManager implements SessionTokenManager {
  private sequence = 0;

  generate(): GeneratedSessionToken {
    this.sequence += 1;

    const token = `test-session-token-${this.sequence}`;

    return {
      token,
      tokenHash: this.hash(token),
    };
  }

  hash(token: string): string {
    return `test-session-hash:${token}`;
  }
}
