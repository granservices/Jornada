import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AuditAction, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { AuditService } from '../../../common/audit/audit.service';
import { PrismaService } from '../../../database/prisma.service';
import { DrakeCrewRotationClient, type DrakePeriod, type DrakeWorker } from './drake-crew-rotation.client';
import { DrakeSchedulePreviewReferenceService } from './drake-schedule-preview-reference.service';

export type EmployeeScheduleRange = { from: Date; to: Date };
const DEFAULT_SCHEDULE_PAST_DAYS = -60;
const DEFAULT_SCHEDULE_FUTURE_DAYS = 60;

@Injectable()
export class EmployeeScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly drake: DrakeCrewRotationClient,
    private readonly previewReferences: DrakeSchedulePreviewReferenceService,
  ) {}

  async listMySchedule(user: AuthenticatedUser, range: EmployeeScheduleRange) {
    const employee = await this.findEmployee(user.id);
    if (!employee) {
      return this.emptySchedule(range);
    }

    const worker = await this.resolveWorker(employee.externalEmployeeId, employee.employeeNumber);
    if (!worker) {
      await this.audit.record({
        actorUserId: user.id,
        action: AuditAction.READ,
        entityType: 'EmployeeSchedule',
        entityId: employee.id,
        metadata: { source: 'DRAKE', scope: 'self', itemCount: 0, from: range.from.toISOString(), to: range.to.toISOString(), missingWorkerLink: true },
      });

      return this.emptySchedule(range);
    }

    const result = await this.listWorkerSchedule(worker, range);

    await this.audit.record({
      actorUserId: user.id,
      action: AuditAction.READ,
      entityType: 'EmployeeSchedule',
      entityId: employee.id,
      metadata: { source: 'DRAKE', scope: 'self', itemCount: result.items.length, from: range.from.toISOString(), to: range.to.toISOString() },
    });

    return result;
  }

  async findPreviewWorkers(user: AuthenticatedUser, query: string) {
    this.assertAdmin(user);
    const workers = await this.drake.findWorkers(query);
    return {
      items: workers.map((worker) => ({
        previewReference: this.previewReferences.issue(user.id, worker),
        fullName: worker.fullName,
        employeeNumber: worker.employeeNumber,
        operationalUnitName: worker.operationalUnitName,
      })),
    };
  }

  async listPreviewSchedule(user: AuthenticatedUser, previewReference: string, range: EmployeeScheduleRange) {
    this.assertAdmin(user);
    const worker = this.previewReferences.resolve(user.id, previewReference);
    const result = await this.listWorkerSchedule(worker, range);

    await this.audit.record({
      actorUserId: user.id,
      action: AuditAction.READ,
      entityType: 'EmployeeSchedule',
      entityId: null,
      metadata: { source: 'DRAKE', scope: 'admin-preview', itemCount: result.items.length, from: range.from.toISOString(), to: range.to.toISOString() },
    });

    return result;
  }

  resolveRange(from?: string, to?: string): EmployeeScheduleRange {
    const start = from ? this.asUtcDate(from) : this.startOfUtcDay(DEFAULT_SCHEDULE_PAST_DAYS);
    const end = to ? this.asUtcDate(to) : this.startOfUtcDay(DEFAULT_SCHEDULE_FUTURE_DAYS);

    if (end <= start) {
      throw new BadRequestException('O fim do periodo deve ser posterior ao inicio.');
    }

    const days = (end.getTime() - start.getTime()) / 86_400_000;
    if (days > 366) {
      throw new BadRequestException('O periodo maximo para consulta e de 366 dias.');
    }

    return { from: start, to: end };
  }

  private async findEmployee(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        person: {
          select: {
            employee: {
              select: { id: true, employeeNumber: true, externalEmployeeId: true },
            },
          },
        },
      },
    });
    const employee = user?.person.employee;

    if (!employee) {
      return null;
    }

    if (!employee.externalEmployeeId && !employee.employeeNumber) {
      return null;
    }

    return employee;
  }

  private async resolveWorker(externalEmployeeId: string | null, employeeNumber: string | null) {
    const worker = await this.drake.findWorker(externalEmployeeId ?? employeeNumber ?? '', employeeNumber);
    return worker ?? null;
  }

  private async listWorkerSchedule(
    worker: Pick<DrakeWorker, 'workerId' | 'operationalUnitId' | 'operationalUnitName'>,
    range: EmployeeScheduleRange,
  ) {
    const periods = await this.drake.listPeriods({
      workerId: worker.workerId,
      operationalUnitId: worker.operationalUnitId,
      from: range.from,
      to: range.to,
    });

    return {
      items: periods
        .flatMap((period) => {
          const item = this.toScheduleItem(period, worker);
          return item ? [item] : [];
        })
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      source: { label: 'Drake', updatedAt: new Date().toISOString() },
    };
  }

  private emptySchedule(range: EmployeeScheduleRange) {
    return {
      items: [],
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      source: { label: 'Drake', updatedAt: new Date().toISOString() },
    };
  }

  private toScheduleItem(
    period: DrakePeriod,
    worker: Pick<DrakeWorker, 'workerId' | 'operationalUnitName'>,
  ) {
    const scheduleType = this.typeFor(period.type);
    if (!scheduleType) return null;

    const title = scheduleType === 'BOARDING' ? 'Embarque' : 'Desembarque';
    return {
      scheduleItemId: `drake_${period.id}`,
      employeeId: worker.workerId,
      type: scheduleType,
      title,
      startsAt: period.start,
      endsAt: period.end,
      location: period.operationalUnitName ?? worker.operationalUnitName ?? 'Local nao informado',
      status: period.approved ? 'CONFIRMED' : 'PENDING',
      sourceLabel: 'Drake',
      action: { label: 'Ver detalhes', route: `/programacao?item=${encodeURIComponent(period.id)}` },
    };
  }

  private typeFor(value: string | null) {
    if (value === 'EMBK') return 'BOARDING' as const;
    if (value === 'DSBK') return 'DISEMBARKING' as const;
    return null;
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (user.roles.includes(Role.ADMIN)) return;
    throw new ForbiddenException('Somente administradores podem consultar programacao em modo de validacao.');
  }

  private asUtcDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Data de consulta invalida.');
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private startOfUtcDay(daysFromToday: number) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromToday));
  }
}
