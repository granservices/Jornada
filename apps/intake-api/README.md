# Jornada Intake API

Mini app operacional para receber eventos externos que representam comunicacoes ou sinais operacionais antes de reaproveitamento pelo Jornada.

## Escopo

Este app tem apenas um endpoint de entrada:

```http
POST /api/intake/events
```

Tipos aceitos para analise:

- `qualification_pending`: pendencia de treinamento e/ou ASO que poderia ser comunicada ao colaborador.
- `logistics_schedule`: evento de programacao logistica.

Eventos fora desses tipos sao armazenados como `unknown` para quarentena analitica.

## Persistencia

- Payload bruto: `INTAKE_STORAGE_DIR`, em arquivos JSON por dia.
- Indice analitico: `INTAKE_SQLITE_PATH`, em SQLite.

O SQLite guarda metadados, classificacao, campos extraidos, duplicidade e janela de comunicacao. O payload bruto fica em arquivo para auditoria.

## Endpoints

```http
GET /api/health
POST /api/intake/events
GET /api/intake/events
GET /api/intake/summary
GET /api/intake/qualification-preview?days=15
```

Todas as rotas de `intake` exigem:

```http
Authorization: Bearer <INTAKE_BEARER_TOKEN>
```

Durante diagnostico controlado de origem externa, `INTAKE_AUTH_DISABLED=true`
pode ser usado temporariamente para aceitar chamadas sem Bearer token. Volte
para `false` assim que a origem estiver confirmada.

Para diagnostico de configuracoes antigas, o app tambem aceita:

```http
POST /api/integrations/drake/employees
POST /api/integrations/drake/expiring-requirements
POST /api/integrations/drake/boarding-schedule
```

Essas rotas gravam no mesmo intake analitico e devem ser removidas ou fechadas
quando a origem estiver apontada para `/api/intake/events`.

## Ambiente

Use `.env` baseado em `.env.example`:

```env
NODE_ENV=production
PORT=3014
INTAKE_BEARER_TOKEN=replace-with-a-strong-random-token-at-least-32-chars
INTAKE_AUTH_DISABLED=false
INTAKE_STORAGE_DIR=./data/raw-events
INTAKE_SQLITE_PATH=./data/intake.sqlite
```

## Execucao local

```bash
npm install
npm run start:dev
```

## Docker

O Dockerfile usa `node:22-alpine` para reaproveitar a imagem LTS ja presente
no ambiente e evitar downloads desnecessarios. O recurso `node:sqlite` ainda
emite aviso experimental nessa versao, mas atende a fase analitica inicial.

```bash
docker compose up --build -d
```

## Docker em producao no servidor atual

No servidor onde `jornada-api-jornada-api:latest` ja existe, use o compose de
runtime para evitar baixar uma nova imagem base:

```bash
npm run build
docker compose -f docker-compose.runtime.yml up --build -d
```

Esse modo copia apenas `dist` e `package.json` para uma imagem nova baseada no
runtime ja existente.

Em producao, a porta `3014` deve ficar presa no loopback do servidor:

```yaml
ports:
  - "127.0.0.1:3014:3014"
```

A publicacao externa deve acontecer por HTTPS em `https://jornada.granhub.com.br/api/intake`,
via OpenLiteSpeed, seguindo o mesmo padrao do Jornada API. Nao publique
`http://<ip-do-servidor>:3014` como endpoint externo.

## Exemplo

```bash
curl -X POST https://jornada.granhub.com.br/api/intake/events \
  -H "Authorization: Bearer $INTAKE_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":"blip-preview","eventType":"qualification_pending","messageParams":{"pendencias":"treinamento","dataVencAso":"2030-01-01","listaTreinamentos":"Treinamento de Compliance"}}'
```
