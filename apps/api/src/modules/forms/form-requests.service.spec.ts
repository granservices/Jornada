import { ForbiddenException } from '@nestjs/common';
import { Role, SupportCatalogStatus } from '@prisma/client';
import { FormRequestsService } from './form-requests.service';

describe('FormRequestsService', () => {
  const actor = { id: 'admin-1', roles: ['ADMIN'] };
  let prisma: {
    $transaction: jest.Mock;
    formDefinition: { findFirst: jest.Mock };
    user: { findUnique: jest.Mock };
    formRequest: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    formResponse: { create: jest.Mock };
  };
  let outbox: { recordWith: jest.Mock };
  let service: FormRequestsService;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((callback) => callback(prisma)),
      formDefinition: { findFirst: jest.fn() },
      user: { findUnique: jest.fn() },
      formRequest: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      formResponse: { create: jest.fn() },
    };
    outbox = { recordWith: jest.fn().mockResolvedValue({ id: 'event-1' }) };
    service = new FormRequestsService(prisma as never, outbox as never);
  });

  it('creates a deadline-bound request from a published form version', async () => {
    prisma.formDefinition.findFirst.mockResolvedValue({
      id: 'form-v3',
      key: 'ferias',
      version: 3,
      title: 'Solicitar ferias',
      status: SupportCatalogStatus.ACTIVE,
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'worker-1' });
    prisma.formRequest.create.mockResolvedValue({
      id: 'request-1',
      formId: 'form-v3',
      respondentUserId: 'worker-1',
      sourceApplication: 'HELP_HUB',
      sourceContextType: 'SupportCase',
      sourceContextId: 'case-1',
      dueAt: new Date('2026-09-10T12:00:00.000Z'),
      status: 'PENDING',
      createdAt: new Date('2026-09-01T12:00:00.000Z'),
    });

    const response = await service.createRequest(actor, {
      formId: 'form-v3',
      respondentUserId: 'worker-1',
      sourceApplication: 'HELP_HUB',
      sourceContextType: 'SupportCase',
      sourceContextId: 'case-1',
      dueAt: '2026-09-10T12:00:00.000Z',
    });

    expect(prisma.formRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        formId: 'form-v3',
        respondentUserId: 'worker-1',
        requestedByUserId: 'admin-1',
        sourceApplication: 'HELP_HUB',
        sourceContextType: 'SupportCase',
        sourceContextId: 'case-1',
        dueAt: new Date('2026-09-10T12:00:00.000Z'),
      }),
    });
    expect(outbox.recordWith).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        eventType: 'forms.request.created',
        aggregateType: 'FormRequest',
        aggregateId: 'request-1',
        idempotencyKey: 'forms.request.created:request-1',
      }),
    );
    expect(response.item).toMatchObject({
      id: 'request-1',
      formId: 'form-v3',
      status: 'PENDING',
    });
  });

  it('blocks an employee from issuing a form request on behalf of an application', async () => {
    await expect(
      service.createRequest({ id: 'worker-1', roles: [Role.EMPLOYEE] }, {
        formId: 'form-v3',
        respondentUserId: 'worker-2',
        sourceApplication: 'HELP_HUB',
        sourceContextType: 'SupportCase',
        sourceContextId: 'case-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts one response from the request recipient and records completion', async () => {
    prisma.formRequest.findUnique.mockResolvedValue({
      id: 'request-1',
      respondentUserId: 'worker-1',
      status: 'PENDING',
      sourceApplication: 'HELP_HUB',
      sourceContextType: 'SupportCase',
      sourceContextId: 'case-1',
    });
    prisma.formRequest.update.mockResolvedValue({ id: 'request-1', status: 'SUBMITTED' });
    prisma.formResponse.create.mockResolvedValue({ id: 'response-1', formRequestId: 'request-1' });

    await service.submitResponse({ id: 'worker-1' }, 'request-1', {
      start_date: '2026-10-01',
    });

    expect(prisma.formResponse.create).toHaveBeenCalledWith({
      data: { formRequestId: 'request-1', submittedByUserId: 'worker-1', values: { start_date: '2026-10-01' } },
    });
    expect(outbox.recordWith).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        eventType: 'forms.request.completed',
        aggregateId: 'request-1',
        idempotencyKey: 'forms.request.completed:request-1',
      }),
    );
  });
});
