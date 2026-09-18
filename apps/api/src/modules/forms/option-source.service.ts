import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OptionSourceAdapterType, OptionSourceStatus, Prisma, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { PrismaService } from '../../database/prisma.service';
import { CreateOptionSourceDto, PreviewOptionSourceDto, UpdateOptionSourceDto } from './dto/option-source.dto';
import { HttpJsonOptionSourceAdapter, StaticOptionSourceAdapter } from './option-source-adapters';
import type { OptionQueryResult, OptionSourceRecord } from './option-source.types';

type CacheEntry = { expiresAt: number; value: OptionQueryResult };

@Injectable()
export class OptionSourceService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly staticAdapter: StaticOptionSourceAdapter,
    private readonly httpAdapter: HttpJsonOptionSourceAdapter,
  ) {}

  async listSources(
    user: AuthenticatedUser,
    options: { includeInactive?: boolean; includeConfig?: boolean } = {},
  ) {
    this.assertAdmin(user);
    const items = await this.prisma.optionSource.findMany({
      where: options.includeInactive ? undefined : { status: OptionSourceStatus.ACTIVE },
      select: options.includeConfig ? this.detailSelect() : this.summarySelect(),
      orderBy: { name: 'asc' },
    });
    return { items };
  }

  async getSource(user: AuthenticatedUser, sourceKey: string) {
    this.assertAdmin(user);
    const source = await this.prisma.optionSource.findFirst({
      where: { key: this.normalizeKey(sourceKey) },
      select: this.detailSelect(),
    });

    if (!source) {
      throw new NotFoundException('Fonte de opcoes nao encontrada.');
    }

    return { item: source };
  }

  async createSource(user: AuthenticatedUser, dto: CreateOptionSourceDto) {
    this.assertAdmin(user);
    const key = this.normalizeKey(dto.key);
    this.validateConfig(dto.adapterType, dto.config);

    try {
      const item = await this.prisma.optionSource.create({
        data: {
          key,
          name: dto.name.trim(),
          adapterType: dto.adapterType,
          status: dto.status ?? OptionSourceStatus.ACTIVE,
          config: dto.config as Prisma.InputJsonValue,
          cacheTtlSeconds: dto.cacheTtlSeconds ?? 300,
        },
        select: this.summarySelect(),
      });
      return { item };
    } catch (error) {
      this.rethrowKnownPersistenceError(error);
    }
  }

  async updateSource(user: AuthenticatedUser, sourceKey: string, dto: UpdateOptionSourceDto) {
    this.assertAdmin(user);
    this.validateConfig(dto.adapterType, dto.config);
    const source = await this.prisma.optionSource.findFirst({
      where: { key: this.normalizeKey(sourceKey) },
      select: { id: true },
    });

    if (!source) {
      throw new NotFoundException('Fonte de opcoes nao encontrada.');
    }

    const item = await this.prisma.optionSource.update({
      where: { id: source.id },
      data: {
        name: dto.name.trim(),
        adapterType: dto.adapterType,
        status: dto.status ?? OptionSourceStatus.ACTIVE,
        config: dto.config as Prisma.InputJsonValue,
        cacheTtlSeconds: dto.cacheTtlSeconds ?? 300,
      },
      select: this.detailSelect(),
    });
    this.clearCache(item.key);
    return { item };
  }

  async previewSource(user: AuthenticatedUser, dto: PreviewOptionSourceDto) {
    this.assertAdmin(user);
    this.validateConfig(dto.adapterType, dto.config);
    const boundedLimit = Number.isFinite(dto.limit) ? Math.min(Math.max(dto.limit ?? 20, 1), 100) : 20;

    return this.adapterFor(dto.adapterType).query(
      {
        key: 'preview',
        adapterType: dto.adapterType,
        config: dto.config,
      } satisfies OptionSourceRecord,
      {
        query: dto.query ?? '',
        cursor: dto.cursor,
        limit: boundedLimit,
      },
    );
  }

  async queryOptions(user: AuthenticatedUser, key: string, queryText: string, cursor: string | undefined, limit: number) {
    const source = await this.prisma.optionSource.findFirst({ where: { key: this.normalizeKey(key), status: OptionSourceStatus.ACTIVE } });
    if (!source) throw new NotFoundException('Fonte de opcoes nao encontrada.');
    const boundedLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
    const cacheKey = `${source.key}:${queryText}:${cursor ?? ''}:${boundedLimit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const adapter = this.adapterFor(source.adapterType);
    const result = await adapter.query(source, { query: queryText, cursor, limit: boundedLimit });
    if (source.cacheTtlSeconds > 0) this.cache.set(cacheKey, { value: result, expiresAt: Date.now() + source.cacheTtlSeconds * 1000 });
    return result;
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!user.roles.some((role) => role === Role.ADMIN || role === Role.TI)) {
      throw new ForbiddenException('Acesso negado.');
    }
  }

  private normalizeKey(value: string) {
    const key = value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
    if (key.length < 2) throw new BadRequestException('Chave da fonte de opcoes invalida.');
    return key;
  }

  private validateConfig(type: OptionSourceAdapterType, config: Record<string, unknown>) {
    if (type === OptionSourceAdapterType.STATIC && (!Array.isArray(config.options) || config.options.some((item) => !this.isOption(item)))) throw new BadRequestException('Fonte estatica exige opcoes validas.');
    if (type === OptionSourceAdapterType.HTTP_JSON && typeof config.endpoint !== 'string') throw new BadRequestException('Fonte HTTP exige endpoint.');
    if (type === OptionSourceAdapterType.HTTP_JSON && config.itemsPath !== undefined && typeof config.itemsPath !== 'string') throw new BadRequestException('itemsPath invalido.');
    if (type === OptionSourceAdapterType.HTTP_JSON && config.valuePath !== undefined && typeof config.valuePath !== 'string') throw new BadRequestException('valuePath invalido.');
    if (type === OptionSourceAdapterType.HTTP_JSON && config.labelPath !== undefined && typeof config.labelPath !== 'string') throw new BadRequestException('labelPath invalido.');
    if (type === OptionSourceAdapterType.HTTP_JSON && config.queryParam !== undefined && typeof config.queryParam !== 'string') throw new BadRequestException('queryParam invalido.');
  }

  private isOption(value: unknown): value is { value: string; label: string } {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const item = value as Record<string, unknown>;
    return typeof item.value === 'string' && item.value.length > 0 && typeof item.label === 'string' && item.label.length > 0;
  }

  private adapterFor(type: OptionSourceAdapterType) {
    return type === OptionSourceAdapterType.STATIC ? this.staticAdapter : this.httpAdapter;
  }

  private summarySelect() {
    return {
      id: true,
      key: true,
      name: true,
      adapterType: true,
      status: true,
      cacheTtlSeconds: true,
      updatedAt: true,
      createdAt: true,
    } satisfies Prisma.OptionSourceSelect;
  }

  private detailSelect() {
    return {
      ...this.summarySelect(),
      config: true,
    } satisfies Prisma.OptionSourceSelect;
  }

  private clearCache(sourceKey: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${sourceKey}:`)) {
        this.cache.delete(key);
      }
    }
  }

  private rethrowKnownPersistenceError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException('Chave da fonte de opcoes ja cadastrada.');
    }

    throw error;
  }
}
