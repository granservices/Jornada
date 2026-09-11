# Jornada Roadmap

## North star

Entregar um produto leve, responsivo e confiavel para o colaborador consultar agenda de embarque, vencimentos e comunicacoes, mesmo em contexto de conectividade ruim.

LGPD e requisito obrigatorio desde a base: o Jornada deve minimizar dados, explicar finalidades, proteger dados sensiveis, evitar vazamentos e manter a experiencia simples para o funcionario.

Codigo limpo, erros bem definidos e baixo acoplamento tambem sao requisitos do MVP. O produto deve ser facil de evoluir sem reescrever modulo inteiro quando atendimento, documentos, agenda e permissoes crescerem.

## Phase 0 - Platform foundation

Objetivo: preparar a base do Jornada para evoluir o app e receber fontes externas futuras sem acoplar as telas ao formato dessas fontes.

Entregas:

- API isolada em `apps/api`
- healthcheck
- contratos internos para os dados consumidos pelo app
- mapa de fontes externas futuras em `docs/internal-contracts-and-sources.md`
- persistencia/auditoria para sincronizacoes futuras
- container e `docker compose`
- publicacao em `jornada.granhub.com.br`

## Phase 1 - Internal contracts and future integrations

Objetivo: definir primeiro os modelos internos que o aplicativo consome; fontes externas entram depois por adapters/importadores.

Entregas:

- contratos internos por area do app
- `EmployeeProfile`, `ScheduleItem`, `RequirementExpiration`, `InboxItem`, `Communication`, `UserAccessContext` e `IntegrationSyncRun`
- validacao por schema
- normalizacao de datas, ids e status
- tabela ou storage de sincronizacoes quando a fonte virar ativa
- idempotencia e correlacao por sincronizacao/evento
- logs estruturados
- intake dedicado para CSVs operacionais externos, como SISPAT de funcionarios

Status em 20 de agosto de 2026, mantido como historico tecnico:

- contratos DTO minimos ja definidos para `employees`, `expiring-requirements` e `boarding-schedule`
- correlacao por `requestId` e `correlationId` ja implementada
- inbox persistida para webhooks do Drake ja aplicada na camada Prisma
- fila BullMQ com Redis e retries exponenciais ja conectada ao intake
- endpoint `POST /api/integrations/sispat/employees-csv` criado para receber e auditar arquivos de funcionarios em `csv` e `xlsx`

Status em 31 de agosto de 2026:

- decisao de direcao atualizada: APIs externas ainda nao sao fontes ativas do MVP atual
- Drake passa a ser implementacao historica/preparada, nao prioridade operacional
- o app deve evoluir por contratos internos e dados mockados/seedados ate uma fonte real ser decidida
- fontes externas futuras devem alimentar o dominio interno por adapters, sem expor payload externo diretamente ao frontend
- documento `docs/internal-contracts-and-sources.md` passa a ser o mapa operacional de contratos internos e fontes futuras

Status em 9 de setembro de 2026:

- Drake foi retomado somente como piloto controlado de leitura de programacao por colaborador.
- `BoardingScheduleModule` ganhou controller autenticado, servico de dominio e adapter `DrakeCrewRotationClient`; a tela continua dependente de `ScheduleItem`, nunca do DTO externo.
- o caminho normal e `GET /api/boarding-schedule/me`; a pre-visualizacao administrativa e auditada e nao substitui vinculo de identidade.
- falta aplicar a migration `202609090001_add_audit_read_action` no banco do ambiente antes de disponibilizar a leitura real.
- validacao local posterior: migration aplicada e piloto autenticado retornou itens normalizados do Crew Rotation por referencia administrativa opaca.

## Phase 1.5 - Platform hardening

Objetivo: consolidar a base tecnica antes da expansao funcional.

Entregas:

- arquitetura feature-based final
- Prisma com PostgreSQL
- observabilidade inicial
- testes unitarios e de integracao
- OpenAPI e DTOs
- stack pronta para frontend web/PWA
- diretriz LGPD documentada e aplicada em novos modulos
- sanitizacao de logs, mascaramento, criptografia e consentimento quando necessario
- diretriz de codigo limpo, Object Calisthenics, SOLID pragmatico e erros explicitos documentada

