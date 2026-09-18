import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { IntakeBodyService } from './intake-body.service';
import { IntakeClassifierService } from './intake-classifier.service';
import { IntakeRawStorageService } from './intake-raw-storage.service';
import { IntakeSqliteService } from './intake-sqlite.service';
import { IntakeStatus, StoredIntakeEvent } from './intake.types';

@Injectable()
export class IntakeService {
  constructor(
    private readonly bodyService: IntakeBodyService,
    private readonly classifierService: IntakeClassifierService,
    private readonly rawStorageService: IntakeRawStorageService,
    private readonly sqliteService: IntakeSqliteService,
  ) {}

  async receive(request: Request) {
    const receivedAt = new Date().toISOString();
    const id = randomUUID();
    const normalizedBody = this.bodyService.normalize(request.body);
    const analysis = this.classifierService.classify(request, normalizedBody);
    const contentType = this.headerValue(request.headers['content-type']);
    const sha256 = this.hashBody(request.body, normalizedBody.rawBodyText);
    const existing = this.sqliteService.findByHash(sha256);
    const status: IntakeStatus = existing
      ? 'duplicate'
      : normalizedBody.bodyKind === 'text' || normalizedBody.bodyKind === 'binary'
        ? 'malformed'
        : 'stored';
    const storagePath = await this.rawStorageService.persist({
      id,
      receivedAt,
      eventType: analysis.eventType,
      source: analysis.source,
      contentType,
      sha256,
      normalizedBody,
    });
    const event: StoredIntakeEvent = {
      id,
      receivedAt,
      source: analysis.source,
      eventType: analysis.eventType,
      status,
      bodyKind: normalizedBody.bodyKind,
      contentType,
      sha256,
      storagePath,
      duplicateOf: existing?.id ?? null,
      parseError: normalizedBody.parseError,
      workerKey: analysis.workerKey,
      workerName: analysis.workerName,
      pendencyKind: analysis.pendencyKind,
      trainingList: analysis.trainingList,
      dueDate: analysis.dueDate,
      daysUntilDue: analysis.daysUntilDue,
      logisticsEventDate: analysis.logisticsEventDate,
      logisticsAction: analysis.logisticsAction,
      eligibleWithin15Days: analysis.eligibleWithin15Days,
      summary: analysis.summary,
    };

    this.sqliteService.insert(event);

    return {
      ok: true,
      id,
      receivedAt,
      eventType: event.eventType,
      status: event.status,
      bodyKind: event.bodyKind,
      duplicateOf: event.duplicateOf,
      stored: true,
    };
  }

  list(input: { eventType?: string; status?: string; limit?: string }) {
    return this.sqliteService.list({
      eventType: input.eventType,
      status: input.status,
      limit: this.normalizeLimit(input.limit),
    });
  }

  summary() {
    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      summary: this.sqliteService.summary(),
    };
  }

  qualificationPreview(daysValue?: string) {
    const days = this.normalizeDays(daysValue);
    return {
      ok: true,
      days,
      generatedAt: new Date().toISOString(),
      events: this.sqliteService.qualificationPreview(days),
    };
  }

  private normalizeLimit(value: string | undefined) {
    const parsed = Number(value ?? 50);

    if (!Number.isInteger(parsed) || parsed < 1) {
      return 50;
    }

    return Math.min(parsed, 500);
  }

  private normalizeDays(value: string | undefined) {
    const parsed = Number(value ?? 15);

    if (!Number.isInteger(parsed) || parsed < 0) {
      return 15;
    }

    return Math.min(parsed, 365);
  }

  private hashBody(body: unknown, rawBodyText: string | null) {
    if (Buffer.isBuffer(body)) {
      return createHash('sha256').update(body).digest('hex');
    }

    return createHash('sha256')
      .update(rawBodyText ?? JSON.stringify(body ?? null))
      .digest('hex');
  }

  private headerValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  }
}
