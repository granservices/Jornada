import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { IntakeAnalysis, IntakeEventType, NormalizedBody } from './intake.types';

@Injectable()
export class IntakeClassifierService {
  classify(request: Request, normalizedBody: NormalizedBody): IntakeAnalysis {
    const explicitType = this.readExplicitEventType(request, normalizedBody);
    const eventType = explicitType ?? this.inferEventType(normalizedBody.payload);
    const source = this.readSource(request, normalizedBody.payload);

    if (eventType === 'qualification_pending') {
      return {
        eventType,
        source,
        ...this.extractQualification(normalizedBody.payload),
      };
    }

    if (eventType === 'logistics_schedule') {
      return {
        eventType,
        source,
        ...this.extractLogistics(normalizedBody.payload),
      };
    }

    return {
      eventType,
      source,
      workerKey: this.findFirstString(normalizedBody.payload, [
        'matricula',
        'employeeId',
        'workerId',
      ]),
      workerName: this.findFirstString(normalizedBody.payload, [
        'nome',
        'name',
        'workerName',
      ]),
      pendencyKind: null,
      trainingList: null,
      dueDate: null,
      daysUntilDue: null,
      logisticsEventDate: null,
      logisticsAction: null,
      eligibleWithin15Days: false,
      summary: 'Evento recebido sem classificacao conhecida.',
    };
  }

  private readExplicitEventType(
    request: Request,
    normalizedBody: NormalizedBody,
  ): IntakeEventType | null {
    const header = this.headerValue(request.headers['x-event-type']);
    const bodyValue = this.findFirstString(normalizedBody.payload, [
      'eventType',
      'type',
    ]);
    const candidate = (header ?? bodyValue)?.trim();

    if (
      candidate === 'qualification_pending' ||
      candidate === 'logistics_schedule'
    ) {
      return candidate;
    }

    return null;
  }

  private inferEventType(payload: unknown): IntakeEventType {
    const text = this.stringifySearchable(payload);

    if (
      text.includes('pendencia_drake') ||
      text.includes('pendencias') ||
      text.includes('datavencaso') ||
      text.includes('listatreinamentos')
    ) {
      return 'qualification_pending';
    }

    if (
      text.includes('boarding') ||
      text.includes('embarque') ||
      text.includes('desembarque') ||
      text.includes('programacao') ||
      text.includes('programação') ||
      text.includes('logistica') ||
      text.includes('logística')
    ) {
      return 'logistics_schedule';
    }

    return 'unknown';
  }

  private readSource(request: Request, payload: unknown) {
    return (
      this.headerValue(request.headers['x-source']) ??
      this.findFirstString(payload, ['source', 'origin']) ??
      'unknown'
    );
  }

  private extractQualification(payload: unknown) {
    const messageParams = this.findRecord(payload, ['messageParams']);
    const pendencyKind =
      this.findFirstString(messageParams, ['pendencias']) ??
      this.findFirstString(payload, ['pendencyKind', 'pendencias']);
    const trainingList =
      this.findFirstString(messageParams, ['listaTreinamentos']) ??
      this.findFirstString(payload, ['trainingList', 'listaTreinamentos']);
    const dueDateRaw =
      this.findFirstString(messageParams, ['dataVencAso']) ??
      this.findFirstString(payload, ['dueDate', 'expirationDate', 'dataVencAso']);
    const dueDate = this.normalizeDate(dueDateRaw);
    const daysUntilDue = dueDate ? this.daysUntil(dueDate) : null;
    const workerName =
      this.findFirstString(messageParams, ['1', 'nome', 'name']) ??
      this.findFirstString(payload, ['workerName', 'nome', 'name']);

    return {
      workerKey: this.findFirstString(payload, [
        'matricula',
        'employeeId',
        'workerId',
        'recipient',
      ]),
      workerName,
      pendencyKind,
      trainingList,
      dueDate,
      daysUntilDue,
      logisticsEventDate: null,
      logisticsAction: null,
      eligibleWithin15Days:
        typeof daysUntilDue === 'number' && daysUntilDue <= 15,
      summary: this.buildQualificationSummary({
        pendencyKind,
        trainingList,
        dueDate,
        daysUntilDue,
      }),
    };
  }

