import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  FormOwnerType,
  Prisma,
  Role,
  SupportCatalogStatus,
  SupportFormFieldType,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../database/prisma.service';
import { UpsertFormDefinitionDto } from './dto/upsert-form-definition.dto';

type FormWithRelations = Prisma.FormDefinitionGetPayload<{
  include: {
    fields: true;
    ownerDepartment: { select: { id: true; code: true; name: true } };
    supportTopicBindings: {
      include: {
        topic: {
          include: {
            department: { select: { id: true; code: true; name: true } };
          };
        };
      };
    };
  };
}>;

const formRelationsInclude = {
  fields: { orderBy: { sortOrder: 'asc' } },
  ownerDepartment: {
    select: { id: true, code: true, name: true },
  },
  supportTopicBindings: {
    include: {
      topic: {
        include: {
          department: {
            select: { id: true, code: true, name: true },
          },
        },
      },
    },
  },
} satisfies Prisma.FormDefinitionInclude;

@Injectable()
export class FormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listForms(user: AuthenticatedUser) {
    this.assertFormsAdmin(user);

    const forms = await this.prisma.formDefinition.findMany({
      orderBy: [{ key: 'asc' }, { version: 'desc' }, { updatedAt: 'desc' }],
      include: {
        fields: { orderBy: { sortOrder: 'asc' } },
        ownerDepartment: {
          select: { id: true, code: true, name: true },
        },
        supportTopicBindings: {
          orderBy: { sortOrder: 'asc' },
          include: {
            topic: {
              include: {
                department: {
                  select: { id: true, code: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    return { items: this.groupForms(forms) };
  }

  async createForm(user: AuthenticatedUser, dto: UpsertFormDefinitionDto) {
    this.assertFormsAdmin(user);
    this.assertHasFields(dto);
    await this.assertOwnerAllowed(dto);

    const requestedKey = this.normalizeFormKey(dto.key || dto.title);
    const key = await this.resolveWritableFormKey(requestedKey, dto.title);
    const status = dto.status ?? SupportCatalogStatus.ACTIVE;

    if (status === SupportCatalogStatus.DRAFT) {
      return this.saveDraftForm(user, key, dto);
    }

    if (status === SupportCatalogStatus.ACTIVE) {
      return this.publishForm(user, key, dto);
    }

    throw new BadRequestException('Formulario so pode ser salvo como rascunho ou publicado.');
  }

  private async saveDraftForm(
    user: AuthenticatedUser,
    key: string,
    dto: UpsertFormDefinitionDto,
  ) {
    const existingDraft = await this.prisma.formDefinition.findFirst({
      where: { key, status: SupportCatalogStatus.DRAFT },
      include: formRelationsInclude,
    });

    const item = await this.prisma.$transaction(async (transaction) => {
      const form = existingDraft
        ? await transaction.formDefinition.update({
          where: { id: existingDraft.id },
          data: this.updateFormData(
            dto,
            key,
            existingDraft.version,
            SupportCatalogStatus.DRAFT,
          ),
          include: formRelationsInclude,
        })
        : await transaction.formDefinition.create({
          data: this.createFormData(
            dto,
            key,
            await this.nextVersion(key),
            SupportCatalogStatus.DRAFT,
          ),
          include: formRelationsInclude,
        });

      await this.audit.recordWith(transaction, {
        actorUserId: user.id,
        action: AuditAction.SAVE_DRAFT,
        entityType: 'FormDefinition',
        entityId: form.id,
        entityLabel: form.title,
        before: existingDraft ? this.toForm(existingDraft) : null,
        after: this.toForm(form),
        metadata: {
          key,
          version: form.version,
          status: form.status,
        },
      });

      return form;
    });

    return { item: this.toForm(item) };
  }

  private async publishForm(
    user: AuthenticatedUser,
    key: string,
    dto: UpsertFormDefinitionDto,
  ) {
    const existingDraft = await this.prisma.formDefinition.findFirst({
      where: { key, status: SupportCatalogStatus.DRAFT },
      include: formRelationsInclude,
    });
    const currentActive = await this.prisma.formDefinition.findFirst({
      where: { key, status: SupportCatalogStatus.ACTIVE },
      include: formRelationsInclude,
      orderBy: { version: 'desc' },
    });

    const item = await this.prisma.$transaction(async (transaction) => {
      await transaction.formDefinition.updateMany({
        where: { key, status: SupportCatalogStatus.ACTIVE },
        data: { status: SupportCatalogStatus.INACTIVE },
      });

      const form = existingDraft
        ? await transaction.formDefinition.update({
          where: { id: existingDraft.id },
          data: this.updateFormData(
            dto,
            key,
            existingDraft.version,
            SupportCatalogStatus.ACTIVE,
          ),
          include: formRelationsInclude,
        })
        : await transaction.formDefinition.create({
        data: this.createFormData(
          dto,
          key,
          await this.nextVersion(key),
          SupportCatalogStatus.ACTIVE,
        ),
        include: formRelationsInclude,
      });

      await this.audit.recordWith(transaction, {
        actorUserId: user.id,
        action: AuditAction.PUBLISH,
        entityType: 'FormDefinition',
        entityId: form.id,
        entityLabel: form.title,
        before: {
          draft: existingDraft ? this.toForm(existingDraft) : null,
          active: currentActive ? this.toForm(currentActive) : null,
        },
        after: this.toForm(form),
        metadata: {
          key,
          version: form.version,
          archivedActiveId: currentActive?.id ?? null,
        },
      });

      return form;
    });

    return { item: this.toForm(item) };
  }

  private createFormData(
    dto: UpsertFormDefinitionDto,
    key: string,
    version: number,
    status: SupportCatalogStatus,
  ): Prisma.FormDefinitionUncheckedCreateInput {
    return {
      key,
      ownerType: dto.ownerType ?? FormOwnerType.GLOBAL,
      ownerDepartmentId: this.ownerDepartmentId(dto),
      version,
      title: dto.title.trim(),
      description: this.optionalText(dto.description),
      schema: this.schemaInput(dto.schema),
      status,
      fields: this.fieldsCreateInput(dto),
    };
  }

  private updateFormData(
    dto: UpsertFormDefinitionDto,
    key: string,
    version: number,
    status: SupportCatalogStatus,
  ): Prisma.FormDefinitionUncheckedUpdateInput {
    return {
      key,
      ownerType: dto.ownerType ?? FormOwnerType.GLOBAL,
      ownerDepartmentId: this.ownerDepartmentId(dto),
      version,
      title: dto.title.trim(),
      description: this.optionalText(dto.description),
      schema: this.schemaInput(dto.schema),
      status,
      fields: this.fieldsUpdateInput(dto),
    };
  }

  private assertFormsAdmin(user: AuthenticatedUser) {
    if (user.roles.includes(Role.ADMIN) || user.roles.includes(Role.TI)) {
      return;
    }

    throw new ForbiddenException('Somente administradores de TI podem manter formularios.');
  }

  private assertHasFields(dto: UpsertFormDefinitionDto) {
    if ((dto.fields ?? []).length > 0) {
      return;
    }

    if (dto.schema && Object.keys(dto.schema).length > 0) {
      return;
    }

    throw new BadRequestException('Formulario precisa ter schema ou ao menos um campo.');
  }

  private async assertOwnerAllowed(dto: UpsertFormDefinitionDto) {
    if (dto.ownerType !== FormOwnerType.SUPPORT_DEPARTMENT) {
      return;
    }

    const departmentId = dto.ownerDepartmentId?.trim();
    if (!departmentId) {
      throw new BadRequestException('Informe o setor dono do formulario.');
    }

    const department = await this.prisma.supportDepartment.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });

    if (department) {
      return;
    }

    throw new NotFoundException('Setor dono do formulario nao encontrado.');
  }

  private async resolveWritableFormKey(requestedKey: string, title: string) {
    const normalizedTitle = this.normalizeFieldCode(title);
    const forms = await this.prisma.formDefinition.findMany({
      select: {
        key: true,
        id: true,
        title: true,
        version: true,
        status: true,
        supportTopicBindings: { select: { id: true } },
      },
    });
    const sameTitleForms = forms.filter(
      (form) => this.normalizeFieldCode(form.title) === normalizedTitle,
    );

    if (sameTitleForms.length === 0) {
      return requestedKey;
    }

    const requestedFormExists = sameTitleForms.some(
      (form) => this.formLogicalKey(form) === requestedKey,
    );

    if (requestedFormExists) {
      return this.formLogicalKey(this.pickCanonicalForm(sameTitleForms));
    }

    throw new BadRequestException(
      'Ja existe um formulario com esse nome. Use outro nome ou edite o formulario existente.',
    );
  }

  private pickCanonicalForm<T extends {
    key: string | null;
    id: string;
    version: number;
    status: SupportCatalogStatus;
    supportTopicBindings: Array<{ id: string }>;
  }>(forms: T[]) {
    return [...forms].sort((left, right) => {
      const scoreDelta = this.canonicalFormScore(right) - this.canonicalFormScore(left);

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return right.version - left.version;
    })[0];
  }

  private canonicalFormScore(form: {
    key: string | null;
    status: SupportCatalogStatus;
    supportTopicBindings: Array<{ id: string }>;
  }) {
    const statusScore = {
      [SupportCatalogStatus.DRAFT]: 100,
      [SupportCatalogStatus.ACTIVE]: 90,
      [SupportCatalogStatus.INACTIVE]: 0,
    }[form.status];
    const bindingScore = form.supportTopicBindings.length > 0 ? 50 : 0;

    return statusScore + bindingScore;
  }

  private formLogicalKey(form: { key: string | null; id: string }) {
    return form.key || form.id;
  }

  private ownerDepartmentId(dto: UpsertFormDefinitionDto) {
    if (dto.ownerType !== FormOwnerType.SUPPORT_DEPARTMENT) {
      return null;
    }

    return dto.ownerDepartmentId?.trim() || null;
  }

  private async nextVersion(key: string) {
    const latest = await this.prisma.formDefinition.findFirst({
      where: { key },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return (latest?.version ?? 0) + 1;
  }

  private groupForms(forms: FormWithRelations[]) {
    const grouped = new Map<string, FormWithRelations[]>();

    for (const form of forms) {
      const key = form.key || form.id;
      grouped.set(key, [...(grouped.get(key) ?? []), form]);
    }

    const rows = Array.from(grouped.entries()).map(([key, versions]) => {
      const published = this.latestVersion(
        versions.filter((form) => form.status === SupportCatalogStatus.ACTIVE),
      );
      const draft = this.latestVersion(
        versions.filter((form) => form.status === SupportCatalogStatus.DRAFT),
      );
      const latest = this.bestDisplayForm([draft, published, ...versions]) ?? versions[0];

      return {
        key,
        latest: this.toForm(latest),
        published: published ? this.toForm(published) : null,
        draft: draft ? this.toForm(draft) : null,
        versions: versions.map((form) => this.toForm(form)),
      };
    });

    return this.mergeDuplicateVisibleForms(rows);
  }

  private mergeDuplicateVisibleForms<T extends {
    title: string;
    version: number;
    status: SupportCatalogStatus;
    updatedAt?: Date | string;
  }>(rows: Array<{
    key: string;
    latest: T;
    published: T | null;
    draft: T | null;
    versions: T[];
  }>) {
    const grouped = new Map<string, typeof rows>();

    for (const row of rows) {
      const visibleKey = this.normalizeFieldCode(row.latest.title || row.key);
      grouped.set(visibleKey, [...(grouped.get(visibleKey) ?? []), row]);
    }

    return Array.from(grouped.values()).map((duplicates) => {
      if (duplicates.length === 1) {
        return duplicates[0];
      }

      return this.mergeFormRows(duplicates);
    });
  }

  private mergeFormRows<T extends {
    title: string;
    version: number;
    status: SupportCatalogStatus;
    updatedAt?: Date | string;
  }>(rows: Array<{
    key: string;
    latest: T;
    published: T | null;
    draft: T | null;
    versions: T[];
  }>) {
    const versions = rows
      .flatMap((row) => row.versions)
      .sort((left, right) => right.version - left.version);
    const published = this.latestVersion(
      rows.map((row) => row.published).filter((form): form is T => Boolean(form)),
    );
    const draft = this.latestVersion(
      rows.map((row) => row.draft).filter((form): form is T => Boolean(form)),
    );
    const latest = this.bestDisplayForm([draft, published, ...versions]) ?? versions[0];
    const key = rows.find((row) => row.versions.includes(latest))?.key ?? rows[0].key;

    return {
      key,
      latest,
      published,
      draft,
      versions,
    };
  }

  private latestVersion<T extends { version: number }>(items: T[]) {
    return items.sort((left, right) => right.version - left.version)[0] ?? null;
  }

  private bestDisplayForm<T extends {
    version: number;
    status: SupportCatalogStatus;
    updatedAt?: Date | string;
  }>(items: Array<T | null | undefined>) {
    return items
      .filter((item): item is T => Boolean(item))
      .sort((left, right) => {
        const statusDelta =
          this.displayStatusScore(right.status) - this.displayStatusScore(left.status);

        if (statusDelta !== 0) {
          return statusDelta;
        }

        const updatedDelta =
          this.updatedTimestamp(right.updatedAt) - this.updatedTimestamp(left.updatedAt);

        if (updatedDelta !== 0) {
          return updatedDelta;
        }

        return right.version - left.version;
      })[0] ?? null;
  }

  private displayStatusScore(status: SupportCatalogStatus) {
    return {
      [SupportCatalogStatus.DRAFT]: 100,
      [SupportCatalogStatus.ACTIVE]: 90,
      [SupportCatalogStatus.INACTIVE]: 0,
    }[status];
  }

  private updatedTimestamp(value?: Date | string) {
    if (!value) {
      return 0;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  private toForm(form: FormWithRelations) {
    return {
      id: form.id,
      key: form.key,
      version: form.version,
      title: form.title,
      description: form.description,
      schema: form.schema,
      status: form.status,
      ownerType: form.ownerType,
      ownerDepartment: form.ownerDepartment,
      fields: form.fields.map((field) => this.toField(field)),
      supportBindings: form.supportTopicBindings.map((binding) => ({
        id: binding.id,
        status: binding.status,
        required: binding.required,
        topic: {
          id: binding.topic.id,
          code: binding.topic.code,
          name: binding.topic.name,
          department: binding.topic.department,
        },
      })),
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
    };
  }

  private toField(field: {
    id: string;
    code: string;
    label: string;
    fieldType: SupportFormFieldType;
    required: boolean;
    sensitive: boolean;
    helpText: string | null;
    options: Prisma.JsonValue | null;
    optionSourceKey: string | null;
    visibleWhen: Prisma.JsonValue | null;
    requiredWhen: Prisma.JsonValue | null;
    sortOrder: number;
  }) {
    return {
      id: field.id,
      code: field.code,
      label: field.label,
      type: field.fieldType,
      required: field.required,
      sensitive: field.sensitive,
      helpText: field.helpText,
      options: field.options,
      optionSourceKey: field.optionSourceKey,
      visibleWhen: field.visibleWhen,
      requiredWhen: field.requiredWhen,
      sortOrder: field.sortOrder,
    };
  }

  private optionalText(value?: string | null) {
    const text = value?.trim();
    return text || null;
  }

  private normalizeFormKey(value: string) {
    const key = this.normalizeFieldCode(value);
    if (key.length >= 2) {
      return key;
    }

    throw new BadRequestException('Informe uma chave valida para o formulario.');
  }

  private normalizeFieldCode(value: string) {
    return value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  private normalizedFieldOptions(options?: string[]) {
    const cleanOptions = (options ?? [])
      .map((option) => option.trim())
      .filter(Boolean);

    return cleanOptions.length > 0 ? cleanOptions : Prisma.JsonNull;
  }

  private conditionsInput(conditions?: Record<string, unknown>) {
    if (!conditions || Object.keys(conditions).length === 0) {
      return Prisma.JsonNull;
    }

    return conditions as Prisma.InputJsonValue;
  }

  private fieldsCreateInput(dto: UpsertFormDefinitionDto) {
    const fields = dto.fields ?? [];

    if (fields.length === 0) {
      return undefined;
    }

    return {
      create: fields.map((field, index) => ({
        code: this.normalizeFieldCode(field.code),
        label: field.label.trim(),
        fieldType: field.type,
        required: field.required ?? false,
        sensitive: field.sensitive ?? false,
        helpText: this.optionalText(field.helpText),
        options: this.normalizedFieldOptions(field.options),
        optionSourceKey: this.optionalText(field.optionSourceKey),
        visibleWhen: this.conditionsInput(field.visibleWhen),
        requiredWhen: this.conditionsInput(field.requiredWhen),
        sortOrder: field.sortOrder ?? index + 1,
      })),
    };
  }

  private fieldsUpdateInput(dto: UpsertFormDefinitionDto) {
    const fields = dto.fields ?? [];

    if (fields.length === 0) {
      return { deleteMany: {} };
    }

    return {
      deleteMany: {},
      create: fields.map((field, index) => ({
        code: this.normalizeFieldCode(field.code),
        label: field.label.trim(),
        fieldType: field.type,
        required: field.required ?? false,
        sensitive: field.sensitive ?? false,
        helpText: this.optionalText(field.helpText),
        options: this.normalizedFieldOptions(field.options),
        optionSourceKey: this.optionalText(field.optionSourceKey),
        visibleWhen: this.conditionsInput(field.visibleWhen),
        requiredWhen: this.conditionsInput(field.requiredWhen),
        sortOrder: field.sortOrder ?? index + 1,
      })),
    };
  }

  private schemaInput(schema?: Record<string, unknown>) {
    if (!schema || Object.keys(schema).length === 0) {
      return Prisma.JsonNull;
    }

    return schema as Prisma.InputJsonValue;
  }
}
