# Separate HelpHub frontend first

## Status

Superseded on 2026-09-02 by `0006-unify-frontend-as-modules.md`.

Jornada separates the HelpHub experience into `apps/help-hub` before splitting the backend or database. `apps/jornada` stays focused on the worker experience, while `apps/help-hub` owns HelpHub and its support configuration. QuickForms remains a separate product boundary and will leave HelpHub when its first standalone authenticated flow is ready.

The shared `apps/api` remains a modular backend for now because support, forms, auth, and worker flows are still evolving together. Backend or database extraction should wait for concrete signals such as independent deploy cadence, divergent scale, clear domain-owning team, stricter compliance requirements, or integrations that should not affect the worker app.