## Phase 2 - Auth foundation

Objetivo: construir a base de identidade antes da area logada do colaborador.

Entregas:

- cadastro de conta
- login
- recuperacao e redefinicao de senha
- sessao com refresh token
- perfis e setores
- auditoria de autenticacao
- base pronta para federacao futura com `Entra ID`

Status em 20 de agosto de 2026:

- backend de `auth` ja estabelecido
- shell visual de login, cadastro, recuperacao e redefinicao iniciado em `apps/jornada`
- proximo passo natural e conectar os fluxos visuais ao backend real

Status em 21 de agosto de 2026:

- `auth` passou a usar separacao entre `Person`, `Employee` e `User`
- `admin bootstrap` segue suportado por email e senha, sem exigir matricula
- login do `apps/jornada` conectado ao backend real com persistencia local da sessao

Status em 29 de agosto de 2026:

- direcao de ecossistema consolidada: auth passa a ser tambem o portal de acesso aos apps
- fundacao inicial adicionada com `Application` e `UserApplicationAccess`
- fundacao de papel contextual por app iniciada com `UserApplicationRole`
- login e refresh passam a poder retornar as aplicacoes acessiveis do usuario
- `GET /auth/applications` entra como contrato inicial para a futura tela de escolha de aplicacao
- separacao recomendada formalizada: `apps/jornada` para colaborador, `apps/help-hub` para atendimento, `apps/api` ainda compartilhado por bounded context
- regra operacional reforcada: backlog compartilhado apenas enquanto o atendimento estiver sem responsavel; apos atribuicao, acesso comum passa a ser do responsavel atual
- gestao administrativa central iniciada no backend para grants e papeis por aplicacao
- catalogo central de aplicativos evoluido com tipo de entrada, imagem opcional, ordenacao, ativacao, CRUD auditado e rota administrativa `/administracao/aplicativos`
- administracao global do Neo foi separada da navegacao do Jornada em `/administracao`; o catalogo e a concessao/revogacao inicial de acessos vivem nesse contexto protegido por `ADMIN`
- ADR `0008-administrative-user-provisioning-and-access-governance.md` define convite administrativo, justificativa auditada para mudancas sensiveis e a protecao do ultimo administrador como proxima evolucao da gestao global
- ADR `0009-contextual-roles-and-code-owned-permissions.md` define `ADMIN` como papel global transversal e papeis de negocio por modulo, com migration controlada das roles legadas
- gestao global planejada passa a cobrir convite administrativo, estados de conta, revogacao de sessoes, revisao de acessos, avisos de seguranca e auditoria consultavel sem exportacao inicial
- Hub passou a filtrar por nome e descricao; entradas novas podem ser nativas ou redirecionamentos externos, sem alterar o SSO dos apps internos ja separados
- suporte passou a materializar um formulario principal por assunto por meio de vinculo ativo explicito, sem depender da ordenacao de registros
- workspace operacional passa a iniciar no backlog da equipe pelo contrato de rota e pelo filtro padrao do backend

Status em 3 de setembro de 2026:

- o cadastro publico passou a ser desabilitado por padrao; convite administrativo cria conta `PENDING`, acesso explicito por modulo e token de sete dias armazenado apenas como hash; reenvio invalida o convite pendente anterior
- o aceite ativa a conta de forma atomica, define a senha e invalida sessoes anteriores; bloqueio, desativacao e revogacao avulsa de sessoes possuem motivo estruturado, auditoria e evento transacional
- o catalogo de papeis novos agora e contextual por modulo: Jornada, Focall e QuickForms validam combinacoes distintas na API administrativa e no Neo
- ADR `0010-jornada-communication-to-focall-handoff.md` inicia a tela Jornada de comunicados e o handoff contextual ao Focall, ainda sem criar atendimento automaticamente

## Phase 3 - Processing core

Objetivo: processar sincronizacoes e eventos de fontes externas futuras sem acoplar a API externa ao dominio interno.

