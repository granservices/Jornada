import { Injectable, Logger } from '@nestjs/common';

export type RequirementAlertCommand = {
  externalEmployeeId: string | null;
  eventId: string | null;
  eventName: string | null;
  requirementType: string | null;
  requirementName: string | null;
  expiresAt: string | null;
  daysToExpire: number | null;
  severity: 'info' | 'warning' | 'critical';
  rawPayload: Record<string, unknown>;
};

@Injectable()
export class ExpiringRequirementsIngestionService {
  private readonly logger = new Logger(
    ExpiringRequirementsIngestionService.name,
  );

  ingest(
    payload: Record<string, unknown>,
    context: { correlationId: string; requestId?: string },
  ) {
    const daysToExpire = this.readNumber(payload, [
      'daysToExpire',
      'diasParaVencer',
      'diasRestantes',
    ]);

    const command: RequirementAlertCommand = {
      externalEmployeeId: this.readString(payload, [
        'employeeId',
        'colaboradorId',
        'matricula',
      ]),
      eventId: this.readString(payload, ['eventId', 'id', 'codigoEvento']),
      eventName: this.readString(payload, ['eventName', 'event', 'type']),
      requirementType: this.readString(payload, [
        'requirementType',
        'tipo',
        'categoria',
      ]),
      requirementName: this.readString(payload, [
        'requirementName',
        'nome',
        'descricao',
      ]),
      expiresAt: this.readString(payload, [
        'expiresAt',
        'expirationDate',
        'dataVencimento',
      ]),
      daysToExpire,
      severity:
        daysToExpire === null
          ? 'info'
          : daysToExpire <= 7
            ? 'critical'
            : daysToExpire <= 30
              ? 'warning'
              : 'info',
      rawPayload: payload,
    };

    this.logger.log(
      `Requirement alert command prepared for ${context.correlationId} with severity ${command.severity}`,
    );

    return command;
  }

  private readString(payload: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return null;
  }

  private readNumber(payload: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return null;
  }
}
