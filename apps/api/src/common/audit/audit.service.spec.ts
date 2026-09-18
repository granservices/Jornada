import { AuditAction } from '@prisma/client';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('redacts sensitive fields before persisting audit payloads', async () => {
    const prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };
    const service = new AuditService(prisma as never);

    await service.record({
      actorUserId: 'user-1',
      action: AuditAction.UPDATE,
      entityType: 'FormDefinition',
      entityId: 'form-1',
      before: {
        title: 'Antes',
        passwordHash: 'secret',
        nested: { cpf: '12345678900' },
      },
      after: {
        title: 'Depois',
        token: 'abc',
      },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        before: {
          title: 'Antes',
          passwordHash: '[REDACTED]',
          nested: { cpf: '[REDACTED]' },
        },
        after: {
          title: 'Depois',
          token: '[REDACTED]',
        },
      }),
    });
  });
});
