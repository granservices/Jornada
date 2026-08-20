import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { PasswordHasherService } from './password-hasher.service';

@Injectable()
export class AuthAdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthAdminBootstrapService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
  ) {}

  async onApplicationBootstrap() {
    const enabled = this.configService.get<boolean>('ADMIN_BOOTSTRAP_ENABLED');

    if (!enabled) {
      return;
    }

    const email = this.configService.get<string>('ADMIN_BOOTSTRAP_EMAIL');
    const password = this.configService.get<string>('ADMIN_BOOTSTRAP_PASSWORD');
    const fullName =
      this.configService.get<string>('ADMIN_BOOTSTRAP_FULL_NAME') ??
      'Administrador Jornada';

    if (!email || !password) {
      this.logger.warn(
        'ADMIN_BOOTSTRAP_ENABLED=true, mas faltam ADMIN_BOOTSTRAP_EMAIL ou ADMIN_BOOTSTRAP_PASSWORD.',
      );
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!existingUser) {
      const passwordHash = await this.passwordHasher.hash(password);

      await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          fullName,
          passwordHash,
          roles: [Role.ADMIN],
          emailVerifiedAt: new Date(),
        },
      });

      this.logger.log(`Conta admin bootstrap criada para ${normalizedEmail}.`);
      return;
    }

    if (!existingUser.roles.includes(Role.ADMIN)) {
      const roles = Array.from(new Set([...existingUser.roles, Role.ADMIN]));

      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          roles,
        },
      });

      this.logger.log(
        `Role ADMIN adicionada ao usuario bootstrap ${normalizedEmail}.`,
      );
      return;
    }

    this.logger.log(`Bootstrap admin ja atendido para ${normalizedEmail}.`);
  }
}
