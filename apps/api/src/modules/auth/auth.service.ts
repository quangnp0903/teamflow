import { AppError } from '../../lib/errors/app-error.ts';
import type { User } from '../users/user.model.ts';
import type { UserRepository } from '../users/user.repository.ts';
import type { RegisterInput } from './auth.schema.ts';
import type { PasswordHasher } from './password-hasher.ts';

export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly passwordHasher: PasswordHasher;

  constructor(userRepository: UserRepository, passwordHasher: PasswordHasher) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
  }

  async register(input: RegisterInput): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser !== null) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email already exists'
      );
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.userRepository.create({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
    });
  }
}
