import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

const { parsed, error } = config({ path: '.env.test' });

if (error) {
  throw new Error('Could not load .env.test', { cause: error });
}

const databaseUrl = parsed?.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing from .env.test');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