Entregas:

- comandos internos por tipo de evento
- fila ou outbox/inbox
- retries e dead-letter strategy
- regras de atualizacao de programacao, vencimentos e comunicados

Status em 20 de agosto de 2026:

- fila inicial criada com `BullMQ`
- `jobId` baseado em `idempotencyKey`
- transicoes do inbox para `QUEUED`, `PROCESSING`, `PROCESSED` e `FAILED`
- handlers ainda estao em modo baseline, prontos para receber a regra de negocio real

## Phase 4 - Employee domain

Objetivo: criar o dominio principal consumido pelo colaborador.

Entregas:

- colaborador
- agenda de embarque
- vencimentos de ASO e treinamentos
- comunicados por setor

Status em 21 de agosto de 2026:

- primeira modelagem estrutural de identidade e colaborador definida em `docs/identity-and-access.md`
- schema Prisma preparado para `Person -> Employee -> User`
- base pronta para ligar agenda, vencimentos e comunicados ao `Employee`

## Phase 5 - Interaction and real-time

Objetivo: habilitar atendimento e comunicacao operacional.

Entregas:

- chat 1:1 com setores
- filas de atendimento
- grupos e espacos de equipe
- notificacoes em tempo real

Status em 23 de agosto de 2026:

- base real do chat criada com `ChatConversation`, `ChatMessage` e `ChatReadState`
- `Socket.IO` integrado ao NestJS com adapter Redis desde o inicio
- endpoints HTTP autenticados criados para conversas, mensagens paginadas, envio e leitura
- frontend do chat conectado ao backend real com `TanStack Query`, cache leve e `react-virtuoso`
- mensagens usam `clientMessageId` para reduzir duplicidade em reconexao/mobile ruim
- modelagem evoluida para `ChatParticipant`, permitindo pessoa-pessoa, setor-setor, funcionario-setor e transferencia sem perder historico
- fundacao de `SupportCase` e `SupportCaseEvent` adicionada para atendimento/chamado separado do chat
- modulo desacoplado para evoluir como atendimento plugavel: `SupportTeam`, `SupportIntegrationLink`, `SupportRating`, porta de identidade e porta de notificacao
- direcao corrigida: Jornada nao tenta recriar uma ferramenta corporativa de conversa; o foco e resolucao de problemas do funcionario, experiencia simples, fila, responsavel, documentos, SLA, auditoria e avaliacao
- backend inicial de atendimento criado em `/api/support`: equipes, abertura, listagem, detalhe, atualizacao, mensagem vinculada e avaliacao
- frontend inicial de Atendimentos criado em `/atendimentos`, separado do chat para reforcar o foco em resolucao
- suporte/chat fechado como MVP operacional: filas padrao, permissao por papel/fila, motivo em transferencia/resolucao/fechamento, bloqueio de mensagem em caso fechado, timeline com eventos e mensagens recentes, avaliacao e tratamento LGPD inicial de texto livre
- decisao de produto atualizada: Chat fica oculto na navegacao do funcionario e `/chat` redireciona para `/atendimento`; toda duvida breve ou demanda formal entra como Atendimento dentro do Jornada
- evolucao de atendimento iniciada: setores visiveis, assuntos selecionaveis, regras de roteamento, membros de equipes, formularios versionados e fundacao para triagem inteligente
- triagem inicial sem IA externa adicionada: regras locais por palavras-chave sugerem setor/assunto e registram hash do texto para auditoria sem guardar conteudo bruto
- administracao inicial do catalogo adicionada para `ADMIN`/`SUPPORT`, com indice em `/atendimentos/configuracao` e paginas proprias para setores, assuntos, equipes, regras e formularios versionados
- endpoints administrativos protegidos adicionados em `/api/support/catalog/...`, mantendo `/support/catalog` enxuto e apenas com itens ativos para o funcionario
- tela administrativa carregada por rota propria/chunk separado para preservar a experiencia mobile-first do colaborador
- direcao UX refinada para o atendente: fluxo simples para o colaborador e workspace operacional desacoplado para quem atende, com detalhe reaproveitavel, contexto recolhivel e painel flutuante apenas em desktop amplo
- fronteira de produto refinada: `/atendimento` e a superficie Jornada do colaborador para abrir mensagem e responder solicitacoes; `/atendimentos` fica reservado para operacao/atendentes

