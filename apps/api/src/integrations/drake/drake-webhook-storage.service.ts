import { Injectable } from '@nestjs/common';
import { IntegrationInboxStatus, type Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaService } from '../../database/prisma.service';
import { DrakeWebhookMetadata, DrakeWebhookType } from './drake.types';

type PersistWebhookInput = {
  webhookType: DrakeWebhookType;
  payload: Record<string, unknown>;
  metadata: DrakeWebhookMetadata;
};

type PersistWebhookResult = {
  duplicate: boolean;
  storagePath: string | null;
};

@Injectable()
export class DrakeWebhookStorageService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async persist({
    webhookType,
    payload,
    metadata,
  }: PersistWebhookInput): Promise<PersistWebhookResult> {
    const existingEvent = await this.prisma.drakeWebhookInboxEvent.findUnique({
      where: {
        idempotencyKey: metadata.idempotencyKey,
      },
      select: {
        storagePath: true,
      },
    });

    if (existingEvent) {
      return {
        duplicate: true,
        storagePath: existingEvent.storagePath,
      };
    }

    const storagePath = await this.persistPayloadFile(
      webhookType,
      payload,
      metadata,
    );

    await this.prisma.drakeWebhookInboxEvent.create({
      data: {
        webhookType,
        requestId: metadata.requestId,
        correlationId: metadata.correlationId,
        idempotencyKey: metadata.idempotencyKey,
        eventName: metadata.eventName,
        externalEventId: metadata.eventId,
        employeeId: metadata.employeeId,
        status: IntegrationInboxStatus.RECEIVED,
        payload: payload as Prisma.InputJsonValue,
        metadata: metadata,
        storagePath,
      },
    });

    return {
      duplicate: false,
      storagePath,
    };
  }

  buildCorrelationId(
    webhookType: DrakeWebhookType,
    metadata: Pick<
      DrakeWebhookMetadata,
      'eventId' | 'eventName' | 'employeeId'
    >,
  ) {
    if (metadata.eventId) {
      return `drake:${webhookType}:${metadata.eventId}`;
    }

    const eventName = metadata.eventName ?? 'unknown-event';
    const employeeId = metadata.employeeId ?? 'unknown-employee';
    return `drake:${webhookType}:${eventName}:${employeeId}`;
  }

  buildIdempotencyKey(
    webhookType: DrakeWebhookType,
    payload: Record<string, unknown>,
    metadata: Pick<
      DrakeWebhookMetadata,
      'eventId' | 'employeeId' | 'eventName'
    >,
  ) {
    if (metadata.eventId) {
      return `drake:${webhookType}:${metadata.eventId}`;
    }

    const hash = createHash('sha256');
    hash.update(webhookType);
    hash.update(JSON.stringify(this.sortObject(payload)));
    hash.update(metadata.employeeId ?? '');
    hash.update(metadata.eventName ?? '');

    return `drake:${webhookType}:hash:${hash.digest('hex')}`;
  }

  private async persistPayloadFile(
    webhookType: DrakeWebhookType,
    payload: Record<string, unknown>,
    metadata: DrakeWebhookMetadata,
  ) {
    const storageDir = this.resolveStorageDir();
    const safeTimestamp = metadata.receivedAt.replaceAll(':', '-');
    const safeCorrelationId = metadata.correlationId
      .replaceAll(':', '-')
      .replaceAll('/', '-');
    const filePath = path.join(
      storageDir,
      `${safeTimestamp}-${webhookType}-${safeCorrelationId}.json`,
    );

    await mkdir(storageDir, { recursive: true });
    await writeFile(
      filePath,
      JSON.stringify(
        {
          storedAt: metadata.receivedAt,
          webhookType,
          metadata,
          payload,
        },
        null,
        2,
      ),
      'utf8',
    );

    return filePath;
  }

  private resolveStorageDir() {
    const configuredPath = this.configService.get<string>(
      'WEBHOOK_STORAGE_DIR',
    );
    return path.resolve(configuredPath ?? './data/webhooks');
  }

  private sortObject(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sortObject(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, currentValue]) => [key, this.sortObject(currentValue)]);

    return Object.fromEntries(entries);
  }
}
