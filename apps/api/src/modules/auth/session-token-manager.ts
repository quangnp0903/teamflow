export type GeneratedSessionToken = Readonly<{
  token: string;
  tokenHash: string;
}>;

export interface SessionTokenManager {
  generate(): GeneratedSessionToken;

  hash(token: string): string;
}
