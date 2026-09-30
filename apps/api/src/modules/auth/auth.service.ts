import { AppError } from '../../lib/errors/app-error.ts';
import type { SessionRepository } from '../sessions/session.repository.ts';
import type { User, UserWithPasswordHash } from '../users/user.model.ts';
import type { UserRepository } from '../users/user.repository.ts';
import type { LoginInput, RegisterInput } from './auth.schema.ts';
import type { PasswordHasher } from './password-hasher.ts';
import type { SessionTokenManager } from './session-token-manager.ts';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type LoginResult = Readonly<{
  user: User;
  session: Readonly<{
    token: string;
    expiresAt: Date;
  }>;
}>;

function invalidCredentialsError(): AppError {
  return new AppError(
    401,
    'INVALID_CREDENTIALS',
    'Email or password is incorrect'
  );
}

function toPublicUser(user: UserWithPasswordHash): User {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function emailAlreadyRegisteredError(): AppError {
  return new AppError(
    409,
    'EMAIL_ALREADY_REGISTERED',
    'An account with this email already exists'
  );
}

function unauthenticatedError(): AppError {
  return new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
}

export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly passwordHasher: PasswordHasher;
  private readonly sessionRepository: SessionRepository;
  private readonly sessionTokenManager: SessionTokenManager;

  constructor(
    userRepository: UserRepository,
    passwordHasher: PasswordHasher,
    sessionRepository: SessionRepository,
    sessionTokenManager: SessionTokenManager
  ) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.sessionRepository = sessionRepository;
    this.sessionTokenManager = sessionTokenManager;
  }

  async register(input: RegisterInput): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser !== null) {
      throw emailAlreadyRegisteredError();
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const result = await this.userRepository.create({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
    });

    if (result.status === 'email_conflict') {
      throw emailAlreadyRegisteredError();
    }

    return result.user;
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(input.email);

    if (user === null) {
      throw invalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.verify(
      input.password,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw invalidCredentialsError();
    }

    const { token, tokenHash } = this.sessionTokenManager.generate();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await this.sessionRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      user: toPublicUser(user),
      session: {
        token,
        expiresAt,
      },
    };
  }

  async authenticateSession(token: string): Promise<User> {
    const tokenHash = this.sessionTokenManager.hash(token);
    const session = await this.sessionRepository.findByTokenHash(tokenHash);

    if (session === null) {
      throw unauthenticatedError();
    }

    const sessionHasExpired =
      new Date(session.expiresAt).getTime() <= Date.now();

    if (sessionHasExpired) {
      await this.sessionRepository.deleteByTokenHash(tokenHash);
      throw unauthenticatedError();
    }

    const user = await this.userRepository.findById(session.userId);

    if (user === null) {
      await this.sessionRepository.deleteByTokenHash(tokenHash);
      throw unauthenticatedError();
    }

    return user;
  }

  async logout(token: string): Promise<void> {
    if (token.length === 0) {
      return;
    }

    const tokenHash = this.sessionTokenManager.hash(token);

    await this.sessionRepository.deleteByTokenHash(tokenHash);
  }
}
