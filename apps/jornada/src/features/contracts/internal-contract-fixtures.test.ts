import { describe, expect, it } from 'vitest';
import { internalContractFixtures } from './internal-contract-fixtures';
import type {
  InboxItem,
  IntegrationSyncRun,
  RequirementExpiration,
  ScheduleItem,
} from './internal-contracts';

const allowedInboxRoutes = [
  '/programacao',
  '/vencimentos',
  '/comunicados',
  '/atendimento',
  '/atendimentos',
  '/perfil',
];

const cpfLikePattern = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/;

function routeStartsWithModule(route: string) {
  return allowedInboxRoutes.some(
    (allowedRoute) => route === allowedRoute || route.startsWith(`${allowedRoute}/`) || route.startsWith(`${allowedRoute}?`),
  );
}

function assertIsoDate(value: string) {
  expect(Number.isNaN(Date.parse(value))).toBe(false);
}

function assertScheduleItem(item: ScheduleItem) {
  expect(item.scheduleItemId).toMatch(/^schedule_/);
  expect(item.employeeId).toBe(internalContractFixtures.employeeProfile.employeeId);
  assertIsoDate(item.startsAt);

  if (item.endsAt !== null) {
    assertIsoDate(item.endsAt);
  }

  expect(routeStartsWithModule(item.action.route)).toBe(true);
}

function assertRequirementExpiration(requirement: RequirementExpiration) {
  expect(requirement.requirementId).toMatch(/^requirement_/);
  expect(requirement.employeeId).toBe(internalContractFixtures.employeeProfile.employeeId);
  if (requirement.expiresAt !== null) {
    assertIsoDate(requirement.expiresAt);
  }
  expect(routeStartsWithModule(requirement.action.route)).toBe(true);
}

function assertInboxItem(item: InboxItem) {
  expect(item.inboxItemId).toMatch(/^inbox_/);
  expect(item.employeeId).toBe(internalContractFixtures.employeeProfile.employeeId);
  expect(routeStartsWithModule(item.route)).toBe(true);

  if (item.dueAt !== null) {
    assertIsoDate(item.dueAt);
  }
}

function assertIntegrationSyncRun(syncRun: IntegrationSyncRun) {
  expect(syncRun.syncRunId).toMatch(/^sync_/);
  expect(syncRun.correlationId).toContain(syncRun.sourceKey);
  expect(syncRun.acceptedCount + syncRun.rejectedCount).toBeLessThanOrEqual(syncRun.receivedCount);
  expect(syncRun.sourceStatus).not.toBe('active');
  expect(syncRun).not.toHaveProperty('payload');
  expect(syncRun).not.toHaveProperty('rawPayload');

  if (syncRun.finishedAt !== null) {
    assertIsoDate(syncRun.finishedAt);
  }
}

describe('internal contract fixtures', () => {
  it('keeps employee identity sanitized and separated from access data', () => {
    const { employeeProfile, userAccessContext } = internalContractFixtures;

    expect(employeeProfile.personId).toBe(userAccessContext.personId);
    expect(employeeProfile.documentMasked).toContain('*');
    expect(employeeProfile.documentMasked).not.toMatch(cpfLikePattern);
    expect(userAccessContext.applications.map((application) => application.appCode)).toContain('JORNADA');
  });

  it('keeps schedule, expiration, communication and inbox fixtures on Jornada internal routes', () => {
    for (const item of internalContractFixtures.scheduleItems) {
      assertScheduleItem(item);
    }

    for (const requirement of internalContractFixtures.requirementExpirations) {
      assertRequirementExpiration(requirement);
    }

    for (const item of internalContractFixtures.inboxItems) {
      assertInboxItem(item);
    }

    for (const communication of internalContractFixtures.communications) {
      expect(routeStartsWithModule(communication.route)).toBe(true);
      assertIsoDate(communication.publishedAt);
    }
  });

  it('keeps integration sync fixtures metadata-only while sources are not active', () => {
    for (const syncRun of internalContractFixtures.integrationSyncRuns) {
      assertIntegrationSyncRun(syncRun);
    }
  });
});
