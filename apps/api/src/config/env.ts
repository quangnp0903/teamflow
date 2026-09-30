import { z } from 'zod';

const trustedOriginSchema = z
  .url({ protocol: /^https?$/ })
  .transform((value) => new URL(value))
  .refine(
    (url) =>
      url.username === '' &&
      url.password === '' &&
      url.pathname === '/' &&
      url.search === '' &&
      url.hash === '',
    'Use an HTTP(S) origin without credentials, paths, queries or fragments'
  )
  .transform((url) => url.origin);

const trustedOriginsSchema = z
  .string()
  .transform((value) => value.split(',').map((origin) => origin.trim()))
  .pipe(z.array(trustedOriginSchema).min(1));

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).startsWith('postgresql://'),

  PORT: z.coerce.number().int().positive().max(65_535).default(3000),

  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  TRUSTED_ORIGINS: trustedOriginsSchema,
});

export const env = envSchema.parse(process.env);
