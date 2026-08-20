import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { StringValue } from 'ms';
import { AppLoggingModule } from './common/logging/logging.module';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';
import { DrakeModule } from './integrations/drake/drake.module';
import { AuthModule } from './modules/auth/auth.module';
import { BoardingScheduleModule } from './modules/boarding-schedule/boarding-schedule.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ExpiringRequirementsModule } from './modules/expiring-requirements/expiring-requirements.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: envValidationSchema,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = new URL(configService.getOrThrow<string>('REDIS_URL'));

        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port || 6379),
            username: redisUrl.username || undefined,
            password: redisUrl.password || undefined,
            db: redisUrl.pathname
              ? Number(redisUrl.pathname.replace('/', '') || 0)
              : 0,
            tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
          },
        };
      },
    }),
    AppLoggingModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.getOrThrow<number>('THROTTLE_TTL_MS'),
          limit: configService.getOrThrow<number>('THROTTLE_LIMIT'),
        },
      ],
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>(
            'JWT_ACCESS_EXPIRES_IN',
          ) as StringValue,
          issuer: configService.getOrThrow<string>('JWT_ISSUER'),
          audience: configService.getOrThrow<string>('JWT_AUDIENCE'),
        },
      }),
    }),
    PrismaModule,
    HealthModule,
    EmployeesModule,
    BoardingScheduleModule,
    ExpiringRequirementsModule,
    DrakeModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
