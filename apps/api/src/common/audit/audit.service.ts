import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type AuditClient = Pick<PrismaService, 'auditLog'>;

type AuditRecord = {
  actorUserId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown> | null;
  requestId?: string | null;
};

const SENSITIVE_KEY_PATTERN =
  /(password|senha|token|secret|authorization|cookie|cpf|cnpj|refresh|accessToken|refreshToken)/i;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(payload: AuditRecord) {
    return this.prisma.auditLog.create({
      data: this.createData(payload),
    });
  }

  recordWith(client: AuditClient, payload: AuditRecord) {
    return client.auditLog.create({
      data: this.createData(payload),
    });
  }

  createData(payload: AuditRecord): Prisma.AuditLogUncheckedCreateInput {
    return {
      actorUserId: payload.actorUserId ?? null,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId ?? null,
      entityLabel: payload.entityLabel ?? null,
      before: this.jsonOrNull(payload.before),
      after: this.jsonOrNull(payload.after),
      metadata: this.jsonOrNull(payload.metadata),
      requestId: payload.requestId ?? null,
    };
  }

  private jsonOrNull(value: unknown) {
    if (value === undefined || value === null) {
      return Prisma.JsonNull;
    }

    return this.sanitize(value) as Prisma.InputJsonValue;
  }

  private sanitize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : this.sanitize(entry),
      ]),
    );
  }
}
