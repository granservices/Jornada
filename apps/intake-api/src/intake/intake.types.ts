export type IntakeEventType =
  | 'qualification_pending'
  | 'logistics_schedule'
  | 'unknown';

export type IntakeStatus = 'stored' | 'duplicate' | 'malformed';

export type BodyKind = 'empty' | 'json' | 'partial-json' | 'text' | 'binary';

export type NormalizedBody = {
  bodyKind: BodyKind;
  payload: unknown;
  rawBodyText: string | null;
  rawBodyBase64: string | null;
  parseError: string | null;
};

export type IntakeAnalysis = {
  eventType: IntakeEventType;
  source: string;
  workerKey: string | null;
  workerName: string | null;
  pendencyKind: string | null;
  trainingList: string | null;
  dueDate: string | null;
  daysUntilDue: number | null;
  logisticsEventDate: string | null;
  logisticsAction: string | null;
  eligibleWithin15Days: boolean;
  summary: string | null;
};

export type StoredIntakeEvent = {
  id: string;
  receivedAt: string;
  source: string;
  eventType: IntakeEventType;
  status: IntakeStatus;
  bodyKind: BodyKind;
  contentType: string | null;
  sha256: string;
  storagePath: string;
  duplicateOf: string | null;
  parseError: string | null;
  workerKey: string | null;
  workerName: string | null;
  pendencyKind: string | null;
  trainingList: string | null;
  dueDate: string | null;
  daysUntilDue: number | null;
  logisticsEventDate: string | null;
  logisticsAction: string | null;
  eligibleWithin15Days: boolean;
  summary: string | null;
};
