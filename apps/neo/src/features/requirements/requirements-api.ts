import { apiFetch } from '../api/api-client';
import type { RequirementExpiration } from '../contracts/internal-contracts';

export type EmployeeRequirementsResponse = {
  items: Array<Omit<RequirementExpiration, 'employeeId'>>;
  source: { label: string; updatedAt: string };
};

export type DrakeRequirementWorkerPreview = {
  previewReference: string;
  fullName: string;
  employeeNumber: string | null;
  operationalUnitName: string | null;
};

export function listMyRequirements() {
  return apiFetch<EmployeeRequirementsResponse>('/expiring-requirements/me');
}

export function findRequirementPreviewWorkers(query: string) {
  const params = new URLSearchParams({ q: query.trim() });
  return apiFetch<{ items: DrakeRequirementWorkerPreview[] }>(`/expiring-requirements/preview/workers?${params.toString()}`);
}

export function listRequirementPreview(previewReference: string) {
  const params = new URLSearchParams({ previewReference });
  return apiFetch<EmployeeRequirementsResponse>(`/expiring-requirements/preview?${params.toString()}`);
}
