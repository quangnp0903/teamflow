import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));

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
