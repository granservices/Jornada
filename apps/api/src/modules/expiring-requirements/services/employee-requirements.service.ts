import { createHash } from 'node:crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { AuditService } from '../../../common/audit/audit.service';
import { PrismaService } from '../../../database/prisma.service';
import { DrakeCrewRotationClient } from '../../boarding-schedule/services/drake-crew-rotation.client';
import { DrakeSchedulePreviewReferenceService } from '../../boarding-schedule/services/drake-schedule-preview-reference.service';
import { DrakeQualificationNeedsClient } from './drake-qualification-needs.client';

@Injectable()
export class EmployeeRequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly workers: DrakeCrewRotationClient,
    private readonly drake: DrakeQualificationNeedsClient,
    private readonly previewReferences: DrakeSchedulePreviewReferenceService,
  ) {}

  async listMine(user: AuthenticatedUser) {
    const employee = await this.findEmployee(user.id);
    const worker = await this.workers.findWorker(
      employee.externalEmployeeId ?? employee.employeeNumber ?? '',
      employee.employeeNumber,
    );
    if (!worker) {
      throw new NotFoundException('Nao foi localizado vinculo de qualificacoes para este colaborador.');
    }

    const result = await this.listWorkerRequirements(worker.workerId);

    await this.audit.record({
      actorUserId: user.id,
      action: AuditAction.READ,
      entityType: 'EmployeeRequirement',
      entityId: employee.id,
      metadata: { source: 'DRAKE', scope: 'self', itemCount: result.items.length },
    });

    return result;
  }

  async findPreviewWorkers(user: AuthenticatedUser, query: string) {
    this.assertAdmin(user);
    const workers = await this.workers.findWorkers(query);
    return {
      items: workers.map((worker) => ({
        previewReference: this.previewReferences.issue(user.id, worker),
        fullName: worker.fullName,
        employeeNumber: worker.employeeNumber,
        operationalUnitName: worker.operationalUnitName,
      })),
    };
  }

  async listPreviewRequirements(user: AuthenticatedUser, previewReference: string) {
    this.assertAdmin(user);
    const worker = this.previewReferences.resolve(user.id, previewReference);
    const result = await this.listWorkerRequirements(worker.workerId);

    await this.audit.record({
      actorUserId: user.id,
      action: AuditAction.READ,
      entityType: 'EmployeeRequirement',
      entityId: null,
      metadata: { source: 'DRAKE', scope: 'admin-preview', itemCount: result.items.length },
    });

    return result;
  }

  private async findEmployee(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        person: {
          select: {
            employee: { select: { id: true, employeeNumber: true, externalEmployeeId: true } },
          },
        },
      },
    });
    const employee = user?.person.employee;
    if (!employee || (!employee.externalEmployeeId && !employee.employeeNumber)) {
      throw new NotFoundException('Sua conta ainda nao esta vinculada a um colaborador com qualificacoes externas.');
    }
    return employee;
  }

  private toRequirement(need: { id: string; qualificationName: string; requirementType: string | null; expiresAt: string | null }) {
    const daysToExpire = this.daysToExpire(need.expiresAt);
    const status = daysToExpire === null ? 'PENDING' : daysToExpire < 0 ? 'EXPIRED' : daysToExpire <= 30 ? 'DUE_SOON' : 'VALID';
    const severity = daysToExpire === null
      ? 'medium'
      : daysToExpire < 0 || daysToExpire <= 7
        ? 'critical'
        : daysToExpire <= 30
          ? 'high'
          : daysToExpire <= 120
            ? 'medium'
            : 'low';
    const type = need.requirementType?.toUpperCase() === 'ASO' ? 'ASO' : 'TRAINING';

    return {
      requirementId: `drake_${createHash('sha256').update(need.id).digest('hex').slice(0, 24)}`,
      type,
      title: need.qualificationName,
      expiresAt: need.expiresAt,
      status,
      severity,
      issuerLabel: 'Drake',
      action: { label: 'Ver vencimentos', route: '/vencimentos' },
    };
  }

  private async listWorkerRequirements(workerId: string) {
    const items = (await this.drake.listExpiringNeeds(workerId))
      .map((need) => this.toRequirement(need))
      .sort((first, second) => this.expirationSortValue(first.expiresAt) - this.expirationSortValue(second.expiresAt));

    return { items, source: { label: 'Drake', updatedAt: new Date().toISOString() } };
  }

  private daysToExpire(expiresAt: string | null) {
    if (!expiresAt) return null;
    const timestamp = Date.parse(expiresAt);
    return Number.isFinite(timestamp) ? Math.ceil((timestamp - Date.now()) / 86_400_000) : null;
  }

  private expirationSortValue(expiresAt: string | null) {
    if (!expiresAt) return Number.MAX_SAFE_INTEGER;
    const timestamp = Date.parse(expiresAt);
    return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (user.roles.includes(Role.ADMIN)) return;
    throw new ForbiddenException('Somente administradores podem consultar vencimentos em modo de validacao.');
  }
}
