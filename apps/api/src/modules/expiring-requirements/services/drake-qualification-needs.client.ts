import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type DrakeQualificationNeed = {
  id: string;
  qualificationName: string;
  requirementType: string | null;
  expiresAt: string | null;
};

@Injectable()
export class DrakeQualificationNeedsClient {
  private readonly pageSize = 100;

  constructor(private readonly config: ConfigService) {}

  async listExpiringNeeds(workerId: string) {
    const items: DrakeQualificationNeed[] = [];
    let skip = 0;

    while (true) {
      const page = await this.fetchPage(workerId, skip);
      items.push(...page.items);

      if (page.items.length < this.pageSize || (page.totalCount !== null && items.length >= page.totalCount)) {
        break;
      }

      skip += this.pageSize;
    }

    return items;
  }

  private async fetchPage(workerId: string, skip: number) {
    const url = new URL('/api/v2/Compliance/IndividualQualificationNeeds/GetAll', this.baseUrl());
    url.searchParams.set('skip', String(skip));
    url.searchParams.set('take', String(this.pageSize));
    url.searchParams.set('filter', JSON.stringify([['workerId', '=', workerId]]));
    url.searchParams.set('sort', JSON.stringify([{ selector: 'expirationDate', desc: false }]));
    url.searchParams.set('select', JSON.stringify([
      'id',
      'qualificationName',
      'qualificationNeedTypeName',
      'expirationDate',
    ]));

    const body = await this.request(url);
    return {
      items: this.readData(body).flatMap((item) => this.toNeed(item)),
      totalCount: this.readTotalCount(body),
    };
  }

  private async request(url: URL) {
    this.assertConfigured();

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: this.authorizationHeader(),
          'X-SAPIENSIA-TenantId': this.config.getOrThrow<string>('DRAKE_TENANT_ID'),
        },
        signal: AbortSignal.timeout(this.config.getOrThrow<number>('DRAKE_SCHEDULE_HTTP_TIMEOUT_MS')),
        redirect: 'error',
      });
    } catch {
      throw new ServiceUnavailableException('A fonte de qualificacoes esta indisponivel.');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('A fonte de qualificacoes nao respondeu neste momento.');
    }

    const rawBody = await response.text();
    if (new TextEncoder().encode(rawBody).byteLength > 1_000_000) {
      throw new ServiceUnavailableException('A fonte de qualificacoes excedeu o limite de resposta.');
    }

    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      throw new ServiceUnavailableException('A fonte de qualificacoes retornou dados invalidos.');
    }
  }

  private readData(value: unknown) {
    if (!value || typeof value !== 'object') return [];
    const data = (value as { data?: unknown }).data;
    return Array.isArray(data) ? data : [];
  }

  private readTotalCount(value: unknown) {
    if (!value || typeof value !== 'object') return null;
    const totalCount = (value as { totalCount?: unknown; count?: unknown }).totalCount
      ?? (value as { count?: unknown }).count;
    return typeof totalCount === 'number' && Number.isFinite(totalCount) ? totalCount : null;
  }

  private toNeed(value: unknown): DrakeQualificationNeed[] {
    if (!value || typeof value !== 'object') return [];
    const item = value as Record<string, unknown>;
    const id = this.readString(item.id);
    const qualificationName = this.readString(item.qualificationName);
    const expiresAt = this.readString(item.expirationDate);
    if (!id || !qualificationName) return [];

    return [{
      id,
      qualificationName,
      requirementType: this.readString(item.qualificationNeedTypeName),
      expiresAt,
    }];
  }

  private assertConfigured() {
    if (!this.config.get<string>('DRAKE_TENANT_ID') || !this.config.get<string>('DRAKE_AUTH_TOKEN')) {
      throw new ServiceUnavailableException('A fonte de qualificacoes ainda nao foi configurada.');
    }
  }

  private authorizationHeader() {
    const token = this.config.getOrThrow<string>('DRAKE_AUTH_TOKEN').trim();
    return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
  }

  private baseUrl() {
    return this.config.getOrThrow<string>('DRAKE_API_BASE_URL');
  }

  private readString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
