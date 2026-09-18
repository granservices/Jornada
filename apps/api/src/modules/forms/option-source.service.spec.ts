import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OptionSourceAdapterType, OptionSourceStatus, Role, UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { HttpJsonOptionSourceAdapter, StaticOptionSourceAdapter } from './option-source-adapters';
import { OptionSourceService } from './option-source.service';

describe('OptionSourceService', () => {
  const admin: AuthenticatedUser = { id: 'admin', email: 'admin@test.local', employeeId: null, roles: [Role.ADMIN], status: UserStatus.ACTIVE };
  const employee: AuthenticatedUser = { id: 'employee', email: 'employee@test.local', employeeId: 'employee', roles: [Role.EMPLOYEE], status: UserStatus.ACTIVE };
  let prisma: { optionSource: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock } };
  let service: OptionSourceService;

  beforeEach(() => {
    prisma = {
      optionSource: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    service = new OptionSourceService(
      prisma as never,
      new StaticOptionSourceAdapter(),
      new HttpJsonOptionSourceAdapter(),
    );
  });

  it('allows only admin roles to manage sources', async () => {
    await expect(service.listSources(employee)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.createSource(employee, {
      key: 'employees',
      name: 'Funcionarios',
      adapterType: OptionSourceAdapterType.STATIC,
      config: { options: [{ value: '1', label: 'Joao' }] },
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a static source with a normalized key', async () => {
    prisma.optionSource.create.mockResolvedValue({ id: 'source-1', key: 'centro_de_custo', name: 'Centros', adapterType: OptionSourceAdapterType.STATIC, status: OptionSourceStatus.ACTIVE, cacheTtlSeconds: 300 });
    const response = await service.createSource(admin, {
      key: ' Centro de Custo ',
      name: 'Centros',
      adapterType: OptionSourceAdapterType.STATIC,
      config: { options: [{ value: '1', label: 'Administrativo' }] },
    });
    expect(response.item.key).toBe('centro_de_custo');
    expect(prisma.optionSource.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ key: 'centro_de_custo' }) }));
  });

  it('queries active sources with bounded pagination and caches the response', async () => {
    prisma.optionSource.findFirst.mockResolvedValue({ key: 'employees', adapterType: OptionSourceAdapterType.STATIC, status: OptionSourceStatus.ACTIVE, cacheTtlSeconds: 300, config: { options: [{ value: '1', label: 'Joao' }, { value: '2', label: 'Maria' }] } });
    const first = await service.queryOptions(admin, 'employees', 'jo', undefined, 999);
    const second = await service.queryOptions(admin, 'employees', 'jo', undefined, 999);
    expect(first.items).toEqual([{ value: '1', label: 'Joao' }]);
    expect(second).toEqual(first);
    expect(prisma.optionSource.findFirst).toHaveBeenCalledTimes(2);
  });

  it('rejects inactive or missing sources', async () => {
    prisma.optionSource.findFirst.mockResolvedValue(null);
    await expect(service.queryOptions(admin, 'missing', '', undefined, 20)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates an existing source and returns full details', async () => {
    prisma.optionSource.findFirst.mockResolvedValue({ id: 'source-1' });
    prisma.optionSource.update.mockResolvedValue({
      id: 'source-1',
      key: 'employees',
      name: 'Funcionarios ativos',
      adapterType: OptionSourceAdapterType.HTTP_JSON,
      status: OptionSourceStatus.ACTIVE,
      cacheTtlSeconds: 120,
      createdAt: '2026-08-31T10:00:00.000Z',
      updatedAt: '2026-08-31T10:30:00.000Z',
      config: {
        endpoint: 'https://api.example.com/employees',
        itemsPath: 'items',
        valuePath: 'id',
        labelPath: 'name',
      },
    });

    const response = await service.updateSource(admin, 'employees', {
      name: 'Funcionarios ativos',
      adapterType: OptionSourceAdapterType.HTTP_JSON,
      config: {
        endpoint: 'https://api.example.com/employees',
        itemsPath: 'items',
        valuePath: 'id',
        labelPath: 'name',
      },
      cacheTtlSeconds: 120,
      status: OptionSourceStatus.ACTIVE,
    });

    expect(response.item.config).toMatchObject({
      endpoint: 'https://api.example.com/employees',
    });
    expect(prisma.optionSource.update).toHaveBeenCalled();
  });

  it('previews a source without persisting it', async () => {
    const response = await service.previewSource(admin, {
      adapterType: OptionSourceAdapterType.STATIC,
      config: {
        options: [
          { value: '1', label: 'Administrativo' },
          { value: '2', label: 'Operacional' },
        ],
      },
      query: 'oper',
      limit: 20,
    });

    expect(response.items).toEqual([{ value: '2', label: 'Operacional' }]);
    expect(prisma.optionSource.create).not.toHaveBeenCalled();
  });
});

describe('OptionSource adapters', () => {
  it('rejects HTTP endpoints that are not explicitly allowlisted HTTPS hosts', async () => {
    const adapter = new HttpJsonOptionSourceAdapter();
    await expect(adapter.query({ key: 'external', adapterType: OptionSourceAdapterType.HTTP_JSON, config: { endpoint: 'http://localhost/items' } }, { query: '', limit: 20 })).rejects.toThrow('nao permitido');
  });
});
