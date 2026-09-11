# Jornada Agents And Skills

## Autoridade do documento

Este arquivo e uma fonte operacional obrigatoria leve para mudancas materiais no Jornada.

Use este documento antes de alterar dominio, arquitetura, suporte, formularios, auth, integracoes, frontend de fluxo principal ou governanca de testes. Quando uma decisao material mudar, atualize este arquivo junto com `docs/checklist.md` ou com uma ADR/documentacao equivalente.

Ordem de autoridade quando houver divergencia:

1. decisao mais recente documentada em checklist, ADR ou documento de dominio
2. este mapa de agentes, skills, loops e harnesses
3. codigo existente

Codigo que contrariar este arquivo sem documentacao de decisao vira debito explicito, nao nova verdade automatica.

## O que e um Agent

Um `Agent` aqui representa uma responsabilidade arquitetural e uma lente de revisao. Ele nao implica bot separado, microservico, modulo fisico ou job obrigatorio.

Ao alterar uma area, use o agent correspondente para checar fronteiras, riscos e validacao esperada. Um agent so deve virar servico, modulo ou automacao quando houver necessidade real de ownership, ciclo de release, escala, compliance ou operacao.

## Maturidade por dominio

| Dominio | Maturidade atual | Observacao |
| --- | --- | --- |
| Fontes externas | Futuras/adapters | Preparar contratos internos antes de consumir APIs reais. |
| Drake/webhooks | Historico/suspenso | Preservar compatibilidade de entrada, idempotencia e replay sem acoplar ao piloto de leitura. |
| Drake/Crew Rotation | Piloto ativo controlado | Alimenta somente `ScheduleItem` por adapter backend, sob demanda, com auditoria de leitura e sem payload externo no frontend. |
| Drake/Qualification Needs | Piloto ativo controlado | Alimenta somente `RequirementExpiration` por adapter backend, sob demanda, todas as necessidades do colaborador, ordenadas por vencimento e sem identificadores externos no retorno. |
| Auth/identidade/acesso | Direcao materializada e em evolucao | Manter `Person`, `Employee`, `User` e grants por aplicacao separados de permissoes internas; convite, ciclo da conta e auditoria sensivel seguem ADRs `0008` e `0009`. |
| Focall/suporte | Dominio mais detalhado | Modulo `focall` do frontend Neo; exigir testes de regressao por fluxo alterado. |
| QuickForms | Dominio independente materializado | Modulo `quick-forms` do frontend Neo; formularios, versoes, solicitacoes e respostas nao pertencem ao Focall fora dos vinculos de integracao. |
| Hub | Portal neutro materializado | Rota `/aplicativos` do Jornada com casca visual propria, sem sidebar de app; mostra apenas os modulos autorizados e nao recebe regra de negocio, marca ou login proprio. |
| Administracao Neo | Capacidade transversal materializada | Rotas `/administracao/*` com lateral propria, restritas a `ADMIN`; mantem catalogo e grants sem pertencer ao Jornada, Focall ou QuickForms. |
| Frontend core | Infraestrutura transversal materializada | `packages/frontend-core` concentra auth, tema e UI compartilhada; nao recebe telas ou regras de dominio. |
| Performance frontend | Regra materializada | Rotas continuam lazy; fornecedores estaveis usam chunks de cache e React Aria deve ser importado por submodulo para preservar o entrypoint. |
| Inbox/programacao/vencimentos | MVP funcional com partes ainda projetadas | Marcar novas decisoes como rascunho quando dependerem de backend/paginacao/cache ainda nao consolidados. |
| Comunicados/notificacoes | Handoff Jornada -> Focall iniciado pelo ADR `0010` | Jornada mantem o comunicado; Focall recebe somente contexto de navegacao ate existir comando idempotente proprio. |

## Agent map

### 1. External Source Intake Agent

Responsabilidade:

