import { Injectable, Logger } from '@nestjs/common';

export type BoardingScheduleUpsertCommand = {
  externalEmployeeId: string | null;
  eventId: string | null;
  eventName: string | null;
  embarkDate: string | null;
  disembarkDate: string | null;
  unitName: string | null;
  status: string | null;
  notes: string[];
  rawPayload: Record<string, unknown>;
};

@Injectable()
export class BoardingScheduleIngestionService {
  private readonly logger = new Logger(BoardingScheduleIngestionService.name);

  ingest(
    payload: Record<string, unknown>,
    context: { correlationId: string; requestId?: string },
  ) {
    const command: BoardingScheduleUpsertCommand = {
      externalEmployeeId: this.readString(payload, [
        'employeeId',
        'colaboradorId',
        'matricula',
      ]),
      eventId: this.readString(payload, ['eventId', 'id', 'codigoEvento']),
      eventName: this.readString(payload, ['eventName', 'event', 'type']),
      embarkDate: this.readString(payload, [
        'embarkDate',
        'dataEmbarque',
        'boardingDate',
      ]),
      disembarkDate: this.readString(payload, [
        'disembarkDate',
        'dataDesembarque',
      ]),
      unitName: this.readString(payload, ['unitName', 'unidade', 'plataforma']),
      status: this.readString(payload, ['status', 'situacao']),
      notes: this.readStringList(payload, ['notes', 'avisos', 'observacoes']),
      rawPayload: payload,
    };

    this.logger.log(
      `Boarding schedule command prepared for ${context.correlationId} with embark ${command.embarkDate ?? 'not-informed'}`,
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

  private readStringList(payload: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = payload[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string');
      }
    }

    return [];
  }
}
