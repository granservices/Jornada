import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, UserStatus } from '@prisma/client';
import ms from 'ms';
import type { StringValue } from 'ms';
import { PrismaService } from '../../database/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthTokenService } from './services/auth-token.service';
import { PasswordHasherService } from './services/password-hasher.service';

type SessionMeta = {
  ipAddress?: string;
  userAgent?: string | string[];
};

type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  status: UserStatus;
  emailVerifiedAt: Date | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly authTokenService: AuthTokenService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, meta: SessionMeta) {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Ja existe uma conta para este email.');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: dto.fullName.trim(),
        passwordHash,
        roles: [Role.EMPLOYEE],
      },
    });

    return this.issueSession(user, meta);
  }

  async login(dto: LoginDto, meta: SessionMeta) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Conta indisponivel para login.');
    }

    const isPasswordValid = await this.passwordHasher.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueSession(user, meta);
  }

  async refresh(dto: RefreshSessionDto, meta: SessionMeta) {
    const session = await this.resolveValidSession(dto.refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    const nextRefreshTokenSecret = this.authTokenService.generateOpaqueToken();
    const nextRefreshToken = `${session.id}.${nextRefreshTokenSecret}`;
    const nextRefreshTokenHash =
      await this.passwordHasher.hash(nextRefreshToken);

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: nextRefreshTokenHash,
        expiresAt: this.buildRefreshTokenExpiryDate(),
        ipAddress: meta.ipAddress ?? session.ipAddress,
        userAgent: this.stringifyUserAgent(meta.userAgent) ?? session.userAgent,
      },
    });

    return this.buildAuthResponse(user, session.id, nextRefreshTokenSecret);
  }

  async logout(dto: LogoutDto) {
    const { sessionId } = this.parseRefreshToken(dto.refreshToken);

    await this.prisma.authSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'logout',
      },
    });

    return {
      ok: true,
      message: 'Sessao encerrada com sucesso.',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return this.buildForgotPasswordResponse();
    }

    const resetToken = this.authTokenService.generateOpaqueToken();
    const tokenHash = await this.passwordHasher.hash(resetToken);
    const expiresAt = new Date(
      Date.now() +
        this.configService.getOrThrow<number>(
          'PASSWORD_RESET_EXPIRES_IN_MINUTES',
        ) *
          60_000,
    );

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return this.buildForgotPasswordResponse(resetToken);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetEntries = await this.prisma.passwordResetToken.findMany({
      where: {
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const matchedEntry = await this.findMatchingResetEntry(
      resetEntries,
      dto.token,
    );

    if (!matchedEntry) {
      throw new BadRequestException(
        'Token de redefinicao invalido ou expirado.',
      );
    }

    const nextPasswordHash = await this.passwordHasher.hash(dto.password);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: matchedEntry.userId },
        data: { passwordHash: nextPasswordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: matchedEntry.id },
        data: { consumedAt: now },
      }),
      this.prisma.authSession.updateMany({
        where: {
          userId: matchedEntry.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
          revokedReason: 'password-reset',
        },
      }),
    ]);

    return {
      ok: true,
      message: 'Senha redefinida com sucesso.',
    };
  }

  private async issueSession(
    user: PublicUser & { passwordHash?: string },
    meta: SessionMeta,
  ) {
    const refreshTokenSecret = this.authTokenService.generateOpaqueToken();
    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'pending',
        expiresAt: this.buildRefreshTokenExpiryDate(),
        ipAddress: meta.ipAddress,
        userAgent: this.stringifyUserAgent(meta.userAgent),
      },
    });

    const refreshToken = `${session.id}.${refreshTokenSecret}`;
    const refreshTokenHash = await this.passwordHasher.hash(refreshToken);

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

    return this.buildAuthResponse(user, session.id, refreshTokenSecret);
  }

  private async buildAuthResponse(
    user: PublicUser & { passwordHash?: string },
    sessionId: string,
    refreshTokenSecret: string,
  ) {
    const accessToken = await this.authTokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      status: user.status,
    });

    return {
      accessToken,
      refreshToken: `${sessionId}.${refreshTokenSecret}`,
      tokenType: 'Bearer',
      user: this.toPublicUser(user),
    };
  }

  private async resolveValidSession(refreshToken: string) {
    const { sessionId } = this.parseRefreshToken(refreshToken);
    const session = await this.prisma.authSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    if (session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sessao expirada ou revogada.');
    }

    const isTokenValid = await this.passwordHasher.verify(
      session.refreshTokenHash,
      refreshToken,
    );

    if (!isTokenValid) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    return session;
  }

  private parseRefreshToken(refreshToken: string) {
    const [sessionId, tokenSecret] = refreshToken.split('.');

    if (!sessionId || !tokenSecret) {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    return { sessionId, tokenSecret };
  }

  private buildRefreshTokenExpiryDate() {
    const value = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );
    const ttlInMilliseconds = ms(value as StringValue);

    if (typeof ttlInMilliseconds !== 'number') {
      throw new Error('JWT_REFRESH_EXPIRES_IN invalido.');
    }

    return new Date(Date.now() + ttlInMilliseconds);
  }

  private buildForgotPasswordResponse(previewToken?: string) {
    return {
      ok: true,
      message:
        'Se o email existir, a solicitacao de redefinicao foi registrada.',
      previewToken:
        process.env.NODE_ENV === 'production' ? undefined : previewToken,
    };
  }

  private async findMatchingResetEntry(
    entries: {
      id: string;
      userId: string;
      tokenHash: string;
      user: PublicUser & { passwordHash?: string };
    }[],
    rawToken: string,
  ) {
    for (const entry of entries) {
      const isMatch = await this.passwordHasher.verify(
        entry.tokenHash,
        rawToken,
      );
      if (isMatch) {
        return entry;
      }
    }

    return null;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private stringifyUserAgent(userAgent?: string | string[]) {
    if (!userAgent) {
      return null;
    }

    return Array.isArray(userAgent) ? userAgent.join(' | ') : userAgent;
  }

  private toPublicUser(
    user: PublicUser & { passwordHash?: string },
  ): PublicUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }
}
