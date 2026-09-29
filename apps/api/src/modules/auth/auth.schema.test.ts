import { describe, expect, it } from 'vitest';

import { registerSchema } from './auth.schema.ts';

const VALID_INPUT = {
  email: 'alice@example.com',
  displayName: 'Alice Nguyen',
  password: 'correct horse battery staple',
};

describe('registerSchema', () => {
  it('normalizes user-controlled profile fields', () => {
    const password = '  keep these spaces  ';

    const result = registerSchema.parse({
      email: '  ALICE@Example.COM  ',
      displayName: '  Alice Nguyen  ',
      password,
    });

    expect(result).toEqual({
      email: 'alice@example.com',
      displayName: 'Alice Nguyen',
      password,
    });
  });

  it.each([
    {
      caseName: 'an invalid email',
      input: {
        ...VALID_INPUT,
        email: 'not-an-email',
      },
    },
    {
      caseName: 'an empty display name',
      input: {
        ...VALID_INPUT,
        displayName: '   ',
      },
    },
    {
      caseName: 'a short password',
      input: {
        ...VALID_INPUT,
        password: 'too short',
      },
    },
    {
      caseName: 'an unknown property',
      input: {
        ...VALID_INPUT,
        role: 'admin',
      },
    },
  ])('rejects $caseName', ({ input }) => {
    expect(registerSchema.safeParse(input).success).toBe(false);
  });
});
