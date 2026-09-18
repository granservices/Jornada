import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { OptionSourceAdapterType } from '@prisma/client';
import type { OptionQuery, OptionQueryResult, OptionSourceConfig, OptionSourceRecord } from './option-source.types';
import { isOptionSourceConfig, type OptionSourceAdapter } from './option-source-adapter';

const MAX_RESPONSE_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MS = 5_000;

@Injectable()
export class StaticOptionSourceAdapter implements OptionSourceAdapter {
  readonly type = OptionSourceAdapterType.STATIC;

  async query(source: OptionSourceRecord, query: OptionQuery): Promise<OptionQueryResult> {
    const config = this.config(source);
    const normalizedQuery = query.query.trim().toLocaleLowerCase();
    const filtered = (config.options ?? []).filter((item) =>
      !normalizedQuery || `${item.label} ${item.value}`.toLocaleLowerCase().includes(normalizedQuery),
    );
    const offset = query.cursor ? Number.parseInt(query.cursor, 10) : 0;
    const items = filtered.slice(offset, offset + query.limit);
    const nextOffset = offset + items.length;

    return {
      items,
      nextCursor: nextOffset < filtered.length ? String(nextOffset) : null,
      hasMore: nextOffset < filtered.length,
    };
  }

  private config(source: OptionSourceRecord) {
    if (!isOptionSourceConfig(source.config) || !Array.isArray(source.config.options)) {
      throw new BadRequestException('Fonte estatica de opcoes invalida.');
    }

    return source.config;
  }
}

@Injectable()
export class HttpJsonOptionSourceAdapter implements OptionSourceAdapter {
  readonly type = OptionSourceAdapterType.HTTP_JSON;

  async query(source: OptionSourceRecord, query: OptionQuery): Promise<OptionQueryResult> {
    const config = this.config(source);
    const endpoint = this.safeEndpoint(config.endpoint!);
    const url = new URL(endpoint);
    url.searchParams.set(config.queryParam ?? 'q', query.query);
    url.searchParams.set('limit', String(query.limit));
    if (query.cursor) {
      url.searchParams.set('cursor', query.cursor);
    }

    let response: Response;
    try {
      const signal = this.buildSignal(query.signal);
      response = await fetch(url, {
        method: 'GET',
        signal,
        headers: { Accept: 'application/json' },
        redirect: 'error',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      throw new ServiceUnavailableException('Fonte de opcoes indisponivel.');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('Fonte de opcoes indisponivel.');
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new ServiceUnavailableException('Resposta da fonte de opcoes excedeu o limite.');
    }

    const body = await response.text();
    if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES) {
      throw new ServiceUnavailableException('Resposta da fonte de opcoes excedeu o limite.');
    }

    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      throw new ServiceUnavailableException('Fonte de opcoes retornou dados invalidos.');
    }

    return this.normalize(json, config, query.limit);
  }

  private config(source: OptionSourceRecord) {
    if (!isOptionSourceConfig(source.config) || !source.config.endpoint) {
      throw new BadRequestException('Fonte HTTP de opcoes invalida.');
    }

    return source.config;
  }

  private safeEndpoint(endpoint: string) {
    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      throw new BadRequestException('Endpoint da fonte de opcoes invalido.');
    }

    const allowedHosts = (process.env.FORM_OPTION_SOURCE_ALLOWED_HOSTS ?? '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    if (url.protocol !== 'https:' || !allowedHosts.includes(url.hostname.toLowerCase())) {
      throw new BadRequestException('Endpoint da fonte de opcoes nao permitido.');
    }

    return url.toString();
  }

  private buildSignal(signal?: AbortSignal) {
    const timeoutMs = Number.parseInt(
      process.env.FORM_OPTION_SOURCE_HTTP_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS),
      10,
    );
    const timeoutSignal = AbortSignal.timeout(
      Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
    );

    if (!signal) {
      return timeoutSignal;
    }

    return AbortSignal.any([signal, timeoutSignal]);
  }

  private normalize(body: unknown, config: OptionSourceConfig, limit: number): OptionQueryResult {
    const rawItems = this.readPath(body, config.itemsPath ?? 'items');
    if (!Array.isArray(rawItems)) {
      throw new ServiceUnavailableException('Fonte de opcoes nao possui uma lista valida.');
    }

    const items = rawItems.slice(0, limit).flatMap((item) => {
      const value = this.readPath(item, config.valuePath ?? 'value');
      const label = this.readPath(item, config.labelPath ?? 'label');
      return typeof value === 'string' || typeof value === 'number'
        ? [{ value: String(value), label: String(label ?? value) }]
        : [];
    });

    return { items, nextCursor: null, hasMore: rawItems.length > limit };
  }

  private readPath(value: unknown, path: string) {
    return path.split('.').reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[segment];
    }, value);
  }
}
