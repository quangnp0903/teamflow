import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next
) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });

    return;
  }

  console.error(error);

  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