  private extractLogistics(payload: unknown) {
    const logisticsEventDate = this.normalizeDate(
      this.findFirstString(payload, [
        'eventDate',
        'scheduleDate',
        'boardingDate',
        'dataProgramacao',
        'dataEmbarque',
      ]),
    );
    const logisticsAction = this.findFirstString(payload, [
      'action',
      'eventName',
      'operation',
      'tipo',
      'type',
    ]);

    return {
      workerKey: this.findFirstString(payload, [
        'matricula',
        'employeeId',
        'workerId',
      ]),
      workerName: this.findFirstString(payload, [
        'workerName',
        'nome',
        'name',
      ]),
      pendencyKind: null,
      trainingList: null,
      dueDate: null,
      daysUntilDue: null,
      logisticsEventDate,
      logisticsAction,
      eligibleWithin15Days: false,
      summary: logisticsAction
        ? `Evento logistico recebido: ${logisticsAction}.`
        : 'Evento logistico recebido.',
    };
  }

  private buildQualificationSummary({
    pendencyKind,
    trainingList,
    dueDate,
    daysUntilDue,
  }: {
    pendencyKind: string | null;
    trainingList: string | null;
    dueDate: string | null;
    daysUntilDue: number | null;
  }) {
    const parts = [
      pendencyKind ? `Pendencia: ${pendencyKind}` : null,
      trainingList ? `Treinamentos: ${trainingList}` : null,
      dueDate ? `Vencimento: ${dueDate}` : null,
      typeof daysUntilDue === 'number' ? `Dias: ${daysUntilDue}` : null,
    ].filter(Boolean);

    return parts.length > 0
      ? parts.join(' | ')
      : 'Pendencia de qualificacao recebida.';
  }

  private findRecord(
    value: unknown,
    keys: string[],
  ): Record<string, unknown> | null {
    const found = this.walk(value).find((item) => {
      if (!this.isRecord(item)) {
        return false;
      }

      return keys.some((key) => this.isRecord(item[key]));
    });

    if (!this.isRecord(found)) {
      return null;
    }

    const key = keys.find((candidate) => this.isRecord(found[candidate]));
    return key ? (found[key] as Record<string, unknown>) : null;
  }

  private findFirstString(value: unknown, keys: string[]) {
    for (const item of this.walk(value)) {
      if (!this.isRecord(item)) {
        continue;
      }

      for (const key of keys) {
        const direct = item[key];
        if (typeof direct === 'string' && direct.trim().length > 0) {
          return direct.trim();
        }
      }
    }

    return null;
  }

  private walk(value: unknown): unknown[] {
    const output: unknown[] = [];
    const queue: unknown[] = [value];

    while (queue.length > 0 && output.length < 200) {
      const current = queue.shift();
      output.push(current);

      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }

      if (this.isRecord(current)) {
        queue.push(...Object.values(current));
      }
    }

    return output;
  }

  private normalizeDate(value: string | null) {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    const brDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    if (brDate) {
      const [, day, month, year] = brDate;
      return `${year}-${month}-${day}`;
    }

    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString().slice(0, 10);
  }

  private daysUntil(date: string) {
    const today = new Date();
    const todayUtc = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    );
    const [year, month, day] = date.split('-').map(Number);
    const targetUtc = Date.UTC(year, month - 1, day);

    return Math.ceil((targetUtc - todayUtc) / 86_400_000);
  }

  private stringifySearchable(payload: unknown) {
    if (typeof payload === 'string') {
      return payload.toLowerCase();
    }

    try {
      return JSON.stringify(payload).toLowerCase();
    } catch {
      return '';
    }
  }

  private headerValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && !Array.isArray(value) && typeof value === 'object';
  }
}
