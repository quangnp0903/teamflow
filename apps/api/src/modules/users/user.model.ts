export type User = Readonly<{
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}>;

export type UserWithPasswordHash = User &
  Readonly<{
    passwordHash: string;
  }>;
