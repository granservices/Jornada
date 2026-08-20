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
npm run dev:api
npm run build:api
npm run test:api
npm run test:api:cov
```

## Docker Compose

O `docker-compose.yml` da raiz prepara o ambiente local com:

- `api`
- `postgres`
- `redis`

O frontend sera ligado depois, sem misturar o deploy do backend com experimentos locais.