- mapear fontes externas futuras sem acoplar o app ao formato delas
- proteger autenticacao, segredos, idempotencia, auditoria e resposta consistente quando uma fonte virar ativa
- garantir que cada fonte alimente contratos internos do Jornada por adapter/importador

Escopo inicial:

- colaboradores
- programacao
- vencimentos
- comunicados
- fontes historicas/preparadas e pilotos explicitamente aprovados, como Crew Rotation e Qualification Needs do Drake

### 2. Ingestion Normalizer Agent

Responsabilidade:

- transformar payload bruto em formato interno
- padronizar ids, datas, status e origem

Quando entra:

- depois da validacao do recebimento

### 3. Identity Access Agent

Responsabilidade:

- manter a fronteira entre `Person`, `Employee` e `User`
- manter a fronteira entre identidade, acesso ao app e permissao interna
- garantir que login, bootstrap admin e evolucao do dominio nao misturem identidade com credencial
- preparar a base para setores, perfis, onboarding, catalogo de apps e federacao futura
- manter a gestao central de grants e papeis por aplicacao dentro de `auth`, sem deslocar isso para modulos de negocio
- tratar `Application.code` como identificador imutavel; nome, descricao, imagem, ordem, status e destino pertencem ao catalogo administrativo
- validar no backend que destino `NATIVE` usa rota interna e que `REDIRECT` usa URL HTTP(S); um app nunca recebe acesso apenas por aparecer no Hub

Quando entra:

- sempre que mexermos em `auth`, colaborador, onboarding ou permissao

### 4. Schedule Projection Agent

Responsabilidade:

- montar programacao de embarque do colaborador
- detectar mudancas relevantes
- entregar recortes leves para futuro, historico e filtros de programacao
- paginar historico e listas longas
- manter a leitura externa por colaborador como recorte pequeno, com intervalo validado e sem sincronizacao em massa antes de haver necessidade comprovada

### 5. Compliance Monitor Agent

Responsabilidade:

- identificar ASO e treinamentos proximos de vencimento
- disparar estados de alerta
- projetar a tela de vencimentos com filtros leves por tipo e criticidade
- manter contagens e estados sincronizados com o Inbox quando houver risco
- manter a leitura externa por colaborador completa, auditada e convertida para `RequirementExpiration` antes de chegar ao frontend, sem expor identificadores externos
- manter o preview administrativo separado do fluxo do colaborador, usando a selecao global do shell, referencia opaca curta e endpoints proprios de validacao
- Programacao e Vencimentos podem se comportar como o colaborador selecionado quando o perfil for `ADMIN`, sem expor `workerId`, tenant, token ou payload Drake bruto
- manter a acao de Vencimentos desacoplada da origem externa: ASO e treinamentos navegam para Atendimento com `setor`/`assunto`, e o Focall resolve catalogo, formulario e equipe

### 6. Communications Routing Agent

Responsabilidade:

- classificar comunicados por setor, equipe e impacto
- preparar exibicao no app

### 7. Support Triage Agent

Responsabilidade:

