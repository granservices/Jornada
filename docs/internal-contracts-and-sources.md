# Internal Contracts And Future Sources

## Purpose

Este documento define os contratos internos que o Jornada deve oferecer para o app antes de consumir fontes externas reais.

A regra principal e simples: tela e regra do Jornada dependem de contrato interno; Fonte Externa entra depois por adapter/importador.

## Decision

O MVP nao depende de APIs externas ativas para nascer. Enquanto uma fonte estiver `future`, `prepared` ou `suspended`, o app pode usar dados mockados, seedados ou internos controlados.

Quando uma Fonte Externa virar `active`, ela deve alimentar o contrato interno correspondente sem vazar payload externo para frontend, tela, regra de dominio ou DTO de leitura do app.

## Source status

| Status | Significado | Regra |
| --- | --- | --- |
| `future` | Fonte possivel, ainda nao decidida | Documentar hipotese e contrato interno afetado. Nao criar credencial nem sync real. |
| `prepared` | Codigo ou endpoint existe, mas nao alimenta o MVP | Preservar compatibilidade, mas nao tratar como prioridade operacional. |
| `active` | Fonte real alimenta dados do Jornada | Exigir contrato, autenticacao, idempotencia, auditoria, erro/retry, LGPD e teste. |
| `suspended` | Fonte parada por decisao de produto/operacao | Manter historico claro e bloquear novas dependencias. |
| `removed` | Fonte retirada da direcao | Remover docs/codigo quando houver decisao explicita e plano de migracao. |

## Future source map

| Fonte Externa | Status atual | Dados esperados | Contrato interno alimentado | Consumidor principal | Frequencia esperada | Risco LGPD inicial | Observacao |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Drake | `active` (piloto controlado de programacao) | programacao por colaborador | `ScheduleItem` | Jornada do colaborador | sob demanda, por sessao | alto | Adapter de leitura do Crew Rotation; nunca expor token, tenant ou payload externo ao navegador. Webhooks historicos permanecem separados. |
| Drake | `active` (piloto controlado de qualificacoes) | ASO, treinamentos e qualificacoes por colaborador | `RequirementExpiration` | Inbox e Vencimentos do colaborador | sob demanda, por sessao | alto | Adapter de leitura de necessidades de qualificacao; retorna todas as necessidades do colaborador, ordenadas por vencimento, com indicadores de atencao e sem identificadores externos. |
| SISPAT | `prepared` | funcionarios por arquivo operacional | `EmployeeProfile` | Jornada do colaborador, auth/onboarding futuro | manual/sob demanda | alto | Intake por CSV/XLSX existe como base historica/preparada. |
| Protheus | `future` | dados administrativos/operacionais a confirmar | a definir por caso de uso | a definir | a definir | a definir | Nao implementar antes de contrato real e finalidade LGPD. |
| Microsoft Entra ID | `future` | identidade/federacao | `UserAccessContext` | Auth/portal de apps | login/sync a definir | medio | Fica para federacao futura, sem bloquear login atual. |
| APIs internas Gran | `future` | a definir | a definir | a definir | a definir | a definir | Entram somente apos mapa de dado, dono e frequencia. |

## Internal contracts

Implementacao inicial do harness:

- tipos: `apps/jornada/src/features/contracts/internal-contracts.ts`
- fixtures sanitizadas: `apps/jornada/src/features/contracts/internal-contract-fixtures.ts`
- teste leve: `apps/jornada/src/features/contracts/internal-contract-fixtures.test.ts`
- consumo inicial nas telas: `apps/jornada/src/views/dashboard-page.tsx`
- tela dedicada de vencimentos do trabalhador: `apps/jornada/src/views/expirations-page.tsx`
- regressao de tela: `apps/jornada/src/views/dashboard-page.test.tsx`

Essas fixtures sao a primeira base executavel dos contratos internos no frontend. Elas nao tornam nenhuma Fonte Externa ativa.

No MVP atual, `Inbox`, `Programacao`, `Vencimentos` e `Perfil` consomem essa fixture por adapters locais de view. `Vencimentos` deve continuar como tela propria do trabalhador, com view-model em `features/requirements`, sem acoplar a tela ao Inbox, a Programacao ou ao payload externo.

## Drake schedule read pilot

O piloto de programacao usa o contrato interno `ScheduleItem`, sem promover o payload do Crew Rotation a contrato do Jornada.

- `GET /api/boarding-schedule/me` resolve `User -> Person -> Employee` no backend e retorna somente a programacao da sessao autenticada.
- o adapter encontra a unidade operacional do colaborador e consulta `CrewRotation/Periods`; esse `POST` e uma consulta parametrizada da fonte, encapsulada no backend.
- a tela recebe apenas itens normalizados, intervalo consultado e metadados minimos da fonte. Token, tenant, identificador operacional, propriedades e payload cru nao atravessam a API do Jornada.
- `GET /api/boarding-schedule/preview/*` existe somente para validacao por `ADMIN`, requer busca e selecao explicitas e grava auditoria de leitura. A busca devolve uma referencia opaca de cinco minutos, vinculada ao administrador; o `WorkerId` permanece no backend. Ele nao e o fluxo do colaborador.
- o intervalo padrao e pequeno (30 dias anteriores e 180 posteriores) e a API rejeita janelas superiores a 366 dias. Nao ha sincronizacao em massa nem cache compartilhado de programacao pessoal neste piloto.
- o vinculo definitivo depende de `Employee.employeeNumber` e/ou `Employee.externalEmployeeId` corresponderem ao registro do colaborador no Drake. O provisionamento deve validar esse vinculo antes de liberar a consulta `me`.

## Drake qualification needs pilot

