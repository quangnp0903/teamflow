import { describe, expect, it } from 'vitest';

import { Argon2PasswordHasher } from './argon2-password-hasher.ts';

describe('Argon2PasswordHasher', () => {
  it('hashes and verifies a password', async () => {
    const passwordHasher = new Argon2PasswordHasher();
    const password = 'correct horse battery staple';

    const passwordHash = await passwordHasher.hash(password);

    expect(passwordHash).not.toBe(password);
    expect(passwordHash).toMatch(/^\$argon2id\$/);

    await expect(passwordHasher.verify(password, passwordHash)).resolves.toBe(
      true
    );

    await expect(
      passwordHasher.verify('incorrect password', passwordHash)
    ).resolves.toBe(false);
  });
});
