# Jornada Communication To Focall Handoff

## Status

Accepted on 2026-09-03.

## Context

Jornada owns operational communications shown to workers. Some communications
need to offer a path to request help in Focall, but a screen in Jornada must
not create, alter, or query Focall tables directly.

## Decision

Jornada will expose communications through its own `Communication` internal
contract and route. A communication may expose a Focall handoff action using a
small context envelope: `communicationId`, `sourceModule`, `title`, and an
allowed target route. Focall remains responsible for opening and owning a
support case after the worker confirms the request.

The initial web page uses sanitized internal fixtures while the communication
source is not active. Its Focall action is available only when the signed-in
user has the Focall access grant. It carries navigation context only; no case
or message is created by Jornada in this first increment.

When creation is needed, the handoff will become an idempotent command handled
by Focall and recorded through the domain event outbox. The command must use a
caller-owned idempotency key and preserve the Jornada communication reference
in Focall as an external context, not as a foreign-key dependency.

## Consequences

The worker can move from a Jornada communication to Focall without exposing
module internals. The initial page does not imply that all communications need
support cases, and it does not grant Focall access automatically. Read state,
audience evaluation, publication and retention remain Jornada responsibilities
for a later vertical slice.
