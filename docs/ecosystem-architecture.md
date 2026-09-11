# Jornada Ecosystem Architecture

## Objective

Definir a arquitetura alvo do ecossistema Jornada com baixo acoplamento, evolucao progressiva e separacao clara entre experiencia do colaborador, operacao interna e identidade compartilhada.

Este documento consolida a direcao recomendada em 29 de agosto de 2026 com base em referencias da industria e no estado atual do repositorio.

## Industry anchors

### Monolith first, with modularity

A direcao inicial recomendada continua sendo `modular monolith`, com extração progressiva apenas quando os limites estiverem maduros.

Base:

- Martin Fowler recomenda `monolith first` para descobrir limites corretos antes de distribuir o sistema em microservices
- AWS Prescriptive Guidance recomenda decompor por capacidade de negocio e tratar persistencia como fronteira do servico, nao so como detalhe tecnico

### Shared database first is acceptable, but only with ownership

Usar o mesmo banco no inicio e aceitavel quando:

- queremos evitar refatoracao estrutural pesada cedo demais
- a equipe ainda esta descobrindo o dominio
- ainda nao ha necessidade real de deploy independente por contexto

Base:

- AWS aceita `shared-database-per-service` como passo intermediario
- AWS alerta que esse modelo cria acoplamento se varios modulos escreverem nas mesmas tabelas sem fronteira
- AWS recomenda schemas ou tabelas privadas por servico quando o banco ainda e compartilhado

### Helpdesk should separate requester and agent experiences

Para atendimento, o padrao observado nos produtos maduros e:

- portal simples para quem solicita
- workspace operacional proprio para quem atende
- request types/forms, queues, SLAs, ownership e contexto lateral no workspace do agente

Base:

- Jira Service Management separa portal de requests, request types, queues e work item views
- Zendesk Agent Workspace concentra contexto, painel lateral, knowledge e side conversations no ambiente do agente

## Recommended topology now

### Applications

#### 1. `Jornada`

Aplicacao do colaborador.

Responsabilidades:

- inbox
- programacao
- vencimentos
- perfil
- abertura e acompanhamento simples de atendimento

Principios:

- mobile-first
- baixo custo cognitivo
- carregamento leve
- foco em consulta e acao rapida

#### 2. `HelpHub`

Aplicacao operacional.

Responsabilidades:

- filas
- lista operacional
- detalhe de atendimento
- ownership
- SLA
- Kanban
- catalogo
- equipes
- formularios
- roteamento
- auditoria operacional

Principios:

- desktop-first sem abandonar mobile
- alta densidade de informacao
- fluxos de triagem e execucao
- nenhuma contaminacao da home do colaborador

#### 3. `QuickForms`

Aplicacao de formularios reutilizaveis.

Responsabilidades:

- criacao, versao e publicacao de formularios
- solicitacoes de preenchimento, prazo e lembretes
- respostas, anexos e auditoria de acesso
- eventos minimos de conclusao para o dominio consumidor

Contrato inicial ativo: `POST /api/forms/requests` cria uma solicitacao autenticada por operador autorizado e `POST /api/forms/requests/:formRequestId/responses` recebe a resposta autenticada do destinatario. O contrato de conclusao entrega referencia e contexto; nunca os valores preenchidos.

Nao deve assumir fila, Kanban ou SLA operacional do HelpHub.

#### 4. Portal `Hub`

Rota `/aplicativos` dentro do Jornada. Nao e um quarto app, nao possui marca propria e nao abriga regras de negocio.

Responsabilidades:

- autenticacao
- sessao
- catalogo de aplicacoes disponiveis
- selecao da aplicacao de entrada

Principios:

- identidade unica
- acesso contextual
- sem assumir as regras de negocio dos apps

## Recommended repo shape

Estado alvo de medio prazo:

```text
apps/
  api/              backend modular compartilhado
  jornada/          PWA do colaborador
  help-hub/         Atendimento operacional
  quick-forms/      Formularios reutilizaveis
  hub/              Catalogo de modulos e redirecionamento
docs/
packages/
  ui/               tokens e componentes realmente compartilhados
  auth-client/      contratos e helpers de sessao quando o reaproveitamento justificar
infra/
scripts/
```

Regra:

- nao criar `packages` por antecipacao
- extrair apenas compartilhamento real

## Backend bounded contexts

O backend continua unico por enquanto, mas dividido por contexto.

### `auth`

Responsavel por:

- `User`
- `AuthSession`
- `PasswordResetToken`
- `AuthAuditLog`
- `Application`
- `UserApplicationAccess`

Nao deve decidir:

- fila de atendimento
- visao do colaborador
- regra operacional de formularios

### `worker`

Responsavel por:

- `Person`
- `Employee`
- inbox
- programacao
- vencimentos
- comunicados
- perfil do colaborador

### `support`

Responsavel por:

- `SupportCase`
- `SupportCaseEvent`
- `SupportTeam`
- `SupportTeamMember`
- `SupportDepartment`
- `SupportTopic`
- `SupportRoutingRule`
- `SupportRating`

### `forms`

Responsavel por:

- `FormDefinition`
- `FormField`
- versionamento
- rascunho/publicacao
- bindings com outros dominios por vinculo

Regra obrigatoria:

- `forms` nao pertence ao `support`
- `support` apenas consome `forms` por vinculo

### `integrations`

Responsavel por:

- webhooks Drake
- CSV/XLSX de origem externa
- normalizacao e fila de processamento