- apoiar o futuro chat com roteamento inicial
- sugerir setor certo para atendimento
- projetar conversas por setor com recortes leves
- manter lista de conversas separada do historico paginado de mensagens
- garantir que mensagens sejam persistidas no PostgreSQL e eventos em tempo real usem Redis/Socket.IO sem virar fonte da verdade
- separar conversa, atendimento e solicitacao/chamado para permitir transferencia, fila e trabalho rastreavel
- manter o nucleo de atendimento independente de Drake, Employee e telas do Jornada
- distinguir acesso ao app `HELP_HUB`, papel no app e ownership do caso assumido
- usar `SupportTeam` como fonte configuravel de filas/equipes, evitando enum rigido como regra principal
- aplicar permissao de atendimento por papel operacional e fila permitida
- manter `SupportDepartment` e `SupportTopic` como camada simples para o funcionario
- manter `SupportRoutingRule` como decisor backend de equipe interna
- permitir que `SupportRoutingRule.conditions` use respostas do formulario para direcionar a fila correta
- manter formularios versionados em dominio independente para metricas, LGPD e reuso fora do suporte
- plugar formularios no atendimento por vinculo com assunto, sem acoplar posse do formulario ao suporte
- manter a administracao de catalogo separada da experiencia do funcionario
- aplicar `RBAC + ABAC` no catalogo administrativo: papel define capacidade, escopo define setor/equipe permitido
- impedir hard delete quando houver vinculo historico ou operacional
- permitir que atendentes participem de multiplas equipes sem duplicar usuarios
- manter conversa como meio, nao como fim do produto
- integrar notificacoes externas por adapters apenas quando houver caso operacional claro
- coletar avaliacao simples ao fim do atendimento para melhoria continua dos setores
- usar factories quando criacao de codigo, caso, evento ou padrao operacional tiver regra propria
- tratar `apps/help-hub` como app de experiencia operacional para atendimento e catalogo; `apps/quick-forms` e a experiencia propria de formularios

### 8. Employee Inbox Agent

Responsabilidade:

- projetar a home `/inbox` do colaborador
- consolidar sinais de embarque, desembarque, treinamento, ASO, compromissos e mensagens
- ordenar registros por urgencia, data e envolvimento direto do colaborador
- manter apenas resumo e acao para modulo proprio, sem transformar a home em dashboard
- no recorte operacional atual, incluir somente o proximo embarque/desembarque futuro, treinamentos com vencimento em ate 120 dias e atendimentos em `WAITING_REQUESTER`
- evitar carregar detalhes que pertencem a programacao, vencimentos, chat ou perfil

### 9. Privacy And LGPD Agent

Responsabilidade:

- classificar dados pessoais, sensiveis e segredos antes de novas features
- exigir finalidade, minimizacao, permissao e retencao
- orientar mascaramento, criptografia, hash e sanitizacao de logs
- garantir transparencia simples para o funcionario
- bloquear fluxos quando consentimento/autorizacao for requisito do tratamento
- revisar DTOs para evitar vazamento de dados por resposta ampla demais

### 10. Clean Code And Error Agent

Responsabilidade:

- manter codigo legivel, pequeno e testavel
- aplicar SOLID de forma pragmatica, sem camadas cerimoniais
- usar Object Calisthenics como guia para reduzir `else`, aninhamento e classes inchadas
- exigir guard clauses quando deixarem o fluxo mais claro
- promover strategy/policy quando condicionais repetidas indicarem variacao de regra
- evitar `Error` generico em regra de negocio
- exigir erros especificos, seguros e mapeaveis para HTTP/UX
- revisar `try/catch` para impedir catch vazio, relancamento inutil ou vazamento de dado sensivel
- sugerir factories quando a criacao tiver invariantes, defaults ou repeticao relevante

### 11. Frontend Safety Agent

Responsabilidade:

- impedir regressao de seguranca e estabilidade em telas interativas
- transformar bug reproduzivel em teste de regressao
- manter handlers de formulario seguros contra eventos sinteticos, loops de estado e dados sensiveis em URL
- garantir que permissao visual no menu nao substitua autorizacao real no backend
- validar campos repetidos com testes semanticos, principalmente em telas administrativas

## Skill map

### Skill: `jornada-platform`

Uso:

- planejamento, arquitetura e implementacao no repositorio `Jornada`
- governanca da API inicial
- evolucao das integracoes e do dominio do produto
- modelagem de identidade `Person -> Employee -> User`

### Skill: `jornada-solution-architect`

Uso:

- decisoes de separacao entre app do trabalhador e operacao interna
- avaliacao de monolito modular vs servicos separados
- desenho de ownership de dominio, deploy e banco
- planejamento de extracao gradual de atendimento, formularios e automacoes

Decisao atual:

