import { describe, expect, it } from 'vitest';

import { InMemoryUserRepository } from '../users/in-memory-user.repository.ts';
import { AuthService } from './auth.service.ts';
import { FakePasswordHasher } from './fake-password-hasher.ts';
import type { UserRepository } from '../users/user.repository.ts';

const REGISTRATION_INPUT = {
  email: 'alice@example.com',
  displayName: 'Alice Nguyen',
  password: 'correct horse battery staple',
};

function createAuthService() {
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const authService = new AuthService(userRepository, passwordHasher);

  return {
    authService,
    userRepository,
  };
}

describe('AuthService', () => {
  it('registers a user with a hashed password', async () => {
    const { authService, userRepository } = createAuthService();

    const user = await authService.register(REGISTRATION_INPUT);

    expect(user).toMatchObject({
      email: 'alice@example.com',
      displayName: 'Alice Nguyen',
    });
    expect(user.id).toEqual(expect.any(String));
    expect(user.createdAt).toEqual(expect.any(String));
    expect(user.updatedAt).toEqual(expect.any(String));
    expect(user).not.toHaveProperty('passwordHash');

    const storedUser = await userRepository.findByEmail(
      REGISTRATION_INPUT.email
    );

    expect(storedUser?.passwordHash).toBe(
      `test-hash:${REGISTRATION_INPUT.password}`
    );
  });

  it('rejects an email that is already registered', async () => {
    const { authService } = createAuthService();

    await authService.register(REGISTRATION_INPUT);

    await expect(
      authService.register({
        ...REGISTRATION_INPUT,
        displayName: 'Another Alice',
      })
    ).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 409,
      code: 'EMAIL_ALREADY_REGISTERED',
      message: 'An account with this email already exists',
    });
  });

  it('maps a concurrent email conflict to the registration error', async () => {
    const conflictingRepository: UserRepository = {
      async findByEmail() {
        return null;
      },

      async create() {
        return { status: 'email_conflict' };
      },
    };

    const authService = new AuthService(
      conflictingRepository,
      new FakePasswordHasher()
    );

    await expect(
      authService.register(REGISTRATION_INPUT)
    ).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 409,
      code: 'EMAIL_ALREADY_REGISTERED',
      message: 'An account with this email already exists',
    });
  });
});
