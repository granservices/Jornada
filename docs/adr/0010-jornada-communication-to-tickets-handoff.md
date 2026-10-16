# Jornada Communication To Tickets Handoff

## Status

Accepted on 2026-09-03.

## Context

Jornada owns operational communications shown to workers. Some communications
need to offer a path to request help in Tickets, but a screen in Jornada must
not create, alter, or query Tickets tables directly.

## Decision

Jornada will expose communications through its own `Communication` internal
contract and route. A communication may expose a Tickets handoff action using a
small context envelope: `communicationId`, `sourceModule`, `title`, and an
allowed target route. Tickets remains responsible for opening and owning a
support case after the worker confirms the request.

The initial web page uses sanitized internal fixtures while the communication
source is not active. Its Tickets action is available only when the signed-in
user has the Tickets access grant. It carries navigation context only; no case
or message is created by Jornada in this first increment.

When creation is needed, the handoff will become an idempotent command handled
by Tickets and recorded through the domain event outbox. The command must use a
caller-owned idempotency key and preserve the Jornada communication reference
in Tickets as an external context, not as a foreign-key dependency.

## Consequences

The worker can move from a Jornada communication to Tickets without exposing
module internals. The initial page does not imply that all communications need
support cases, and it does not grant Tickets access automatically. Read state,
audience evaluation, publication and retention remain Jornada responsibilities
for a later vertical slice.
