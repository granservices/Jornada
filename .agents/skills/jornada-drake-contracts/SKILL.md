---
name: jornada-drake-contracts
description: Use only when maintaining, reviewing, resuming, or removing the historical Jornada Drake webhook implementation.
---

# Jornada Drake Contracts

Use this skill only for work that touches the historical/prepared Drake webhook intake in Jornada:

- `POST /api/integrations/drake/employees`
- `POST /api/integrations/drake/expiring-requirements`
- `POST /api/integrations/drake/boarding-schedule`
- request authentication, payload DTOs, idempotency keys, persisted inbox events, replay, diagnostics, and intake documentation

## Current status

Drake is not an active data source for the current MVP direction. Treat it as historical/prepared implementation until the user explicitly resumes or removes it.

For new external API planning, prefer the `jornada-integration-sources` skill instead.

## Operating posture

Preserve published routes, bearer authentication, response shape, correlation metadata, idempotency, and auditability while the code exists unless the user explicitly approves a contract change or removal.

Do not normalize the three endpoints into one assumed payload shape. `employees`, `expiring-requirements`, and `boarding-schedule` can arrive with different structures and operational meaning.

## Before changing behavior

Establish the real contract first:

1. identify the exact endpoint, DTO, service, storage, queue, and processor path involved
2. compare the intended change against `docs/server-intake-map.md`, `docs/roadmap.md`, `docs/testing-strategy.md`, and `docs/agents-and-skills.md`
3. inspect representative fixtures, captured payloads, or tests before editing validators or normalizers
4. check whether the change affects idempotency, correlation id, persisted payload, queue processing, or logs

If the evidence is missing, document the uncertainty and prefer adding a narrow fixture/test before broad parsing changes.

## Validation expectations

For contract changes, run or add focused tests around:

- valid request accepted for each affected endpoint
- missing or invalid bearer token rejected
- duplicate payload/event handled idempotently
- persisted audit event has safe correlation metadata
- processor success and retry/failure path when queue behavior changes

When diagnosing production intake, revalidate live server/proxy/DNS state before making production claims. A partial-byte `request aborted` usually means sender/proxy cancellation needs investigation; do not assume it is only a body-size limit.

## Safety boundaries

Never print or store secrets in the answer, docs, fixtures, or logs. Use environment variables for tokens and redact sensitive worker data in examples.

Keep deploy changes isolated to the Jornada API unless the user explicitly asks to involve the web app or a broader rollout.
