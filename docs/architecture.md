# Jornada Architecture

## Objective

Construir uma base robusta para um produto web mobile-first da GranServices, com backend e frontend separados, forte foco em PWA, integracoes externas, rastreabilidade e evolucao segura para um MVP premium.

## Architectural stance

Nao usar Clean Architecture como regra rigida.

Usar codigo limpo de forma pragmatica, inspirado por Uncle Bob, SOLID e Object Calisthenics.

Usar:

- modular monolith
- feature-based
- SOLID quando fizer sentido
- DTOs, services, repositories e interfaces onde agregam clareza
- factories para criacao com regra, codigo, default ou invariante de dominio
- separacao forte entre backend e frontend
- guard clauses e early return para reduzir ramificacoes profundas
- erros especificos e seguros, nunca erro generico para regra de negocio

Evitar:

- camadas genericas globais para tudo
- burocracia desnecessaria
- acoplamento do dominio ao framework ou ao ORM
- `else`/aninhamentos que escondem regra de negocio
- `try/catch` vazio ou usado apenas para relancar o mesmo erro
- logs, mensagens de erro ou DTOs que exponham dados pessoais/sensiveis

Detalhamento: `docs/clean-code-and-errors.md`.

## Privacy and LGPD stance

LGPD e requisito obrigatorio do Jornada.

Toda feature deve nascer com:

- minimizacao de dados
- finalidade clara
- DTOs pequenos, sem espelhar tabelas sensiveis
- permissao aplicada no backend
- logs sanitizados
- criptografia ou hash para segredos, tokens e dados de alto risco
- transparencia simples para o funcionario
- bloqueio do fluxo quando consentimento/autorizacao for indispensavel

Detalhamento: `docs/lgpd-and-privacy.md`.

## High-level topology

### Backend

- `NestJS`
- `PostgreSQL`
- `Redis` obrigatorio desde a base para filas e tempo real
- API HTTP como nucleo principal
- WebSocket com `Socket.IO` para chat e tempo real
- workers assíncronos quando houver fila real

### Frontend

- `apps/jornada` para a experiencia do colaborador
- `apps/help-hub` para a operacao de atendimento
- `apps/quick-forms` para formularios reutilizaveis
- rota `/aplicativos` em `apps/jornada` para o catalogo de modulos autorizados
- PWA para o app do colaborador
- mobile-first no colaborador e experiencia operacional propria no app de atendimento
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
- `apps/jornada`
- `apps/help-hub`
- `apps/quick-forms`
- `docs`
- `infra`
- `scripts`

Adicionar `libs` ou `packages` apenas quando houver compartilhamento real.

Detalhamento do ecossistema: `docs/ecosystem-architecture.md`.

Decisao atual:

- os frontends de Jornada, HelpHub e QuickForms sao separados no codigo; o Hub e a rota `/aplicativos` do Jornada
- `apps/api` continua compartilhado como monolito modular por contexto
- banco fisicamente separado fica para fase futura, quando houver ownership e necessidade operacional real
- decisao registrada em `docs/adr/0004-separate-atendimento-frontend-first.md`

## Feature-based backend structure

Cada feature deve agrupar o que lhe pertence.

Exemplo:

