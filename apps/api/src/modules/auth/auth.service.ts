import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditAction, Role, UserProfileNotificationChannel, UserStatus } from '@prisma/client';
import ms from 'ms';
import type { StringValue } from 'ms';
import { AuditService } from '../../common/audit/audit.service';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { HttpRequestContext } from '../../common/http/request-context';
import { PrismaService } from '../../database/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { AuthAuditService } from './services/auth-audit.service';
import {
  AccessibleApplication,
  AuthApplicationAccessService,
} from './services/auth-application-access.service';
import { AuthTokenService } from './services/auth-token.service';
import { PasswordHasherService } from './services/password-hasher.service';

type PublicUser = {
  id: string;
  email: string;
  employeeId: string | null;
  fullName: string;
  roles: Role[];
  status: UserStatus;
  emailVerifiedAt: Date | null;
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: PublicUser;
  applications: AccessibleApplication[];
};

type AuthUserRecord = {
  id: string;
  email: string;
  personId: string;
  passwordHash: string | null;
  status: UserStatus;
  roles: Role[];
  emailVerifiedAt: Date | null;
  person: {
    fullName: string;
    employee: {
      employeeNumber: string | null;
      externalEmployeeId: string | null;
    } | null;
  };
};

type MyProfileUserRecord = {
  id: string;
  email: string;
  status: UserStatus;
  roles: Role[];
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  updatedAt: Date;
  person: {
    fullName: string;
    cpf: string | null;
    birthDate: Date | null;
    employee: {
      employeeNumber: string | null;
      department: string | null;
      updatedAt: Date;
    } | null;
  };
  profilePreference: {
    preferredName: string | null;
    phoneNumber: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    primaryBase: string | null;
    notificationChannel: UserProfileNotificationChannel;
    updatedAt: Date;
  } | null;
};

