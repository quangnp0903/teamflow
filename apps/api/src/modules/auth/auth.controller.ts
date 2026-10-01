import type { Request, Response } from 'express';

import { loginSchema, registerSchema } from './auth.schema.ts';
import type { AuthService } from './auth.service.ts';
import { SESSION_COOKIE_NAME } from './auth.constants.ts';
import { AppError } from '../../lib/errors/app-error.ts';

type AuthControllerOptions = Readonly<{
  secureSessionCookie: boolean;
}>;

export class AuthController {
  private readonly service: AuthService;
  private readonly secureSessionCookie: boolean;

  constructor(service: AuthService, options: AuthControllerOptions) {
    this.service = service;
    this.secureSessionCookie = options.secureSessionCookie;
  }

  register = async (request: Request, response: Response) => {
    const input = registerSchema.parse(request.body);
    const user = await this.service.register(input);

    response.status(201).json({
      data: user,
    });
  };

  login = async (request: Request, response: Response) => {
    const input = loginSchema.parse(request.body);
    const result = await this.service.login(input);

    response.cookie(SESSION_COOKIE_NAME, result.session.token, {
      httpOnly: true,
      secure: this.secureSessionCookie,
      sameSite: 'lax',
      path: '/',
      expires: result.session.expiresAt,
    });

    response.status(200).json({
      data: result.user,
    });
  };

  me = (request: Request, response: Response) => {
    const user = request.user;

    if (user === undefined) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    response.status(200).json({
      data: user,
    });
  };

  logout = async (request: Request, response: Response) => {
    const cookieValue: unknown = request.cookies[SESSION_COOKIE_NAME];

    const token = typeof cookieValue === 'string' ? cookieValue : '';

    await this.service.logout(token);

    response.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: this.secureSessionCookie,
      sameSite: 'lax',
      path: '/',
    });

    response.status(204).end();
  };
}