```text
apps/api/src/modules/boarding-schedule/
  dto/
  contracts/
  types/
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
- `contracts`: formatos tecnicos expostos para outros modulos, como comandos, eventos e tipos de integracao
- `types`: tipos internos pequenos da feature
- `events`: eventos internos e handlers locais da feature
- `factories`: criacao de objetos/codigos/agregados quando houver regra ou invariante

## Cross-cutting modules

Poucos e bem definidos:

- `config`
- `database`
- `auth`
- `audit`
- `logging`
- `shared`

`shared` deve conter apenas utilidades realmente reutilizaveis, nunca virar deposito generico.

## Reliable domain events

Mudancas que precisam informar outro dominio gravam um registro no `DomainEventOutbox` na mesma transacao do dado de negocio. O `DomainEventRelayService` busca itens pendentes ou presos, a fila BullMQ aplica retry exponencial e o processador registra `PENDING`, `PROCESSING`, `DELIVERED` ou `FAILED` no PostgreSQL. A entrega e ao menos uma vez; consumidores registram `ProcessedDomainEvent` por consumidor e evento antes de repetir efeitos. A fila nunca e a unica fonte de verdade.

O primeiro fluxo entre dominios e `forms.request.completed`: o QuickForms preserva a resposta e o HelpHub registra apenas uma projecao operacional de conclusao. Valores preenchidos nao transitam no evento nem sao copiados para o atendimento.

SLA pertence ao HelpHub. `SupportSlaPolicy` define a meta por prioridade em minutos e `SupportSlaService` calcula inicialmente em calendario 24x7; `dueAt` e persistido no mesmo commit de abertura do `SupportCase`. Expediente, fuso e feriados evoluirao somente dentro desse servico.

## Data architecture

### Primary database

- `PostgreSQL`

Uso:

- `Person`
- `Employee`
- usuarios
- agenda
- vencimentos
- comunicados
- relacoes entre setores e equipes
- trilhas de auditoria
- historico operacional

### Redis

Redis entra desde a base, sem servico pago, como infraestrutura local/containerizada.

- fila
- cache
- rate limiting distribuido
- pub/sub
- presenca e estado efemero do chat

PostgreSQL segue como fonte da verdade. Redis nao guarda historico definitivo; ele coordena eventos entre instancias, acelera estados efemeros e sustenta escalabilidade do Socket.IO.

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

## Identity direction

Base atual de identidade:

- `Person` como identidade principal
- `Employee` como vinculo operacional do colaborador
- `User` como conta de acesso
- `Application` como catalogo de apps do ecossistema
- `UserApplicationAccess` como acesso contextual ao app

Regra importante:

- toda autenticacao pertence a um `User`
- todo `User` pertence a uma `Person`
- nem toda `Person` precisa ser `Employee`

Exemplo pratico:

- admin bootstrap: `User` + `Person`
- colaborador comum: `User` + `Person` + `Employee`

Regra de ecossistema:

- autenticacao e unica
- acesso a aplicacoes e contextual
- permissao fina continua dentro de cada app e dominio

## Integration architecture

Padrao alvo para fontes externas futuras:

1. definir contrato interno do Jornada
2. mapear Fonte Externa e status
3. criar adapter/importador apenas quando a fonte virar preparada ou ativa
4. validar payload real ou fixture sanitizada
5. normalizar para o contrato interno
6. persistir sincronizacao/auditoria
7. projetar leitura pequena para o app

O frontend e as regras do Jornada nao devem depender diretamente de payload externo. Drake fica como implementacao historica/preparada, sem prioridade operacional atual.

Detalhamento: `docs/internal-contracts-and-sources.md`.

## Realtime direction

Padrao inicial:

- `Socket.IO` com `NestJS`
- adapter Redis oficial para propagacao entre instancias
- autenticar WebSocket com o mesmo JWT Bearer do HTTP
- historico de chat persistido no PostgreSQL via Prisma
- mensagens paginadas e cacheadas no frontend com `TanStack Query`
- listas longas de mensagens virtualizadas no frontend

Uso:

- chat com setores
- notificacoes operacionais
- presenca
- atualizacao de agenda

## Chat and support domain

O chat deve crescer como canal conversacional generico, nao como uma relacao fixa `funcionario + setor`.

Modelo de referencia:

- `ChatConversation`: conversa
- `ChatParticipant`: participante usuario, time, setor legado ou origem externa
- `ChatMessage`: mensagem
- `ChatReadState`: leitura por usuario
- `SupportTeam`: fila/equipe responsavel configuravel por dados
- `SupportCase`: atendimento/chamado/solicitacao formal
- `SupportCaseEvent`: eventos de auditoria do atendimento
- `SupportIntegrationLink`: vinculo opcional com integracoes/notificacoes externas
- `SupportRating`: avaliacao simples ao fim do atendimento

Regra central:

- conversa e canal
- atendimento e responsabilidade operacional
- chamado/solicitacao e trabalho rastreavel
- Jornada nao deve recriar ferramenta corporativa generica de conversa; deve focar triagem, resolucao, fila, SLA, documentos, auditoria e experiencia do funcionario

`SupportCase` pode nascer de uma conversa ou de uma mensagem especifica, mas nao substitui o historico do chat.

## Dynamic forms domain

Formulario dinamico e dominio reutilizavel, nao subparte fixa do suporte.

Modelo:

- `FormDefinition`: definicao versionada do formulario
- `FormField`: campo tipado, ordenado, com flags de obrigatoriedade e sensibilidade
- `SupportTopicFormBinding`: vinculo plugavel entre assunto de atendimento e formulario

Regras:

- criacao e versionamento ficam centralizados no modulo `forms`
- o criador visual oficial e acessado por `/formularios/novo` e `/formularios/:formKey/editar`
- MVP restringe manutencao de formularios a `ADMIN` e `TI`
- atendimento usa formulario por vinculo, nao por posse direta
- MVP usa o primeiro vinculo ativo do assunto como formulario principal
- novas versoes preservam atendimentos antigos
- formularios podem ser globais ou pertencer a setor
- regras condicionais ficam simples: visibilidade e obrigatoriedade por campos anteriores
- dados sensiveis devem ser minimizados e mascarados em DTOs de detalhe

Decisoes registradas:

- `docs/adr/0002-remove-antd-formily-designable-from-frontend.md`
- `docs/adr/0003-use-custom-form-builder-as-official-flow.md`

O modulo deve depender de portas, nao de detalhes do produto:

- `ChatIdentityPort` resolve o ator exibido
- `SupportNotificationPort` envia notificacoes sem prender o dominio a um canal
- adapters concretos podem ser trocados sem alterar o nucleo de atendimento
- o adapter inicial de notificacao e no-op; canais corporativos ficam para uma fase futura, se fizerem sentido operacional

Detalhamento: `docs/chat-and-support-domain.md`.

## Mobile-first product implications

Mesmo sendo web:

- telas desenhadas primeiro para celular
- carregamento leve
- PWA
- offline parcial
- foco em consulta rapida e acao objetiva

## Lightweight data rules

Regra geral para o Jornada:

- o frontend nao deve carregar mais dados do que a tela usa
- filtros que reduzem volume, dependem de permissao ou afetam ordenacao devem rodar no backend
- historico e listas grandes devem nascer paginados
- detalhes devem ser carregados sob demanda, na tela de detalhe ou modulo proprio
- cache deve ser usado para informacoes pouco volateis, como perfil, metadados e referencias estaveis
- DTOs de leitura devem ser pequenos e orientados ao caso de uso, nao espelhos completos das tabelas
- DTOs do app devem seguir contratos internos como `EmployeeProfile`, `ScheduleItem`, `RequirementExpiration`, `InboxItem`, `Communication`, `UserAccessContext` e `IntegrationSyncRun`

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
- encapsular componentes realmente reutilizaveis em pacote proprio; enquanto isso, manter os componentes do colaborador em `apps/jornada/src/components/ui`

## Non-functional priorities

- rastreabilidade desde o inicio
- logs estruturados
- auditoria transacional em banco para acoes de negocio/configuracao
- health checks
- coverage de testes consistente
- facilidade de manutencao
- deploy previsivel em Docker

## Audit and observability

`AuditLog` e a fonte oficial para rastrear acoes de negocio. Ele deve registrar quem fez, quando fez, qual entidade mudou, acao executada, resumo anterior/posterior sanitizado e metadados tecnicos.

Regras:

- auditoria de acao de negocio fica no banco, nao em ferramenta externa
- Sentry ou ferramenta similar entra como observabilidade de erro, trace, performance e diagnostico tecnico
- eventos enviados para observabilidade externa devem passar por `beforeSend`/scrubber e bloquear query string sensivel, tokens, CPF, CNPJ, senha e conteudo livre
- operacoes criticas devem preferir auditoria na mesma transacao da mudanca
- auditoria nao deve copiar texto sensivel de atendimento, documentos ou anexos; usar ids, status, tipo de evento e metadados minimos
