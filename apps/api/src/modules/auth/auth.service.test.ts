import { describe, expect, it } from 'vitest';

import { InMemoryUserRepository } from '../users/in-memory-user.repository.ts';
import { AuthService } from './auth.service.ts';
import { FakePasswordHasher } from './fake-password-hasher.ts';
import type { UserRepository } from '../users/user.repository.ts';
import { InMemorySessionRepository } from '../sessions/in-memory-session.repository.ts';
import { FakeSessionTokenManager } from './fake-session-token-manager.ts';

const REGISTRATION_INPUT = {
  email: 'alice@example.com',
  displayName: 'Alice Nguyen',
  password: 'correct horse battery staple',
};

function createAuthService() {
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const sessionRepository = new InMemorySessionRepository();
  const sessionTokenManager = new FakeSessionTokenManager();

  const authService = new AuthService(
    userRepository,
    passwordHasher,
    sessionRepository,
    sessionTokenManager
  );

  return {
    authService,
    userRepository,
    sessionRepository,
    sessionTokenManager,
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
      async findById() {
        return null;
      },

      async findByEmail() {
        return null;
      },

      async create() {
        return { status: 'email_conflict' };
      },
    };

    const authService = new AuthService(
      conflictingRepository,
      new FakePasswordHasher(),
      new InMemorySessionRepository(),
      new FakeSessionTokenManager()
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

  it('logs in a user and creates a session', async () => {
    const { authService, sessionRepository, sessionTokenManager } =
      createAuthService();

    const user = await authService.register(REGISTRATION_INPUT);
    const beforeLogin = Date.now();

    const result = await authService.login({
      email: REGISTRATION_INPUT.email,
      password: REGISTRATION_INPUT.password,
    });

    const afterLogin = Date.now();
    const expectedDuration = 7 * 24 * 60 * 60 * 1000;

    expect(result.user).toEqual(user);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.session.token).toBe('test-session-token-1');

    expect(result.session.expiresAt.getTime()).toBeGreaterThanOrEqual(
      beforeLogin + expectedDuration
    );
    expect(result.session.expiresAt.getTime()).toBeLessThanOrEqual(
      afterLogin + expectedDuration
    );

    const tokenHash = sessionTokenManager.hash(result.session.token);
    const storedSession = await sessionRepository.findByTokenHash(tokenHash);

    expect(storedSession).toMatchObject({
      userId: user.id,
      tokenHash,
      expiresAt: result.session.expiresAt.toISOString(),
    });
  });

  it('rejects an incorrect password', async () => {
    const { authService } = createAuthService();

    await authService.register(REGISTRATION_INPUT);

    await expect(
      authService.login({
        email: REGISTRATION_INPUT.email,
        password: 'incorrect password',
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect',
    });
  });

  it('uses the same error when the email does not exist', async () => {
    const { authService } = createAuthService();

    await expect(
      authService.login({
        email: 'missing@example.com',
        password: 'incorrect password',
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect',
    });
  });
});
