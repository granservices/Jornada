# Unify the Neo frontend as independent modules

## Status

Accepted on 2026-09-02.

## Context

The first frontend split created separate Jornada, Tickets and QuickForms
workspaces. It preserved product boundaries, but introduced three
runtime shells, PWA manifests, local servers and an internal SSO transition.
The shared visual shell then diverged in practice, increasing maintenance cost
without a proven need for independent frontend deployment.

## Decision

Neo will publish one frontend: `apps/neo`.

- `Jornada`, `Tickets` and `QuickForms` are independent internal modules of the
  same frontend, loaded by route.
- Existing direct routes remain stable: `/inbox`, `/atendimentos` and
  `/formularios`.
- `/aplicativos` remains a neutral Hub. It has no module sidebar and lists only
  modules or external applications the signed-in user may access.
- Each module owns its routes, navigation definition, UI, API client, tests and
  domain-specific permissions. Modules do not import one another's UI or rules.
- One authenticated session, shell, bundle entry and PWA manifest serve all
  internal modules. Internal module navigation never issues an SSO ticket.
- Native module routes and icons are a versioned registry in code. The auth
  catalog controls access, visible metadata, ordering and activation.
- The product and application identifier are `Tickets` and `TICKETS`.
  Existing grants are migrated to the new identifier before the old catalog
  code is removed from active runtime paths.
- Catalog entries with `REDIRECT` remain external applications. They may be
  managed by an administrator, but do not become internal modules.
- The old `apps/tickets` and `apps/quick-forms` workspaces were removed after
  module migration into the unified frontend. They are no longer part of the
  workspace, scripts or deployment surface.

The backend remains a modular monolith. This decision changes frontend
publication only; it does not relax data ownership, contracts, outbox,
idempotency or authorization boundaries.

## Consequences

The application has one reliable visual shell and one local development start
path. Module code remains separable because its ownership and route boundaries
are explicit, while initial bundle size is protected by route-level lazy loading.

The previous separate-frontend decision in ADR 0004 is superseded for frontend
publication. ADR 0005 remains valid for backend modularity and reliable domain
events; its frontend paragraph is superseded by this ADR.

## Future extraction signals

A module may become a separately deployed frontend only when at least one
concrete signal exists: a distinct owning team, independent release cadence,
materially different scale, availability or compliance requirement, or an
integration that requires isolation.
