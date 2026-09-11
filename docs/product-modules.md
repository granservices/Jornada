# Product Modules

## MVP premium direction

O MVP nao sera um prototipo raso. Ele deve nascer com estrutura de produto real, mesmo que o escopo de features seja controlado.

## Core modules

### 0. Privacy And LGPD

- classificacao de dados
- transparencia para o funcionario
- consentimento quando necessario
- mascaramento e criptografia de dados sensiveis
- logs sanitizados
- controle de acesso por finalidade
- retencao e descarte

Estado atual em 23 de agosto de 2026:

- LGPD definida como requisito obrigatorio em `docs/lgpd-and-privacy.md`
- novas features devem passar por revisao de finalidade, necessidade, permissao, DTOs, logs, cache e criptografia

### 1. Auth

- criar conta
- login
- recuperar senha
- redefinir senha
- refresh de sessao
- logout
- verificacao de email
- perfis
- setores
- trilha de auditoria

Observacao:

`Auth` passa a ser a primeira vertical funcional do produto. Antes de agenda, vencimentos e comunicados, a base de identidade precisa nascer pronta para crescimento.

Estado atual em 21 de agosto de 2026:

- login por email ou matricula mantido
- `admin bootstrap` com acesso por email preservado
- sessao web inicial conectada ao backend real

### 2. Employee

- dados do colaborador
- vinculos operacionais
- identificadores externos
- contrato interno `EmployeeProfile` para o app

Estado atual em 21 de agosto de 2026:

- separacao formal entre `Person`, `Employee` e `User`
- `Employee` definido como ponte entre identidade e dominio operacional

### 3. Boarding Schedule

- agenda de embarque
- agenda de desembarque
- alteracoes de programacao
- status e proximidade
- contrato interno `ScheduleItem` para timeline e Inbox

### 4. Expiring Requirements

- ASO
- treinamentos
- certificados e documentos
- estados de alerta
- contrato interno `RequirementExpiration` para lista e sinais do Inbox

Estado atual em 22 de agosto de 2026:

- primeira tela web criada em `/vencimentos`
- filtros funcionais para todos, criticos, ASO, treinamentos e documentos
- busca funcional no frontend enquanto o contrato real da API nao existe
- diretriz mantida: no backend real, filtros volumosos devem ser resolvidos por DTOs pequenos e paginados quando necessario

### 5. Communications

- comunicados gerais
- comunicados por setor
- avisos operacionais
- destaque de mudancas relevantes
- contrato interno `Communication` para avisos e recortes no Inbox

### 6. Chat and Support

- conversa com setores
- fila de atendimento
- grupos e espacos de equipe
- participantes genericos para pessoa-pessoa, setor-setor e funcionario-setor
- atendimento/chamado separado da conversa, mas relacionado por origem
- equipes/filas configuraveis por dados
- avaliacao ao fim do atendimento
- notificacoes externas opcionais por adapter, quando houver caso operacional claro

Estado atual em 22 de agosto de 2026:

- primeira tela web criada em `/chat`
- lista de conversas por setor com filtros funcionais
- painel de mensagens selecionavel no frontend
- envio real, historico paginado e roteamento dependem de contrato/backend futuro

Estado atual em 23 de agosto de 2026:

- dominio revisado para separar `ChatConversation`, `ChatParticipant`, `ChatMessage`, `SupportCase` e `SupportCaseEvent`
- `SupportTeam` adicionado como base de fila/equipe plugavel
- `SupportIntegrationLink` adicionado para vincular atendimento a integracoes/notificacoes sem acoplar o nucleo
- `SupportRating` adicionado como base de avaliacao do atendimento pelo funcionario
- portas de identidade e notificacao criadas para manter inversao de dependencia
- backend `/support` iniciado com equipes, abertura, listagem, detalhe, atualizacao, comentario e avaliacao
- tela `/atendimentos` iniciada para o funcionario abrir demanda e acompanhar resolucao sem depender do chat como produto principal
- Jornada deve resolver demanda, triagem, fila, responsavel, documentos, SLA, auditoria e experiencia do funcionario, sem tentar recriar ferramenta corporativa generica de conversa
- decisao documentada em `docs/chat-and-support-domain.md`

Estado atual em 26 de agosto de 2026:

- formularios dinamicos foram separados do suporte como definicoes versionadas reutilizaveis
- modulo `/forms` passa a centralizar listagem e publicacao de versoes, com acesso inicial `ADMIN`/`TI`
- tela `/formularios` vira biblioteca central, fora da configuracao de atendimento
- criacao e edicao ficam em `/formularios/novo` e `/formularios/:formKey/editar`, usando o builder proprio do Jornada
- `FormDefinition.schema` guarda JSON tecnico de compatibilidade; `FormField` continua como base tipada principal para compatibilidade com atendimento
- `SupportTopicFormBinding` liga assunto de atendimento ao formulario, preservando abertura simples no MVP
- `SupportTopicFormBinding.isPrimary` define explicitamente o formulario principal ativo de cada assunto; o modelo continua permitindo multiplos vinculos para evolucao futura
- formularios podem ser globais ou de setor, preparando governanca por gestor setorial sem acoplar a feature de atendimento
- decisao arquitetural registrada: o criador oficial fica somente em `/formularios/novo` e `/formularios/:formKey/editar`

Estado atual em 31 de agosto de 2026:

- `SupportDepartment` foi consolidado como setor visivel ao funcionario
- `SupportTeam` foi consolidado como fila/equipe interna de operacao
- a abertura do atendimento passa a seguir `setor obrigatorio + assunto opcional + formulario principal antes da conversa`
- transferencias preservam o mesmo `SupportCase`, trocando ownership e equipe sem quebrar o historico
- a experiencia do atendente passa a se orientar por backlog da equipe antes da carteira pessoal
- o backend aplica o backlog da equipe como filtro padrao para perfil operacional, inclusive quando o cliente nao envia filtro de fila
- transferencia entre equipes limpa automaticamente o responsavel atual e registra o retorno ao backlog da equipe de destino

## Future modules

- notifications
- attachments
- teams
- preferences
- admin
- integrations hub

## Internal contracts before sources

Antes de conectar uma API externa real, o Jornada deve definir o contrato interno consumido pelo app.

Contratos iniciais:

- `UserAccessContext`
- `EmployeeProfile`
- `ScheduleItem`
- `RequirementExpiration`
- `InboxItem`
- `Communication`
- `IntegrationSyncRun`

Detalhamento: `docs/internal-contracts-and-sources.md`.

## MyDrake inspiration translated to Jornada

Pontos principais a preservar na visao do produto:

- agenda real como elemento central
- compromissos operacionais
- treinamentos realizados e agendados
- informacao facil para o colaborador
- mudancas e avisos com peso operacional

## Build order recommendation

Ordem recomendada para implementacao:

1. `Auth`
2. `Employee`
3. `Boarding Schedule`
4. `Expiring Requirements`
5. `Communications`
6. `Chat and Support`
