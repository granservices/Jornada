# Jornada Repo Guide

## Purpose

`Jornada` e o hub operacional mobile-first da Gran Services.

Fases do produto:

1. webhook receiver para o Drake e integracoes iniciais
2. processamento interno dos eventos recebidos
3. autenticacao robusta e area logada do colaborador
4. agenda de embarque, vencimentos, comunicados e chat

## Current source of truth

- API que deve subir primeiro: `apps/api`
- Subdominio planejado: `jornada.granhub.com.br`
- Porta interna atual: `3004`
- Stack base da API: `NestJS 11.2.1` com `Node.js 24 LTS`

## Delivery rule

Durante a fase atual, priorize a estabilidade dos endpoints externos do Drake.

- Nao misture a API de recepcao dos webhooks com o futuro frontend do app.
- O deploy inicial deve sair isolado de qualquer experimento local.
- Mudancas em `apps/api` devem preservar os tres endpoints publicados, salvo decisao explicita do usuario.

## Drake webhook contract

Endpoints atuais:

- `POST /api/integrations/drake/employees`
- `POST /api/integrations/drake/expiring-requirements`
- `POST /api/integrations/drake/boarding-schedule`
- `GET /api/health`

Todos os webhooks usam `Authorization: Bearer <token>`.

## Architecture direction

- Controllers finos
- Regras em services
- Organizacao por feature/module
- Configuracao por `env` validado
- Persistencia inicial simples para auditoria dos webhooks
- Evolucao posterior para fila, processamento assincrono, notificacoes e chat

## Documentation rule

Antes de expandir o dominio, mantenha estes arquivos atualizados:

- `docs/roadmap.md`
- `docs/checklist.md`
- `docs/agents-and-skills.md`
- `docs/frontend-architecture.md`

## Docs and library usage

- Para NestJS, Node, Docker e bibliotecas relacionadas, consulte a documentacao atual via Context7 antes de decisoes estruturais.
- Prefira versoes estaveis e LTS para tudo que entrar no deploy.