## Data ownership while the database is shared

Enquanto o PostgreSQL continuar compartilhado:

- cada bounded context e dono das suas tabelas
- nenhuma feature pode acessar diretamente tabelas internas de outro contexto para decidir regra de negocio
- leitura cruzada deve acontecer por service, port ou projection especifica
- joins transversais grandes devem ser evitados

Regra pratica:

- `support` pode referenciar `userId`, `personId`, `employeeId`
- `support` nao deve virar cliente direto do schema inteiro de `worker`
- `forms` publica contratos pequenos para consulta e vinculo

## Authorization direction

### Layer 1 - Identity

Usuario autenticado.

### Layer 2 - Application access

Quais apps o usuario pode abrir:

- `JORNADA`
- `ATENDIMENTO`
- futuros apps

Persistencia atual:

- `UserApplicationAccess`

### Layer 3 - In-app authorization

O que ele pode fazer dentro do app.

Exemplos:

- no `Jornada`, a pessoa entra como colaborador
- no `Atendimento`, a mesma pessoa pode atuar como agente, gestor ou admin

Persistencia alvo iniciada:

- `UserApplicationRole`
- papeis contextuais por app, como `USER`, `AGENT`, `MANAGER`, `ADMIN`

Direcao recomendada:

- manter `RBAC` pragmatico no curto prazo
- evoluir para `RBAC + ABAC` por contexto
- nao usar roles globais como resposta final para todas as permissoes do ecossistema

## Separation strategy

### Step 1 - Separate frontend experiences

Primeira separacao recomendada.

Implementacao:

- `apps/jornada` fica como app do colaborador
- `apps/help-hub` concentra a experiencia operacional
- `apps/quick-forms` concentra formularios reutilizaveis
- `/aplicativos` no Jornada lista apenas modulos autorizados
- todos usam `apps/api` inicialmente

Status em 31 de agosto de 2026:

- `apps/help-hub` e o frontend operacional inicial
- `apps/jornada` e o frontend do colaborador
- `apps/jornada` nao deve carregar diretamente telas de atendimento, formularios ou configuracao operacional
- `apps/api` permanece compartilhado como monolito modular por contexto
- decisao registrada em `docs/adr/0004-separate-atendimento-frontend-first.md`

Regra de ownership operacional no atendimento:

- backlog nao atribuido pode ser visto e assumido pela equipe autorizada
- depois de atribuido, o atendimento passa a ser visivel e operavel apenas para o responsavel atual
- excecoes ficam para perfis amplos, como administracao operacional
- transferencia ou devolucao devolvem o item ao fluxo compartilhado

### Step 2 - Stabilize contracts

Antes de separar backend:

- fechar ownership dos dominios
- reduzir acesso cruzado
- padronizar DTOs
- amadurecer auditoria
- consolidar projections/eventos internos onde houver leitura cruzada
- persistir eventos de dominio em outbox na mesma transacao da mudanca
- tratar entrega como ao menos uma vez e consumidores como idempotentes
- centralizar administracao de grants e papeis por aplicacao no modulo `auth`

### Step 3 - Extract backend only when justified

Extrair `support` ou `forms` para servico proprio apenas se houver:

- deploy independente necessario
- escala muito diferente
- time dono claramente separado
- compliance/seguranca diferente
- maturidade suficiente do modelo de dados

### Step 4 - Extract database later

Banco fisicamente separado apenas quando:

- servico ja tiver ownership real
- schema compartilhado ja estiver atrapalhando
- for aceitavel lidar com consistencia eventual, composicao por API e sagas

## API contract direction

### Public and stable

Manter estaveis:

- endpoints Drake publicados
- auth principal
- endpoints operacionais ja usados pelo frontend

### New platform contracts

Introduzir como base do ecossistema:

- `GET /auth/applications`
- resposta de login com aplicacoes acessiveis

Depois:

- escolha de aplicacao
- contexto selecionado
- eventual token contextual por aplicacao, se a complexidade justificar

## Testing direction

Toda fundacao arquitetural nova deve vir com:

- teste unitario do service principal
- teste de regra de autorizacao ou acesso
- teste de contrato minimo quando a feature muda payload de auth ou endpoint publico

Quando novos apps nascerem:

- smoke test por app
- teste de rota protegida
- teste de sessao compartilhada

## Immediate implementation priorities

1. consolidar `auth` como portal de acesso ao ecossistema
2. manter `apps/jornada` focado no colaborador
3. evoluir `apps/help-hub` e `apps/quick-forms` como apps proprios
4. preservar `apps/api` como monolito modular por contexto
5. endurecer ownership de dados por dominio
6. manter Swagger/OpenAPI atualizado nos contratos HTTP relevantes

## Current frontend state

- `apps/jornada` e o PWA do colaborador.
- `apps/help-hub` e o workspace operacional.
- `apps/quick-forms` e o PWA proprio de formularios.
- a selecao de aplicacoes permanece em `/aplicativos` no Jornada; criar um frontend de Hub separado exige decisao futura explicita.

Nao criar shells vazios: cada novo app deve nascer com rota autenticada, smoke test e entrada no catalogo de aplicacoes.

## What to avoid

- microservices por ansiedade
- banco separado por moda
- duas aplicacoes escrevendo livremente nas mesmas tabelas
- auth central tomando decisoes do dominio de atendimento
- modulo `support` absorvendo `forms`
- app do colaborador carregando UX operacional de backoffice