Proximas expansoes ficam fora do fechamento do MVP de suporte/chat:

- anexos privados
- SLA e indicadores
- grupos/espacos de equipe
- notificacoes externas opcionais
- auditoria detalhada de acesso/exportacao
- edicao fina do catalogo administrativo, sinonimos de triagem e metricas operacionais
- workspace flutuante do atendente com estado persistido por URL, minimizacao e troca rapida entre casos sem perder a fila

Sequencia recomendada apos o ajuste visual atual:

1. consolidar filtros operacionais de fila tambem no backend
2. registrar marcos de ownership do atendimento (`assumido`, `transferido`, `resolvido`)
3. adicionar SLA e motivo tipificado sem poluir a experiencia do atendente
4. fechar auditoria operacional das acoes criticas
5. evoluir anexos privados e historico detalhado

Status em 27 de agosto de 2026:

- filtros operacionais de fila passaram a existir tambem no backend de `/api/support/cases`, reduzindo regra duplicada no frontend
- direcao definida para a etapa seguinte de operacao visual: Kanban de atendimento sobre a mesma base de filas, ownership e status
- biblioteca candidata validada por documentacao atual: `dnd-kit`, por suportar multiplos containers, overlay, sensores de ponteiro/toque/teclado e melhor extensibilidade para desktop e mobile
- direcao de produto em avaliacao madura: manter `Jornada do trabalhador` separado da futura aplicacao operacional de atendimento, com extracao de frontend antes de separar backend e banco por completo

Status em 11 de setembro de 2026:

- UX de encerramento/transferencia passou a usar motivo tipificado e comentario complementar separado no workspace operacional
- fila operacional passou a exibir sinal compacto de SLA baseado em `dueAt`, sem inferir tempo de responsabilidade que ainda nao esteja no contrato
- `/atendimento` passou a permitir reabertura explicita de atendimento resolvido recente, com motivo e mensagem obrigatoria dentro da propria Jornada
- Inbox do colaborador passou a incluir atendimento resolvido recente sem avaliacao como acao compacta, alem de respostas aguardando retorno

Status em 30 de agosto de 2026:

- rota principal de formularios passou a usar um editor proprio sem `Designable`, mais leve e previsivel para o MVP
- editor novo cobre rascunho, publicacao, preview interativo e condicionais basicas de visibilidade/obrigatoriedade
- criador oficial de formularios consolidado em `/formularios/novo` e `/formularios/:formKey/editar`, combinando `react-aria` drag and drop com runtime `RJSF`, biblioteca de blocos, secoes, textos readonly e base para colunas por secao
- rotas antigas com `Designable` foram removidas apos o builder proprio cobrir o alcance atual
- dependencias `antd`, `@designable/*` e `@formily/*` foram removidas do frontend

Status em 31 de agosto de 2026:

