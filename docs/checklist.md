# Jornada Checklist

## Foundation

- [x] Inicializar Git do repositorio
- [x] Validar direcao `NestJS 11.2.1`
- [x] Definir arquitetura feature-based sem clean architecture rigida
- [x] Definir backend separado do futuro frontend/PWA
- [x] Criar documentacao inicial de roadmap, skill e checklist
- [x] Criar documentacao de arquitetura, modulos e testes
- [x] Escolher base de UI com `React Aria Components` + `Tailwind CSS`
- [x] Limpar a base antiga em Next.js local
- [x] Mover a API definitiva para a estrutura final do monorepo
- [x] Definir nomes finais de `apps/api` e futuro `apps/web`

## Platform baseline

- [x] Instalar stack base de validacao, swagger e throttling
- [x] Adicionar logging estruturado inicial
- [x] Definir estrutura de modulos no backend
- [x] Definir estrategia de configuracao por ambiente
- [ ] Definir observabilidade inicial
- [ ] Consolidar estrategia de erros e auditoria
- [x] Definir estrategia de testes e cobertura
- [x] Preparar `docker compose` final com Postgres e Redis

## Database and infra

- [x] Configurar PostgreSQL
- [x] Configurar Prisma
- [x] Definir primeira modelagem de schema
- [x] Preparar migracoes
- [x] Decidir entrada inicial de Redis ou deixá-lo apenas preparado

## External integrations

- [x] Definir payload esperado de `employees`
- [x] Definir payload esperado de `expiring-requirements`
- [x] Definir payload esperado de `boarding-schedule`
- [x] Implementar validacao de schema
- [x] Implementar idempotencia
- [x] Implementar logs estruturados
- [x] Implementar correlacao por request/evento
- [x] Definir strategy de fila/processamento futuro

## Domain modeling

- [ ] Definir entidades principais
- [ ] Definir usuarios, perfis e setores
- [ ] Definir agenda de embarque
- [ ] Definir vencimentos de ASO
- [ ] Definir vencimentos de treinamentos
- [ ] Definir comunicados
- [ ] Definir espacos/setores de suporte

## Product app

- [x] Escolher stack do frontend web/PWA
- [x] Definir escopo funcional do modulo `auth`
- [x] Definir fluxos de login, criar conta e recuperar senha
- [x] Definir sessao, refresh token e revogacao
- [x] Implementar baseline do modulo `auth` no backend
- [x] Adicionar auditoria basica do `auth`
- [x] Endurecer fluxo de recuperacao de senha
- [ ] Definir verificacao de email e onboarding inicial
- [ ] Consolidar endurecimento avancado da autenticacao
- [x] Definir UX mobile-first
- [ ] Definir estrategia PWA
- [ ] Definir estrategia offline parcial
- [ ] Definir navegacao principal inspirada no MyDrake

## Real-time and support

- [ ] Desenhar chat por setor
- [ ] Definir grupos e espacos de equipe
- [ ] Definir eventos em tempo real
- [ ] Definir anexos, historico e auditoria

## Operations

- [ ] Definir observabilidade
- [ ] Definir se entra Sentry desde a base 1 ou na fase seguinte
- [x] Definir retries e dead-letter
- [ ] Definir processo de deploy
- [ ] Definir homologacao e producao
