# Remove AntD, Formily and Designable from frontend

The Jornada frontend will use its own typed form builder and lightweight dynamic field runtime for the current MVP. We removed `antd`, `@ant-design/*`, `@formily/*`, `@designable/*`, and the legacy `/formularios/legacy/*` designer routes because the custom builder already covers the current scope with smaller bundles, less style leakage risk, and simpler LGPD review.

`FormDefinition.schema` remains as a technical JSON compatibility field, but `FormField`, `visibleWhen`, `requiredWhen`, and backend validation are the primary contracts for forms. Reintroducing a visual designer dependency should require a new ADR with bundle, accessibility, maintenance, and mobile impact review.
