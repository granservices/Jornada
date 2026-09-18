import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type DrakeWorker = {
  workerId: string;
  employeeNumber: string | null;
  fullName: string;
  operationalUnitId: string;
  operationalUnitName: string | null;
};

export type DrakePeriod = {
  id: string;
  start: string;
  end: string;
  type: string | null;
  layer: string | null;
  eventDescription: string | null;
  eventAcronym: string | null;
  eventColor: string | null;
  appointmentDescription: string | null;
  operationalUnitName: string | null;
  approved: boolean;
};

type DrakeWorkerResponse = {
  WorkerId?: unknown;
  workerId?: unknown;
  Registration?: unknown;
  workerRegistration?: unknown;
  FullName?: unknown;
  workerName?: unknown;
  OperationalUnitId?: unknown;
  operationalUnitId?: unknown;
  OperationalUnitName?: unknown;
  operationalUnitName?: unknown;
};

type DrakePeriodResponse = {
  Id?: unknown;
  id?: unknown;
  Start?: unknown;
  start?: unknown;
  End?: unknown;
  end?: unknown;
  Type?: unknown;
  type?: unknown;
  Layer?: unknown;
  layer?: unknown;
  EventDescription?: unknown;
  eventDescription?: unknown;
  EventAcronym?: unknown;
  eventAcronym?: unknown;
  EventColor?: unknown;
  eventColor?: unknown;
  AppointmentDescription?: unknown;
  appointmentDescription?: unknown;
  UopName?: unknown;
  uopName?: unknown;
  Approved?: unknown;
  approved?: unknown;
};

@Injectable()
export class DrakeCrewRotationClient {
  constructor(private readonly config: ConfigService) {}

  async findWorkers(query: string) {
    const url = new URL('/api/v2/CrewRotation/GetWorkers', this.baseUrl());
    url.searchParams.set('textSearch', query.trim());
    url.searchParams.set('page', '1');
    url.searchParams.set('limit', '20');

    const body = await this.request(url, { method: 'GET' });
    const items = this.readArray(body, 'Items', 'items');
    return items.flatMap((item) => this.toWorker(item));
  }

  async findWorker(workerId: string, employeeNumber: string | null) {
    const candidates = await this.findWorkers(employeeNumber ?? workerId);
    return candidates.find((candidate) => candidate.workerId === workerId)
      ?? candidates.find((candidate) => candidate.employeeNumber === employeeNumber)
      ?? null;
  }

  async listPeriods(input: {
    workerId: string;
    operationalUnitId: string;
    from: Date;
    to: Date;
  }) {
    const url = new URL('/api/v2/CrewRotation/Periods', this.baseUrl());
    const body = await this.request(url, {
      method: 'POST',
      body: JSON.stringify({
        Start: input.from.toISOString(),
        End: input.to.toISOString(),
        Layers: ['CrewRotation'],
        WorkerIds: [input.workerId],
        OperationalUnitId: input.operationalUnitId,
      }),
    });

    return this.readArray(body).flatMap((item) => this.toPeriod(item));
  }

  private async request(url: URL, init: RequestInit) {
    this.assertConfigured();

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: this.authorizationHeader(),
          'X-SAPIENSIA-TenantId': this.config.getOrThrow<string>('DRAKE_TENANT_ID'),
        },
        signal: AbortSignal.timeout(
          this.config.getOrThrow<number>('DRAKE_SCHEDULE_HTTP_TIMEOUT_MS'),
        ),
        redirect: 'error',
      });
    } catch {
      throw new ServiceUnavailableException('A fonte de programacao esta indisponivel.');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('A fonte de programacao nao respondeu neste momento.');
    }

    const rawBody = await response.text();
    if (new TextEncoder().encode(rawBody).byteLength > 2_000_000) {
      throw new ServiceUnavailableException('A fonte de programacao excedeu o limite de resposta.');
    }

    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      throw new ServiceUnavailableException('A fonte de programacao retornou dados invalidos.');
    }
  }

  private assertConfigured() {
    if (!this.config.get<string>('DRAKE_TENANT_ID') || !this.config.get<string>('DRAKE_AUTH_TOKEN')) {
      throw new ServiceUnavailableException('A fonte de programacao ainda nao foi configurada.');
    }
  }

  private authorizationHeader() {
    const token = this.config.getOrThrow<string>('DRAKE_AUTH_TOKEN').trim();
    return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
  }

  private baseUrl() {
    return this.config.getOrThrow<string>('DRAKE_API_BASE_URL');
  }

  private readArray(value: unknown, ...keys: string[]) {
    if (Array.isArray(value)) {
      return value;
    }

    if (!value || typeof value !== 'object') {
      return [];
    }

    for (const key of keys) {
      const candidate = (value as Record<string, unknown>)[key];
      if (Array.isArray(candidate)) return candidate;
    }

    return [];
  }

  private toWorker(value: unknown): DrakeWorker[] {
    if (!value || typeof value !== 'object') {
      return [];
    }

    const worker = value as DrakeWorkerResponse;
    const workerId = this.readString(worker.WorkerId ?? worker.workerId);
    const fullName = this.readString(worker.FullName ?? worker.workerName);
    const operationalUnitId = this.readString(worker.OperationalUnitId ?? worker.operationalUnitId);

    if (!workerId || !fullName || !operationalUnitId) {
      return [];
    }

    return [{
      workerId,
      fullName,
      employeeNumber: this.readString(worker.Registration ?? worker.workerRegistration),
      operationalUnitId,
      operationalUnitName: this.readString(worker.OperationalUnitName ?? worker.operationalUnitName),
    }];
  }

  private toPeriod(value: unknown): DrakePeriod[] {
    if (!value || typeof value !== 'object') {
      return [];
    }

    const period = value as DrakePeriodResponse;
    const id = this.readString(period.Id ?? period.id);
    const start = this.readString(period.Start ?? period.start);
    const end = this.readString(period.End ?? period.end);

    if (!id || !start || !end) {
      return [];
    }

    return [{
      id,
      start,
      end,
      type: this.readString(period.Type ?? period.type),
      layer: this.readString(period.Layer ?? period.layer),
      eventDescription: this.readString(period.EventDescription ?? period.eventDescription),
      eventAcronym: this.readString(period.EventAcronym ?? period.eventAcronym),
      eventColor: this.readString(period.EventColor ?? period.eventColor),
      appointmentDescription: this.readString(period.AppointmentDescription ?? period.appointmentDescription),
      operationalUnitName: this.readString(period.UopName ?? period.uopName),
      approved: period.Approved === true || period.approved === true,
    }];
  }

  private readString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
