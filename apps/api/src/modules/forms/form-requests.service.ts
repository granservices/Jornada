import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FormRequestStatus, Role, SupportCatalogStatus } from '@prisma/client';
import { DomainEventOutboxService } from '../../common/events/domain-event-outbox.service';
import { PrismaService } from '../../database/prisma.service';

type FormRequestActor = {
  id: string;
  roles?: Role[];
};

const FORM_REQUESTER_ROLES = new Set<Role>([
  Role.ADMIN,
  Role.SUPPORT,
  Role.TI,
]);

export type CreateFormRequestInput = {
  formId: string;
  respondentUserId: string;
  sourceApplication: string;
  sourceContextType: string;
  sourceContextId: string;
  dueAt?: string;
};

@Injectable()
export class FormRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventOutbox: DomainEventOutboxService,
  ) {}

  async createRequest(actor: FormRequestActor, input: CreateFormRequestInput) {
    this.assertCanRequest(actor);
    const dueAt = this.parseDueAt(input.dueAt);
    const form = await this.prisma.formDefinition.findFirst({
      where: { id: input.formId, status: SupportCatalogStatus.ACTIVE },
      select: { id: true, key: true, version: true, title: true },
    });
    if (!form) {
      throw new NotFoundException('Formulario publicado nao encontrado.');
    }

    const respondent = await this.prisma.user.findUnique({
      where: { id: input.respondentUserId },
      select: { id: true },
    });
    if (!respondent) {
      throw new NotFoundException('Destinatario do formulario nao encontrado.');
    }

    const item = await this.prisma.$transaction(async (transaction) => {
      const request = await transaction.formRequest.create({
        data: {
          formId: form.id,
          requestedByUserId: actor.id,
          respondentUserId: respondent.id,
          sourceApplication: input.sourceApplication.trim(),
          sourceContextType: input.sourceContextType.trim(),
          sourceContextId: input.sourceContextId.trim(),
          dueAt,
        },
      });

      await this.eventOutbox.recordWith(transaction, {
        idempotencyKey: `forms.request.created:${request.id}`,
        eventType: 'forms.request.created',
        aggregateType: 'FormRequest',
        aggregateId: request.id,
        payload: {
          formRequestId: request.id,
          formId: form.id,
          formKey: form.key,
          formVersion: form.version,
          respondentUserId: respondent.id,
          sourceApplication: request.sourceApplication,
          sourceContextType: request.sourceContextType,
          sourceContextId: request.sourceContextId,
          dueAt: request.dueAt?.toISOString() ?? null,
        },
      });

      return request;
    });

    return { item };
  }

  async submitResponse(actor: FormRequestActor, formRequestId: string, values: Record<string, unknown>) {
    const request = await this.prisma.formRequest.findUnique({ where: { id: formRequestId } });
    if (!request) throw new NotFoundException('Solicitacao de formulario nao encontrada.');
    if (request.respondentUserId !== actor.id) throw new BadRequestException('Somente o destinatario pode responder este formulario.');
    if (request.status !== FormRequestStatus.PENDING) throw new BadRequestException('Formulario nao esta pendente.');

    await this.prisma.$transaction(async (transaction) => {
      await transaction.formResponse.create({ data: { formRequestId, submittedByUserId: actor.id, values: values as never } });
      await transaction.formRequest.update({ where: { id: formRequestId }, data: { status: FormRequestStatus.SUBMITTED, submittedAt: new Date() } });
      await this.eventOutbox.recordWith(transaction, {
        idempotencyKey: `forms.request.completed:${formRequestId}`,
        eventType: 'forms.request.completed', aggregateType: 'FormRequest', aggregateId: formRequestId,
        payload: { formRequestId, respondentUserId: actor.id, sourceApplication: request.sourceApplication, sourceContextType: request.sourceContextType, sourceContextId: request.sourceContextId },
      });
    });
  }

  private parseDueAt(value?: string) {
    if (!value) {
      return null;
    }

    const dueAt = new Date(value);
    if (!Number.isNaN(dueAt.getTime())) {
      return dueAt;
    }

    throw new BadRequestException('Prazo do formulario invalido.');
  }

  private assertCanRequest(actor: FormRequestActor) {
    if (actor.roles?.some((role) => FORM_REQUESTER_ROLES.has(role))) {
      return;
    }

    throw new ForbiddenException('Usuario sem permissao para solicitar formularios.');
  }
}
