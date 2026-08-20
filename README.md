# Jornada

Monorepo do `Jornada`, a plataforma operacional mobile-first da Gran Services.

## Estrutura

```text
apps/
  api/   -> backend NestJS
  web/   -> frontend PWA futuro
docs/    -> roteiro, arquitetura e checklist
legacy/  -> snapshot isolado da base antiga
```

## App ativo agora

O backend em `apps/api` e a base ativa do projeto.

Ele concentra:

- webhooks do Drake
- bootstrap tecnico do backend
- inicio do modulo `auth`
- futura integracao com PostgreSQL, Redis e processamento interno

## Comandos principais

```bash
npm run infra:up
npm run dev:api
npm run build:api
npm run test:api
npm run test:api:cov
```

`npm run infra:up` procura a primeira porta livre a partir de `5434`, atualiza o `DATABASE_URL` local da API e sobe apenas `postgres` e `redis`.

Com a infra local no ar, a API usa o Redis em `REDIS_URL` para processar os webhooks do Drake de forma assincrona via BullMQ.

## Docker Compose

O `docker-compose.yml` da raiz prepara o ambiente local com:

- `api`
- `postgres`
- `redis`

O frontend sera ligado depois, sem misturar o deploy do backend com experimentos locais.
