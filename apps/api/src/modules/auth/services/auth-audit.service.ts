import { Injectable, Logger } from '@nestjs/common';
import {
  AuthAuditEventType,
  AuthAuditOutcome,
  type User,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

type AuditPayload = {
  eventType: AuthAuditEventType;
  outcome: AuthAuditOutcome;
  userId?: string;
  email?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string | null;
  reason?: string;
};

@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger(AuthAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async success(
    eventType: AuthAuditEventType,
    payload: Omit<AuditPayload, 'eventType' | 'outcome'>,
  ) {
    await this.persist({
      ...payload,
      eventType,
      outcome: AuthAuditOutcome.SUCCESS,
    });
  }

  async failure(
    eventType: AuthAuditEventType,
    payload: Omit<AuditPayload, 'eventType' | 'outcome'>,
  ) {
    await this.persist({
      ...payload,
      eventType,
      outcome: AuthAuditOutcome.FAILURE,
    });
  }

  fromUser(user: Pick<User, 'id' | 'email'> | null | undefined) {
    if (!user) {
      return {};
    }

    return {
      userId: user.id,
      email: user.email,
    };
  }

  private async persist(payload: AuditPayload) {
    try {
      await this.prisma.authAuditLog.create({
        data: payload,
      });
    } catch (error) {
      const details =
        error instanceof Error ? error.message : 'unexpected audit error';

      this.logger.warn(
        `Auth audit persistence failed for ${payload.eventType}: ${details}`,
      );
    }
  }
}