O piloto de qualificacoes usa o contrato interno `RequirementExpiration`, sem promover o payload de Compliance do Drake a contrato do Jornada.

- `GET /api/expiring-requirements/me` resolve `User -> Person -> Employee` no backend e retorna somente vencimentos do colaborador autenticado.
- `GET /api/expiring-requirements/preview/*` existe somente para validacao por `ADMIN`, requer busca e selecao explicitas e grava auditoria de leitura. A busca devolve uma referencia opaca de cinco minutos, vinculada ao administrador; o `WorkerId` permanece no backend. Ele nao e o fluxo do colaborador.
- o adapter consulta `Compliance/IndividualQualificationNeeds/GetAll` filtrando somente por `workerId`, paginando internamente quando necessario, com ordenacao por `expirationDate` e selecao minima de campos.
- o service mantem todas as necessidades retornadas para o colaborador, reforca a ordenacao por `expiresAt`, coloca itens sem data no fim e converte o identificador externo da necessidade em `requirementId` opaco, sem limitar a quantidade retornada pela regra do Jornada.
- o retorno para as telas contem apenas `requirementId`, `type`, `title`, `expiresAt`, `status`, `severity`, `issuerLabel` e `action`; `WorkerId`, tenant, token e payload bruto ficam no backend.
- cada leitura normal e auditada como `EmployeeRequirement`, com origem, escopo e quantidade, sem persistir dados sensiveis ou identificadores externos no log.

### EmployeeProfile

Resumo do colaborador para telas e regras do Jornada.

Campos esperados no MVP:

- `employeeId`
- `personId`
- `displayName`
- `registration`
- `documentMasked`
- `departmentName`
- `roleName`
- `status`
- `updatedAt`

Regras:

- nao expor documento completo no frontend por padrao
- diferenciar identidade (`Person`) de vinculo operacional (`Employee`)
- origem externa nao deve aparecer como regra da tela

### UserAccessContext

Resumo do usuario autenticado e seus acessos por aplicacao.

Campos esperados no MVP:

- `userId`
- `personId`
- `displayName`
- `email`
- `applications`
- `currentApplication`
- `roles`
- `scopes`

Regras:

- acesso ao app nao substitui permissao fina do dominio
- roles globais nao devem virar fonte principal de autorizacao operacional
- app com um unico acesso pode entrar direto; multiplos acessos usam portal

### ScheduleItem

Item de programacao exibido para o colaborador.

Campos esperados no MVP:

- `scheduleItemId`
- `employeeId`
- `type`
- `title`
- `startsAt`
- `endsAt`
- `location`
- `status`
- `sourceLabel`
- `action`

Regras:

- listar por intervalo e pagina quando houver backend real
- detalhes completos entram sob demanda
- ordenacao e permissao pertencem ao backend quando houver volume

### RequirementExpiration

Vencimento ou pendencia operacional do colaborador.

Campos esperados no MVP:

- `requirementId`
- `employeeId`
- `type`
- `title`
- `expiresAt`
- `status`
- `severity`
- `issuerLabel`
- `action`

Regras:

- ordenar por prazo e criticidade
- considerar todas as necessidades retornadas para o colaborador, sem janela artificial de 120 dias
- classificar indicadores como vencido, proximo do vencimento para ate 120 dias, em dia para maior que 120 dias e sem data
- filtros por tipo/status devem ir para o backend quando houver volume
- dado de saude/documento deve ser minimizado e mascarado

### InboxItem

Sinal resumido e acionavel na home do colaborador.

Campos esperados no MVP:

- `inboxItemId`
- `employeeId`
- `kind`
- `title`
- `summary`
- `priority`
- `dueAt`
- `route`
- `relatedId`
- `readState`

Regras:

- Inbox nao e dashboard
- mostrar resumo e acao, nao detalhe completo
- cada item deve apontar para modulo proprio quando houver aprofundamento

### Communication

Comunicado operacional exibido ao colaborador.

Campos esperados no MVP:

- `communicationId`
- `audience`
- `title`
- `summary`
- `publishedAt`
- `expiresAt`
- `priority`
- `route`

Regras:

- comunicados por setor/equipe devem respeitar permissao no backend
- conteudo sensivel nao deve ser usado em push/log/cache sem revisao LGPD
- leitura completa pode ficar fora do Inbox

### IntegrationSyncRun

Registro de execucao de importacao, webhook ou sincronizacao externa.

Campos esperados quando houver fonte ativa:

- `syncRunId`
- `sourceKey`
- `status`
- `startedAt`
- `finishedAt`
- `receivedCount`
- `acceptedCount`
- `rejectedCount`
- `correlationId`
- `errorSummary`

Regras:

- guardar metadados e contagens antes de payload bruto
- erros devem ser resumidos e sanitizados
- permitir retentativa idempotente sem reprocessar sucesso

## Seam design

Interface externa recomendada para o app:

```text
apps/jornada -> API DTO do Jornada -> service de dominio -> repository/projection interna
```

Interface para fonte externa ativa:

```text
Fonte Externa -> adapter/importador -> validador -> normalizador -> contrato interno/projection -> tela
```

O seam principal fica no contrato interno. O adapter externo varia sem obrigar frontend, telas ou regras de negocio a conhecer o payload original.

## Validation bar

Antes de marcar uma fonte como `active`, exigir:

- contrato real ou fixture sanitizada
- teste do adapter/normalizador
- teste de idempotencia
- auditoria de `IntegrationSyncRun`
- tratamento de erro/retry
- revisao LGPD de dados recebidos, armazenados e expostos

Validacao atual:

- `npm run test:jornada -- src/features/contracts/internal-contract-fixtures.test.ts`
- `npm run test:jornada -- src/features/contracts/internal-contract-fixtures.test.ts src/views/dashboard-page.test.tsx`