- editor novo passou a bloquear edicao manual de chave do formulario e codigo do campo no MVP, mantendo geracao automatica a partir de titulo e rotulo
- direcao registrada para `SELECT` com fonte remota reutilizavel via adapters no backend, preservando o formulario desacoplado de endpoints externos e pronto para catalogos grandes com busca e paginacao
- contrato definido: fonte de opcoes cadastrada no backend, consulta interna normalizada e endpoint externo nunca exposto ao navegador
- primeira entrega futura deve iniciar com adapters `STATIC` e `HTTP_JSON` allowlisted, com timeout, limite de resposta, cache e auditoria tecnica sanitizada
- primeira entrega implementada: `OptionSource`, endpoint interno normalizado e integracao de `optionSourceKey` no builder/runtime
- painel administrativo de fontes implementado em `/formularios/fontes`, com listagem, cadastro, edicao e preview antes do uso
- timeout HTTP das fontes passou a ser configurado por ambiente para evitar chamadas lentas demais no backend
- pendencias: segredo/referencia segura para futuras fontes autenticadas e combo remoto com busca incremental no preenchimento do colaborador
- modelo operacional de atendimento refinado: setor obrigatorio, assunto opcional, formulario principal antes da conversa e continuidade do mesmo caso em transferencias
- vocabulário de dominio fechado para atendimento: `SupportDepartment` como setor visivel, `SupportTeam` como fila/equipe interna e ownership separado de acesso ao app
- workspace do atendente consolidado conceitualmente com prioridade em backlog da equipe, depois detalhe e por fim contexto secundario recolhivel
- separacao fisica inicial de frontend entregue em `apps/help-hub`
- `apps/jornada` fica como experiencia do colaborador e encaminha rotas operacionais antigas para o HelpHub
- `apps/help-hub` concentra o atendimento e sua configuracao operacional enquanto o QuickForms ganha frontend proprio
- `apps/api` e PostgreSQL continuam compartilhados como monolito modular por contexto
- decisao registrada em `docs/adr/0004-separate-atendimento-frontend-first.md`

## Phase 6 - Mobile experience

Objetivo: consolidar a experiencia do colaborador.

Entregas:

- PWA
- cache e estrategia offline parcial
- notificacoes push
- UX mobile-first
- Inbox como home do colaborador, com embarque, desembarque, treinamento, ASO, compromissos e mensagens
- dashboard personalizavel por widgets apenas para futura visao de gestor/admin
- agenda detalhada do funcionario com futuro, historico recente, filtros no backend e paginacao quando houver volume
- carregamento leve: DTOs pequenos, campos usados pela tela, cache para dados pouco volateis

Status em 20 de agosto de 2026:

- `apps/jornada` iniciado com `Vite`, `React`, `React Aria Components`, `Tailwind CSS` e `vite-plugin-pwa`
- shell mobile-first ja definido com navegacao inferior no celular e sidebar no desktop
- tema base claro ja definido, com neutros frios e vermelho reservado para acento e estados criticos

Status em 22 de agosto de 2026:

- pagina inicial da area logada reorganizada como `/inbox`
- `/app` mantido apenas como redirecionamento para `/inbox`
- query string de abas removida da navegacao principal
- Inbox definido com registros resumidos e acoes para modulos de detalhe
- agenda do funcionario iniciada com visao de proximos eventos e historico recente
- Vencimentos iniciado como modulo proprio com filtros para criticos, ASO, treinamentos e documentos
- Chat iniciado como modulo proprio por setores, com lista de conversas, filtros e painel de mensagens
- diretriz de processamento leve formalizada: filtros no backend, paginacao para historico/listas grandes e cache para dados estaveis
- dashboard configuravel fica reservado para futura visao de gestor/admin

## Phase 7 - Operations and intelligence

Objetivo: dar escala operacional com controle.

Entregas:

- observabilidade
- painis de operacao
- automacoes assistivas
- agents internos com fronteiras claras

## Phase 8 - Ecosystem and access portal

Objetivo: sustentar multiplas aplicacoes com identidade unica e baixo acoplamento.

Entregas:

- catalogo central de aplicacoes
- acesso do usuario por aplicacao
- papeis contextuais por aplicacao
- gestao administrativa central de grants e papeis por aplicacao
- tela de escolha de aplicativo apos login
- separacao do frontend operacional em `apps/help-hub`
- contratos de permissao por contexto
- criterios claros para futura extracao de backend e banco

Status em 29 de agosto de 2026:

- portal inicial de aplicativos entrou no frontend em `/aplicativos`
- login e redirects passam a respeitar `applications[]` retornadas pela sessao
- usuario com um unico app entra direto no `entryPath`; usuario com mais de um acesso escolhe o contexto antes de navegar
- menu do shell passou a respeitar acesso contextual por aplicacao, reduzindo mistura visual entre colaborador e operacao
- rotas de `atendimentos` ganharam guarda de frontend por app; formularios seguem em extracao gradual para `apps/quick-forms`

Status em 31 de agosto de 2026:

