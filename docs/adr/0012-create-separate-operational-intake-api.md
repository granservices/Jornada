# ADR 0012: Create Separate Operational Intake API

## Status

Accepted

## Context

The published webhook receiver started as a small Jornada API for Drake tests.
It later accumulated temporary diagnostics and unrelated SISPAT code. The new
need is narrower: receive what would be sent to BLIP or logistics flows, retain
the raw data, classify only the known operational event types, and analyze the
15-day communication window before feeding Jornada features.

Keeping this inside the main Jornada API would increase coupling before the data
contract is trusted. Reusing the old published receiver directly would also
carry unrelated SISPAT behavior and historical debugging code.

## Decision

Create a new standalone app at `apps/intake-api`.

The app exposes one ingestion endpoint:

- `POST /api/intake/events`

Initial supported event types:

- `qualification_pending`
- `logistics_schedule`

The app stores raw payloads on disk and indexes extracted metadata in SQLite for
analysis. Jornada will not consume these events directly until a later internal
contract is explicitly defined.

## Consequences

- The deployment can be small and Docker Compose based.
- SISPAT and historical Drake routes stay out of the new app.
- SQLite is acceptable for the first analytical phase because it indexes the
  received events locally without introducing a database service.
- Future Jornada reuse must go through a clean internal contract, not through
  raw payloads.
