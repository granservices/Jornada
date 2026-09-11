---
name: jornada-integration-sources
description: Use when planning future external data sources for Jornada without making them active dependencies of the app.
---

# Jornada Integration Sources

Use this skill when the task is about APIs, files, webhooks, or systems that may feed Jornada in the future, but are not active dependencies of the current MVP.

## Direction

Treat external systems as `Fonte Externa` in product/documentation language and `IntegrationSource` when a technical model is needed.

The Jornada app should depend on internal contracts first. External sources feed those contracts through adapters/importers later.

## Required framing

Before proposing implementation, identify:

- which internal contract the source feeds
- who consumes the data in the app
- whether the source is `future`, `prepared`, `active`, `suspended`, or `removed`
- expected frequency: one-off import, scheduled sync, webhook, or manual upload
- LGPD risk and data minimization needs
- authentication/secret handling without printing credentials
- idempotency, audit, retry, and failure handling expectations

## Default recommendation

If the source is not active yet:

- document it in the source map
- define or refine the internal contract
- use mock, seed, or controlled internal data for the app
- postpone real API calls, credentials, and production sync until the source is decided

Do not let an external payload become the frontend model. The adapter translates from the external shape into Jornada's internal model.
