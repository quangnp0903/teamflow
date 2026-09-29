export type Session = Readonly<{
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}>;
