# Testing Strategy

## Goal

Ter uma base com boa cobertura e rastreabilidade desde o inicio, sem criar uma suite pesada e lenta sem necessidade.

## Recommended stack

### Backend

- `Jest`
- `@nestjs/testing`
- `Supertest`

### Frontend

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

## Coverage expectation

Meta inicial:

- services centrais: alta cobertura
- integracoes externas: cobertura por contrato e cenarios de erro
- controllers: cobertura objetiva, sem excesso

## Regression harness

Manter fixtures para:

- payloads do Drake
- expiracao de treinamentos
- agenda de embarque
- comunicados

## Observability in tests

Todo bug importante deve poder ser:

1. reproduzido por teste
2. observado por log
3. rastreado por correlacao

## Current baseline on August 20, 2026

Ja validado na base atual:

- `lint` do backend
- testes unitarios do `auth`
- teste `e2e` de `health`
- `build` do `NestJS`

O proximo passo natural e adicionar cenarios `e2e` para:

- `login`
- `refresh`
- `forgot-password`
- `reset-password`
