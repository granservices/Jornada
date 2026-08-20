import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';

type AccessTokenPayload = {
  sub: string;
  email: string;
  roles: Role[];
  status: UserStatus;
};

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: AccessTokenPayload) {
    return this.jwtService.signAsync(payload);
  }

  generateOpaqueToken() {
    return randomBytes(48).toString('hex');
  }
}
