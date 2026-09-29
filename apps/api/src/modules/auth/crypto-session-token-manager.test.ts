import { describe, expect, it } from 'vitest';

import { CryptoSessionTokenManager } from './crypto-session-token-manager.ts';

describe('CryptoSessionTokenManager', () => {
  it('generates a random token and its SHA-256 hash', () => {
    const tokenManager = new CryptoSessionTokenManager();

    const result = tokenManager.generate();

    expect(result.token).toHaveLength(43);
    expect(result.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.tokenHash).toBe(tokenManager.hash(result.token));
    expect(result.tokenHash).not.toBe(result.token);
  });

  it('generates a different token each time', () => {
    const tokenManager = new CryptoSessionTokenManager();

    const first = tokenManager.generate();
    const second = tokenManager.generate();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it('hashes the same token deterministically', () => {
    const tokenManager = new CryptoSessionTokenManager();

    expect(tokenManager.hash('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });
});
