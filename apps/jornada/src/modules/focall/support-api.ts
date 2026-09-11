import { apiFetch } from '../../features/api/api-client';

export type SupportCaseStatus =
  | 'NEW'
  | 'OPEN'
  | 'WAITING_REQUESTER'
  | 'WAITING_INTERNAL'
  | 'WAITING_APPROVAL'
  | 'RESOLVED'
  | 'CLOSED';

export type SupportCasePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type SupportTransferReason =
  | 'WRONG_TEAM'
  | 'NEEDS_SPECIALIST'
  | 'NEEDS_APPROVAL'
  | 'INSUFFICIENT_INFORMATION'
  | 'OTHER';
export type SupportResolutionReason =
  | 'RESOLVED'
  | 'DUPLICATE'
  | 'REQUESTER_CANCELLED'
  | 'OUT_OF_SCOPE'
  | 'NO_REQUESTER_RETURN'
  | 'OTHER';
export type SupportReopenReason =
  | 'REQUESTER_NOT_RESOLVED'
  | 'REQUESTER_HAS_MORE_INFORMATION'
  | 'OTHER';
export type ApprovalRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'CANCELLED'
  | 'EXPIRED';
export type ApprovalStepStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'CANCELLED'
  | 'EXPIRED';
export type SupportCaseOpeningPolicy =
  | 'CONTINUOUS_CONVERSATION'
  | 'INDIVIDUAL_REQUEST'
  | 'BUSINESS_KEY';
export type SupportFormFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'SELECT'
  | 'DATE'
  | 'BOOLEAN'
  | 'NUMBER'
  | 'FILE';

export type SupportTeam = {
  id: string;
  code: string;
  name: string;
  status?: 'ACTIVE' | 'INACTIVE';
};

export type SupportTopicField = {
  id: string;
  code: string;
  label: string;
  type: SupportFormFieldType;
  required: boolean;
  sensitive: boolean;
  helpText: string | null;
  options: unknown;
  optionSourceKey: string | null;
  visibleWhen: unknown | null;
  requiredWhen: unknown | null;
};

export type SupportTopicForm = {
  id: string;
  version: number;
  title: string;
  description: string | null;
  fields: SupportTopicField[];
};

export type SupportTopic = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  defaultPriority: SupportCasePriority;
  openingPolicy: SupportCaseOpeningPolicy;
  businessKeyFieldCode: string | null;
  form: SupportTopicForm | null;
};

export type SupportDepartment = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  sortOrder?: number;
  topics: SupportTopic[];
};

export type SupportCatalogAdminTopic = Omit<SupportTopic, 'form'> & {
  status: 'ACTIVE' | 'INACTIVE';
  sortOrder: number;
  forms: Array<SupportTopicForm & { status: 'ACTIVE' | 'INACTIVE' }>;
};

export type SupportCatalogAdminDepartment = Omit<SupportDepartment, 'topics'> & {
  status: 'ACTIVE' | 'INACTIVE';
  sortOrder: number;
  topics: SupportCatalogAdminTopic[];
};

export type SupportCatalogAdminTeam = SupportTeam & {
  status: 'ACTIVE' | 'INACTIVE';
  department: {
    id: string;
    code: string;
    name: string;
  } | null;
  members: Array<{
    id: string;
    role: string;
    status: 'ACTIVE' | 'INACTIVE';
    user: {
      id: string;
      name: string;
      email: string;
      roles: string[];
      status: string;
    };
  }>;
};

export type SupportRoutingRule = {
  id: string;
  status: 'ACTIVE' | 'INACTIVE';
  priority: number;
  conditions: unknown | null;
  department: {
    id: string;
    code: string;
    name: string;
  };
  topic: {
    id: string;
    code: string;
    name: string;
  } | null;
  team: {
    id: string;
    code: string;
    name: string;
  };
};

export type ApprovalRule = {
  id: string;
  status: 'ACTIVE' | 'INACTIVE';
  priority: number;
  conditions: unknown | null;
  defaultDueMinutes: number | null;
  manualTriggerAllowed: boolean;
  department: { id: string; code: string; name: string } | null;
  topic: { id: string; code: string; name: string } | null;
  form: { id: string; title: string; version: number } | null;
  approvalTeam: { id: string; code: string; name: string };
};

