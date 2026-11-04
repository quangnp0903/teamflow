import { z } from 'zod';

export const emailFieldSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z.email({ error: 'Enter a valid email address' }).max(254, {
      error: 'Email must not exceed 254 characters',
    })
  );
