import { Injectable } from '@nestjs/common';
import { SupportCasePriority } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SupportSlaService } from './support-sla.service';

const DEFAULT_TARGET_MINUTES: Record<SupportCasePriority, number> = {
  [SupportCasePriority.LOW]: 72 * 60,
  [SupportCasePriority.NORMAL]: 48 * 60,
  [SupportCasePriority.HIGH]: 24 * 60,
  [SupportCasePriority.URGENT]: 4 * 60,
};

@Injectable()
export class SupportSlaPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: SupportSlaService,
  ) {}

  async calculateDueAt(priority: SupportCasePriority, startedAt: Date) {
    const policy = await this.prisma.supportSlaPolicy.findUnique({
      where: { priority },
    });
    const targetMinutes = policy?.active
      ? policy.resolutionTargetMinutes
      : DEFAULT_TARGET_MINUTES[priority];

    return this.calculator.calculateDueAt(startedAt, targetMinutes);
  }
}
