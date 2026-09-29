import type { PasswordHasher } from './password-hasher.ts';

const TEST_HASH_PREFIX = 'test-hash:';

export class FakePasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return `${TEST_HASH_PREFIX}${password}`;
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `${TEST_HASH_PREFIX}${password}`;
  }
}
