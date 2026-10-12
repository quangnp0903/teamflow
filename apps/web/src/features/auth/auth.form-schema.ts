import { z } from 'zod';

const emailFieldSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email({ error: 'Enter a valid email address' })
      .max(254, { error: 'Email must not exceed 254 characters' })
  );

const passwordFieldSchema = z
  .string()
  .max(128, { error: 'Password must not exceed 128 characters' });

export const loginFormSchema = z.object({
  email: emailFieldSchema,
  password: passwordFieldSchema.min(1, {
    error: 'Enter your password',
  }),
});

export const registerFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { error: 'Enter a display name' })
    .max(80, {
      error: 'Display name must not exceed 80 characters',
    }),
  email: emailFieldSchema,
  password: passwordFieldSchema.min(15, {
    error: 'Use at least 15 characters',
  }),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
