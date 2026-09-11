# Use custom form builder as official flow

Dynamic form creation and editing happen only through the Jornada custom builder at `/formularios/novo` and `/formularios/:formKey/editar`. Forms are a reusable versioned domain owned by `forms`, so the product should not keep a parallel experimental route or a second editor path for the same responsibility.

This keeps the operator flow small, preserves the lightweight frontend decision from ADR 0002, and makes future form evolution happen through one builder, one runtime, and one set of versioning contracts.
