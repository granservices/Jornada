import { apiFetch } from '../../features/api/api-client';
import type { SupportFormFieldType, SupportTopicForm } from '../tickets/support-api';

export type FormOwnerType = 'GLOBAL' | 'SUPPORT_DEPARTMENT';
export type OptionSourceAdapterType = 'STATIC' | 'HTTP_JSON';

export type DynamicFormDefinition = SupportTopicForm & {
  key: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'INACTIVE';
  ownerType: FormOwnerType;
  schema: Record<string, unknown> | null;
  ownerDepartment: {
    id: string;
    code: string;
    name: string;
  } | null;
  supportBindings: Array<{
    id: string;
    status: 'ACTIVE' | 'INACTIVE';
    required: boolean;
    topic: {
      id: string;
      code: string;
      name: string;
      department: {
        id: string;
        code: string;
        name: string;
      };
    };
  }>;
  createdAt: string;
  updatedAt: string;
};

export type DynamicFormGroup = {
  key: string;
  latest: DynamicFormDefinition;
  published: DynamicFormDefinition | null;
  draft: DynamicFormDefinition | null;
  versions: DynamicFormDefinition[];
};

export type OptionSourceSummary = {
  id: string;
  key: string;
  name: string;
  adapterType: OptionSourceAdapterType;
  status: 'ACTIVE' | 'INACTIVE';
  cacheTtlSeconds: number;
  createdAt: string;
  updatedAt: string;
};

export type OptionSourceDetail = OptionSourceSummary & {
  config: Record<string, unknown>;
};

export function listDynamicForms() {
  return apiFetch<{ items: DynamicFormGroup[] }>('/forms');
}

export function listOptionSources(params: { includeInactive?: boolean; includeConfig?: boolean } = {}) {
  const query = new URLSearchParams();
  if (params.includeInactive) query.set('includeInactive', '1');
  if (params.includeConfig) query.set('includeConfig', '1');
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<{ items: Array<OptionSourceSummary | OptionSourceDetail> }>(`/forms/option-sources${suffix}`);
}

export function getOptionSource(sourceKey: string) {
  return apiFetch<{ item: OptionSourceDetail }>(
    `/forms/option-sources/${encodeURIComponent(sourceKey)}`,
  );
}

export function createOptionSource(payload: {
  key: string;
  name: string;
  adapterType: OptionSourceAdapterType;
  status?: 'ACTIVE' | 'INACTIVE';
  cacheTtlSeconds?: number;
  config: Record<string, unknown>;
}) {
  return apiFetch<{ item: OptionSourceSummary }>('/forms/option-sources', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateOptionSource(
  sourceKey: string,
  payload: {
    name: string;
    adapterType: OptionSourceAdapterType;
    status?: 'ACTIVE' | 'INACTIVE';
    cacheTtlSeconds?: number;
    config: Record<string, unknown>;
  },
) {
  return apiFetch<{ item: OptionSourceDetail }>(
    `/forms/option-sources/${encodeURIComponent(sourceKey)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function previewOptionSource(payload: {
  adapterType: OptionSourceAdapterType;
  config: Record<string, unknown>;
  query?: string;
  cursor?: string;
  limit?: number;
}) {
  return apiFetch<{ items: Array<{ value: string; label: string }>; nextCursor: string | null; hasMore: boolean }>(
    '/forms/option-sources/preview',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function queryOptionSource(sourceKey: string, params: { q?: string; cursor?: string; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.limit) query.set('limit', String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<{ items: Array<{ value: string; label: string }>; nextCursor: string | null; hasMore: boolean }>(
    `/forms/option-sources/${encodeURIComponent(sourceKey)}/options${suffix}`,
  );
}

export function createDynamicForm(payload: {
  key?: string;
  ownerType?: FormOwnerType;
  ownerDepartmentId?: string;
  title: string;
  description?: string;
  status?: 'ACTIVE' | 'DRAFT';
  schema?: Record<string, unknown>;
  fields?: Array<{
    code: string;
    label: string;
    type: SupportFormFieldType;
    required?: boolean;
    sensitive?: boolean;
    helpText?: string;
    options?: string[];
    optionSourceKey?: string;
    visibleWhen?: Record<string, unknown>;
    requiredWhen?: Record<string, unknown>;
    sortOrder?: number;
  }>;
}) {
  return apiFetch<{ item: DynamicFormDefinition }>('/forms', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
