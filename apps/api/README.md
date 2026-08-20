# Jornada API

Backend `NestJS` do `Jornada`, com webhook intake, bootstrap tecnico e inicio do modulo `auth`.

## Stack

- `NestJS 11.2.1`
- `Node.js 24 LTS`
- `Docker Compose`
- `Prisma`
- `PostgreSQL`

## Endpoints iniciais

- `GET /api/health`
- `GET /api/docs`
- `POST /api/integrations/drake/employees`
- `POST /api/integrations/drake/expiring-requirements`
- `POST /api/integrations/drake/boarding-schedule`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Todos os webhooks exigem:

```http
Authorization: Bearer <DRAKE_WEBHOOK_BEARER_TOKEN>
Content-Type: application/json
```

## Ambiente

Use `.env` baseado em `.env.example`.

```env
NODE_ENV=development
PORT=3004
DATABASE_URL=postgresql://jornada:jornada@localhost:5432/jornada?schema=public
DRAKE_WEBHOOK_BEARER_TOKEN=replace-with-a-strong-random-token
JWT_ACCESS_SECRET=replace-with-a-strong-random-token
JWT_REFRESH_SECRET=replace-with-a-different-strong-random-token
WEBHOOK_STORAGE_DIR=./data/webhooks
```

## Execucao local

```bash
npm install
npm run prisma:generate
npm run start:dev
```

## Container

```bash
docker compose up --build -d
```

## Persistencia inicial

Cada webhook recebido e salvo em `data/webhooks`, para auditoria e validacao dos testes do Drake antes da camada completa de processamento.

O Swagger local fica em `http://localhost:3004/api/docs`.
