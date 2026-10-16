# Modular monolith and reliable domain events

## Status

Accepted on 2026-09-01. Its frontend-publication details are superseded by
`0006-unify-frontend-as-modules.md`; backend modularity and reliable domain
events remain accepted.

## Decision

Jornada will remain a modular monolith while product boundaries mature.

- `Jornada`, `Tickets`, `QuickForms`, and `Hub` are separate frontend applications in the same repository.
- `apps/api` remains the initial deployment unit, organized by feature/domain modules.
- A module owns its rules, tables, migrations, DTOs, events, tests, and technical contracts.
- A module may expose only explicit contracts from its `contracts/` directory. It must not access another module's persistence directly.
- Controllers are thin. Services own business rules. Repositories are introduced only when persistence complexity or a replaceable persistence boundary justifies them.

Domain changes that need to inform another module must persist an outbox event in the same database transaction as the business change. Delivery is at least once; consumers must be idempotent. Retry, correlation, audit, and a reprocessable failure state are mandatory before a cross-domain event is considered delivered.

## Consequences

This keeps the operational footprint small during discovery while preserving a safe route to extract `forms`, `support`, or another mature domain into its own API and database later. Containers alone do not establish independence; explicit ownership and versioned contracts do.

The frontend release remains unified initially. Source apps remain isolated so a future independent pipeline or container does not require a UX rewrite.

## Extraction signals

Extract an API or database only when a domain has a distinct owning team, release cadence, scale profile, integration risk, availability requirement, or compliance boundary.
