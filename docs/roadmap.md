# Jornada Roadmap

## North star

Entregar um produto leve, responsivo e confiavel para o colaborador consultar agenda de embarque, vencimentos e comunicacoes, mesmo em contexto de conectividade ruim.

## Phase 0 - External entrypoint

Objetivo: receber webhooks do Drake com autenticacao e auditoria.

Entregas:

- API isolada em `apps/api`
- healthcheck
- webhooks `employees`, `expiring-requirements`, `boarding-schedule`
- persistencia inicial dos payloads recebidos
- container e `docker compose`
- publicacao em `jornada.granhub.com.br`

## Phase 1 - Ingestion and normalization

Objetivo: deixar os dados recebidos prontos para consumo interno.

Entregas:

- contratos de payload por endpoint
- validacao por schema
- normalizacao de datas, ids e status
- tabela ou storage de eventos recebidos
- idempotencia e correlacao por evento
- logs estruturados

Status em 20 de agosto de 2026:

- contratos DTO minimos ja definidos para `employees`, `expiring-requirements` e `boarding-schedule`
- correlacao por `requestId` e `correlationId` ja implementada
- inbox persistida para webhooks do Drake ja aplicada na camada Prisma
- fila BullMQ com Redis e retries exponenciais ja conectada ao intake

## Phase 1.5 - Platform hardening

Objetivo: consolidar a base tecnica antes da expansao funcional.

Entregas:

- arquitetura feature-based final
- Prisma com PostgreSQL
- observabilidade inicial
- testes unitarios e de integracao
- OpenAPI e DTOs
- stack pronta para frontend web/PWA

## Phase 2 - Auth foundation

Objetivo: construir a base de identidade antes da area logada do colaborador.

Entregas:

- cadastro de conta
- login
- recuperacao e redefinicao de senha
- sessao com refresh token
- perfis e setores
- auditoria de autenticacao
- base pronta para federacao futura com `Entra ID`

## Phase 3 - Processing core

Objetivo: processar o que chega do Drake sem acoplar a API externa ao dominio interno.

Entregas:

- comandos internos por tipo de evento
- fila ou outbox/inbox
- retries e dead-letter strategy
- regras de atualizacao de agenda, vencimentos e comunicados

Status em 20 de agosto de 2026:

- fila inicial criada com `BullMQ`
- `jobId` baseado em `idempotencyKey`
- transicoes do inbox para `QUEUED`, `PROCESSING`, `PROCESSED` e `FAILED`
- handlers ainda estao em modo baseline, prontos para receber a regra de negocio real

## Phase 4 - Employee domain

Objetivo: criar o dominio principal consumido pelo colaborador.

Entregas:

- colaborador
- agenda de embarque
- vencimentos de ASO e treinamentos
- comunicados por setor

## Phase 5 - Interaction and real-time

Objetivo: habilitar atendimento e comunicacao operacional.

Entregas:

- chat 1:1 com setores
- filas de atendimento
- grupos e espacos de equipe
- notificacoes em tempo real

## Phase 6 - Mobile experience

Objetivo: consolidar a experiencia do colaborador.

Entregas:

- PWA
- cache e estrategia offline parcial
- notificacoes push
- UX mobile-first

## Phase 7 - Operations and intelligence

Objetivo: dar escala operacional com controle.

Entregas:

- observabilidade
- painis de operacao
- automacoes assistivas
- agents internos com fronteiras claras
