import { z } from 'zod';

import { emailSchema } from '../../lib/validation/email.schema.ts';

export const displayNameSchema = z.string().trim().min(1).max(80);

export const passwordSchema = z.string().min(15).max(128);

export const registerSchema = z
  .object({
    email: emailSchema,
    displayName: displayNameSchema,
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
