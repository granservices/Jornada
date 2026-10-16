# Testing Strategy

## Goal

Ter uma base com boa cobertura e rastreabilidade desde o inicio, sem criar uma suite pesada e lenta sem necessidade.

## Recommended stack

### Backend

- `Jest`
- `@nestjs/testing`
- `Supertest`

### Frontend

- `Vitest`
- `Testing Library`
- `jsdom`
- `Playwright` para E2E quando o app web existir

## Test layers

### Unit

Cobrir:

- services
- mappers
- regras de validacao
- funcoes puras

Prioridade alta.

### Integration

Cobrir:

- controllers + services
- repositories
- integracao com banco
- contratos de payload

Prioridade alta.

### E2E

Cobrir:

- health
- auth
- webhooks
- principais fluxos do colaborador

Prioridade media no backend inicial, alta quando o frontend existir.

### Frontend component/regression

Cobrir:

- formularios com estado local
- filtros e buscas que alteram lista em tela
- componentes compartilhados de acao, input e selecao
- fluxos administrativos com muitos campos repetidos
- qualquer bug reportado pelo usuario antes de considerar corrigido

Prioridade alta para telas que criam, editam, comentam, avaliam ou transferem atendimentos.

Para telas administrativas que carregam dados da API, cada fluxo critico deve cobrir:

- carregamento feliz com dados reais de contrato
- falha de API exibida na tela com acao de recuperacao
- resposta `401` limpando sessao e mostrando fluxo de nova autenticacao
- lista vazia real diferente de lista vazia por filtro/busca
- teste positivo equivalente no backend para a permissao esperada, nao apenas teste de bloqueio

Regra de seguranca:

- handlers de eventos devem capturar `event.currentTarget.value` antes de entrar em updater funcional de estado
- o guard `npm run test:jornada:guards` deve continuar bloqueando regressao desse padrao
- testes de componentes devem simular digitacao real com `@testing-library/user-event`
- campos repetidos precisam ser testados com escopo ou seletores semanticos claros, evitando falsos positivos

## Coverage expectation

Meta inicial:

- services centrais: alta cobertura
- contratos internos: cobertura por DTO/modelo de leitura consumido pelo app
- integracoes externas ativas: cobertura por contrato e cenarios de erro
- controllers: cobertura objetiva, sem excesso

## Regression harness

Manter fixtures para:

- contratos internos do Jornada consumidos pelo app
- `EmployeeProfile`, `ScheduleItem`, `RequirementExpiration`, `InboxItem`, `Communication`, `UserAccessContext` e `IntegrationSyncRun`
- payloads externos apenas quando a fonte estiver ativa ou preparada
- expiracao de treinamentos
- agenda de embarque
- comunicados

Harness inicial implementado:

- `apps/neo/src/features/contracts/internal-contract-fixtures.test.ts` valida fixtures sanitizadas dos contratos internos no seam do frontend
- `apps/neo/src/views/dashboard-page.test.tsx` valida que `Inbox`, `Programacao` e `Perfil` consomem os contratos internos iniciais em vez de mocks soltos por tela
- `apps/neo/src/views/expirations-page.test.tsx` valida a tela dedicada de `Vencimentos` do trabalhador, incluindo consumo de `/expiring-requirements/me`, preview administrativo por referencia opaca e indicadores por icone
- o teste garante rotas internas do Jornada, documento mascarado e `IntegrationSyncRun` sem payload bruto
- comando focado: `npm run test:jornada -- src/features/contracts/internal-contract-fixtures.test.ts`
- comando focado de tela + contrato: `npm run test:jornada -- src/features/contracts/internal-contract-fixtures.test.ts src/views/dashboard-page.test.tsx src/views/expirations-page.test.tsx`

## Observability in tests

Todo bug importante deve poder ser:

1. reproduzido por teste
2. observado por log
3. rastreado por correlacao

## Current frontend baseline on August 23, 2026

Ja validado na base atual:

- `Vitest` configurado no app web com ambiente `jsdom`
- `Testing Library` e `user-event` para interacoes reais de formulario
- testes de regressao para cadastro administrativo de setores, assuntos, equipes, regras e formularios
- testes de outbox transacional, relay, retry terminal e consumidor idempotente para a conclusao de QuickForms no Tickets
- a suite Vitest do Neo roda em um fork unico no CI/local para evitar interferencia entre testes de UI que compartilham mocks de navegador e storage
- testes de regressao para erro de carregamento, token invalido e empty state do catalogo administrativo de atendimento
- guard automatizado contra uso inseguro de `event.currentTarget` dentro de updater funcional de estado
- scripts raiz `npm run test:jornada` e `npm run test:jornada:guards`

## Current baseline on August 20, 2026

Ja validado na base atual:

- `lint` do backend
- testes unitarios do `auth`
- testes unitarios do intake e processor historico do Drake
- teste `e2e` de `health`
- `build` do `NestJS`

O proximo passo natural e adicionar cenarios `e2e` para:

- `login`
- `refresh`
- `forgot-password`
- `reset-password`
