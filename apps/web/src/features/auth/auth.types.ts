export type AuthUser = Readonly<{
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}>;

export type RegisterInput = Readonly<{
  email: string;
  displayName: string;
  password: string;
}>;

export type LoginInput = Readonly<{
  email: string;
  password: string;
}>;

export type AuthUserResponse = Readonly<{
  data: AuthUser;
}>;
