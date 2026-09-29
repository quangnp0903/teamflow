import type { Request, Response } from 'express';

import { registerSchema } from './auth.schema.ts';
import type { AuthService } from './auth.service.ts';

export class AuthController {
  private readonly service: AuthService;

  constructor(service: AuthService) {
    this.service = service;
  }

  register = async (request: Request, response: Response) => {
    const input = registerSchema.parse(request.body);
    const user = await this.service.register(input);

    response.status(201).json({
      data: user,
    });
  };
}