- `apps/jornada` e a experiencia do colaborador
- `apps/help-hub` e a experiencia operacional de atendimento
- `apps/quick-forms` e a experiencia independente para criacao e execucao de formularios
- o Hub e a rota neutra `/aplicativos` do Jornada, sem app ou nome proprio
- HelpHub e QuickForms sempre delegam autenticacao ao login central do Jornada; o retorno usa SSO opaco de uso unico
- HelpHub e QuickForms devem manter telas, clientes e testes de seus dominios dentro do proprio app; somente infraestrutura transversal entra em `packages/frontend-core`
- `AppShellLayout` e os estilos do frame visual sao infraestrutura transversal: alteracoes de shell, header, sidebar ou tokens devem ser feitas e testadas em `packages/frontend-core`, nunca apenas numa copia local do Jornada
- `AppShellLayout` recebe uma porta opcional de workspace; o core nao pode importar cliente, tipo ou regra de suporte diretamente
- `apps/api` continua compartilhado como monolito modular por contexto
- nao separar banco ate existir sinal operacional real
- decisao registrada em `docs/adr/0004-separate-atendimento-frontend-first.md`

### Skill: `jornada-drake-contracts`

Uso:

- revisar a implementacao historica/preparada dos webhooks do Drake quando houver manutencao ou decisao explicita de retomada/remocao
- preservar endpoints, autenticacao, idempotencia, auditoria e replay enquanto o codigo existir
- evitar tratar Drake como fonte ativa do MVP atual sem nova decisao

### Skill: `jornada-integration-sources`

Uso:

- mapear fontes externas futuras que alimentarao o app
- definir contratos internos antes de adapters externos
- planejar sync, autenticacao, idempotencia, auditoria, erro/retry e LGPD sem implementar consumo prematuro
- manter `docs/internal-contracts-and-sources.md` como mapa operacional das fontes e contratos

### Skill futura: `jornada-employee-experience`

Uso:

- quando a frente PWA/mobile-first estiver madura
- jornadas do colaborador, offline, notificacoes e UX

## Loops

### Loop 1 - External source intake loop

Mapear fonte futura -> definir contrato interno afetado -> decidir adapter/importador -> autenticar quando ativo -> validar -> persistir sincronizacao -> responder ou registrar resultado

Validacao minima:

- registro de status da fonte: futura, preparada, ativa, suspensa ou removida
- teste de contrato apenas quando a fonte virar ativa ou preparada para consumo
- conferencia de auditoria/correlacao sem expor dado sensivel em log
- atualizacao de `docs/internal-contracts-and-sources.md` sempre que uma fonte mudar de status

### Loop 2 - Event processing loop

Consumir evento persistido -> normalizar -> aplicar regra -> salvar estado

Validacao minima:

- fixture por tipo de payload processado
- teste do caminho feliz e do erro principal
- verificacao de idempotencia/reprocessamento sem duplicar estado

### Loop 2.1 - Domain event outbox loop

Persistir mudanca de negocio e evento no mesmo commit -> relay enfileira apos commit -> consumidor valida chave idempotente -> aplica efeito -> registra entrega ou falha reprocessavel.

Validacao minima:

- teste de que a acao de negocio grava o outbox na mesma transacao
- teste de repeticao sem duplicar o efeito do consumidor
- teste de retry e estado de falha sem perder o evento
- logs com `correlationId`, sem payload pessoal ou sensivel desnecessario
- para conclusao de formularios, publicar apenas referencia, origem e contexto; valores respondidos permanecem no QuickForms

### Loop 2.5 - Identity loop

Receber acesso ou vinculo -> resolver `Person` -> projetar `Employee` quando existir -> ligar `User` ao acesso correto -> conceder `Application` quando necessario -> delegar autorizacao fina ao app escolhido

Validacao minima:

- teste de bootstrap/admin sem `Employee`
- teste de colaborador com `Person`, `Employee` e `User`
- teste de grants por aplicacao sem depender apenas de papel global

