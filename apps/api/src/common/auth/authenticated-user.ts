import { Role, UserStatus } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  email: string;
  employeeId: string | null;
  roles: Role[];
  status: UserStatus;
};

export type AccessTokenPayload = {
  sub: string;
  email: string;
  employeeId?: string | null;
  roles: Role[];
  status: UserStatus;
};
