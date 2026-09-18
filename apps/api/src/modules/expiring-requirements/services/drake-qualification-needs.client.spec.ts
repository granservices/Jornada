import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrakeQualificationNeedsClient } from './drake-qualification-needs.client';

describe('DrakeQualificationNeedsClient', () => {
  const config = { get: jest.fn(), getOrThrow: jest.fn() };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-09T12:00:00.000Z'));
    jest.restoreAllMocks();
    config.get.mockImplementation((key: string) => ({ DRAKE_TENANT_ID: 'tenant-1', DRAKE_AUTH_TOKEN: 'token-1' })[key]);
    config.getOrThrow.mockImplementation((key: string) => ({ DRAKE_API_BASE_URL: 'https://drake.example/api', DRAKE_TENANT_ID: 'tenant-1', DRAKE_AUTH_TOKEN: 'token-1', DRAKE_SCHEDULE_HTTP_TIMEOUT_MS: 1000 })[key]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses paged Drake parameters and returns only the minimized qualification contract', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      totalCount: 2,
      data: [
        { id: 'need-1', qualificationName: 'HUET', qualificationNeedTypeName: 'AP', expirationDate: '2026-10-01T00:00:00.000Z', workerName: 'Nao deve sair' },
        { id: 'need-2', qualificationName: 'NR-35', qualificationNeedTypeName: 'AP', expirationDate: null, workerName: 'Nao deve sair' },
      ],
    }), { status: 200 }));
    const client = new DrakeQualificationNeedsClient(config as unknown as ConfigService);

    await expect(client.listExpiringNeeds('worker-1')).resolves.toEqual([
      { id: 'need-1', qualificationName: 'HUET', requirementType: 'AP', expiresAt: '2026-10-01T00:00:00.000Z' },
      { id: 'need-2', qualificationName: 'NR-35', requirementType: 'AP', expiresAt: null },
    ]);

    const url = fetchMock.mock.calls[0]?.[0] as URL;
    expect(url.pathname).toBe('/api/v2/Compliance/IndividualQualificationNeeds/GetAll');
    expect(url.searchParams.get('skip')).toBe('0');
    expect(url.searchParams.get('take')).toBe('100');
    const filter = JSON.parse(url.searchParams.get('filter') ?? '[]') as unknown[];
    expect(filter).toEqual([['workerId', '=', 'worker-1']]);
    expect(url.searchParams.get('filter')).not.toContain('expirationDate');
    expect(url.searchParams.get('select')).toContain('qualificationName');
  });

  it('keeps requesting Drake pages until all qualification needs are read', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `need-${index}`,
      qualificationName: `Qualificacao ${index}`,
      qualificationNeedTypeName: 'AP',
      expirationDate: '2026-10-01T00:00:00.000Z',
    }));
    const secondPage = Array.from({ length: 5 }, (_, index) => ({
      id: `need-${index + 100}`,
      qualificationName: `Qualificacao ${index + 100}`,
      qualificationNeedTypeName: 'AP',
      expirationDate: '2026-10-02T00:00:00.000Z',
    }));
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ totalCount: 105, data: firstPage }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ totalCount: 105, data: secondPage }), { status: 200 }));
    const client = new DrakeQualificationNeedsClient(config as unknown as ConfigService);

    const result = await client.listExpiringNeeds('worker-1');

    expect(result).toHaveLength(105);
    expect((fetchMock.mock.calls[0]?.[0] as URL).searchParams.get('skip')).toBe('0');
    expect((fetchMock.mock.calls[1]?.[0] as URL).searchParams.get('skip')).toBe('100');
  });

  it('maps a failed external source to a safe Jornada error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('external detail'));
    const client = new DrakeQualificationNeedsClient(config as unknown as ConfigService);

    await expect(client.listExpiringNeeds('worker-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