### Loop 3 - Alerting loop

Ler programacao e vencimentos -> detectar risco -> gerar comunicado/notificacao

Validacao minima:

- fixture com vencimento critico, proximo e regular
- teste de ordenacao/prioridade quando o alerta aparecer no Inbox
- revisao LGPD antes de notificacao externa

### Loop 3.5 - Expiring requirements view loop

Receber filtro e busca -> aplicar recorte por tipo, status e permissao -> retornar DTO pequeno de vencimentos -> exibir lista acionavel no modulo proprio

Validacao minima:

- teste de filtros e busca no frontend
- teste de acao que abre Atendimento com setor/assunto esperado para ASO e treinamento
- teste de permissao/filtro no backend quando houver endpoint real
- DTO pequeno sem dados sensiveis desnecessarios

### Loop 4 - Support loop

Receber mensagem -> autenticar -> validar participacao -> persistir -> atualizar leitura -> publicar evento em tempo real -> acompanhar resposta

Validacao minima:

- teste de participacao antes de listar ou enviar mensagem
- teste de persistencia como fonte da verdade
- teste de evento em tempo real sem depender dele para recuperar historico

### Loop 4.5 - Chat view loop

Receber filtro de setor/status -> listar conversas resumidas -> carregar apenas mensagens da conversa selecionada -> paginar historico quando necessario -> manter cache leve e invalidar por evento Socket.IO

Validacao minima:

- teste de lista resumida e conversa selecionada
- teste de paginacao/virtualizacao quando alterar historico de mensagens
- teste de cache invalidado por evento relevante

### Loop 4.6 - Support case loop

Receber demanda -> criar ou vincular atendimento -> atribuir setor/responsavel -> registrar eventos -> opcionalmente gerar solicitacao/tarefa -> concluir com auditoria

Implementacao inicial:

- `POST /api/support/cases`
- `GET /api/support/cases`
- `GET /api/support/cases/:supportCaseId`
- `PATCH /api/support/cases/:supportCaseId`
- `POST /api/support/cases/:supportCaseId/messages`
- `POST /api/support/cases/:supportCaseId/rating`
- `GET /api/support/teams`
- factory de codigo de atendimento para isolar regra de criacao
- motivo obrigatorio para transferencia, resolucao e fechamento
- bloqueio de nova mensagem em atendimento fechado

Validacao minima:

- teste de criacao, listagem, detalhe e atualizacao
- teste de transferencia/resolucao/fechamento com motivo obrigatorio
- teste bloqueando mensagem em atendimento fechado
- auditoria sanitizada para eventos operacionais

### Loop 4.9 - Support catalog and routing loop

Listar setores e assuntos ativos -> funcionario seleciona assunto -> runtime proprio renderiza campos dinamicos -> API revalida formulario e condicionais -> avalia politica de abertura do assunto -> avalia regras por respostas estruturadas -> cria ou reaproveita atendimento na equipe correta -> salva campos estruturados quando houver formulario

Implementacao administrativa:

