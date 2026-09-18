import { SupportSlaService } from './support-sla.service';

describe('SupportSlaService', () => {
  it('calculates a 24x7 resolution target from the opening instant', () => {
    const service = new SupportSlaService();

    const dueAt = service.calculateDueAt(
      new Date('2026-09-01T10:00:00.000Z'),
      240,
    );

    expect(dueAt.toISOString()).toBe('2026-09-01T14:00:00.000Z');
  });
});
