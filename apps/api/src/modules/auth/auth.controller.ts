import type { Request, Response } from 'express';

import { loginSchema, registerSchema } from './auth.schema.ts';
import type { AuthService } from './auth.service.ts';

export const SESSION_COOKIE_NAME = 'teamflow_session';

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
}