const AUTH_AUDIT_EVENT = {
  REGISTER: 'REGISTER',
  LOGIN: 'LOGIN',
  REFRESH: 'REFRESH',
  LOGOUT: 'LOGOUT',
  FORGOT_PASSWORD: 'FORGOT_PASSWORD',
  RESET_PASSWORD: 'RESET_PASSWORD',
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly authTokenService: AuthTokenService,
    private readonly authAuditService: AuthAuditService,
    private readonly configService: ConfigService,
    private readonly applicationAccess: AuthApplicationAccessService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, meta: HttpRequestContext) {
    if (!this.configService.get<boolean>('AUTH_PUBLIC_REGISTRATION_ENABLED')) {
      throw new ForbiddenException(
        'O cadastro publico esta desabilitado. Solicite um convite administrativo.',
      );
    }

    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      await this.authAuditService.failure(AUTH_AUDIT_EVENT.REGISTER, {
        email,
        reason: 'email-already-registered',
        ...this.toAuditContext(meta),
      });

      throw new ConflictException('Ja existe uma conta para este email.');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        person: {
          create: {
            fullName: dto.fullName.trim(),
            employee: dto.employeeId
              ? {
                  create: {
                    employeeNumber: this.normalizeEmployeeId(dto.employeeId),
                    externalEmployeeId: this.normalizeEmployeeId(dto.employeeId),
                  },
                }
              : undefined,
          },
        },
        passwordHash,
        roles: [Role.EMPLOYEE],
      },
      include: {
        person: {
          include: {
            employee: true,
          },
        },
      },
    });

    await this.applicationAccess.grantEmployeeDefaultApps(user.id);

    await this.authAuditService.success(AUTH_AUDIT_EVENT.REGISTER, {
      ...this.authAuditService.fromUser(user),
      ...this.toAuditContext(meta),
    });

    return this.issueSession(user, meta);
  }

  async login(dto: LoginDto, meta: HttpRequestContext) {
    const loginIdentifier = this.normalizeLoginIdentifier(
      dto.identifier ?? dto.email,
    );
    const user = await this.findUserForLogin(loginIdentifier);

    if (!user) {
      await this.authAuditService.failure(AUTH_AUDIT_EVENT.LOGIN, {
        email: loginIdentifier.isEmail ? loginIdentifier.value : undefined,
        reason: loginIdentifier.isEmail
          ? 'user-not-found-by-email'
          : 'user-not-found-by-employee-id',
        ...this.toAuditContext(meta),
      });

      throw new UnauthorizedException('Credenciais invalidas.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      await this.authAuditService.failure(AUTH_AUDIT_EVENT.LOGIN, {
        ...this.authAuditService.fromUser(user),
        reason: `user-status-${user.status.toLowerCase()}`,
        ...this.toAuditContext(meta),
      });

      throw new UnauthorizedException('Conta indisponivel para login.');
    }

    const isPasswordValid = user.passwordHash
      ? await this.passwordHasher.verify(user.passwordHash, dto.password)
      : false;

    if (!isPasswordValid) {
      await this.authAuditService.failure(AUTH_AUDIT_EVENT.LOGIN, {
        ...this.authAuditService.fromUser(user),
        reason: 'invalid-password',
        ...this.toAuditContext(meta),
      });

      throw new UnauthorizedException('Credenciais invalidas.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.authAuditService.success(AUTH_AUDIT_EVENT.LOGIN, {
      ...this.authAuditService.fromUser(user),
      ...this.toAuditContext(meta),
    });

    return this.issueSession(user, meta);
  }

  async refresh(dto: RefreshSessionDto, meta: HttpRequestContext) {
    const session = await this.resolveValidSession(dto.refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        person: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.authAuditService.failure(AUTH_AUDIT_EVENT.REFRESH, {
        userId: session.userId,
        reason: 'user-not-active-for-refresh',
        ...this.toAuditContext(meta),
      });

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

    await this.authAuditService.success(AUTH_AUDIT_EVENT.REFRESH, {
      ...this.authAuditService.fromUser(user),
      ...this.toAuditContext(meta),
    });

    return this.buildAuthResponse(user, session.id, nextRefreshTokenSecret);
  }

  async logout(dto: LogoutDto, meta: HttpRequestContext) {
    const { sessionId } = this.parseRefreshToken(dto.refreshToken);
    const currentSession = await this.prisma.authSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

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

    await this.authAuditService.success(AUTH_AUDIT_EVENT.LOGOUT, {
      ...this.authAuditService.fromUser(currentSession?.user),
      ...this.toAuditContext(meta),
    });

    return {
      ok: true,
      message: 'Sessao encerrada com sucesso.',
    };
  }

  async listApplications(userId: string) {
    return {
      items: await this.applicationAccess.listAccessibleApplications(userId),
    };
  }

  async getMyProfile(user: AuthenticatedUser) {
    return {
      item: this.toMyProfileResponse(await this.findMyProfileUser(user.id)),
    };
  }

  async updateMyProfile(
    user: AuthenticatedUser,
    dto: UpdateMyProfileDto,
    meta: HttpRequestContext,
  ) {
    const beforeUser = await this.findMyProfileUser(user.id);
    const beforePreference = beforeUser.profilePreference;
    const nextPreference = await this.prisma.userProfilePreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        preferredName: this.optionalText(dto.preferredName),
        phoneNumber: this.optionalText(dto.phoneNumber),
        emergencyContactName: this.optionalText(dto.emergencyContactName),
        emergencyContactPhone: this.optionalText(dto.emergencyContactPhone),
        primaryBase: this.optionalText(dto.primaryBase),
        notificationChannel:
          dto.notificationChannel ?? UserProfileNotificationChannel.EMAIL,
      },
      update: {
        preferredName: this.optionalText(dto.preferredName),
        phoneNumber: this.optionalText(dto.phoneNumber),
        emergencyContactName: this.optionalText(dto.emergencyContactName),
        emergencyContactPhone: this.optionalText(dto.emergencyContactPhone),
        primaryBase: this.optionalText(dto.primaryBase),
        notificationChannel:
          dto.notificationChannel ?? beforePreference?.notificationChannel ?? UserProfileNotificationChannel.EMAIL,
      },
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: AuditAction.UPDATE,
      entityType: 'UserProfilePreference',
      entityId: nextPreference.id,
      entityLabel: beforeUser.email,
      before: beforePreference,
      after: nextPreference,
      metadata: { scope: 'self-service-profile' },
      requestId: meta.requestId,
    });

    return {
      item: this.toMyProfileResponse({
        ...beforeUser,
        profilePreference: nextPreference,
      }),
    };
  }

  async issueSessionForUserId(userId: string, meta: HttpRequestContext) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        person: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    return this.issueSession(user, meta);
  }

  async forgotPassword(dto: ForgotPasswordDto, meta: HttpRequestContext) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      await this.authAuditService.failure(AUTH_AUDIT_EVENT.FORGOT_PASSWORD, {
        email,
        reason: 'user-not-found',
        ...this.toAuditContext(meta),
      });

      return this.buildForgotPasswordResponse();
    }

    const now = new Date();
    const resetToken = this.authTokenService.generateOpaqueToken();
    const tokenHash = await this.passwordHasher.hash(resetToken);
    const expiresAt = new Date(
      Date.now() +
        this.configService.getOrThrow<number>(
          'PASSWORD_RESET_EXPIRES_IN_MINUTES',
        ) *
          60_000,
    );

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          consumedAt: now,
        },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    await this.authAuditService.success(AUTH_AUDIT_EVENT.FORGOT_PASSWORD, {
      ...this.authAuditService.fromUser(user),
      ...this.toAuditContext(meta),
    });

    return this.buildForgotPasswordResponse(resetToken);
  }

  async resetPassword(dto: ResetPasswordDto, meta: HttpRequestContext) {
    const resetEntries = await this.prisma.passwordResetToken.findMany({
      where: {
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          include: {
            person: {
              include: {
                employee: true,
              },
            },
          },
        },
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
      await this.authAuditService.failure(AUTH_AUDIT_EVENT.RESET_PASSWORD, {
        reason: 'invalid-or-expired-reset-token',
        ...this.toAuditContext(meta),
      });

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

    await this.authAuditService.success(AUTH_AUDIT_EVENT.RESET_PASSWORD, {
      ...this.authAuditService.fromUser(matchedEntry.user),
      reason: 'password-reset-completed',
      ...this.toAuditContext(meta),
    });

    return {
      ok: true,
      message: 'Senha redefinida com sucesso.',
    };
  }

  private async issueSession(
    user: AuthUserRecord,
    meta: HttpRequestContext,
  ): Promise<AuthResponse> {
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
    user: AuthUserRecord,
    sessionId: string,
    refreshTokenSecret: string,
  ): Promise<AuthResponse> {
    const accessToken = await this.authTokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      employeeId: user.person.employee?.employeeNumber ?? null,
      roles: user.roles,
      status: user.status,
    });
    const applications =
      await this.applicationAccess.listAccessibleApplications(user.id);

    return {
      accessToken,
      refreshToken: `${sessionId}.${refreshTokenSecret}`,
      tokenType: 'Bearer',
      user: this.toPublicUser(user),
      applications,
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
    if (previewToken && process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        'Password reset preview token generated for non-production environment.',
      );
    }

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
      user: AuthUserRecord;
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

  private normalizeEmployeeId(employeeId: string) {
    return employeeId.trim().replace(/\s+/g, '');
  }

  private normalizeLoginIdentifier(identifier?: string) {
    const value = identifier?.trim();

    if (!value) {
      throw new BadRequestException('Informe matricula ou email.');
    }

    if (value.includes('@')) {
      return {
        isEmail: true,
        value: this.normalizeEmail(value),
      };
    }

    return {
      isEmail: false,
      value: this.normalizeEmployeeId(value),
    };
  }

  private findUserForLogin(identifier: { isEmail: boolean; value: string }) {
    return this.prisma.user.findFirst({
      where: identifier.isEmail
        ? { email: identifier.value }
        : {
            person: {
              is: {
                employee: {
                  is: {
                    employeeNumber: identifier.value,
                  },
                },
              },
            },
          },
      include: {
        person: {
          include: {
            employee: true,
          },
        },
      },
    });
  }

  private async findMyProfileUser(userId: string): Promise<MyProfileUserRecord> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        roles: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        updatedAt: true,
        person: {
          select: {
            fullName: true,
            cpf: true,
            birthDate: true,
            employee: {
              select: {
                employeeNumber: true,
                department: true,
                updatedAt: true,
              },
            },
          },
        },
        profilePreference: {
          select: {
            preferredName: true,
            phoneNumber: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            primaryBase: true,
            notificationChannel: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario sem acesso ativo.');
    }

    return user;
  }

  private toMyProfileResponse(user: MyProfileUserRecord) {
    return {
      official: {
        userId: user.id,
        email: user.email,
        fullName: user.person.fullName,
        documentMasked: this.maskCpf(user.person.cpf),
        birthDate: user.person.birthDate?.toISOString() ?? null,
        employeeNumber: user.person.employee?.employeeNumber ?? null,
        departmentName: user.person.employee?.department ?? null,
        accountStatus: user.status,
        roles: user.roles,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        updatedAt: user.person.employee?.updatedAt.toISOString() ?? user.updatedAt.toISOString(),
      },
      preferences: {
        preferredName: user.profilePreference?.preferredName ?? null,
        phoneNumber: user.profilePreference?.phoneNumber ?? null,
        emergencyContactName: user.profilePreference?.emergencyContactName ?? null,
        emergencyContactPhone: user.profilePreference?.emergencyContactPhone ?? null,
        primaryBase: user.profilePreference?.primaryBase ?? null,
        notificationChannel:
          user.profilePreference?.notificationChannel ?? UserProfileNotificationChannel.EMAIL,
        updatedAt: user.profilePreference?.updatedAt.toISOString() ?? null,
      },
      editableFields: [
        'preferredName',
        'phoneNumber',
        'emergencyContactName',
        'emergencyContactPhone',
        'primaryBase',
        'notificationChannel',
      ],
    };
  }

  private maskCpf(cpf: string | null) {
    const digits = cpf?.replace(/\D/g, '');

    if (!digits || digits.length !== 11) {
      return null;
    }

    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }

  private optionalText(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private stringifyUserAgent(userAgent?: string | string[] | null) {
    if (!userAgent) {
      return null;
    }

    return Array.isArray(userAgent) ? userAgent.join(' | ') : userAgent;
  }

  private toPublicUser(
    user: AuthUserRecord,
  ): PublicUser {
    return {
      id: user.id,
      email: user.email,
      employeeId: user.person.employee?.employeeNumber ?? null,
      fullName: user.person.fullName,
      roles: user.roles,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }

  private toAuditContext(meta: HttpRequestContext) {
    return {
      requestId: meta.requestId,
      ipAddress: meta.ipAddress,
      userAgent: this.stringifyUserAgent(meta.userAgent),
    };
  }
}