export type ApprovalRequest = {
  id: string;
  status: ApprovalRequestStatus;
  reason: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  supportCase: {
    id: string;
    code: string;
    title: string;
    status: SupportCaseStatus;
    requester: { id: string; name: string; email: string };
  };
  currentStep: {
    id: string;
    status: ApprovalStepStatus;
    dueAt: string | null;
    decisionComment: string | null;
    approvalTeam: { id: string; code: string; name: string };
    decidedBy: { id: string; name: string; email: string } | null;
  } | null;
  events: Array<{
    id: string;
    type: string;
    comment: string | null;
    createdAt: string;
    author: { id: string; name: string; email: string } | null;
  }>;
};

export type SupportAssignableUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

export type SupportTriageSuggestion = {
  id: string;
  source: 'RULE' | 'LOCAL_AI' | 'EXTERNAL_AI';
  confidence: number | null;
  department: {
    id: string;
    code: string;
    name: string;
  };
  topic: {
    id: string;
    code: string;
    name: string;
  };
  team: {
    id: string;
    code: string;
    name: string;
  };
};

export type SupportCaseListItem = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: SupportCaseStatus;
  priority: SupportCasePriority;
  department: {
    id: string;
    code: string;
    name: string;
  } | null;
  topic: {
    id: string;
    code: string;
    name: string;
  } | null;
  teamCode: string | null;
  teamName: string;
  requester: {
    id: string;
    name: string;
    email: string;
  };
  assignedUser: {
    id: string;
    name: string;
    email: string;
  } | null;
  rating: {
    score: number;
    comment: string | null;
    createdAt: string;
  } | null;
  originConversationId: string | null;
  dueAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportCaseDetail = SupportCaseListItem & {
  events: Array<{
    id: string;
    type: string;
    fromValue: string | null;
    toValue: string | null;
    author: {
      id: string;
      name: string;
      email: string;
    } | null;
    createdAt: string;
  }>;
  messages: Array<{
    id: string;
    body: string;
    senderName: string;
    mine: boolean;
    createdAt: string;
  }>;
  form: SupportTopicForm | null;
  fieldValues: Array<{
    id: string;
    fieldId: string;
    fieldCode: string;
    label: string;
    type: SupportFormFieldType;
    value: unknown;
    sensitive: boolean;
  }>;
};

export type SupportCaseFilter = 'all' | 'open' | 'waiting' | 'resolved';
export type SupportOperatorQueueView =
  | 'novos-e-meus'
  | 'nao-atribuidos'
  | 'meus-atendimentos'
  | 'aguardando'
  | 'alta-prioridade'
  | 'resolvidos';

export function listSupportTeams() {
  return apiFetch<{ items: SupportTeam[] }>('/support/teams');
}

export function listSupportCatalog() {
  return apiFetch<{ items: SupportDepartment[] }>('/support/catalog');
}

export function listSupportCatalogAdmin() {
  return apiFetch<{
    departments: SupportCatalogAdminDepartment[];
    teams: SupportCatalogAdminTeam[];
    routingRules: SupportRoutingRule[];
  }>('/support/catalog/admin');
}

export function listSupportAssignableUsers() {
  return apiFetch<{ items: SupportAssignableUser[] }>('/support/catalog/assignees');
}

