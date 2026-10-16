# Jornada API

Backend `NestJS` do `Jornada`, com webhook intake, bootstrap tecnico e inicio do modulo `auth`.

## Stack

- `NestJS 11.2.1`
- `Node.js 24 LTS`
- `Docker Compose`
- `Prisma`
- `PostgreSQL`
- `nestjs-pino`

## Endpoints iniciais

- `GET /api/health`
- `GET /api/docs`
- `POST /api/integrations/drake/employees`
- `POST /api/integrations/drake/expiring-requirements`
- `POST /api/integrations/drake/boarding-schedule`
- `POST /api/integrations/sispat/employees-csv`
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

O intake do SISPAT aceita:

- `multipart/form-data` com arquivo `csv`, `xlsx` ou `xls` no campo `file`
- corpo bruto com o conteudo do arquivo (`text/csv`, `application/csv`, `text/plain`, `application/octet-stream` e equivalentes para Excel)

Ao receber uma planilha Excel, a API tenta usar a aba `Planilha1` primeiro. Se ela nao existir, usa a primeira aba encontrada.

Para testes controlados, voce pode desabilitar a validacao do bearer token com:

```env
DRAKE_WEBHOOK_AUTH_DISABLED=true
```

## Ambiente

Use `.env` baseado em `.env.example`.

```env
NODE_ENV=development
PORT=3004
DATABASE_URL=postgresql://jornada:jornada@localhost:55432/jornada?schema=public
REDIS_URL=redis://localhost:56379
DRAKE_WEBHOOK_BEARER_TOKEN=replace-with-a-strong-random-token
DRAKE_WEBHOOK_AUTH_DISABLED=false
JWT_ACCESS_SECRET=replace-with-a-strong-random-token
JWT_REFRESH_SECRET=replace-with-a-different-strong-random-token
LOG_LEVEL=info
WEBHOOK_STORAGE_DIR=./data/webhooks
SISPAT_IMPORT_STORAGE_DIR=./data/sispat-imports
DRAKE_WEBHOOK_QUEUE_ENABLED=true
DRAKE_WEBHOOK_QUEUE_ATTEMPTS=5
DRAKE_WEBHOOK_QUEUE_BACKOFF_MS=5000
ADMIN_BOOTSTRAP_ENABLED=false
ADMIN_BOOTSTRAP_EMAIL=admin@granservices.com.br
ADMIN_BOOTSTRAP_PASSWORD=replace-with-a-strong-admin-password
ADMIN_BOOTSTRAP_FULL_NAME=Administrador Jornada
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

Os arquivos recebidos do SISPAT sao salvos em `data/sispat-imports`, preservando o formato original (`.csv` ou `.xlsx`) e gerando um `.json` de metadados com preview, colunas e hash.

O Swagger local fica em `http://localhost:3004/api/docs`.

## Observabilidade atual

- logs estruturados com `requestId`
- header de resposta `X-Request-Id`
- auditoria basica dos eventos de `auth`
- redaction de campos sensiveis em logs HTTP

## Intake do Drake no estado atual

- DTOs minimos por endpoint para contrato inicial
- `idempotencyKey` por evento recebido
- `correlationId` para rastrear repeticoes e fluxo operacional
- inbox persistida para eventos recebidos
- payload bruto ainda salvo em arquivo para auditoria inicial
- fila BullMQ com Redis para processamento assincrono
- retries exponenciais e marcacao de falha final no inbox
- bootstrap opcional de conta admin por `env`
