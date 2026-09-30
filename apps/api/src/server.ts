import { createApp } from './app.ts';
import { env } from './config/env.ts';
import { prisma } from './lib/database/prisma.ts';
import { PrismaTaskRepository } from './modules/tasks/prisma-task.repository.ts';
import { Argon2PasswordHasher } from './modules/auth/argon2-password-hasher.ts';
import { PrismaUserRepository } from './modules/users/prisma-user.repository.ts';
import { CryptoSessionTokenManager } from './modules/auth/crypto-session-token-manager.ts';
import { PrismaSessionRepository } from './modules/sessions/prisma-session.repository.ts';

const taskRepository = new PrismaTaskRepository(prisma);
const userRepository = new PrismaUserRepository(prisma);
const passwordHasher = new Argon2PasswordHasher();
const sessionRepository = new PrismaSessionRepository(prisma);
const sessionTokenManager = new CryptoSessionTokenManager();

const app = createApp({
  taskRepository,
  userRepository,
  sessionRepository,
  passwordHasher,
  sessionTokenManager,
  secureSessionCookie: env.NODE_ENV === 'production',
});

const server = app.listen(env.PORT, () => {
  console.info(`API listening at http://localhost:${env.PORT}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.info(`${signal} received; closing the HTTP server`);

  server.close(async (error) => {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('Database could not disconnect cleanly', disconnectError);
      process.exitCode = 1;
    }

    if (error) {
      console.error('HTTP server could not close cleanly', error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
