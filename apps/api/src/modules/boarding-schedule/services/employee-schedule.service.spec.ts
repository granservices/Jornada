import { ForbiddenException } from '@nestjs/common';
import { AuditAction, Role, UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import type { AuditService } from '../../../common/audit/audit.service';
import type { PrismaService } from '../../../database/prisma.service';
import type { DrakeCrewRotationClient } from './drake-crew-rotation.client';
import { EmployeeScheduleService } from './employee-schedule.service';

describe('EmployeeScheduleService', () => {
  const employee: AuthenticatedUser = {
    id: 'user-1',
    email: 'gero@example.test',
    employeeId: 'FRI-01-10014',
    roles: [Role.EMPLOYEE],
    status: UserStatus.ACTIVE,
  };
  const admin: AuthenticatedUser = { ...employee, id: 'admin-1', roles: [Role.ADMIN] };

  let prisma: { user: { findUnique: jest.Mock } };
  let audit: { record: jest.Mock };
  let drake: { findWorker: jest.Mock; findWorkers: jest.Mock; listPeriods: jest.Mock };
  let previewReferences: { issue: jest.Mock; resolve: jest.Mock };
  let service: EmployeeScheduleService;

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    audit = { record: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    drake = {
      findWorker: jest.fn().mockResolvedValue({
        workerId: 'worker-1',
        employeeNumber: 'FRI-01-10014',
        fullName: 'Gero',
        operationalUnitId: 'unit-1',
        operationalUnitName: 'Unidade',
      }),
      findWorkers: jest.fn(),
      listPeriods: jest.fn().mockResolvedValue([
        {
          id: 'period-1',
          start: '2026-09-10T12:00:00.000Z',
          end: '2026-09-15T12:00:00.000Z',
          type: 'EMBK',
          layer: 'CrewRotation',
          eventDescription: 'Embarque',
          eventAcronym: 'EMB',
          eventColor: null,
          appointmentDescription: null,
          operationalUnitName: 'Plataforma 1',
          approved: true,
        },
      ]),
    };
    previewReferences = {
      issue: jest.fn().mockReturnValue('preview-reference'),
      resolve: jest.fn().mockReturnValue({ workerId: 'worker-1', operationalUnitId: 'unit-1', operationalUnitName: 'Unidade' }),
    };
    service = new EmployeeScheduleService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      drake as unknown as DrakeCrewRotationClient,
      previewReferences as unknown as DrakeSchedulePreviewReferenceService,
    );
  });

  it('resolves the authenticated employee and returns only the internal schedule contract', async () => {
    prisma.user.findUnique.mockResolvedValue({
      person: { employee: { id: 'employee-1', employeeNumber: 'FRI-01-10014', externalEmployeeId: 'worker-1' } },
    });

    const result = await service.listMySchedule(employee, {
      from: new Date('2026-09-01T00:00:00.000Z'),
      to: new Date('2026-10-01T00:00:00.000Z'),
    });

    expect(drake.findWorker).toHaveBeenCalledWith('worker-1', 'FRI-01-10014');
    expect(drake.listPeriods).toHaveBeenCalledWith(expect.objectContaining({
      workerId: 'worker-1',
      operationalUnitId: 'unit-1',
    }));
    expect(result.items).toEqual([
      expect.objectContaining({
        scheduleItemId: 'drake_period-1',
        employeeId: 'worker-1',
        type: 'BOARDING',
        status: 'CONFIRMED',
        sourceLabel: 'Drake',
      }),
    ]);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: AuditAction.READ,
      entityId: 'employee-1',
      metadata: expect.objectContaining({ scope: 'self' }),
    }));
  });

  it('returns an empty schedule when the signed-in user has no employee relationship', async () => {
    prisma.user.findUnique.mockResolvedValue({ person: { employee: null } });

    await expect(service.listMySchedule(employee, service.resolveRange('2026-09-01', '2026-10-01')))
      .resolves.toEqual({
        items: [],
        range: {
          from: '2026-09-01T00:00:00.000Z',
          to: '2026-10-01T00:00:00.000Z',
        },
        source: expect.objectContaining({ label: 'Drake' }),
      });
    expect(drake.findWorker).not.toHaveBeenCalled();
    expect(drake.listPeriods).not.toHaveBeenCalled();
  });

  it('returns an empty schedule when Drake has no worker match for the signed-in employee', async () => {
    prisma.user.findUnique.mockResolvedValue({
      person: { employee: { id: 'employee-1', employeeNumber: 'FRI-01-10014', externalEmployeeId: null } },
    });
    drake.findWorker.mockResolvedValue(null);

    await expect(service.listMySchedule(employee, service.resolveRange('2026-09-01', '2026-10-01')))
      .resolves.toEqual({
        items: [],
        range: {
          from: '2026-09-01T00:00:00.000Z',
          to: '2026-10-01T00:00:00.000Z',
        },
        source: expect.objectContaining({ label: 'Drake' }),
      });
    expect(drake.listPeriods).not.toHaveBeenCalled();
  });

  it('keeps administrative preview restricted to administrators', async () => {
    await expect(service.findPreviewWorkers(employee, 'Gero')).rejects.toBeInstanceOf(ForbiddenException);
    expect(drake.findWorkers).not.toHaveBeenCalled();
  });

  it('returns a minimized worker candidate list for an administrator preview', async () => {
    drake.findWorkers.mockResolvedValue([
      { workerId: 'worker-1', employeeNumber: 'FRI-01-10014', fullName: 'Gero', operationalUnitId: 'unit-1', operationalUnitName: 'Unidade' },
    ]);

    await expect(service.findPreviewWorkers(admin, 'Gero')).resolves.toEqual({
      items: [{ previewReference: 'preview-reference', employeeNumber: 'FRI-01-10014', fullName: 'Gero', operationalUnitName: 'Unidade' }],
    });
  });

  it('rejects an inverted or excessive date range before querying the source', () => {
    expect(() => service.resolveRange('2026-10-01', '2026-09-01')).toThrow('fim do periodo');
    expect(() => service.resolveRange('2026-01-01', '2027-02-01')).toThrow('periodo maximo');
  });

  it('uses a default schedule window from 60 days ago to 60 days ahead', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-10T15:30:00.000Z'));

    try {
      expect(service.resolveRange()).toEqual({
        from: new Date('2026-07-12T00:00:00.000Z'),
        to: new Date('2026-11-09T00:00:00.000Z'),
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('excludes Drake operational intervals that are not embarkation movements', async () => {
    prisma.user.findUnique.mockResolvedValue({
      person: { employee: { id: 'employee-1', employeeNumber: 'FRI-01-10014', externalEmployeeId: 'worker-1' } },
    });
    drake.listPeriods.mockResolvedValue([
      { id: 'boarding-1', start: '2026-09-10T00:00:00.000Z', end: '2026-09-10T23:59:59.999Z', type: 'EMBK', operationalUnitName: 'Unidade', approved: false },
      { id: 'interval-1', start: '2026-09-11T00:00:00.000Z', end: '2026-09-20T23:59:59.999Z', type: 'WKOF', operationalUnitName: 'Unidade', approved: false },
      { id: 'disembarking-1', start: '2026-09-21T00:00:00.000Z', end: '2026-09-21T23:59:59.999Z', type: 'DSBK', operationalUnitName: 'Unidade', approved: false },
    ]);

    const result = await service.listMySchedule(employee, service.resolveRange('2026-09-01', '2026-10-01'));

    expect(result.items.map((item) => [item.title, item.type])).toEqual([
      ['Embarque', 'BOARDING'],
      ['Desembarque', 'DISEMBARKING'],
    ]);
  });
});
