import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  AccessTokenPayload,
  AuthenticatedUser,
} from './authenticated-user';

@Injectable()
export class JwtAccessTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async verifyBearerHeader(authorization?: string | string[] | null) {
    const header = Array.isArray(authorization)
      ? authorization[0]
      : authorization;

    if (!header) {
      throw new UnauthorizedException('Authorization header ausente.');
    }

    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Authorization header invalido.');
    }

    return this.verifyToken(token);
  }

  async verifyToken(token: string): Promise<AuthenticatedUser> {
    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        issuer: this.configService.getOrThrow<string>('JWT_ISSUER'),
        audience: this.configService.getOrThrow<string>('JWT_AUDIENCE'),
      });
    } catch {
      throw new UnauthorizedException('Token de acesso invalido.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        roles: true,
        status: true,
        person: {
          select: {
            employee: {
              select: {
                employeeNumber: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Usuario sem acesso ativo.');
    }

    return {
      id: user.id,
      email: user.email,
      employeeId: user.person.employee?.employeeNumber ?? null,
      roles: user.roles,
      status: user.status,
    };
  }
}
