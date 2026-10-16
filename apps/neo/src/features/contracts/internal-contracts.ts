export type SourceStatus = 'future' | 'prepared' | 'active' | 'suspended' | 'removed';

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

export type ScheduleItemType =
  | 'BOARDING'
  | 'DISEMBARKING'
  | 'TRAINING'
  | 'MEDICAL'
  | 'OPERATIONAL';

export type ScheduleItemStatus = 'CONFIRMED' | 'PENDING' | 'CHANGED' | 'CANCELED';

export type RequirementExpirationType = 'ASO' | 'TRAINING' | 'DOCUMENT' | 'CERTIFICATE';

export type RequirementExpirationStatus = 'VALID' | 'DUE_SOON' | 'EXPIRED' | 'PENDING';

export type RequirementSeverity = 'low' | 'medium' | 'high' | 'critical';

export type InboxItemKind =
  | 'schedule'
  | 'requirement'
  | 'communication'
  | 'support'
  | 'profile';

export type InboxPriority = 'low' | 'normal' | 'high' | 'critical';

export type ReadState = 'unread' | 'read';

export type CommunicationAudience = 'all' | 'department' | 'team' | 'employee';

export type SyncRunStatus = 'queued' | 'processing' | 'processed' | 'failed' | 'partial';

export interface UserAccessContext {
  userId: string;
  personId: string;
  displayName: string;
  email: string;
  applications: Array<{
    appCode: string;
    name: string;
    entryPath: string;
    roles: string[];
    scopes: string[];
  }>;
  currentApplication: {
    appCode: string;
    name: string;
  };
  roles: string[];
  scopes: string[];
}

export interface EmployeeProfile {
  employeeId: string;
  personId: string;
  displayName: string;
  registration: string;
  documentMasked: string;
  departmentName: string;
  roleName: string;
  status: EmployeeStatus;
  updatedAt: string;
}

export interface ScheduleItem {
  scheduleItemId: string;
  employeeId: string;
  type: ScheduleItemType;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  status: ScheduleItemStatus;
  sourceLabel: string;
  action: {
    label: string;
    route: string;
  };
}

export interface RequirementExpiration {
  requirementId: string;
  employeeId: string;
  type: RequirementExpirationType;
  title: string;
  expiresAt: string | null;
  status: RequirementExpirationStatus;
  severity: RequirementSeverity;
  issuerLabel: string;
  action: {
    label: string;
    route: string;
  };
}

export interface InboxItem {
  inboxItemId: string;
  employeeId: string;
  kind: InboxItemKind;
  title: string;
  summary: string;
  priority: InboxPriority;
  dueAt: string | null;
  route: string;
  relatedId: string;
  readState: ReadState;
}

export interface Communication {
  communicationId: string;
  audience: CommunicationAudience;
  title: string;
  summary: string;
  publishedAt: string;
  expiresAt: string | null;
  priority: InboxPriority;
  route: string;
}

export interface IntegrationSyncRun {
  syncRunId: string;
  sourceKey: string;
  sourceStatus: SourceStatus;
  status: SyncRunStatus;
  startedAt: string;
  finishedAt: string | null;
  receivedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  correlationId: string;
  errorSummary: string | null;
}

export interface InternalContractFixtures {
  userAccessContext: UserAccessContext;
  employeeProfile: EmployeeProfile;
  scheduleItems: ScheduleItem[];
  requirementExpirations: RequirementExpiration[];
  inboxItems: InboxItem[];
  communications: Communication[];
  integrationSyncRuns: IntegrationSyncRun[];
}
