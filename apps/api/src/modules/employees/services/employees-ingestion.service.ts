import { Injectable, Logger } from '@nestjs/common';

export type EmployeeUpsertCommand = {
  externalEmployeeId: string | null;
  eventId: string | null;
  eventName: string | null;
  fullName: string | null;
  cpf: string | null;
  email: string | null;
  department: string | null;
  rawPayload: Record<string, unknown>;
};

@Injectable()
export class EmployeesIngestionService {
  private readonly logger = new Logger(EmployeesIngestionService.name);

  ingest(
    payload: Record<string, unknown>,
    context: { correlationId: string; requestId?: string },
  ) {
    const command: EmployeeUpsertCommand = {
      externalEmployeeId: this.readString(payload, [
        'employeeId',
        'colaboradorId',
        'matricula',
      ]),
      eventId: this.readString(payload, ['eventId', 'id', 'codigoEvento']),
      eventName: this.readString(payload, ['eventName', 'event', 'type']),
      fullName: this.readString(payload, ['fullName', 'nome', 'nomeCompleto']),
      cpf: this.readString(payload, ['cpf', 'documento']),
      email: this.readString(payload, ['email', 'emailCorporativo']),
      department: this.readString(payload, ['department', 'setor', 'area']),
      rawPayload: payload,
    };

    this.logger.log(
      `Employee domain command prepared for ${context.correlationId} with employee ${command.externalEmployeeId ?? 'unknown'}`,
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
}
