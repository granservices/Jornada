import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrakeCrewRotationClient } from './drake-crew-rotation.client';

describe('DrakeCrewRotationClient', () => {
  const config = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    config.get.mockImplementation((key: string) => ({
      DRAKE_TENANT_ID: 'tenant-1',
      DRAKE_AUTH_TOKEN: 'token-1',
    })[key]);
    config.getOrThrow.mockImplementation((key: string) => ({
      DRAKE_API_BASE_URL: 'https://drake.example/api',
      DRAKE_TENANT_ID: 'tenant-1',
      DRAKE_AUTH_TOKEN: 'token-1',
      DRAKE_SCHEDULE_HTTP_TIMEOUT_MS: 1000,
    })[key]);
  });

  it('normalizes Drake worker and period payloads without leaking the raw payload', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      items: [{ workerId: 'worker-1', workerRegistration: 'REG-1', workerName: 'Pessoa', operationalUnitId: 'unit-1', operationalUnitName: 'Unidade' }],
    }), { status: 200 }));
    const client = new DrakeCrewRotationClient(config as unknown as ConfigService);

    await expect(client.findWorkers('Pessoa')).resolves.toEqual([
      { workerId: 'worker-1', employeeNumber: 'REG-1', fullName: 'Pessoa', operationalUnitId: 'unit-1', operationalUnitName: 'Unidade' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/api/v2/CrewRotation/GetWorkers' }), expect.objectContaining({ method: 'GET' }));

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([
      { Id: 'period-1', Start: '2026-09-01T00:00:00.000Z', End: '2026-09-02T00:00:00.000Z', EventDescription: 'Embarque', Approved: true },
    ]), { status: 200 }));

    await expect(client.listPeriods({ workerId: 'worker-1', operationalUnitId: 'unit-1', from: new Date('2026-09-01T00:00:00.000Z'), to: new Date('2026-09-02T00:00:00.000Z') }))
      .resolves.toEqual([expect.objectContaining({ id: 'period-1', eventDescription: 'Embarque', approved: true })]);
  });

  it('maps unavailable external calls to a safe Jornada error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network detail'));
    const client = new DrakeCrewRotationClient(config as unknown as ConfigService);

    await expect(client.findWorkers('Pessoa')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
