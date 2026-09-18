import { SupportCasePriority } from '@prisma/client';
import { SupportSlaPolicyService } from './support-sla-policy.service';

describe('SupportSlaPolicyService', () => {
  it('uses the active priority policy to calculate a case target', async () => {
    const prisma = {
      supportSlaPolicy: {
        findUnique: jest.fn().mockResolvedValue({ active: true, resolutionTargetMinutes: 120 }),
      },
    };
    const calculator = { calculateDueAt: jest.fn().mockReturnValue(new Date('2026-09-01T12:00:00.000Z')) };
    const service = new SupportSlaPolicyService(prisma as never, calculator as never);

    const dueAt = await service.calculateDueAt(SupportCasePriority.HIGH, new Date('2026-09-01T10:00:00.000Z'));

    expect(prisma.supportSlaPolicy.findUnique).toHaveBeenCalledWith({ where: { priority: SupportCasePriority.HIGH } });
    expect(calculator.calculateDueAt).toHaveBeenCalledWith(new Date('2026-09-01T10:00:00.000Z'), 120);
    expect(dueAt.toISOString()).toBe('2026-09-01T12:00:00.000Z');
  });
});
