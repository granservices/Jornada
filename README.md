# Neo

Monorepo do `Neo`, a plataforma operacional mobile-first da GranServices.

## Estrutura

```text
apps/
  api/       -> backend NestJS modular
  jornada/   -> frontend e PWA unificados do Neo
packages/
  frontend-core/ -> infraestrutura compartilhada em retirada gradual
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
npm run dev
npm run infra:up
npm run dev:api
npm run build:api
npm run test:api
npm run test:api:cov
npm run dev:jornada
npm run build:jornada
npm run test:jornada
npm run test:frontend-core
```

`npm run dev` e o comando local recomendado: sobe Postgres e Redis, aguarda a
API responder em `/api/health` e inicia o Neo em `http://localhost:3006`.
Use `Ctrl+C` para encerrar os processos de desenvolvimento iniciados por ele.
Se API ou Neo ja estiverem em execucao nas portas `3004`/`3006` por este repo,
o comando reinicia esses processos antes de subir de novo, evitando navegador
ou API presos em codigo antigo. Se alguma porta estiver ocupada por processo
externo ao repo, ele interrompe com uma mensagem clara para evitar matar outro
ambiente por engano.

`npm run infra:up` procura a primeira porta livre a partir de `5434`, atualiza o `DATABASE_URL` local da API e sobe apenas `postgres` e `redis`.

Com a infra local no ar, a API usa o Redis em `REDIS_URL` para processar os webhooks do Drake de forma assincrona via BullMQ.

## Docker Compose

O `docker-compose.yml` da raiz prepara o ambiente local com:

- `api`
- `postgres`
- `redis`

`apps/jornada` roda em `http://localhost:3006`. O Hub fica em `http://localhost:3006/aplicativos`; Focall e QuickForms usam, respectivamente, `/atendimentos` e `/formularios` no mesmo frontend autenticado.
