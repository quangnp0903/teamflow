import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).startsWith('postgresql://'),

  PORT: z.coerce.number().int().positive().max(65_535).default(3000),

  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
});

export const env = envSchema.parse(process.env);
