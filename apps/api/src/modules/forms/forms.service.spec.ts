import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  FormOwnerType,
  Role,
  SupportCatalogStatus,
  SupportFormFieldType,
  UserStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { FormsService } from './forms.service';

describe('FormsService', () => {
  let prisma: {
    $transaction: jest.Mock;
    formDefinition: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    auditLog: {
      create: jest.Mock;
    };
    supportDepartment: {
      findUnique: jest.Mock;
    };
  };
  let service: FormsService;

  const admin: AuthenticatedUser = {
    id: 'admin-user',
    email: 'admin@granservices.com.br',
    employeeId: null,
    roles: [Role.ADMIN],
    status: UserStatus.ACTIVE,
  };

  const support: AuthenticatedUser = {
    id: 'support-user',
    email: 'support@granservices.com.br',
    employeeId: null,
    roles: [Role.SUPPORT],
    status: UserStatus.ACTIVE,
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((callback) => callback(prisma)),
      formDefinition: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      supportDepartment: {
        findUnique: jest.fn(),
      },
    };
    prisma.formDefinition.findMany.mockResolvedValue([]);
    service = new FormsService(prisma as never, {
      recordWith: jest.fn((client, payload) =>
        client.auditLog.create({ data: payload }),
      ),
    } as never);
  });

  it('blocks support operators from maintaining generic forms', async () => {
    await expect(service.listForms(support)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lists forms grouped by stable key with versions', async () => {
    prisma.formDefinition.findMany.mockResolvedValue([
      formVersion({ id: 'form-2', version: 2 }),
      formVersion({ id: 'form-1', version: 1 }),
    ]);

    const response = await service.listForms(admin);

    expect(response.items).toHaveLength(1);
    expect(response.items[0]).toMatchObject({
      key: 'ferias',
      latest: { id: 'form-2', version: 2 },
      published: { id: 'form-2', version: 2 },
      draft: null,
      versions: [{ id: 'form-2' }, { id: 'form-1' }],
    });
  });

  it('uses the draft as latest while a form has unpublished edits', async () => {
    prisma.formDefinition.findMany.mockResolvedValue([
      formVersion({
        id: 'form-draft',
        version: 2,
        status: SupportCatalogStatus.DRAFT,
        title: 'Ferias em edicao',
        updatedAt: new Date('2026-08-27T12:00:00.000Z'),
      }),
      formVersion({
        id: 'form-active',
        version: 1,
        status: SupportCatalogStatus.ACTIVE,
        title: 'Ferias publicada',
        updatedAt: new Date('2026-08-26T10:00:00.000Z'),
      }),
    ]);

    const response = await service.listForms(admin);

    expect(response.items[0]).toMatchObject({
      latest: { id: 'form-draft', version: 2, status: SupportCatalogStatus.DRAFT },
      published: { id: 'form-active', version: 1, status: SupportCatalogStatus.ACTIVE },
      draft: { id: 'form-draft', version: 2, status: SupportCatalogStatus.DRAFT },
    });
  });

  it('merges legacy duplicate rows with the same visible form name', async () => {
    prisma.formDefinition.findMany.mockResolvedValue([
      formVersion({ id: 'juhi-2', key: 'juhi_copia', version: 2, title: 'Juhi' }),
      formVersion({ id: 'juhi-1', key: 'juhi', version: 1, title: 'Juhi' }),
    ]);

    const response = await service.listForms(admin);

    expect(response.items).toHaveLength(1);
    expect(response.items[0]).toMatchObject({
      latest: { id: 'juhi-2', version: 2, title: 'Juhi' },
      published: { id: 'juhi-2', version: 2, title: 'Juhi' },
      versions: [{ id: 'juhi-2' }, { id: 'juhi-1' }],
    });
  });

  it('publishes a new independent form version for admin users', async () => {
    prisma.formDefinition.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(formVersion({ version: 1 }))
      .mockResolvedValueOnce({ version: 1 });
    prisma.formDefinition.create.mockResolvedValue(formVersion({ version: 2 }));

    await service.createForm(admin, {
      key: 'Ferias',
      title: ' Solicitar ferias ',
      description: ' Periodo pretendido ',
      fields: [
        {
          code: 'start date',
          label: 'Data inicial',
          type: SupportFormFieldType.DATE,
          required: true,
        },
      ],
    });

    expect(prisma.formDefinition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: 'ferias',
        ownerType: FormOwnerType.GLOBAL,
        ownerDepartmentId: null,
        version: 2,
        title: 'Solicitar ferias',
        description: 'Periodo pretendido',
        status: SupportCatalogStatus.ACTIVE,
        fields: {
          create: [
            expect.objectContaining({
              code: 'start_date',
              fieldType: SupportFormFieldType.DATE,
              required: true,
            }),
          ],
        },
      }),
      include: expect.any(Object),
    });
    expect(prisma.formDefinition.updateMany).toHaveBeenCalledWith({
      where: { key: 'ferias', status: SupportCatalogStatus.ACTIVE },
      data: { status: SupportCatalogStatus.INACTIVE },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'PUBLISH',
        actorUserId: admin.id,
        entityType: 'FormDefinition',
      }),
    });
  });

  it('blocks another form with the same visible title', async () => {
    prisma.formDefinition.findMany.mockResolvedValue([
      formVersion({ id: 'existing-form', key: 'juhi', title: 'Juhi' }),
    ]);

    await expect(
      service.createForm(admin, {
        key: 'novo_juhi',
        title: 'juhi',
        status: SupportCatalogStatus.DRAFT,
        schema: { schema: { type: 'object' } },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.formDefinition.create).not.toHaveBeenCalled();
    expect(prisma.formDefinition.update).not.toHaveBeenCalled();
  });

  it('allows drafting a linked legacy form when the duplicate is an inactive orphan', async () => {
    prisma.formDefinition.findMany.mockResolvedValue([
      formVersion({
        id: 'orphan-form',
        key: 'juhi',
        title: 'Juhi',
        status: SupportCatalogStatus.INACTIVE,
        supportTopicBindings: [],
      }),
      formVersion({
        id: 'linked-form',
        key: 'cmt67ga82000fo4c8vebt3y8x',
        title: 'Juhi',
        status: SupportCatalogStatus.INACTIVE,
        supportTopicBindings: [{ id: 'binding-juhi' }],
      }),
    ]);
    prisma.formDefinition.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ version: 1 });
    prisma.formDefinition.create.mockResolvedValue(
      formVersion({
        id: 'linked-draft',
        key: 'cmt67ga82000fo4c8vebt3y8x',
        title: 'Juhi',
        version: 2,
        status: SupportCatalogStatus.DRAFT,
      }),
    );

    const response = await service.createForm(admin, {
      key: 'cmt67ga82000fo4c8vebt3y8x',
      title: 'Juhi',
      status: SupportCatalogStatus.DRAFT,
      schema: { schema: { type: 'object' } },
    });

    expect(response.item).toMatchObject({
      id: 'linked-draft',
      status: SupportCatalogStatus.DRAFT,
      version: 2,
    });
  });

  it('moves draft saves from an orphan duplicate key to the linked canonical form', async () => {
    prisma.formDefinition.findMany.mockResolvedValue([
      formVersion({
        id: 'orphan-form',
        key: 'juhi',
        title: 'Juhi',
        status: SupportCatalogStatus.INACTIVE,
        supportTopicBindings: [],
      }),
      formVersion({
        id: 'linked-form',
        key: 'cmt67ga82000fo4c8vebt3y8x',
        title: 'Juhi',
        status: SupportCatalogStatus.INACTIVE,
        supportTopicBindings: [{ id: 'binding-juhi' }],
      }),
    ]);
    prisma.formDefinition.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ version: 1 });
    prisma.formDefinition.create.mockResolvedValue(
      formVersion({
        id: 'linked-draft',
        key: 'cmt67ga82000fo4c8vebt3y8x',
        title: 'Juhi',
        version: 2,
        status: SupportCatalogStatus.DRAFT,
      }),
    );

    await service.createForm(admin, {
      key: 'juhi',
      title: 'Juhi',
      status: SupportCatalogStatus.DRAFT,
      schema: { schema: { type: 'object' } },
    });

    expect(prisma.formDefinition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: 'cmt67ga82000fo4c8vebt3y8x',
        status: SupportCatalogStatus.DRAFT,
      }),
      include: expect.any(Object),
    });
  });

  it('saves a single draft per form key', async () => {
    prisma.formDefinition.findFirst.mockResolvedValue(
      formVersion({
        id: 'draft-form',
        version: 3,
        status: SupportCatalogStatus.DRAFT,
      }),
    );
    prisma.formDefinition.update.mockResolvedValue(
      formVersion({
        id: 'draft-form',
        version: 3,
        status: SupportCatalogStatus.DRAFT,
      }),
    );

    const response = await service.createForm(admin, {
      key: 'Ferias',
      title: 'Ferias em edicao',
      status: SupportCatalogStatus.DRAFT,
      schema: { schema: { type: 'object' } },
    });

    expect(response.item).toMatchObject({
      id: 'draft-form',
      version: 3,
      status: SupportCatalogStatus.DRAFT,
    });
    expect(prisma.formDefinition.update).toHaveBeenCalledWith({
      where: { id: 'draft-form' },
      data: expect.objectContaining({
        key: 'ferias',
        status: SupportCatalogStatus.DRAFT,
        version: 3,
      }),
      include: expect.any(Object),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'SAVE_DRAFT',
        actorUserId: admin.id,
        entityType: 'FormDefinition',
      }),
    });
  });

  it('publishes the existing draft and archives the previous active form', async () => {
    prisma.formDefinition.findFirst
      .mockResolvedValueOnce(
        formVersion({
          id: 'draft-form',
          version: 3,
          status: SupportCatalogStatus.DRAFT,
        }),
      )
      .mockResolvedValueOnce(
        formVersion({
          id: 'active-form',
          version: 2,
          status: SupportCatalogStatus.ACTIVE,
        }),
      );
    prisma.formDefinition.update.mockResolvedValue(
      formVersion({
        id: 'draft-form',
        version: 3,
        status: SupportCatalogStatus.ACTIVE,
      }),
    );

    await service.createForm(admin, {
      key: 'Ferias',
      title: 'Ferias final',
      status: SupportCatalogStatus.ACTIVE,
      schema: { schema: { type: 'object' } },
    });

    expect(prisma.formDefinition.updateMany).toHaveBeenCalledWith({
      where: { key: 'ferias', status: SupportCatalogStatus.ACTIVE },
      data: { status: SupportCatalogStatus.INACTIVE },
    });
    expect(prisma.formDefinition.update).toHaveBeenCalledWith({
      where: { id: 'draft-form' },
      data: expect.objectContaining({
        schema: { schema: { type: 'object' } },
        status: SupportCatalogStatus.ACTIVE,
        version: 3,
      }),
      include: expect.any(Object),
    });
  });

  it('requires fields before publishing', async () => {
    await expect(
      service.createForm(admin, {
        title: 'Formulario vazio',
        fields: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function formVersion(patch: Partial<ReturnType<typeof formVersionBase>>) {
  return {
    ...formVersionBase(),
    ...patch,
  };
}

function formVersionBase() {
  return {
    id: 'form-1',
    key: 'ferias',
    version: 1,
    title: 'Ferias',
    description: null,
    status: SupportCatalogStatus.ACTIVE,
    ownerType: FormOwnerType.GLOBAL,
    ownerDepartment: null,
    fields: [
      {
        id: 'field-start-date',
        code: 'start_date',
        label: 'Data inicial',
        fieldType: SupportFormFieldType.DATE,
        required: true,
        sensitive: false,
        helpText: null,
        options: null,
        visibleWhen: null,
        requiredWhen: null,
        sortOrder: 1,
      },
    ],
    supportTopicBindings: [],
    createdAt: new Date('2026-08-26T10:00:00.000Z'),
    updatedAt: new Date('2026-08-26T10:00:00.000Z'),
  };
}