- `GET /api/support/catalog/admin`
- `GET /api/support/catalog/assignees`
- `POST /api/support/catalog/departments`
- `PATCH /api/support/catalog/departments/:departmentId`
- `POST /api/support/catalog/topics`
- `PATCH /api/support/catalog/topics/:topicId`
- `POST /api/support/catalog/teams`
- `PATCH /api/support/catalog/teams/:teamId`
- `POST /api/support/catalog/team-members`
- `POST /api/support/catalog/routing-rules`
- `PATCH /api/support/catalog/routing-rules/:ruleId`
- `POST /api/support/catalog/topics/:topicId/forms`
- rota web `/atendimentos/configuracao` para `ADMIN` e `SUPPORT`
- rota web `/atendimentos/configuracao/formularios` emite SSO e redireciona para o QuickForms
- rota web `/formularios` pertence ao QuickForms e mantem a biblioteca central de formularios versionados
- rota web `/formularios/novo` e `/formularios/:formKey/editar` usam o criador visual proprio no QuickForms
- nao manter rota experimental paralela para o mesmo criador de formularios
- formularios do funcionario usam runtime proprio, com condicionais simples de visibilidade e obrigatoriedade por campo
- backend usa `FormDefinition.schema` como JSON tecnico de compatibilidade, `FormField` como contrato tipado principal e `SupportTopicFormBinding` como vinculo de suporte
- assunto define politica de abertura: conversa continua, solicitacao individual ou chave de negocio com `businessKeyFieldCode`
- regras de aprovacao vivem em `/atendimentos/configuracao/aprovacoes`; fila de decisao vive em `/atendimentos/aprovacoes`
- aprovacao deve criar `ApprovalRequest`, `ApprovalStep`, `ApprovalEvent` e atualizar `SupportResponsibilityPeriod`
- remocao de AntD/Formily/Designable registrada em `docs/adr/0002-remove-antd-formily-designable-from-frontend.md`
- criador proprio oficial registrado em `docs/adr/0003-use-custom-form-builder-as-official-flow.md`
- fontes remotas de opcoes sao dominio separado: `OptionSource`, `OptionSourceAdapter` e `OptionSourceQueryService`; o formulario guarda apenas `optionSourceKey` e preferencias de UX
- adapters externos rodam somente no backend, com allowlist de destinos, timeout, limite de resposta, cache, credenciais fora do schema e logs sanitizados
- a operacao administrativa dessas fontes fica em `/formularios/fontes`, separada da biblioteca de formularios para reduzir erro operacional
- roteamento de equipe continua separado e posterior ao envio do formulario

Validacao minima:

- teste de catalogo publico separado do catalogo administrativo
- teste de permissao para manutencao administrativa
- teste de revalidacao backend das condicionais do formulario
- teste de politica de abertura para nao misturar solicitacoes individuais em conversa ativa
- teste de regra automatica criando aprovacao e mudando atendimento para `WAITING_APPROVAL`
- teste de roteamento por resposta estruturada
- teste de fontes remotas com allowlist, timeout, limite, cache e logs sanitizados

### Loop 4.10 - Support triage suggestion loop

Receber texto inicial -> aplicar regras locais -> sugerir setor/assunto/equipe -> funcionario confirma -> registrar sugestao e aceite -> abrir atendimento com dados minimizados

Validacao minima:

- teste de sugestao local por regra
- teste de aceite/recusa sem abrir atendimento automaticamente
- revisao de minimizacao antes de IA externa

### Loop 4.7 - Support notification loop

Receber evento relevante do atendimento -> avaliar regra de notificacao -> enviar por adapter plugavel quando habilitado -> registrar vinculo em `SupportIntegrationLink` -> manter Jornada como fonte de status/resolucao

Validacao minima:

- teste de adapter desabilitado por padrao
- teste de registro de vinculo externo sem virar fonte da verdade
- revisao LGPD, segredo e retencao antes de habilitar fornecedor externo

### Loop 4.8 - Support rating loop

Encerrar atendimento -> solicitar avaliacao simples -> registrar `SupportRating` -> disponibilizar indicadores por setor -> retroalimentar melhoria de processo

Validacao minima:

- teste de avaliacao apenas para atendimento resolvido/fechado
- teste de uma avaliacao por encerramento quando aplicavel
- DTO sem expor mensagens sensiveis em indicadores

### Loop 5 - Employee inbox loop

Ler resumo leve de programacao, vencimentos e atendimentos -> reduzir para o proximo embarque/desembarque, treinamentos ate 120 dias e respostas aguardando colaborador -> priorizar por colaborador -> exibir no Inbox -> levar para a superficie Jornada `/atendimento` quando a acao for do colaborador

Validacao minima:

