import { apiFetch } from '../api/api-client';
import type { ScheduleItem } from '../contracts/internal-contracts';

export type EmployeeScheduleResponse = {
  items: ScheduleItem[];
  range: { from: string; to: string };
  source: { label: string; updatedAt: string };
};

export type DrakeWorkerPreview = {
  previewReference: string;
  fullName: string;
  employeeNumber: string | null;
  operationalUnitName: string | null;
};

export function listMySchedule() {
  return apiFetch<EmployeeScheduleResponse>('/boarding-schedule/me');
}

export function findDrakeWorkers(query: string) {
  const params = new URLSearchParams({ q: query.trim() });
  return apiFetch<{ items: DrakeWorkerPreview[] }>(`/boarding-schedule/preview/workers?${params.toString()}`);
}

export function listDrakeWorkerPreview(previewReference: string, range: { from: string; to: string }) {
  const params = new URLSearchParams({ previewReference, ...range });
  return apiFetch<EmployeeScheduleResponse>(`/boarding-schedule/preview?${params.toString()}`);
}
