# Keep support metadata outside dynamic forms

## Status

Accepted on 2026-09-10.

Support topic, generated title, initial message, case opening policy, and approval flow remain outside the dynamic form schema. A form captures structured answers, but it does not own routing, SLA, conversation lifecycle, title semantics, or approval decisions.

`SupportTopic` is the business classification selected by the worker. It chooses the primary form, routing context, future SLA, and how a new submission opens or reuses a support case. Initial policies are continuous conversation, individual request, and business key.

`SupportCase.title` should be generated from department, topic, and selected form fields, then remain editable by authorized operators. The initial message is free text for conversation context: required for generic or underspecified topics, optional when the form already captures enough context.

Approvals are modeled as a future workflow linked to the support case and submitted form data. They are not ordinary form fields, because approval needs its own approver, decision, timestamp, justification, evaluated data, and audit trail.

This keeps forms reusable under `/forms`, prevents circular routing where the system must read a form answer before knowing which form/rule applies, and avoids mixing independent requests such as two reimbursements into a single active conversation just because they share department and topic.
