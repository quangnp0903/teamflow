import type { RequestHandler } from 'express';

import { AppError } from '../lib/errors/app-error.ts';
import { SESSION_COOKIE_NAME } from '../modules/auth/auth.constants.ts';
import type { AuthService } from '../modules/auth/auth.service.ts';

type SessionAuthenticator = Pick<AuthService, 'authenticateSession'>;

export function requireAuth(
  authenticator: SessionAuthenticator
): RequestHandler {
  return async (request, _response, next) => {
    const cookieValue: unknown = request.cookies?.[SESSION_COOKIE_NAME];
    const token = typeof cookieValue === 'string' ? cookieValue : '';

    if (token.length === 0) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const user = await authenticator.authenticateSession(token);

    request.user = user;
    next();
  };
}
