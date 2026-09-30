import type { RequestHandler } from 'express';

import { AppError } from '../lib/errors/app-error.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requireTrustedOrigin(
  trustedOrigins: readonly string[]
): RequestHandler {
  const allowedOrigins = new Set(trustedOrigins);

  return (request, _response, next) => {
    if (SAFE_METHODS.has(request.method)) {
      next();
      return;
    }

    const origin = request.get('Origin');

    if (origin === undefined || !allowedOrigins.has(origin)) {
      next(
        new AppError(403, 'UNTRUSTED_ORIGIN', 'Request origin is not allowed')
      );
      return;
    }

    next();
  };
}