export function upsertSupportDepartment(payload: {
  code: string;
  name: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  sortOrder?: number;
}) {
  return apiFetch<{ item: SupportCatalogAdminDepartment }>(
    '/support/catalog/departments',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function updateSupportDepartment(
  departmentId: string,
  payload: {
    code: string;
    name: string;
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    sortOrder?: number;
  },
) {
  return apiFetch<{ item: SupportCatalogAdminDepartment }>(
    `/support/catalog/departments/${departmentId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function deleteSupportDepartment(departmentId: string) {
  return apiFetch<{
    item: SupportCatalogAdminDepartment;
    deletionMode: 'SOFT' | 'HARD';
  }>(`/support/catalog/departments/${departmentId}`, {
    method: 'DELETE',
  });
}

export function upsertSupportTopic(payload: {
  departmentId: string;
  code: string;
  name: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  defaultPriority?: SupportCasePriority;
  openingPolicy?: SupportCaseOpeningPolicy;
  businessKeyFieldCode?: string;
  sortOrder?: number;
}) {
  return apiFetch<{ item: SupportCatalogAdminTopic }>('/support/catalog/topics', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSupportTopic(
  topicId: string,
  payload: {
    departmentId: string;
    code: string;
    name: string;
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    defaultPriority?: SupportCasePriority;
    openingPolicy?: SupportCaseOpeningPolicy;
    businessKeyFieldCode?: string;
    sortOrder?: number;
  },
) {
  return apiFetch<{ item: SupportCatalogAdminTopic }>(
    `/support/catalog/topics/${topicId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function deleteSupportTopic(topicId: string) {
  return apiFetch<{
    item: SupportCatalogAdminTopic;
    deletionMode: 'SOFT' | 'HARD';
  }>(`/support/catalog/topics/${topicId}`, {
    method: 'DELETE',
  });
}

export function upsertSupportTeam(payload: {
  departmentId?: string;
  code: string;
  name: string;
  status?: 'ACTIVE' | 'INACTIVE';
}) {
  return apiFetch<{ item: SupportCatalogAdminTeam }>('/support/catalog/teams', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSupportTeam(
  teamId: string,
  payload: {
    departmentId?: string;
    code: string;
    name: string;
    status?: 'ACTIVE' | 'INACTIVE';
  },
) {
  return apiFetch<{ item: SupportCatalogAdminTeam }>(
    `/support/catalog/teams/${teamId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function deleteSupportTeam(teamId: string) {
  return apiFetch<{
    item: SupportCatalogAdminTeam;
    deletionMode: 'SOFT' | 'HARD';
  }>(`/support/catalog/teams/${teamId}`, {
    method: 'DELETE',
  });
}

export function upsertSupportTeamMember(payload: {
  teamId: string;
  userId: string;
  role?: 'AGENT' | 'MEMBER' | 'OBSERVER' | 'REQUESTER';
  status?: 'ACTIVE' | 'INACTIVE';
}) {
  return apiFetch<{ item: unknown }>('/support/catalog/team-members', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteSupportTeamMember(memberId: string) {
  return apiFetch<{
    item: unknown;
    deletionMode: 'SOFT' | 'HARD';
  }>(`/support/catalog/team-members/${memberId}`, {
    method: 'DELETE',
  });
}

export function upsertSupportRoutingRule(payload: {
  departmentId: string;
  topicId?: string;
  teamId: string;
  status?: 'ACTIVE' | 'INACTIVE';
  priority?: number;
  conditions?: Record<string, unknown>;
}) {
  return apiFetch<{ item: SupportRoutingRule }>('/support/catalog/routing-rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSupportRoutingRule(
  ruleId: string,
  payload: {
    departmentId: string;
    topicId?: string;
    teamId: string;
    status?: 'ACTIVE' | 'INACTIVE';
    priority?: number;
    conditions?: Record<string, unknown>;
  },
) {
  return apiFetch<{ item: SupportRoutingRule }>(
    `/support/catalog/routing-rules/${ruleId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function deleteSupportRoutingRule(ruleId: string) {
  return apiFetch<{
    item: SupportRoutingRule;
    deletionMode: 'HARD';
  }>(`/support/catalog/routing-rules/${ruleId}`, {
    method: 'DELETE',
  });
}

export function createSupportTopicForm(payload: {
  topicId: string;
  title: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  fields: Array<{
    code: string;
    label: string;
    type: SupportFormFieldType;
    required?: boolean;
    sensitive?: boolean;
    helpText?: string;
    options?: string[];
    visibleWhen?: Record<string, unknown>;
    requiredWhen?: Record<string, unknown>;
    sortOrder?: number;
  }>;
}) {
  const { topicId, ...body } = payload;

  return apiFetch<{ item: SupportTopicForm }>(
    `/support/catalog/topics/${topicId}/forms`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export function listApprovalRules() {
  return apiFetch<{ items: ApprovalRule[] }>('/support/catalog/approval-rules');
}

export function createApprovalRule(payload: {
  departmentId?: string;
  topicId?: string;
  formId?: string;
  approvalTeamId: string;
  status?: 'ACTIVE' | 'INACTIVE';
  priority?: number;
  conditions?: Record<string, unknown>;
  defaultDueMinutes?: number;
  manualTriggerAllowed?: boolean;
}) {
  return apiFetch<{ item: ApprovalRule }>('/support/catalog/approval-rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateApprovalRule(
  ruleId: string,
  payload: {
    departmentId?: string;
    topicId?: string;
    formId?: string;
    approvalTeamId: string;
    status?: 'ACTIVE' | 'INACTIVE';
    priority?: number;
    conditions?: Record<string, unknown>;
    defaultDueMinutes?: number;
    manualTriggerAllowed?: boolean;
  },
) {
  return apiFetch<{ item: ApprovalRule }>(
    `/support/catalog/approval-rules/${ruleId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function suggestSupportTriage(text: string) {
  return apiFetch<{ suggestion: SupportTriageSuggestion | null }>(
    '/support/triage/suggestions',
    {
      method: 'POST',
      body: JSON.stringify({ text }),
    },
  );
}

export function listSupportCases(params: {
  filter: SupportCaseFilter;
  q: string;
  queue?: SupportOperatorQueueView;
  previewReference?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.filter === 'open') {
    searchParams.set('state', 'active');
  } else if (params.filter === 'waiting') {
    searchParams.set('state', 'waiting');
  } else if (params.filter === 'resolved') {
    searchParams.set('state', 'resolved');
  }

  const query = params.q.trim();
  if (query) {
    searchParams.set('q', query);
  }

  if (params.queue) {
    searchParams.set('queue', params.queue);
  }

  if (params.previewReference) {
    searchParams.set('previewReference', params.previewReference);
  }

  searchParams.set('limit', '20');

  return apiFetch<{ items: SupportCaseListItem[] }>(
    `/support/cases?${searchParams.toString()}`,
  );
}

export function createSupportCase(payload: {
  teamCode?: string;
  departmentId?: string;
  topicId?: string;
  title?: string;
  description?: string;
  priority?: SupportCasePriority;
  previewReference?: string;
  fieldValues?: Array<{
    fieldId: string;
    value: string;
  }>;
}) {
  return apiFetch<{ item: SupportCaseDetail }>('/support/cases', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listApprovalRequests() {
  return apiFetch<{ items: ApprovalRequest[] }>('/support/approvals');
}

export function decideApproval(params: {
  approvalRequestId: string;
  decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  comment?: string;
}) {
  return apiFetch<{ item: ApprovalRequest }>(
    `/support/approvals/${params.approvalRequestId}/decision`,
    {
      method: 'POST',
      body: JSON.stringify({
        decision: params.decision,
        comment: params.comment,
      }),
    },
  );
}

export function requestManualApproval(params: {
  supportCaseId: string;
  approvalTeamId: string;
  reason: string;
  dueMinutes?: number;
}) {
  return apiFetch<{ item: ApprovalRequest }>(
    `/support/cases/${params.supportCaseId}/approvals`,
    {
      method: 'POST',
      body: JSON.stringify({
        approvalTeamId: params.approvalTeamId,
        reason: params.reason,
        dueMinutes: params.dueMinutes,
      }),
    },
  );
}

export function getSupportCase(supportCaseId: string) {
  return apiFetch<{ item: SupportCaseDetail }>(`/support/cases/${supportCaseId}`);
}

export function getSupportCasePreview(supportCaseId: string, previewReference: string) {
  const params = new URLSearchParams({ previewReference });
  return apiFetch<{ item: SupportCaseDetail }>(
    `/support/cases/${supportCaseId}?${params.toString()}`,
  );
}

export function updateSupportCase(params: {
  supportCaseId: string;
  status?: SupportCaseStatus;
  priority?: SupportCasePriority;
  teamCode?: string;
  assignedUserId?: string;
  changeReason?: string;
  changeComment?: string;
}) {
  return apiFetch<{ item: SupportCaseDetail }>(
    `/support/cases/${params.supportCaseId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        status: params.status,
        priority: params.priority,
        teamCode: params.teamCode,
        assignedUserId: params.assignedUserId,
        changeReason: params.changeReason,
        changeComment: params.changeComment,
      }),
    },
  );
}

export function reopenSupportCase(params: {
  supportCaseId: string;
  reason: SupportReopenReason;
  message: string;
}) {
  return apiFetch<{ item: SupportCaseDetail }>(
    `/support/cases/${params.supportCaseId}/reopen`,
    {
      method: 'POST',
      body: JSON.stringify({
        reason: params.reason,
        message: params.message,
      }),
    },
  );
}

export function addSupportCaseMessage(params: {
  supportCaseId: string;
  body: string;
  previewReference?: string;
}) {
  return apiFetch<{
    message: {
      id: string;
      body: string;
      senderName: string;
      createdAt: string;
    };
  }>(`/support/cases/${params.supportCaseId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      body: params.body,
      previewReference: params.previewReference,
    }),
  });
}

export function rateSupportCase(params: {
  supportCaseId: string;
  score: number;
  comment?: string;
}) {
  return apiFetch<{
    rating: NonNullable<SupportCaseListItem['rating']>;
  }>(`/support/cases/${params.supportCaseId}/rating`, {
    method: 'POST',
    body: JSON.stringify({
      score: params.score,
      comment: params.comment,
    }),
  });
}
