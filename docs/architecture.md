# Jornada Architecture

## Objective

Construir uma base robusta para um produto web mobile-first da Gran Services, com backend e frontend separados, forte foco em PWA, integracoes externas, rastreabilidade e evolucao segura para um MVP premium.

## Architectural stance

Nao usar Clean Architecture como regra rigida.

Usar:

- modular monolith
- feature-based
- SOLID quando fizer sentido
- DTOs, services, repositories e interfaces onde agregam clareza
- separacao forte entre backend e frontend

Evitar:

- camadas genericas globais para tudo
- burocracia desnecessaria
- acoplamento do dominio ao framework ou ao ORM

## High-level topology

### Backend

- `NestJS`
- `PostgreSQL`
- `Redis` preparado, mas opcional no bootstrap inicial
- API HTTP como nucleo principal
- WebSocket para fase de chat e tempo real
- workers assíncronos quando houver fila real

### Frontend

- app web unico
- PWA
- mobile-first
- responsivo para tablet e desktop
- `React Aria Components` como base de acessibilidade e comportamento
- `Tailwind CSS` para composicao visual e tokens
- biblioteca interna de componentes do produto, sem depender de um kit visual fechado

## Separation of concerns

### Backend

Responsavel por:

- autenticacao e autorizacao
- integracoes Drake e outros sistemas
- agenda de embarque
- vencimentos de ASO e treinamentos
- comunicados
- chat e tempo real
- auditoria, rastreabilidade, logs e observabilidade

### Frontend

Responsavel por:

- autenticacao, sessao e recuperacao de conta no lado cliente
- experiencia do colaborador
- leitura e interacao com agenda, comunicados e vencimentos
- atualizacao em tempo real
- experiencia mobile e offline parcial

## Monorepo direction

Estrutura alvo:

- `apps/api`
- `apps/web`
- `docs`
- `infra`
- `scripts`

Adicionar `libs` ou `packages` apenas quando houver compartilhamento real.

## Feature-based backend structure

Cada feature deve agrupar o que lhe pertence.

Exemplo:

```text
apps/api/src/modules/boarding-schedule/
  dto/
  interfaces/
  entities/
  repositories/
  services/
  controllers/
  events/
  tests/
```

Convencao:

- `controllers`: entrada HTTP ou websocket
- `dto`: contratos de entrada e saida
- `services`: regras de negocio e orquestracao
- `repositories`: acesso a persistencia
- `interfaces`: contratos internos quando ajudam a desacoplar
- `entities`: modelos do dominio da feature
- `events`: eventos internos e handlers locais da feature

## Cross-cutting modules

Poucos e bem definidos:

- `config`
- `database`
- `auth`
- `audit`
- `logging`
- `shared`

`shared` deve conter apenas utilidades realmente reutilizaveis, nunca virar deposito generico.

## Data architecture

### Primary database

- `PostgreSQL`

Uso:

- usuarios
- agenda
- vencimentos
- comunicados
- relacoes entre setores e equipes
- trilhas de auditoria
- historico operacional

### Redis

Entrar quando houver necessidade real:

- fila
- cache
- rate limiting distribuido
- pub/sub
- presenca e estado efemero do chat

Redis e previsto na arquitetura, mas nao precisa ser obrigatorio no primeiro bootstrap funcional.

## ORM direction

Padrao preferido:

- `Prisma`

Razoes:

- schema claro
- boa ergonomia com PostgreSQL
- tipagem forte
- migrations organizadas
- velocidade de onboarding

Disciplina necessaria:

- nao espalhar Prisma em controllers
- manter acesso por repositories/services da feature
- permitir SQL manual em casos de query critica

## Integration architecture

Padrao alvo para integracoes externas:

1. intake
2. validation
3. normalization
4. persistence
5. processing
6. projection

Isso vale para Drake e futuras integracoes.

## Realtime direction

Padrao inicial:

- `Socket.IO` com `NestJS`

Uso futuro:

- chat com setores
- notificacoes operacionais
- presenca
- atualizacao de agenda

## Mobile-first product implications

Mesmo sendo web:

- telas desenhadas primeiro para celular
- carregamento leve
- PWA
- offline parcial
- foco em consulta rapida e acao objetiva

## Frontend foundation decision

Escolha atual recomendada:

- `React Aria Components` para primitives acessiveis e estados de interacao
- `Tailwind CSS` para layout, temas e refinamento visual
- `lucide-react` para iconografia

Racional:

- forte acessibilidade desde a base
- liberdade visual maior que kits prontos
- boa aderencia a formularios, overlays, listas, dialogs e navegacao mobile
- combina bem com uma biblioteca interna de componentes sem acoplamento excessivo

Disciplina:

- nao misturar varias libs de primitives sem necessidade
- evitar usar `React Aria` e `Radix` como duas fundacoes paralelas
- encapsular os componentes em `apps/web/src/components/ui`

## Non-functional priorities

- rastreabilidade desde o inicio
- logs estruturados
- health checks
- coverage de testes consistente
- facilidade de manutencao
- deploy previsivel em Docker