- teste de prioridade/ordenacao dos sinais
- teste de busca/filtro do Inbox
- teste de agregacao sem mostrar ASO, cursos acima de 120 dias, compromissos medicos ou atendimentos que ainda nao aguardam retorno do colaborador
- garantia de que detalhe do colaborador fica em `/atendimento`, sem expor a mesa operacional `/atendimentos`

### Loop 6 - Lightweight query loop

Receber filtro do frontend -> aplicar filtro, permissao e paginacao no backend -> retornar DTO pequeno -> cachear apenas dados pouco volateis

Validacao minima:

- teste de permissao backend junto do filtro
- teste de paginacao quando lista puder crescer
- revisao de DTO para minimizacao de dados
- confirmacao de que o DTO pertence a um contrato interno do Jornada, nao ao payload externo

### Loop 7 - Privacy review loop

Definir dado usado -> classificar risco -> confirmar finalidade/base legal provavel -> aplicar permissao/minimizacao -> decidir hash/criptografia/retencao -> revisar DTO/log/cache -> escrever microcopy de transparencia quando necessario

Validacao minima:

- checklist LGPD no documento da feature
- teste ou revisao de logs sanitizados em fluxo sensivel
- microcopy de transparencia quando o funcionario informar dado sensivel

### Loop 8 - Clean code and error review loop

Ler fluxo alterado -> procurar aninhamento/else desnecessario -> extrair guard clause ou policy quando clarear -> revisar erros especificos -> revisar logs seguros -> confirmar teste do caminho feliz e erro principal

Validacao minima:

- teste do caminho feliz e do erro principal
- revisao de erro especifico em regra de negocio
- revisao de `try/catch` para evitar catch vazio ou relancamento inutil

### Loop 9 - Frontend safety loop

Alterar tela interativa -> revisar exposicao de dados sensiveis -> validar handlers de eventos -> adicionar ou atualizar teste de regressao -> rodar `npm run test:jornada:guards` quando o codigo for do Jornada -> rodar o teste do app alterado -> confirmar build

Validacao minima:

- teste semantico de interacao alterada
- `npm run test:jornada:guards` quando aplicavel
- `npm run test:jornada`, `npm run test:help-hub` ou `npm run test:quick-forms`, conforme o app alterado
- build web quando houver mudanca de rota, shell, bundle ou dependencia

## Harness

### Internal contract harness

Objetivo:

- validar `EmployeeProfile`, `ScheduleItem`, `RequirementExpiration`, `InboxItem`, `Communication`, `UserAccessContext` e `IntegrationSyncRun` com fixtures pequenas, sanitizadas e independentes de fonte externa

Implementacao atual:

- `apps/jornada/src/features/contracts/internal-contracts.ts`
- `apps/jornada/src/features/contracts/internal-contract-fixtures.ts`
- `apps/jornada/src/features/profile/profile-api.ts`
- `apps/jornada/src/features/contracts/internal-contract-fixtures.test.ts`
- `apps/jornada/src/views/dashboard-page.test.tsx`
- `apps/jornada/src/views/expirations-page.tsx`

Consumo inicial:

- `apps/jornada/src/views/dashboard-page.tsx` adapta as fixtures para `Inbox`, `Programacao` e `Perfil`; quando ha sessao, `/perfil` consome `GET /api/auth/me/profile` e salva apenas preferencias editaveis em `PATCH /api/auth/me/profile`
- `apps/jornada/src/views/expirations-page.tsx` mantem a tela propria de vencimentos do trabalhador, usando view-model em `features/requirements`

### Local webhook harness

Objetivo:

- simular chamadas de fonte externa quando um webhook estiver ativo ou preparado

### Payload replay harness

Objetivo:

- reaplicar payload salvo e sanitizado para debug ou regressao

### Integration contract harness

Objetivo:

- rodar payloads fixos contra adapters, validadores e transformadores quando uma fonte externa virar ativa
