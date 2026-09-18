import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrakeSchedulePreviewReferenceService } from './drake-schedule-preview-reference.service';

describe('DrakeSchedulePreviewReferenceService', () => {
  const config = { getOrThrow: jest.fn().mockReturnValue('a-secret-long-enough-for-jwt-signing') };

  it('returns an opaque reference bound to its administrator', () => {
    const service = new DrakeSchedulePreviewReferenceService(config as unknown as ConfigService);
    const reference = service.issue('admin-1', { workerId: 'worker-1', operationalUnitId: 'unit-1', operationalUnitName: 'Unidade' });

    expect(reference).not.toContain('worker-1');
    expect(service.resolve('admin-1', reference)).toEqual({
      workerId: 'worker-1',
      employeeNumber: null,
      operationalUnitId: 'unit-1',
      operationalUnitName: 'Unidade',
    });
    expect(() => service.resolve('admin-2', reference)).toThrow(BadRequestException);
  });
});
