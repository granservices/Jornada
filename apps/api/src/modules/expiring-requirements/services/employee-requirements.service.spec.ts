import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditAction, Role, UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import type { AuditService } from '../../../common/audit/audit.service';
import type { PrismaService } from '../../../database/prisma.service';
import type { DrakeCrewRotationClient } from '../../boarding-schedule/services/drake-crew-rotation.client';
import type { DrakeSchedulePreviewReferenceService } from '../../boarding-schedule/services/drake-schedule-preview-reference.service';
import type { DrakeQualificationNeedsClient } from './drake-qualification-needs.client';
import { EmployeeRequirementsService } from './employee-requirements.service';

describe('EmployeeRequirementsService', () => {
  const user: AuthenticatedUser = { id: 'user-1', email: 'employee@example.test', employeeId: 'REG-1', roles: [Role.EMPLOYEE], status: UserStatus.ACTIVE };
  const admin: AuthenticatedUser = { id: 'admin-1', email: 'admin@example.test', employeeId: null, roles: [Role.ADMIN], status: UserStatus.ACTIVE };
  const now = new Date('2026-09-09T12:00:00.000Z');
  let prisma: { user: { findUnique: jest.Mock } };
  let audit: { record: jest.Mock };
  let workers: { findWorker: jest.Mock; findWorkers: jest.Mock };
  let drake: { listExpiringNeeds: jest.Mock };
  let previewReferences: { issue: jest.Mock; resolve: jest.Mock };
  let service: EmployeeRequirementsService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    prisma = { user: { findUnique: jest.fn() } };
    audit = { record: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    workers = {
      findWorker: jest.fn().mockResolvedValue({ workerId: 'worker-1' }),
      findWorkers: jest.fn().mockResolvedValue([
        {
          workerId: 'worker-1',
          employeeNumber: 'REG-1',
          fullName: 'Gero Andrade',
          operationalUnitId: 'unit-1',
          operationalUnitName: 'Unidade Offshore',
        },
      ]),
    };
    drake = { listExpiringNeeds: jest.fn().mockResolvedValue([{ id: 'external-need-1', qualificationName: 'HUET', requirementType: 'AP', expiresAt: '2026-09-12T00:00:00.000Z' }]) };
    previewReferences = {
      issue: jest.fn().mockReturnValue('preview-reference-without-worker-id-1234567890'),
      resolve: jest.fn().mockReturnValue({ workerId: 'worker-1', operationalUnitId: 'unit-1', operationalUnitName: 'Unidade Offshore' }),
    };
    service = new EmployeeRequirementsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      workers as unknown as DrakeCrewRotationClient,
      drake as unknown as DrakeQualificationNeedsClient,
      previewReferences as unknown as DrakeSchedulePreviewReferenceService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves only the signed-in employee and returns a minimized requirement contract', async () => {
    prisma.user.findUnique.mockResolvedValue({ person: { employee: { id: 'employee-1', employeeNumber: 'REG-1', externalEmployeeId: 'worker-1' } } });

    const result = await service.listMine(user);

    expect(workers.findWorker).toHaveBeenCalledWith('worker-1', 'REG-1');
    expect(drake.listExpiringNeeds).toHaveBeenCalledWith('worker-1');
    expect(result.items[0]).toEqual(expect.objectContaining({ type: 'TRAINING', title: 'HUET', status: 'DUE_SOON', requirementId: expect.stringMatching(/^drake_[a-f0-9]{24}$/) }));
    expect(result.items[0]).not.toHaveProperty('externalEmployeeId');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.READ, entityId: 'employee-1' }));
  });

  it('orders requirements by expiration without limiting the internal response', async () => {
    prisma.user.findUnique.mockResolvedValue({ person: { employee: { id: 'employee-1', employeeNumber: 'REG-1', externalEmployeeId: 'worker-1' } } });
    drake.listExpiringNeeds.mockResolvedValue(
      Array.from({ length: 22 }, (_, index) => ({
        id: `external-need-${index}`,
        qualificationName: `Qualificacao ${index}`,
        requirementType: 'AP',
        expiresAt: new Date(Date.UTC(2026, 10, 22 - index)).toISOString(),
        workerId: 'external-worker-id',
      })),
    );

    const result = await service.listMine(user);

    expect(result.items).toHaveLength(22);
    expect(result.items.map((item) => item.expiresAt)).toEqual(
      [...result.items.map((item) => item.expiresAt)].sort(),
    );
    expect(JSON.stringify(result.items)).not.toContain('external-need-');
    expect(JSON.stringify(result.items)).not.toContain('external-worker-id');
  });

  it('keeps every worker requirement and classifies expiration attention ranges', async () => {
    prisma.user.findUnique.mockResolvedValue({ person: { employee: { id: 'employee-1', employeeNumber: 'REG-1', externalEmployeeId: 'worker-1' } } });
    drake.listExpiringNeeds.mockResolvedValue([
      { id: 'expired', qualificationName: 'Vencido', requirementType: 'AP', expiresAt: '2026-09-01T00:00:00.000Z' },
      { id: 'inside', qualificationName: 'Dentro da janela', requirementType: 'AP', expiresAt: '2027-01-07T00:00:00.000Z' },
      { id: 'outside', qualificationName: 'Fora da janela', requirementType: 'AP', expiresAt: '2027-01-08T00:00:00.000Z' },
      { id: 'undated', qualificationName: 'Sem data', requirementType: 'AP', expiresAt: null },
    ]);

    const result = await service.listMine(user);

    expect(result.items.map((item) => item.title)).toEqual(['Vencido', 'Dentro da janela', 'Fora da janela', 'Sem data']);
    expect(result.items[0]).toEqual(expect.objectContaining({ status: 'EXPIRED', severity: 'critical' }));
    expect(result.items[1]).toEqual(expect.objectContaining({ status: 'VALID', severity: 'medium' }));
    expect(result.items[2]).toEqual(expect.objectContaining({ status: 'VALID', severity: 'low' }));
    expect(result.items[3]).toEqual(expect.objectContaining({ status: 'PENDING', severity: 'medium', expiresAt: null }));
  });

  it('does not call Drake for a user without an employee relationship', async () => {
    prisma.user.findUnique.mockResolvedValue({ person: { employee: null } });

    await expect(service.listMine(user)).rejects.toBeInstanceOf(NotFoundException);
    expect(workers.findWorker).not.toHaveBeenCalled();
  });

  it('blocks preview worker search for non-admin users', async () => {
    await expect(service.findPreviewWorkers(user, 'Gero')).rejects.toBeInstanceOf(ForbiddenException);
    expect(workers.findWorkers).not.toHaveBeenCalled();
  });

  it('returns preview workers through opaque references without exposing Drake identifiers', async () => {
    const result = await service.findPreviewWorkers(admin, 'Gero');

    expect(workers.findWorkers).toHaveBeenCalledWith('Gero');
    expect(previewReferences.issue).toHaveBeenCalledWith(admin.id, expect.objectContaining({ workerId: 'worker-1' }));
    expect(result.items[0]).toEqual({
      previewReference: 'preview-reference-without-worker-id-1234567890',
      fullName: 'Gero Andrade',
      employeeNumber: 'REG-1',
      operationalUnitName: 'Unidade Offshore',
    });
    expect(JSON.stringify(result.items)).not.toContain('worker-1');
  });

  it('loads admin preview requirements from a resolved opaque worker reference', async () => {
    const result = await service.listPreviewRequirements(admin, 'preview-reference-without-worker-id-1234567890');

    expect(previewReferences.resolve).toHaveBeenCalledWith(admin.id, 'preview-reference-without-worker-id-1234567890');
    expect(drake.listExpiringNeeds).toHaveBeenCalledWith('worker-1');
    expect(result.items[0]).toEqual(expect.objectContaining({ title: 'HUET', requirementId: expect.stringMatching(/^drake_[a-f0-9]{24}$/) }));
    expect(JSON.stringify(result.items)).not.toContain('external-need-1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: admin.id,
      action: AuditAction.READ,
      entityId: null,
      metadata: { source: 'DRAKE', scope: 'admin-preview', itemCount: 1 },
    }));
  });
});