- `apps/help-hub` criado como frontend operacional inicial
- `apps/jornada` removeu carregamento direto das telas operacionais e manteve apenas redirecionamento para o HelpHub
- `apps/api` continua compartilhado; extracao de backend/banco fica dependente de sinais operacionais reais

## Phase 8.5 - Modular platform hardening

Objetivo: transformar os limites do ecossistema em codigo testavel antes de ampliar novos apps.

Entregas:

- nomenclatura de produto `Jornada`, `HelpHub` e `QuickForms`; o Hub e o portal `/aplicativos` dentro do Jornada, sem marca propria
- eventos de dominio persistidos em outbox transacional
- relay com fila, retries, idempotencia e reprocessamento antes da primeira integracao assincrona entre dominios
- requests/respostas independentes para QuickForms
- politica de SLA e calendario operacional no HelpHub

Status em 1 de setembro de 2026:

- ADR `0005-modular-monolith-and-reliable-domain-events.md` adicionado
- `support.case.created` passou a ser persistido no outbox na mesma transacao de criacao do atendimento
- `FormRequest` passou a fixar formulario publicado, destinatario, origem e prazo em dominio proprio do QuickForms
- `forms.request.created` passou a ser persistido no outbox na mesma transacao da solicitacao
- `FormResponse` passou a registrar uma unica conclusao pelo destinatario e a publicar `forms.request.completed` no outbox
- relay BullMQ adicionado com varredura de pendencias, recuperacao de processamento preso, retry exponencial e estado terminal reprocessavel
- `ProcessedDomainEvent` garante que o consumidor do HelpHub registre uma unica projeção operacional para `forms.request.completed`
- API autenticada do QuickForms adicionada para criar solicitacoes e receber respostas sem acesso direto a tabelas de outro dominio
- politica de SLA e calendario operacional do HelpHub permanecem como proxima entrega de dominio
- primeira politica de SLA implementada: alvo configuravel por prioridade, calculo 24x7 isolado e `dueAt` persistido na abertura do atendimento
- catalogo central agora usa `JORNADA`, `HELP_HUB` e `QUICK_FORMS`; a migracao preserva grants do codigo legado
- `apps/quick-forms` possui PWA e rotas autenticadas reais para biblioteca, fontes e builder
- existem tres apps de negocio: Jornada, HelpHub e QuickForms; o portal de modulos permanece em `/aplicativos` no Jornada e nao usa nome ou login proprio
- qualquer acesso direto ao HelpHub ou QuickForms sem sessao abre o login central do Jornada e, depois, retorna por ticket SSO opaco ao app solicitado
- mudanca de app usa ticket SSO opaco, hasheado no banco, de uso unico e curta duracao; emissao e consumo sao auditados
- `packages/frontend-core` passou a ser o dono da infraestrutura compartilhada de frontend; HelpHub e QuickForms usam o pacote para auth/SSO/tema/estilos e shell comum
- telas e clientes de HelpHub e QuickForms foram movidos para seus respectivos `apps`; o shell foi extraido para o core com porta injetavel para a dock de suporte, sem acoplar QuickForms ao dominio de atendimento
- o frame visual do shell foi consolidado no frontend core para eliminar divergencia de header, sidebar e fundo entre HelpHub, QuickForms e Jornada
- ADR `0006-unify-frontend-as-modules.md` define a proxima simplificacao: um frontend Neo publicado, com Jornada, Focall e QuickForms como modulos internos lazy; `HELP_HUB` permanece codigo tecnico durante a migracao

Status em 2 de setembro de 2026:

- o frontend Neo foi consolidado em `apps/jornada`, com uma sessao, um shell e um PWA.
- Focall e QuickForms foram movidos para `apps/jornada/src/modules` e preservam respectivamente `/atendimentos` e `/formularios`.
- catalogo nativo atualizado para `Focall`, `HELP_HUB` e `QUICK_FORMS` como `NATIVE`; destinos externos continuam como `REDIRECT`.
- a proxima etapa e smoke manual e retirada controlada dos frontends de referencia, sem mudar backend, banco ou contratos de dominio.
